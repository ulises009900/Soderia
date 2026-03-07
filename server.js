const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./config/db');
const bcrypt = require('bcrypt');
const os = require('os');
const localtunnel = require('localtunnel');
const session = require('express-session');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// --- Middlewares ---

// Middleware de Sesión
// NOTA: El 'secret' debe ser una cadena larga y aleatoria guardada en tu archivo .env
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'a-very-secret-key-that-should-be-in-env',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Usar cookies seguras en producción (HTTPS)
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 // La sesión dura 24 horas
  }
});
app.use(sessionMiddleware);

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Compartir sesión de Express con Socket.IO
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

// Middleware para verificar autenticación en rutas de Express
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  // Si no está autenticado, redirige a la página de inicio de sesión
  res.redirect('/');
};

// Almacenar usuarios conectados
const users = new Map();

// --- Rutas ---

// Rutas Protegidas (requieren inicio de sesión)
app.get('/mobile', isAuthenticated, (req, res) => {
  res.sendFile(__dirname + '/public/mobile.html');
});

app.get('/desktop', isAuthenticated, (req, res) => {
  res.sendFile(__dirname + '/public/desktop.html');
});

// API REST - Obtener datos
app.get('/api/data', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM data_entries ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching data' });
  }
});

// API REST - Obtener datos por usuario (protegida)
app.get('/api/data/:userId', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM data_entries WHERE user_id = $1 ORDER BY created_at DESC', [req.params.userId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching user data' });
  }
});

// --- Rutas Públicas (Autenticación) ---
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// API REST - Login de Usuario
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    // 1. Buscar al usuario por su nombre
    const result = await db.query('SELECT * FROM auth_users WHERE username = $1', [username]);
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      // 2. Comparar la contraseña enviada con el hash guardado en la BD
      const isValid = await bcrypt.compare(password, user.password);
      
      if (isValid) {
        // Guardar usuario en la sesión
        req.session.user = { id: user.id, username: user.username, role: user.role };
        res.json({ success: true, user: req.session.user });
      } else {
        res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
      }
    } else {
      res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// API REST - Logout de Usuario
app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: 'Error al cerrar sesión' });
    }
    res.clearCookie('connect.sid'); // Limpiar la cookie de sesión
    res.json({ success: true, message: 'Sesión cerrada correctamente.' });
  });
});

app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    // Hashear la contraseña antes de guardarla
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Por defecto registramos como 'mobile'
    const result = await db.query(
      'INSERT INTO auth_users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username, role',
      [username, hashedPassword, 'mobile']
    );
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return res.status(400).json({ error: 'El usuario ya existe' });
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

// --- Lógica de WebSockets ---
io.on('connection', (socket) => {
  const session = socket.request.session;

  // 1. Verificar si el usuario está autenticado a través de la sesión
  if (!session || !session.user) {
    console.log('Conexión de socket no autorizada rechazada:', socket.id);
    return socket.disconnect(true);
  }

  const authenticatedUser = session.user;
  console.log(`Usuario autenticado conectado vía WebSocket: ${authenticatedUser.username} (${socket.id})`);

  // 2. Añadir al usuario a la lista de conectados
  users.set(socket.id, {
    id: socket.id, // ID del socket
    userId: authenticatedUser.id, // ID permanente del usuario en la BD
    username: authenticatedUser.username,
    role: authenticatedUser.role,
    connected_at: new Date()
  });
  
  // 3. Notificar a todos que un nuevo usuario se ha conectado
  io.emit('user_connected', {
    message: `${authenticatedUser.username} se conectó`,
    users: Array.from(users.values())
  });

  // Recibir datos desde móvil
  socket.on('submit_data', async (data) => {
    try {
      const user = users.get(socket.id); // Obtener datos del usuario desde nuestro mapa seguro
      
      const result = await db.query(
        'INSERT INTO data_entries (user_id, username, data_type, content, coordinates, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *',
        [String(user.userId), user.username, data.type, data.content, data.coordinates ? JSON.stringify(data.coordinates) : null]
      );

      // Broadcast a todos los clientes
      io.emit('new_data', result.rows[0]);
      
      socket.emit('success', { message: 'Datos guardados correctamente' });
    } catch (err) {
      console.error(err);
      socket.emit('error', { message: 'Error al guardar datos' });
    }
  });

  // Eliminar datos (solo desde desktop)
  socket.on('delete_data', async (dataId) => {
    try {
      const user = users.get(socket.id);
      if (!user || user.role !== 'desktop') {
        socket.emit('error', { message: 'No tienes permiso' });
        return;
      }

      await db.query('DELETE FROM data_entries WHERE id = $1', [dataId]);
      io.emit('data_deleted', { id: dataId });
      socket.emit('success', { message: 'Datos eliminados' });
    } catch (err) {
      console.error(err);
      socket.emit('error', { message: 'Error al eliminar datos' });
    }
  });

  // Actualizar datos
  socket.on('update_data', async (data) => {
    try {
      const user = users.get(socket.id);
      if (!user || user.role !== 'desktop') {
        socket.emit('error', { message: 'No tienes permiso' });
        return;
      }

      const result = await db.query(
        'UPDATE data_entries SET content = $1, coordinates = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
        [data.content, data.coordinates ? JSON.stringify(data.coordinates) : null, data.id]
      );

      io.emit('data_updated', result.rows[0]);
      socket.emit('success', { message: 'Datos actualizados' });
    } catch (err) {
      console.error(err);
      socket.emit('error', { message: 'Error al actualizar datos' });
    }
  });

  // Desconexión
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      users.delete(socket.id);
      io.emit('user_disconnected', {
        message: `${user.username} se desconectó`,
        users: Array.from(users.values())
      });
    }
    console.log('Usuario desconectado:', socket.id);
  });
});

// --- Iniciar Servidor ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', async () => {
  console.clear();
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║         🔗 SODERIA - Sistema de Gestión Remota        ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');

  // Mostrar la IP local
  const interfaces = os.networkInterfaces();
  let localIp = 'localhost';
  
  Object.keys(interfaces).forEach((ifname) => {
    interfaces[ifname].forEach((iface) => {
      if (iface.family === 'IPv4' && !iface.internal) {
        localIp = iface.address;
      }
    });
  });

  console.log(`✅ Servidor ejecutándose en puerto ${PORT}`);
  console.log('');
  console.log('📱 ACCESO LOCAL (misma red WiFi):');
  console.log(`   Página principal:  http://${localIp}:${PORT}`);
  console.log(`   (Desde aquí podrás iniciar sesión para ir a /mobile o /desktop)`);
  console.log('');

  // Iniciar Localtunnel automáticamente
  try {
    const tunnel = await localtunnel({ 
      port: parseInt(PORT),
      local_host: '127.0.0.1'
    });
    console.log('🌍 ACCESO REMOTO (desde cualquier red 4G/5G/Wifi):');
    console.log(`   ${tunnel.url}`);
    console.log('   (Usa esta URL para iniciar sesión desde cualquier lugar)');
    console.log('');
    console.log('   ⚠️ ¿Error 503? El servicio gratuito localtunnel puede estar saturado.');
    console.log('   👉 Solución estable: Usa NGROK (ver instrucciones en CONEXION_REMOTA.md)');
    console.log('💡 IMPORTANTE: La URL pública cambia cada vez que inicias el servidor.');
    console.log('');

    tunnel.on('close', () => {
      console.log('🔌 Túnel de acceso público cerrado.');
    });
  } catch (err) {
    console.error('\n❌ No se pudo iniciar el túnel. Asegúrate de estar conectado a internet.');
  }
});
