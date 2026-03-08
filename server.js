const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

// Setup session middleware
app.use(session({
    secret: 'supersecretkey', // Change this for a real application
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using https
}));

// Body parser middleware to handle POST requests
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Database connection (create file if not exists)
const db = new sqlite3.Database('soderia.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error(err.message);
    } else {
        console.log('Connected to the soderia database.');
        // initialize tables
        db.serialize(() => {
            db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    username TEXT PRIMARY KEY,
                    password TEXT NOT NULL,
                    role TEXT NOT NULL
                )
            `);
            db.run(`
                CREATE TABLE IF NOT EXISTS clientes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nombre TEXT UNIQUE NOT NULL,
                    direccion TEXT,
                    telefono TEXT,
                    email TEXT,
                    saldo_total REAL DEFAULT 0,
                    activo INTEGER DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
            db.run(`
                CREATE TABLE IF NOT EXISTS productos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nombre TEXT UNIQUE NOT NULL,
                    descripcion TEXT,
                    precio_unitario REAL DEFAULT 0,
                    stock INTEGER DEFAULT 0,
                    activo INTEGER DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
            db.run(`
                CREATE TABLE IF NOT EXISTS ventas (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    cliente_id INTEGER NOT NULL,
                    cliente_nombre TEXT NOT NULL,
                    direccion TEXT,
                    total_monto REAL NOT NULL,
                    forma_pago TEXT,
                    estado_pago INTEGER DEFAULT 0,
                    saldo_deuda REAL DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(cliente_id) REFERENCES clientes(id)
                )
            `);
            db.run(`
                CREATE TABLE IF NOT EXISTS detalles_venta (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    venta_id INTEGER NOT NULL,
                    producto_nombre TEXT NOT NULL,
                    cantidad INTEGER NOT NULL,
                    precio_unitario REAL,
                    monto REAL NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(venta_id) REFERENCES ventas(id)
                )
            `);
            db.run(`
                CREATE TABLE IF NOT EXISTS pagos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    cliente_id INTEGER NOT NULL,
                    cliente_nombre TEXT NOT NULL,
                    monto REAL NOT NULL,
                    forma_pago TEXT,
                    referencia TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(cliente_id) REFERENCES clientes(id)
                )
            `);
            db.run(`
                CREATE TABLE IF NOT EXISTS saldo_cliente (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    cliente_id INTEGER NOT NULL,
                    cliente_nombre TEXT NOT NULL,
                    monto_deuda REAL DEFAULT 0,
                    monto_pagado REAL DEFAULT 0,
                    saldo_pendiente REAL DEFAULT 0,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(cliente_id) REFERENCES clientes(id)
                )
            `);
            // Legacy table - mantener para compatibilidad con datos anteriores
            db.run(`
                CREATE TABLE IF NOT EXISTS data_entries (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    cliente_id INTEGER,
                    cliente_nombre TEXT NOT NULL,
                    direccion TEXT,
                    producto TEXT NOT NULL,
                    cantidad INTEGER NOT NULL,
                    monto REAL NOT NULL,
                    saldo REAL DEFAULT 0,
                    forma_pago TEXT,
                    pagado INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(cliente_id) REFERENCES clientes(id)
                )
            `);
            // ensure admin user exists
            db.get(`SELECT username FROM users WHERE username='admin'`, (e, row) => {
                if (e) return console.error(e.message);
                if (!row) {
                    db.run(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`, ['admin','admin','admin']);
                    console.log('Admin user created (admin/admin)');
                }
            });
        });
    }
});

// Routes
app.get('/', (req, res) => {
    if (req.session.loggedin) {
        res.redirect('/selector');
    } else {
        res.sendFile(path.join(__dirname, 'views', 'login.html'));
    }
});

app.post('/login', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    if (username && password) {
        db.get(`SELECT * FROM users WHERE username = ? AND password = ?`, [username, password], (err, row) => {
            if (err) {
                res.status(500).send('Error on the server.');
                return console.error(err.message);
            }
            if (row) {
                req.session.loggedin = true;
                req.session.username = username;
                res.redirect('/selector');
            } else {
                res.send('Incorrect Username and/or Password!');
            }
            res.end();
        });
    } else {
        res.send('Please enter Username and Password!');
        res.end();
    }
});

app.get('/selector', (req, res) => {
    if (req.session.loggedin) {
        res.sendFile(path.join(__dirname, 'views', 'selector.html'));
    } else {
        res.redirect('/');
    }
});

app.get('/dashboard', (req, res) => {
    if (req.session.loggedin) {
        res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
    } else {
        res.redirect('/');
    }
});

app.get('/pc', (req, res) => {
    if (req.session.loggedin) {
        res.sendFile(path.join(__dirname, 'views', 'pc.html'));
    } else {
        res.redirect('/');
    }
});

app.get('/admin', (req, res) => {
    if (req.session.loggedin) {
        res.sendFile(path.join(__dirname, 'views', 'admin.html'));
    } else {
        res.redirect('/');
    }
});

app.get('/movil', (req, res) => {
    if (req.session.loggedin) {
        res.sendFile(path.join(__dirname, 'views', 'movil.html'));
    } else {
        res.redirect('/');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if(err) {
            return console.log(err);
        }
        res.redirect('/');
    });
});

// REST API for data entries
app.get('/api/data', (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');
    db.all(`SELECT * FROM data_entries ORDER BY created_at DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/data', (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');
    const { cliente_id, cliente_nombre, direccion, producto, cantidad, monto, saldo, forma_pago, pagado } = req.body;
    db.run(
        `INSERT INTO data_entries (cliente_id, cliente_nombre, direccion, producto, cantidad, monto, saldo, forma_pago, pagado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [cliente_id || null, cliente_nombre, direccion, producto, cantidad, monto, saldo || 0, forma_pago, pagado ? 1 : 0],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

// Clientes API
app.get('/api/clientes', (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');
    const search = req.query.q || '';
    const query = search ? `SELECT * FROM clientes WHERE nombre LIKE ? ORDER BY nombre` : `SELECT * FROM clientes ORDER BY nombre`;
    const params = search ? [`%${search}%`] : [];
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.post('/api/clientes', (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');
    const { nombre, direccion, telefono, email } = req.body;
    db.run(
        `INSERT INTO clientes (nombre, direccion, telefono, email) VALUES (?, ?, ?, ?)`,
        [nombre, direccion, telefono, email],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, nombre, direccion, telefono, email });
        }
    );
});

app.put('/api/clientes/:id', (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');
    const id = req.params.id;
    const { nombre, direccion, telefono, email, activo } = req.body;
    db.run(
        `UPDATE clientes SET nombre = ?, direccion = ?, telefono = ?, email = ?, activo = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [nombre, direccion, telefono, email, activo ? 1 : 0, id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ changes: this.changes });
        }
    );
});

app.delete('/api/clientes/:id', (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');
    const id = req.params.id;
    db.run(`DELETE FROM clientes WHERE id = ?`, [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ changes: this.changes });
    });
});

// Productos API
app.get('/api/productos', (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');
    const search = req.query.q || '';
    const query = search ? `SELECT * FROM productos WHERE nombre LIKE ? ORDER BY nombre` : `SELECT * FROM productos ORDER BY nombre`;
    db.all(query, search ? [`%${search}%`] : [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.post('/api/productos', (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');
    const { nombre, descripcion, precio_unitario, stock } = req.body;
    db.run(
        `INSERT INTO productos (nombre, descripcion, precio_unitario, stock) VALUES (?, ?, ?, ?)`,
        [nombre, descripcion || '', precio_unitario || 0, stock || 0],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, nombre, descripcion, precio_unitario, stock });
        }
    );
});

app.put('/api/productos/:id', (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');
    const id = req.params.id;
    const { nombre, descripcion, precio_unitario, stock, activo } = req.body;
    db.run(
        `UPDATE productos SET nombre = ?, descripcion = ?, precio_unitario = ?, stock = ?, activo = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [nombre, descripcion, precio_unitario, stock, activo ? 1 : 0, id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ changes: this.changes });
        }
    );
});

app.delete('/api/productos/:id', (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');
    const id = req.params.id;
    db.run(`DELETE FROM productos WHERE id = ?`, [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ changes: this.changes });
    });
});

app.put('/api/data/:id', (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');
    const id = req.params.id;
    const { producto, cantidad, monto, saldo, forma_pago, pagado } = req.body;
    db.run(
        `UPDATE data_entries SET producto = ?, cantidad = ?, monto = ?, saldo = ?, forma_pago = ?, pagado = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [producto, cantidad, monto, saldo, forma_pago, pagado ? 1 : 0, id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ changes: this.changes });
        }
    );
});

app.delete('/api/data/:id', (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');
    const id = req.params.id;
    db.run(`DELETE FROM data_entries WHERE id = ?`, [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ changes: this.changes });
    });
});


app.listen(port, async () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log('Starting ngrok tunnel...');
    try {
        const ngrok = require('ngrok');
        const url = await ngrok.connect({ addr: port, authtoken: process.env.NGROK_TOKEN });
        console.log('🌍 Ngrok URL:', url);
        console.log('   Mobile:', url + '/movil');
        console.log('   PC:', url + '/pc');
    } catch (err) {
        console.log('⚠️  ngrok failed to start; make sure you have network access or set NGROK_TOKEN.');
    }
});
