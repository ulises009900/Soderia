const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000;
const sessionSecret = process.env.SESSION_SECRET || 'supersecretkey';

// Setup session middleware
app.use(session({
    secret: sessionSecret, // can be overridden with SESSION_SECRET env var
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
                    cliente_id INTEGER NOT NULL UNIQUE,
                    cliente_nombre TEXT NOT NULL,
                    monto_deuda REAL DEFAULT 0,
                    monto_pagado REAL DEFAULT 0,
                    saldo_pendiente REAL DEFAULT 0,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(cliente_id) REFERENCES clientes(id)
                )
            `);
            db.run(`
                CREATE TABLE IF NOT EXISTS pagos_deuda (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    cliente_id INTEGER NOT NULL,
                    cliente_nombre TEXT NOT NULL,
                    monto_pago REAL NOT NULL,
                    forma_pago TEXT,
                    observaciones TEXT,
                    fecha_pago DATETIME DEFAULT CURRENT_TIMESTAMP,
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
        
        // Migración: Agregar columna activo si no existe
        db.all(`PRAGMA table_info(clientes)`, (err, columns) => {
            if (err) return console.error(err.message);
            const hasActivo = columns.some(col => col.name === 'activo');
            if (!hasActivo) {
                db.run(`ALTER TABLE clientes ADD COLUMN activo INTEGER DEFAULT 1`, (err) => {
                    if (err) console.error('Error adding activo to clientes:', err);
                    else console.log('✓ Column activo added to clientes');
                });
            }
        });
        
        db.all(`PRAGMA table_info(productos)`, (err, columns) => {
            if (err) return console.error(err.message);
            const hasActivo = columns.some(col => col.name === 'activo');
            if (!hasActivo) {
                db.run(`ALTER TABLE productos ADD COLUMN activo INTEGER DEFAULT 1`, (err) => {
                    if (err) console.error('Error adding activo to productos:', err);
                    else console.log('✓ Column activo added to productos');
                });
            }
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

// REST API for data entries (unificado con ventas)
app.get('/api/data', (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');
    db.all(`
        SELECT 
            dv.id,
            v.id as venta_id,
            v.cliente_id,
            v.cliente_nombre,
            v.direccion,
            dv.producto_nombre as producto,
            dv.cantidad,
            dv.monto,
            v.forma_pago,
            v.estado_pago,
            v.saldo_deuda as saldo,
            v.created_at
        FROM detalles_venta dv
        JOIN ventas v ON dv.venta_id = v.id
        ORDER BY v.created_at DESC
    `, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        // Mapear para compatibilidad con frontend
        const data = (rows || []).map(r => ({
            id: r.id,
            venta_id: r.venta_id,
            cliente_id: r.cliente_id,
            cliente_nombre: r.cliente_nombre,
            direccion: r.direccion,
            producto: r.producto,
            cantidad: r.cantidad,
            monto: r.monto,
            forma_pago: r.forma_pago,
            pagado: r.estado_pago === 'pagado' ? 1 : 0,
            saldo: r.saldo,
            created_at: r.created_at
        }));
        res.json(data);
    });
});

app.post('/api/data', (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');
    const { cliente_id, cliente_nombre, direccion, producto, cantidad, monto, forma_pago, pagado } = req.body;
    
    const estado_pago = pagado ? 'pagado' : 'pendiente';
    const saldo_deuda = pagado ? 0 : monto;
    
    db.run(
        `INSERT INTO ventas (cliente_id, cliente_nombre, direccion, total_monto, forma_pago, estado_pago, saldo_deuda) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [cliente_id || null, cliente_nombre, direccion, monto, forma_pago, estado_pago, saldo_deuda],
        function(ventaErr) {
            if (ventaErr) return res.status(500).json({ error: ventaErr.message });
            
            const ventaId = this.lastID;
            const precio_unitario = cantidad > 0 ? monto / cantidad : 0;
            
            db.run(
                `INSERT INTO detalles_venta (venta_id, producto_nombre, cantidad, precio_unitario, monto)
                 VALUES (?, ?, ?, ?, ?)`,
                [ventaId, producto, cantidad, precio_unitario, monto],
                function(detalleErr) {
                    if (detalleErr) return res.status(500).json({ error: detalleErr.message });
                    
                    res.json({ id: this.lastID, venta_id: ventaId });
                }
            );
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

app.get('/api/clientes/:id', (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');
    const id = req.params.id;
    db.get('SELECT * FROM clientes WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Cliente no encontrado' });
        res.json(row);
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

// Deuda API - Calcular deuda sumando todas las ventas pendientes
app.get('/api/deuda/:cliente_id', (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');
    const cliente_id = req.params.cliente_id;

    // Calcular deuda total sumando todas las ventas pendientes del cliente
    db.get(
        `SELECT SUM(dv.monto) as deuda_total,
                MAX(v.created_at) as ultima_venta
         FROM detalles_venta dv
         JOIN ventas v ON dv.venta_id = v.id
         WHERE v.cliente_id = ? AND v.estado_pago = 'pendiente'`,
        [cliente_id],
        (err, row) => {
            if (err) return res.status(500).json({ error: err.message });

            const deuda = row && row.deuda_total ? parseFloat(row.deuda_total) : 0;
            const ultima_actualizacion = row && row.ultima_venta ? row.ultima_venta : new Date().toISOString();

            res.json({
                deuda: deuda,
                ultima_actualizacion: ultima_actualizacion
            });
        }
    );
});

// Historial de Pagos - Control y auditoría
app.get('/api/historial-pagos', (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');

    const cliente = req.query.cliente || '';
    const fechaDesde = req.query.fecha_desde || '';
    const fechaHasta = req.query.fecha_hasta || '';

    let query = 'SELECT * FROM pagos_deuda WHERE 1=1';
    const params = [];

    if (cliente) {
        query += " AND cliente_nombre LIKE ?";
        params.push(`%${cliente}%`);
    }

    if (fechaDesde) {
        query += " AND DATE(fecha_pago) >= ?";
        params.push(fechaDesde);
    }

    if (fechaHasta) {
        query += " AND DATE(fecha_pago) <= ?";
        params.push(fechaHasta);
    }

    query += " ORDER BY fecha_pago DESC LIMIT 500";

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        // Calcular totales
        const totalPagos = rows ? rows.length : 0;
        const totalMonto = rows ? rows.reduce((sum, p) => sum + parseFloat(p.monto_pago), 0) : 0;

        res.json({
            pagos: rows || [],
            total_pagos: totalPagos,
            total_pagado: totalMonto.toFixed(2)
        });
    });
});

// Validar integridad de pagos
app.get('/api/validar-pagos', (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');

    // Verificar que todos los pagos registrados correspondan a clientes válidos
    db.all(
        `SELECT p.id, p.cliente_id, p.cliente_nombre, p.monto_pago, p.fecha_pago,
                COUNT(c.id) as cliente_existe
         FROM pagos_deuda p
         LEFT JOIN clientes c ON p.cliente_id = c.id
         GROUP BY p.id
         HAVING cliente_existe = 0`,
        [],
        (err, pagosInvalidos) => {
            if (err) return res.status(500).json({ error: err.message });

            const tieneErrores = pagosInvalidos && pagosInvalidos.length > 0;

            res.json({
                valido: !tieneErrores,
                errores: pagosInvalidos || [],
                total_errores: pagosInvalidos ? pagosInvalidos.length : 0
            });
        }
    );
});

// Ventas pendientes de un cliente
app.get('/api/ventas-pendientes/:cliente_id', (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');
    const cliente_id = req.params.cliente_id;
    
    db.all(
        `SELECT v.id as venta_id, dv.producto_nombre as producto, dv.cantidad, dv.monto, v.created_at as fecha
         FROM detalles_venta dv
         JOIN ventas v ON dv.venta_id = v.id
         WHERE v.cliente_id = ? AND v.estado_pago = 'pendiente'
         ORDER BY v.created_at ASC`,
        [cliente_id],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            
            res.json({ 
                ventas: rows || [],
                total_ventas: rows ? rows.length : 0
            });
        }
    );
});

// Registrar Pago - Aplicar pago a ventas seleccionadas específicamente
app.post('/api/registrar-pago-seleccionado', (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');
    
    const { cliente_id, ventas_seleccionadas, monto_pago, forma_pago, observaciones } = req.body;
    
    if (!cliente_id || !ventas_seleccionadas || ventas_seleccionadas.length === 0 || monto_pago <= 0) {
        return res.status(400).json({ error: 'Datos inválidos' });
    }
    
    // Verificar que el monto coincida con la suma de las ventas seleccionadas
    const totalSeleccionado = ventas_seleccionadas.reduce((sum, v) => sum + parseFloat(v.monto), 0);
    if (Math.abs(monto_pago - totalSeleccionado) > 0.01) {
        return res.status(400).json({ error: `El monto (${monto_pago}) no coincide con el total seleccionado (${totalSeleccionado.toFixed(2)})` });
    }
    
    // Obtener nombre del cliente
    db.get('SELECT nombre FROM clientes WHERE id = ?', [cliente_id], (err, clienteRow) => {
        if (err) {
            console.error('Error obteniendo nombre cliente:', err);
            return res.status(500).json({ error: 'Error interno' });
        }
        
        if (!clienteRow) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        
        const clienteNombre = clienteRow.nombre;
        let ventasCompletadas = 0;
        const totalVentas = ventas_seleccionadas.length;
        
        // Marcar cada venta seleccionada como pagada
        ventas_seleccionadas.forEach(venta => {
            // Buscar la venta por detalles (producto, cantidad, monto, fecha aproximada)
            db.get(
                `SELECT v.id as venta_id FROM ventas v
                 JOIN detalles_venta dv ON v.id = dv.venta_id
                 WHERE v.cliente_id = ? AND v.estado_pago = 'pendiente'
                 AND dv.producto_nombre = ? AND dv.cantidad = ? AND dv.monto = ?
                 ORDER BY v.created_at ASC LIMIT 1`,
                [cliente_id, venta.producto, venta.cantidad, venta.monto],
                (err, ventaRow) => {
                    if (err) {
                        console.error('Error buscando venta:', err);
                        return;
                    }
                    
                    if (!ventaRow) {
                        console.error('Venta no encontrada:', venta);
                        return;
                    }
                    
                    // Marcar como pagada
                    db.run(
                        'UPDATE ventas SET estado_pago = ?, saldo_deuda = 0 WHERE id = ?',
                        ['pagado', ventaRow.venta_id],
                        function(err) {
                            if (err) {
                                console.error('Error marcando venta como pagada:', err);
                                return;
                            }
                            
                            ventasCompletadas++;
                            
                            // Cuando todas las ventas estén procesadas
                            if (ventasCompletadas === totalVentas) {
                                // Registrar el pago en la tabla de pagos
                                const fechaPago = new Date().toISOString();
                                db.run(
                                    `INSERT INTO pagos_deuda (cliente_id, cliente_nombre, monto_pago, forma_pago, observaciones, fecha_pago)
                                     VALUES (?, ?, ?, ?, ?, ?)`,
                                    [cliente_id, clienteNombre, monto_pago, forma_pago, observaciones || '', fechaPago],
                                    function(pagoErr) {
                                        if (pagoErr) {
                                            console.error('Error registrando pago:', pagoErr);
                                            return res.status(500).json({ error: 'Error registrando pago' });
                                        }
                                        
                                        // Calcular nueva deuda total
                                        db.get(
                                            `SELECT SUM(dv.monto) as deuda_restante
                                             FROM detalles_venta dv
                                             JOIN ventas v ON dv.venta_id = v.id
                                             WHERE v.cliente_id = ? AND v.estado_pago = 'pendiente'`,
                                            [cliente_id],
                                            (err, row) => {
                                                const deudaRestante = row && row.deuda_restante ? parseFloat(row.deuda_restante) : 0;
                                                
                                                res.json({
                                                    success: true,
                                                    monto_pagado: monto_pago,
                                                    ventas_pagadas: totalVentas,
                                                    deuda_restante: deudaRestante
                                                });
                                            }
                                        );
                                    }
                                );
                            }
                        }
                    );
                }
            );
        });
    });
});

// Registrar Pago - Aplicar pago a ventas pendientes (FIFO)
app.post('/api/registrar-pago', (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');

    const { cliente_id, monto_pago, forma_pago, observaciones } = req.body;

    if (!cliente_id || monto_pago <= 0) {
        return res.status(400).json({ error: 'Datos inválidos' });
    }

    // Obtener todas las ventas pendientes ordenadas por fecha (FIFO)
    db.all(
        `SELECT v.id as venta_id, dv.id as detalle_id, dv.monto, v.created_at
         FROM ventas v
         JOIN detalles_venta dv ON v.id = dv.venta_id
         WHERE v.cliente_id = ? AND v.estado_pago = 'pendiente'
         ORDER BY v.created_at ASC`,
        [cliente_id],
        (err, ventasPendientes) => {
            if (err) return res.status(500).json({ error: err.message });

            if (!ventasPendientes || ventasPendientes.length === 0) {
                return res.status(404).json({ error: 'Cliente no tiene ventas pendientes' });
            }

            // Calcular deuda total
            const deudaTotal = ventasPendientes.reduce((sum, venta) => sum + parseFloat(venta.monto), 0);

            if (monto_pago > deudaTotal) {
                return res.status(400).json({ error: `El monto($${monto_pago}) supera la deuda total($${deudaTotal.toFixed(2)})` });
            }

            let montoRestante = monto_pago;
            const ventasAMarcarPagadas = [];

            // Aplicar pago usando FIFO (primero las ventas más antiguas)
            for (const venta of ventasPendientes) {
                if (montoRestante <= 0) break;

                const montoVenta = parseFloat(venta.monto);

                if (montoRestante >= montoVenta) {
                    // Pagar venta completa
                    ventasAMarcarPagadas.push({
                        venta_id: venta.venta_id,
                        monto_pagado: montoVenta
                    });
                    montoRestante -= montoVenta;
                } else {
                    // Pagar parte de la venta (dividir si es necesario)
                    // Por simplicidad, marcaremos como pagada solo si el pago cubre el total
                    // Si no cubre, no marcamos como pagada
                    break;
                }
            }

            // Si no se pudo aplicar el pago completo a ninguna venta, devolver error
            if (ventasAMarcarPagadas.length === 0) {
                return res.status(400).json({ error: 'El monto debe ser suficiente para pagar al menos una venta completa. Las ventas más antiguas tienen montos específicos.' });
            }

            // Marcar ventas como pagadas
            let completadas = 0;
            const totalMarcadas = ventasAMarcarPagadas.length;

            ventasAMarcarPagadas.forEach(venta => {
                db.run(
                    'UPDATE ventas SET estado_pago = ?, saldo_deuda = 0 WHERE id = ?',
                    ['pagado', venta.venta_id],
                    function(err) {
                        if (err) {
                            console.error('Error marcando venta como pagada:', err);
                            return;
                        }

                        completadas++;

                        // Cuando todas las ventas estén marcadas, registrar el pago
                        if (completadas === totalMarcadas) {
                            // Obtener nombre del cliente
                            db.get('SELECT nombre FROM clientes WHERE id = ?', [cliente_id], (err, clienteRow) => {
                                if (err) {
                                    console.error('Error obteniendo nombre cliente:', err);
                                    return res.status(500).json({ error: 'Error interno' });
                                }

                                const clienteNombre = clienteRow ? clienteRow.nombre : 'Cliente';

                                // Registrar el pago en la tabla de pagos
                                const fechaPago = new Date().toISOString();
                                db.run(
                                    `INSERT INTO pagos_deuda (cliente_id, cliente_nombre, monto_pago, forma_pago, observaciones, fecha_pago)
                                     VALUES (?, ?, ?, ?, ?, ?)`,
                                    [cliente_id, clienteNombre, monto_pago, forma_pago, observaciones || '', fechaPago],
                                    function(pagoErr) {
                                        if (pagoErr) {
                                            console.error('Error registrando pago:', pagoErr);
                                            return res.status(500).json({ error: 'Error registrando pago' });
                                        }

                                        // Calcular nueva deuda total
                                        db.get(
                                            `SELECT SUM(dv.monto) as deuda_restante
                                             FROM detalles_venta dv
                                             JOIN ventas v ON dv.venta_id = v.id
                                             WHERE v.cliente_id = ? AND v.estado_pago = 'pendiente'`,
                                            [cliente_id],
                                            (err, row) => {
                                                const deudaRestante = row && row.deuda_restante ? parseFloat(row.deuda_restante) : 0;

                                                res.json({
                                                    success: true,
                                                    monto_pagado: monto_pago,
                                                    ventas_pagadas: totalMarcadas,
                                                    deuda_restante: deudaRestante
                                                });
                                            }
                                        );
                                    }
                                );
                            });
                        }
                    }
                );
            });
        }
    );
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

app.get('/api/productos/:id', (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');
    const id = req.params.id;
    db.get('SELECT * FROM productos WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Producto no encontrado' });
        res.json(row);
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
    const { producto, cantidad, monto, forma_pago, saldo, pagado } = req.body;
    
    const precio_unitario = cantidad > 0 ? monto / cantidad : 0;
    const estado_pago = pagado ? 'pagado' : 'pendiente';
    const saldo_deuda = pagado ? 0 : (saldo || monto);
    
    // First update detalles_venta
    db.run(
        `UPDATE detalles_venta SET producto_nombre = ?, cantidad = ?, precio_unitario = ?, monto = ? WHERE id = ?`,
        [producto, cantidad, precio_unitario, monto, id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            
            // Then update ventas table
            db.run(
                `UPDATE ventas SET forma_pago = ?, estado_pago = ?, saldo_deuda = ? WHERE id = (SELECT venta_id FROM detalles_venta WHERE id = ?)`,
                [forma_pago, estado_pago, saldo_deuda, id],
                function(ventaErr) {
                    if (ventaErr) return res.status(500).json({ error: ventaErr.message });
                    res.json({ changes: this.changes });
                }
            );
        }
    );
});

app.delete('/api/data/:id', (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');
    const id = req.params.id;
    db.run(`DELETE FROM detalles_venta WHERE id = ?`, [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ changes: this.changes });
    });
});

// Ventas API (nueva - para crear ventas completas con múltiples productos)
app.post('/api/ventas', (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');
    const { cliente_id, cliente_nombre, direccion, productos, forma_pago, pagado } = req.body;
    
    if (!productos || productos.length === 0) {
        return res.status(400).json({ error: 'Debe incluir al menos un producto' });
    }
    
    const estado_pago = pagado ? 'pagado' : 'pendiente';
    const total_monto = productos.reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0);
    const saldo_deuda = pagado ? 0 : total_monto;
    
    db.run(
        `INSERT INTO ventas (cliente_id, cliente_nombre, direccion, total_monto, forma_pago, estado_pago, saldo_deuda) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [cliente_id || null, cliente_nombre, direccion, total_monto, forma_pago, estado_pago, saldo_deuda],
        function(ventaErr) {
            if (ventaErr) return res.status(500).json({ error: ventaErr.message });
            
            const ventaId = this.lastID;
            let completados = 0;
            let errores = 0;
            
            // Insertar cada producto
            productos.forEach((producto, index) => {
                const cantidad = parseFloat(producto.cantidad) || 1;
                const monto = parseFloat(producto.monto) || 0;
                const precio_unitario = cantidad > 0 ? monto / cantidad : 0;
                
                db.run(
                    `INSERT INTO detalles_venta (venta_id, producto_nombre, cantidad, precio_unitario, monto)
                     VALUES (?, ?, ?, ?, ?)`,
                    [ventaId, producto.producto, cantidad, precio_unitario, monto],
                    function(detalleErr) {
                        if (detalleErr) {
                            errores++;
                        } else {
                            completados++;
                        }
                        
                        // Si es el último producto
                        if (index === productos.length - 1) {
                            if (errores > 0) {
                                return res.status(500).json({ error: `Se guardaron ${completados} pero fallaron ${errores}` });
                            }
                            
                            res.json({ id: ventaId, productos_guardados: completados });
                        }
                    }
                );
            });
        }
    );
});

// Pago rápido - Pagar deuda completa
app.post('/api/pagar-deuda-completa', (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');

    const { cliente_id, forma_pago, observaciones } = req.body;

    if (!cliente_id) {
        return res.status(400).json({ error: 'Cliente requerido' });
    }

    // Validar que el cliente existe
    db.get('SELECT id, nombre FROM clientes WHERE id = ?', [cliente_id], (err, clienteRow) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!clienteRow) return res.status(404).json({ error: 'Cliente no encontrado' });

        const clienteNombre = clienteRow.nombre;

        // Obtener deuda total del cliente
        db.get(
            `SELECT SUM(dv.monto) as deuda_total, COUNT(DISTINCT v.id) as cantidad_ventas
             FROM detalles_venta dv
             JOIN ventas v ON dv.venta_id = v.id
             WHERE v.cliente_id = ? AND v.estado_pago = 'pendiente'`,
            [cliente_id],
            (err, row) => {
                if (err) return res.status(500).json({ error: err.message });

                const deudaTotal = row && row.deuda_total ? parseFloat(row.deuda_total) : 0;
                const cantidadVentas = row && row.cantidad_ventas ? row.cantidad_ventas : 0;

                if (deudaTotal <= 0) {
                    return res.status(400).json({ error: 'El cliente no tiene deuda pendiente' });
                }

                // Validar forma de pago
                if (!forma_pago || forma_pago.trim() === '') {
                    return res.status(400).json({ error: 'Forma de pago requerida' });
                }

                // Iniciar transacción: actualizar ventas y registrar pago
                const fechaPago = new Date().toISOString();

                // Marcar todas las ventas pendientes como pagadas
                db.run(
                    'UPDATE ventas SET estado_pago = ?, saldo_deuda = 0 WHERE cliente_id = ? AND estado_pago = ?',
                    ['pagado', cliente_id, 'pendiente'],
                    function(updateErr) {
                        if (updateErr) {
                            console.error('Error actualizando ventas:', updateErr);
                            return res.status(500).json({ error: 'Error actualizando estado de ventas' });
                        }

                        const ventasActualizadas = this.changes;

                        // Registrar el pago
                        db.run(
                            `INSERT INTO pagos_deuda (cliente_id, cliente_nombre, monto_pago, forma_pago, observaciones, fecha_pago)
                             VALUES (?, ?, ?, ?, ?, ?)`,
                            [cliente_id, clienteNombre, deudaTotal, forma_pago, observaciones || '', fechaPago],
                            function(pagoErr) {
                                if (pagoErr) {
                                    console.error('Error registrando pago:', pagoErr);
                                    return res.status(500).json({ error: 'Error registrando el pago' });
                                }

                                // Verificar que el pago se registró correctamente
                                db.get(
                                    'SELECT id FROM pagos_deuda WHERE cliente_id = ? AND fecha_pago = ?',
                                    [cliente_id, fechaPago],
                                    (err, pagoRegistro) => {
                                        if (err || !pagoRegistro) {
                                            return res.status(500).json({ error: 'Error verificando registro del pago' });
                                        }

                                        res.json({
                                            success: true,
                                            monto_pagado: deudaTotal,
                                            deuda_restante: 0,
                                            ventas_pagadas: ventasActualizadas,
                                            pago_id: pagoRegistro.id
                                        });
                                    }
                                );
                            }
                        );
                    }
                );
            }
        );
    });
});

// Pago rápido - Pagar deuda parcial
app.post('/api/pagar-deuda-parcial', (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');

    const { cliente_id, monto_pago, forma_pago, observaciones } = req.body;

    if (!cliente_id || monto_pago <= 0) {
        return res.status(400).json({ error: 'Datos inválidos' });
    }

    // Obtener deuda total del cliente
    db.get(
        `SELECT SUM(dv.monto) as deuda_total
         FROM detalles_venta dv
         JOIN ventas v ON dv.venta_id = v.id
         WHERE v.cliente_id = ? AND v.estado_pago = 'pendiente'`,
        [cliente_id],
        (err, row) => {
            if (err) return res.status(500).json({ error: err.message });

            const deudaTotal = row && row.deuda_total ? parseFloat(row.deuda_total) : 0;

            if (deudaTotal <= 0) {
                return res.status(400).json({ error: 'El cliente no tiene deuda pendiente' });
            }

            if (monto_pago > deudaTotal) {
                return res.status(400).json({ error: `El monto($${monto_pago}) supera la deuda total($${deudaTotal.toFixed(2)})` });
            }

            // Obtener nombre del cliente
            db.get('SELECT nombre FROM clientes WHERE id = ?', [cliente_id], (err, clienteRow) => {
                if (err) return res.status(500).json({ error: err.message });

                const clienteNombre = clienteRow ? clienteRow.nombre : 'Cliente';

                // Aplicar pago parcial usando FIFO (primero las ventas más antiguas)
                db.all(
                    `SELECT v.id as venta_id, dv.monto, v.created_at
                     FROM ventas v
                     JOIN detalles_venta dv ON v.id = dv.venta_id
                     WHERE v.cliente_id = ? AND v.estado_pago = 'pendiente'
                     ORDER BY v.created_at ASC`,
                    [cliente_id],
                    (err, ventasPendientes) => {
                        if (err) return res.status(500).json({ error: err.message });

                        let montoRestante = monto_pago;
                        const ventasAMarcarPagadas = [];

                        // Aplicar pago usando FIFO
                        for (const venta of ventasPendientes) {
                            if (montoRestante <= 0) break;

                            const montoVenta = parseFloat(venta.monto);

                            if (montoRestante >= montoVenta) {
                                // Pagar venta completa
                                ventasAMarcarPagadas.push(venta.venta_id);
                                montoRestante -= montoVenta;
                            } else {
                                // Para pago parcial, no marcamos ventas como pagadas
                                // solo si no cubren el total de la venta
                                break;
                            }
                        }

                        // Marcar ventas completas como pagadas
                        if (ventasAMarcarPagadas.length > 0) {
                            const placeholders = ventasAMarcarPagadas.map(() => '?').join(',');
                            db.run(
                                `UPDATE ventas SET estado_pago = 'pagado', saldo_deuda = 0
                                 WHERE id IN (${placeholders})`,
                                ventasAMarcarPagadas,
                                function(updateErr) {
                                    if (updateErr) return res.status(500).json({ error: updateErr.message });

                                    // Registrar el pago
                                    const fechaPago = new Date().toISOString();
                                    db.run(
                                        `INSERT INTO pagos_deuda (cliente_id, cliente_nombre, monto_pago, forma_pago, observaciones, fecha_pago)
                                         VALUES (?, ?, ?, ?, ?, ?)`,
                                        [cliente_id, clienteNombre, monto_pago, forma_pago, observaciones || '', fechaPago],
                                        function(pagoErr) {
                                            if (pagoErr) return res.status(500).json({ error: pagoErr.message });

                                            // Calcular nueva deuda
                                            db.get(
                                                `SELECT SUM(dv.monto) as deuda_restante
                                                 FROM detalles_venta dv
                                                 JOIN ventas v ON dv.venta_id = v.id
                                                 WHERE v.cliente_id = ? AND v.estado_pago = 'pendiente'`,
                                                [cliente_id],
                                                (err, row) => {
                                                    const deudaRestante = row && row.deuda_restante ? parseFloat(row.deuda_restante) : 0;

                                                    res.json({
                                                        success: true,
                                                        monto_pagado: monto_pago,
                                                        deuda_restante: deudaRestante
                                                    });
                                                }
                                            );
                                        }
                                    );
                                }
                            );
                        } else {
                            // Solo registrar el pago sin marcar ventas como pagadas
                            const fechaPago = new Date().toISOString();
                            db.run(
                                `INSERT INTO pagos_deuda (cliente_id, cliente_nombre, monto_pago, forma_pago, observaciones, fecha_pago)
                                 VALUES (?, ?, ?, ?, ?, ?)`,
                                [cliente_id, clienteNombre, monto_pago, forma_pago, observaciones || '', fechaPago],
                                function(pagoErr) {
                                    if (pagoErr) return res.status(500).json({ error: pagoErr.message });

                                    // Calcular nueva deuda (debería ser la misma ya que no se pagaron ventas completas)
                                    res.json({
                                        success: true,
                                        monto_pagado: monto_pago,
                                        deuda_restante: deudaTotal
                                    });
                                }
                            );
                        }
                    }
                );
            });
        }
    );
});

// Pago rápido - Pago mixto (efectivo + transferencia)
app.post('/api/pagar-deuda-mixta', (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');

    const { cliente_id, monto_efectivo, monto_transferencia, observaciones } = req.body;

    const totalPago = (parseFloat(monto_efectivo) || 0) + (parseFloat(monto_transferencia) || 0);

    if (!cliente_id || totalPago <= 0) {
        return res.status(400).json({ error: 'Datos inválidos' });
    }

    // Obtener deuda total del cliente
    db.get(
        `SELECT SUM(dv.monto) as deuda_total
         FROM detalles_venta dv
         JOIN ventas v ON dv.venta_id = v.id
         WHERE v.cliente_id = ? AND v.estado_pago = 'pendiente'`,
        [cliente_id],
        (err, row) => {
            if (err) return res.status(500).json({ error: err.message });

            const deudaTotal = row && row.deuda_total ? parseFloat(row.deuda_total) : 0;

            if (deudaTotal <= 0) {
                return res.status(400).json({ error: 'El cliente no tiene deuda pendiente' });
            }

            if (totalPago > deudaTotal) {
                return res.status(400).json({ error: `El monto total($${totalPago.toFixed(2)}) supera la deuda total($${deudaTotal.toFixed(2)})` });
            }

            // Obtener nombre del cliente
            db.get('SELECT nombre FROM clientes WHERE id = ?', [cliente_id], (err, clienteRow) => {
                if (err) return res.status(500).json({ error: err.message });

                const clienteNombre = clienteRow ? clienteRow.nombre : 'Cliente';

                // Aplicar pago mixto usando FIFO
                db.all(
                    `SELECT v.id as venta_id, dv.monto, v.created_at
                     FROM ventas v
                     JOIN detalles_venta dv ON v.id = dv.venta_id
                     WHERE v.cliente_id = ? AND v.estado_pago = 'pendiente'
                     ORDER BY v.created_at ASC`,
                    [cliente_id],
                    (err, ventasPendientes) => {
                        if (err) return res.status(500).json({ error: err.message });

                        let montoRestante = totalPago;
                        const ventasAMarcarPagadas = [];

                        // Aplicar pago usando FIFO
                        for (const venta of ventasPendientes) {
                            if (montoRestante <= 0) break;

                            const montoVenta = parseFloat(venta.monto);

                            if (montoRestante >= montoVenta) {
                                // Pagar venta completa
                                ventasAMarcarPagadas.push(venta.venta_id);
                                montoRestante -= montoVenta;
                            } else {
                                // Para pago mixto, no marcamos ventas como pagadas
                                // solo si no cubren el total de la venta
                                break;
                            }
                        }

                        // Marcar ventas completas como pagadas
                        if (ventasAMarcarPagadas.length > 0) {
                            const placeholders = ventasAMarcarPagadas.map(() => '?').join(',');
                            db.run(
                                `UPDATE ventas SET estado_pago = 'pagado', saldo_deuda = 0
                                 WHERE id IN (${placeholders})`,
                                ventasAMarcarPagadas,
                                function(updateErr) {
                                    if (updateErr) return res.status(500).json({ error: updateErr.message });

                                    // Registrar el pago mixto
                                    registrarPagoMixto();
                                }
                            );
                        } else {
                            // Solo registrar el pago sin marcar ventas como pagadas
                            registrarPagoMixto();
                        }

                        function registrarPagoMixto() {
                            const fechaPago = new Date().toISOString();
                            const descripcionPago = `Efectivo: $${monto_efectivo.toFixed(2)}, Transferencia: $${monto_transferencia.toFixed(2)}`;

                            db.run(
                                `INSERT INTO pagos_deuda (cliente_id, cliente_nombre, monto_pago, forma_pago, observaciones, fecha_pago)
                                 VALUES (?, ?, ?, ?, ?, ?)`,
                                [cliente_id, clienteNombre, totalPago, 'mixto', (observaciones || '') + ' ' + descripcionPago, fechaPago],
                                function(pagoErr) {
                                    if (pagoErr) return res.status(500).json({ error: pagoErr.message });

                                    // Calcular nueva deuda
                                    db.get(
                                        `SELECT SUM(dv.monto) as deuda_restante
                                         FROM detalles_venta dv
                                         JOIN ventas v ON dv.venta_id = v.id
                                         WHERE v.cliente_id = ? AND v.estado_pago = 'pendiente'`,
                                        [cliente_id],
                                        (err, row) => {
                                            const deudaRestante = row && row.deuda_restante ? parseFloat(row.deuda_restante) : 0;

                                            res.json({
                                                success: true,
                                                monto_efectivo: parseFloat(monto_efectivo) || 0,
                                                monto_transferencia: parseFloat(monto_transferencia) || 0,
                                                total_pagado: totalPago,
                                                deuda_restante: deudaRestante
                                            });
                                        }
                                    );
                                }
                            );
                        }
                    }
                );
            });
        }
    );
});

// Pago rápido - Pagar deuda seleccionada (parcial)
app.post('/api/pagar-deuda-seleccionada', (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');

    const { cliente_id, ventas_seleccionadas, forma_pago, observaciones } = req.body;

    if (!cliente_id || !ventas_seleccionadas || ventas_seleccionadas.length === 0) {
        return res.status(400).json({ error: 'Datos inválidos: cliente y ventas requeridas' });
    }

    // Validar forma de pago
    if (!forma_pago || forma_pago.trim() === '') {
        return res.status(400).json({ error: 'Forma de pago requerida' });
    }

    // Validar cliente existe
    db.get('SELECT id, nombre FROM clientes WHERE id = ?', [cliente_id], (err, clienteRow) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!clienteRow) return res.status(404).json({ error: 'Cliente no encontrado' });

        const clienteNombre = clienteRow.nombre;

        // Verificar que las ventas seleccionadas existen y están pendientes
        const ventaIds = ventas_seleccionadas.map(v => v.venta_id);
        const placeholders = ventaIds.map(() => '?').join(',');

        db.all(
            `SELECT v.id as venta_id, SUM(dv.monto) as monto
             FROM ventas v
             LEFT JOIN detalles_venta dv ON v.id = dv.venta_id
             WHERE v.id IN (${placeholders}) AND v.cliente_id = ? AND v.estado_pago = 'pendiente'
             GROUP BY v.id`,
            [...ventaIds, cliente_id],
            (err, ventasVerificadas) => {
                if (err) return res.status(500).json({ error: err.message });

                if (!ventasVerificadas || ventasVerificadas.length !== ventas_seleccionadas.length) {
                    return res.status(400).json({ error: 'Una o más ventas seleccionadas no existen o ya están pagadas' });
                }

                // Calcular y validar total a pagar
                const totalPago = ventas_seleccionadas.reduce((sum, v) => sum + parseFloat(v.monto), 0);

                if (totalPago <= 0) {
                    return res.status(400).json({ error: 'El monto a pagar debe ser mayor a 0' });
                }

                // Marcar las ventas seleccionadas como pagadas
                const fechaPago = new Date().toISOString();
                const updatePromises = ventas_seleccionadas.map(venta => {
                    return new Promise((resolve, reject) => {
                        db.run(
                            'UPDATE ventas SET estado_pago = ?, saldo_deuda = 0, updated_at = ? WHERE id = ?',
                            ['pagado', fechaPago, venta.venta_id],
                            function(err) {
                                if (err) reject(err);
                                else resolve();
                            }
                        );
                    });
                });

                Promise.all(updatePromises)
                    .then(() => {
                        // Registrar el pago
                        db.run(
                            `INSERT INTO pagos_deuda (cliente_id, cliente_nombre, monto_pago, forma_pago, observaciones, fecha_pago)
                             VALUES (?, ?, ?, ?, ?, ?)`,
                            [cliente_id, clienteNombre, totalPago, forma_pago, observaciones || '', fechaPago],
                            function(pagoErr) {
                                if (pagoErr) {
                                    console.error('Error registrando pago:', pagoErr);
                                    return res.status(500).json({ error: 'Error registrando el pago' });
                                }

                                // Verificar y calcular nueva deuda total
                                db.get(
                                    `SELECT SUM(dv.monto) as deuda_restante
                                     FROM detalles_venta dv
                                     JOIN ventas v ON dv.venta_id = v.id
                                     WHERE v.cliente_id = ? AND v.estado_pago = 'pendiente'`,
                                    [cliente_id],
                                    (err, row) => {
                                        if (err) {
                                            console.error('Error calculando deuda restante:', err);
                                            return res.status(500).json({ error: 'Error calculando deuda restante' });
                                        }

                                        const deudaRestante = row && row.deuda_restante ? parseFloat(row.deuda_restante) : 0;

                                        res.json({
                                            success: true,
                                            monto_pagado: totalPago,
                                            ventas_pagadas: ventas_seleccionadas.length,
                                            deuda_restante: deudaRestante
                                        });
                                    }
                                );
                            }
                        );
                    })
                    .catch(err => {
                        console.error('Error en transacción de pago:', err);
                        res.status(500).json({ error: 'Error procesando el pago: ' + err.message });
                    });
            }
        );
    });
});

// Pago rápido - Pago mixto con selección de ventas
app.post('/api/pagar-deuda-mixta-seleccionada', (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');

    const { cliente_id, ventas_seleccionadas, monto_efectivo, monto_transferencia, observaciones } = req.body;

    const montoEfectivo = parseFloat(monto_efectivo) || 0;
    const montoTransferencia = parseFloat(monto_transferencia) || 0;
    const totalPago = montoEfectivo + montoTransferencia;
    const totalSeleccionado = ventas_seleccionadas.reduce((sum, v) => sum + parseFloat(v.monto), 0);

    // Validaciones exhaustivas
    if (!cliente_id || !ventas_seleccionadas || ventas_seleccionadas.length === 0) {
        return res.status(400).json({ error: 'Datos inválidos: cliente y ventas requeridas' });
    }

    if (totalPago <= 0) {
        return res.status(400).json({ error: 'El monto total a pagar debe ser mayor a 0' });
    }

    if (Math.abs(totalPago - totalSeleccionado) > 0.01) {
        return res.status(400).json({ 
            error: `El total de pago ($${totalPago.toFixed(2)}) debe coincidir con el total seleccionado ($${totalSeleccionado.toFixed(2)})` 
        });
    }

    // Validar cliente existe
    db.get('SELECT id, nombre FROM clientes WHERE id = ?', [cliente_id], (err, clienteRow) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!clienteRow) return res.status(404).json({ error: 'Cliente no encontrado' });

        const clienteNombre = clienteRow.nombre;

        // Verificar que las ventas seleccionadas existen y están pendientes
        const ventaIds = ventas_seleccionadas.map(v => v.venta_id);
        const placeholders = ventaIds.map(() => '?').join(',');

        db.all(
            `SELECT v.id as venta_id, SUM(dv.monto) as monto
             FROM ventas v
             LEFT JOIN detalles_venta dv ON v.id = dv.venta_id
             WHERE v.id IN (${placeholders}) AND v.cliente_id = ? AND v.estado_pago = 'pendiente'
             GROUP BY v.id`,
            [...ventaIds, cliente_id],
            (err, ventasVerificadas) => {
                if (err) return res.status(500).json({ error: err.message });

                if (!ventasVerificadas || ventasVerificadas.length !== ventas_seleccionadas.length) {
                    return res.status(400).json({ error: 'Una o más ventas seleccionadas no existen o ya están pagadas' });
                }

                // Marcar las ventas seleccionadas como pagadas
                const fechaPago = new Date().toISOString();
                const updatePromises = ventas_seleccionadas.map(venta => {
                    return new Promise((resolve, reject) => {
                        db.run(
                            'UPDATE ventas SET estado_pago = ?, saldo_deuda = 0, updated_at = ? WHERE id = ?',
                            ['pagado', fechaPago, venta.venta_id],
                            function(err) {
                                if (err) reject(err);
                                else resolve();
                            }
                        );
                    });
                });

                Promise.all(updatePromises)
                    .then(() => {
                        // Registrar el pago mixto
                        const descripcionPago = `Efectivo: $${montoEfectivo.toFixed(2)}, Transferencia: $${montoTransferencia.toFixed(2)}`;
                        const observacionesCompletas = (observaciones || '') + ' ' + descripcionPago;

                        db.run(
                            `INSERT INTO pagos_deuda (cliente_id, cliente_nombre, monto_pago, forma_pago, observaciones, fecha_pago)
                             VALUES (?, ?, ?, ?, ?, ?)`,
                            [cliente_id, clienteNombre, totalPago, 'mixto', observacionesCompletas, fechaPago],
                            function(pagoErr) {
                                if (pagoErr) {
                                    console.error('Error registrando pago mixto:', pagoErr);
                                    return res.status(500).json({ error: 'Error registrando el pago' });
                                }

                                // Calcular nueva deuda total
                                db.get(
                                    `SELECT SUM(dv.monto) as deuda_restante
                                     FROM detalles_venta dv
                                     JOIN ventas v ON dv.venta_id = v.id
                                     WHERE v.cliente_id = ? AND v.estado_pago = 'pendiente'`,
                                    [cliente_id],
                                    (err, row) => {
                                        if (err) {
                                            console.error('Error calculando deuda restante:', err);
                                            return res.status(500).json({ error: 'Error calculando deuda restante' });
                                        }

                                        const deudaRestante = row && row.deuda_restante ? parseFloat(row.deuda_restante) : 0;

                                        res.json({
                                            success: true,
                                            monto_efectivo: montoEfectivo,
                                            monto_transferencia: montoTransferencia,
                                            total_pagado: totalPago,
                                            deuda_restante: deudaRestante
                                        });
                                    }
                                );
                            }
                        );
                    })
                    .catch(err => {
                        console.error('Error en transacción de pago mixto:', err);
                        res.status(500).json({ error: 'Error procesando el pago: ' + err.message });
                    });
            }
        );
    });
});

// =========================
// ENDPOINTS DE CONTABILIDAD
// =========================

// Resumen de contabilidad
app.get('/api/contabilidad/resumen', (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');
    
    db.get(`
        SELECT 
            COUNT(DISTINCT v.id) as total_ventas,
            SUM(dv.monto) as ingresos_totales,
            SUM(CASE WHEN v.estado_pago = 'pagado' THEN dv.monto ELSE 0 END) as ingresos_pagados,
            SUM(CASE WHEN v.estado_pago = 'pendiente' THEN dv.monto ELSE 0 END) as ingresos_pendientes,
            COUNT(DISTINCT v.cliente_id) as clientes_con_ventas,
            COUNT(DISTINCT dv.producto_nombre) as productos_vendidos
        FROM detalles_venta dv
        JOIN ventas v ON dv.venta_id = v.id
    `, [], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row || {});
    });
});

// Ingresos por período (últimos 30 días)
app.get('/api/contabilidad/ingresos-periodo', (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');
    
    db.all(`
        SELECT 
            DATE(v.created_at) as fecha,
            COUNT(DISTINCT v.id) as num_ventas,
            SUM(dv.monto) as monto_total
        FROM detalles_venta dv
        JOIN ventas v ON dv.venta_id = v.id
        WHERE v.created_at >= datetime('now', '-30 days')
        GROUP BY DATE(v.created_at)
        ORDER BY fecha DESC
    `, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// Productos más vendidos
app.get('/api/contabilidad/top-productos', (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');
    
    const limit = req.query.limit || 10;
    
    db.all(`
        SELECT 
            dv.producto_nombre,
            SUM(dv.cantidad) as cantidad_total,
            SUM(dv.monto) as monto_total,
            COUNT(DISTINCT v.id) as numero_ventas,
            AVG(dv.precio_unitario) as precio_promedio
        FROM detalles_venta dv
        JOIN ventas v ON dv.venta_id = v.id
        GROUP BY dv.producto_nombre
        ORDER BY monto_total DESC
        LIMIT ?
    `, [limit], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// Clientes con más compras
app.get('/api/contabilidad/top-clientes', (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');
    
    const limit = req.query.limit || 10;
    
    db.all(`
        SELECT 
            v.cliente_nombre,
            v.cliente_id,
            COUNT(DISTINCT v.id) as numero_ventas,
            SUM(dv.monto) as monto_total,
            SUM(CASE WHEN v.estado_pago = 'pendiente' THEN dv.monto ELSE 0 END) as deuda_total
        FROM detalles_venta dv
        JOIN ventas v ON dv.venta_id = v.id
        GROUP BY v.cliente_id
        ORDER BY monto_total DESC
        LIMIT ?
    `, [limit], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// Resumen por forma de pago
app.get('/api/contabilidad/forma-pago', (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');
    
    db.all(`
        SELECT 
            v.forma_pago,
            COUNT(DISTINCT v.id) as numero_transacciones,
            SUM(dv.monto) as monto_total
        FROM detalles_venta dv
        JOIN ventas v ON dv.venta_id = v.id
        WHERE v.forma_pago != '' AND v.forma_pago IS NOT NULL
        GROUP BY v.forma_pago
        ORDER BY monto_total DESC
    `, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// Estado de pagos (pagado vs pendiente)
app.get('/api/contabilidad/estado-pagos', (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');
    
    db.all(`
        SELECT 
            v.estado_pago,
            COUNT(DISTINCT v.id) as numero_ventas,
            SUM(dv.monto) as monto_total
        FROM detalles_venta dv
        JOIN ventas v ON dv.venta_id = v.id
        GROUP BY v.estado_pago
    `, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// Deuda total pendiente
app.get('/api/contabilidad/deuda-pendiente', (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');
    
    db.all(`
        SELECT 
            v.cliente_nombre,
            v.cliente_id,
            SUM(dv.monto) as deuda_total,
            COUNT(DISTINCT v.id) as numero_ventas,
            MAX(v.created_at) as ultima_venta
        FROM detalles_venta dv
        JOIN ventas v ON dv.venta_id = v.id
        WHERE v.estado_pago = 'pendiente'
        GROUP BY v.cliente_id
        ORDER BY deuda_total DESC
    `, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
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
