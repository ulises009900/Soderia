#!/usr/bin/env node

/**
 * Script para iniciar Soderia con acceso público
 * Usa localtunnel para acceso desde cualquier red/dispositivo
 */

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const os = require('os');
const localtunnel = require('localtunnel');
require('dotenv').config();
const db = require('./config/db');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Almacenar usuarios conectados
const users = new Map();

// Rutas
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.get('/mobile', (req, res) => {
  res.sendFile(__dirname + '/public/mobile.html');
});

app.get('/desktop', (req, res) => {
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

// API REST - Obtener datos por usuario
app.get('/api/data/:userId', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM data_entries WHERE user_id = $1 ORDER BY created_at DESC', [req.params.userId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching user data' });
  }
});

// WebSockets
io.on('connection', (socket) => {
  console.log('Nuevo usuario conectado:', socket.id);

  // Usuario se registra con su rol y nombre
  socket.on('register', (data) => {
    users.set(socket.id, {
      id: socket.id,
      username: data.username,
      role: data.role, // 'mobile' o 'desktop'
      connected_at: new Date()
    });
    
    io.emit('user_connected', {
      message: `${data.username} se conectó`,
      users: Array.from(users.values())
    });
  });

  // Recibir datos desde móvil
  socket.on('submit_data', async (data) => {
    try {
      const user = users.get(socket.id);
      
      const result = await db.query(
        'INSERT INTO data_entries (user_id, username, data_type, content, coordinates, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *',
        [socket.id, user.username, data.type, data.content, data.coordinates ? JSON.stringify(data.coordinates) : null]
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
      if (user.role !== 'desktop') {
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
      if (user.role !== 'desktop') {
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

// Iniciar servidor
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
  console.log(`   Móvil:             http://${localIp}:${PORT}/mobile`);
  console.log(`   PC:                http://${localIp}:${PORT}/desktop`);
  console.log('');

  // Iniciar Localtunnel automáticamente
  try {
    const tunnel = await localtunnel({ port: PORT });
    console.log('🌍 ACCESO REMOTO (desde cualquier red 4G/5G/Wifi):');
    console.log(`   ${tunnel.url}`);
    console.log('   ${tunnel.url}/mobile');
    console.log('   ${tunnel.url}/desktop');
    console.log('');
    console.log('💡 IMPORTANTE: La URL pública cambia cada vez que inicias el servidor.');
    console.log('');

    tunnel.on('close', () => {
      console.log('🔌 Túnel de acceso público cerrado.');
      process.exit(0);
    });
  } catch (err) {
    console.warn('⚠️  No se pudo crear túnel público. Asegúrate de estar conectado a internet.');
    console.log('');
    console.log('💡 Para compartir con otros desde otra red, usa tu IP pública:');
    console.log('   Ve a: https://www.cual-es-mi-ip.net');
    console.log('');
  }
});

// Manejo de errores
process.on('uncaughtException', (err) => {
  console.error('❌ Error no capturado:', err);
  process.exit(1);
});
