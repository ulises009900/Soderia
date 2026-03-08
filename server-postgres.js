const express = require('express');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');
const pool = require('./db-config');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const sessionSecret = process.env.SESSION_SECRET || 'supersecretkey';

// Setup session middleware
app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Body parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Initialize database (crear tabla si no existe)
async function initializeDBConnection() {
    try {
        const result = await pool.query('SELECT NOW()');
        console.log('✓ Connected to PostgreSQL database');
    } catch (err) {
        console.error('✗ Failed to connect to PostgreSQL:', err.message);
        process.exit(1);
    }
}

initializeDBConnection();

// Routes
app.get('/', (req, res) => {
    if (req.session.loggedin) {
        res.redirect('/selector');
    } else {
        res.sendFile(path.join(__dirname, 'views', 'login.html'));
    }
});

app.post('/login', async (req, res) => {
    try {
        const username = req.body.username;
        const password = req.body.password;
        
        if (username && password) {
            const result = await pool.query(
                'SELECT * FROM users WHERE username = $1 AND password = $2',
                [username, password]
            );
            
            if (result.rows.length > 0) {
                req.session.loggedin = true;
                req.session.username = username;
                res.redirect('/selector');
            } else {
                res.send('Incorrect Username and/or Password!');
            }
        } else {
            res.send('Please enter Username and Password!');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Error on the server.');
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
app.get('/api/data', async (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');
    try {
        const result = await pool.query(`
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
        `);
        
        const data = result.rows.map(r => ({
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
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/data', async (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');
    try {
        const { cliente_id, cliente_nombre, direccion, producto, cantidad, monto, forma_pago, pagado } = req.body;
        
        const estado_pago = pagado ? 'pagado' : 'pendiente';
        const saldo_deuda = pagado ? 0 : monto;
        
        // Insert venta
        const ventaResult = await pool.query(
            `INSERT INTO ventas (cliente_id, cliente_nombre, direccion, total_monto, forma_pago, estado_pago, saldo_deuda) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [cliente_id || null, cliente_nombre, direccion, monto, forma_pago, estado_pago, saldo_deuda]
        );
        
        const ventaId = ventaResult.rows[0].id;
        const precio_unitario = cantidad > 0 ? monto / cantidad : 0;
        
        // Insert detalle_venta
        const detalleResult = await pool.query(
            `INSERT INTO detalles_venta (venta_id, producto_nombre, cantidad, precio_unitario, monto)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [ventaId, producto, cantidad, precio_unitario, monto]
        );
        
        res.json({ id: detalleResult.rows[0].id, venta_id: ventaId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Clientes API
app.get('/api/clientes', async (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');
    try {
        const search = req.query.q || '';
        let result;
        
        if (search) {
            result = await pool.query(
                'SELECT * FROM clientes WHERE nombre ILIKE $1 ORDER BY nombre',
                [`%${search}%`]
            );
        } else {
            result = await pool.query('SELECT * FROM clientes ORDER BY nombre');
        }
        
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/clientes/:id', async (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');
    try {
        const result = await pool.query('SELECT * FROM clientes WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/clientes', async (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');
    try {
        const { nombre, direccion, telefono, email } = req.body;
        const result = await pool.query(
            `INSERT INTO clientes (nombre, direccion, telefono, email) 
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [nombre, direccion, telefono, email]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/clientes/:id', async (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');
    try {
        const id = req.params.id;
        const { nombre, direccion, telefono, email, activo } = req.body;
        const result = await pool.query(
            `UPDATE clientes SET nombre = $1, direccion = $2, telefono = $3, email = $4, activo = $5, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $6 RETURNING *`,
            [nombre, direccion, telefono, email, activo ? 1 : 0, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/clientes/:id', async (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');
    try {
        const result = await pool.query('DELETE FROM clientes WHERE id = $1', [req.params.id]);
        res.json({ deleted: result.rowCount });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Deuda API
app.get('/api/deuda/:cliente_id', async (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');
    try {
        const result = await pool.query(
            `SELECT SUM(dv.monto) as deuda_total, MAX(v.created_at) as ultima_venta
             FROM detalles_venta dv
             JOIN ventas v ON dv.venta_id = v.id
             WHERE v.cliente_id = $1 AND v.estado_pago = 'pendiente'`,
            [req.params.cliente_id]
        );

        const row = result.rows[0];
        const deuda = row && row.deuda_total ? parseFloat(row.deuda_total) : 0;
        const ultima_actualizacion = row && row.ultima_venta ? row.ultima_venta : new Date().toISOString();

        res.json({
            deuda: deuda,
            ultima_actualizacion: ultima_actualizacion
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Historial de Pagos
app.get('/api/historial-pagos', async (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');
    try {
        const cliente = req.query.cliente || '';
        const fechaDesde = req.query.fecha_desde || '';
        const fechaHasta = req.query.fecha_hasta || '';

        let query = 'SELECT * FROM pagos_deuda WHERE 1=1';
        const params = [];
        let paramCount = 1;

        if (cliente) {
            query += ` AND cliente_nombre ILIKE $${paramCount}`;
            params.push(`%${cliente}%`);
            paramCount++;
        }

        if (fechaDesde) {
            query += ` AND DATE(fecha_pago) >= $${paramCount}`;
            params.push(fechaDesde);
            paramCount++;
        }

        if (fechaHasta) {
            query += ` AND DATE(fecha_pago) <= $${paramCount}`;
            params.push(fechaHasta);
            paramCount++;
        }

        query += ' ORDER BY fecha_pago DESC LIMIT 500';

        const result = await pool.query(query, params);
        const rows = result.rows;
        
        const totalPagos = rows ? rows.length : 0;
        const totalMonto = rows ? rows.reduce((sum, p) => sum + parseFloat(p.monto_pago), 0) : 0;

        res.json({
            pagos: rows || [],
            total_pagos: totalPagos,
            total_pagado: totalMonto.toFixed(2)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Ventas pendientes
app.get('/api/ventas-pendientes/:cliente_id', async (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');
    try {
        const result = await pool.query(
            `SELECT v.id as venta_id, dv.producto_nombre as producto, dv.cantidad, dv.monto, v.created_at as fecha
             FROM detalles_venta dv
             JOIN ventas v ON dv.venta_id = v.id
             WHERE v.cliente_id = $1 AND v.estado_pago = 'pendiente'
             ORDER BY v.created_at ASC`,
            [req.params.cliente_id]
        );
        
        res.json({ 
            ventas: result.rows || [],
            total_ventas: result.rows ? result.rows.length : 0
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Registrar Pago - Completa
app.post('/api/pagar-deuda-completa', async (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');
    try {
        const { cliente_id, forma_pago, observaciones } = req.body;

        if (!cliente_id) {
            return res.status(400).json({ error: 'Cliente requerido' });
        }

        // Validar cliente existe
        const clienteResult = await pool.query('SELECT id, nombre FROM clientes WHERE id = $1', [cliente_id]);
        if (clienteResult.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        const clienteNombre = clienteResult.rows[0].nombre;

        // Obtener deuda total
        const deudaResult = await pool.query(
            `SELECT SUM(dv.monto) as deuda_total
             FROM detalles_venta dv
             JOIN ventas v ON dv.venta_id = v.id
             WHERE v.cliente_id = $1 AND v.estado_pago = 'pendiente'`,
            [cliente_id]
        );

        const deudaTotal = deudaResult.rows[0] && deudaResult.rows[0].deuda_total ? 
            parseFloat(deudaResult.rows[0].deuda_total) : 0;

        if (deudaTotal <= 0) {
            return res.status(400).json({ error: 'El cliente no tiene deuda pendiente' });
        }

        // Validar forma de pago
        if (!forma_pago || forma_pago.trim() === '') {
            return res.status(400).json({ error: 'Forma de pago requerida' });
        }

        const fechaPago = new Date().toISOString();

        // Actualizar ventas como pagadas
        await pool.query(
            'UPDATE ventas SET estado_pago = $1, saldo_deuda = 0 WHERE cliente_id = $2 AND estado_pago = $3',
            ['pagado', cliente_id, 'pendiente']
        );

        // Registrar pago
        await pool.query(
            `INSERT INTO pagos_deuda (cliente_id, cliente_nombre, monto_pago, forma_pago, observaciones, fecha_pago)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [cliente_id, clienteNombre, deudaTotal, forma_pago, observaciones || '', fechaPago]
        );

        res.json({
            success: true,
            monto_pagado: deudaTotal,
            deuda_restante: 0
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Productos API
app.get('/api/productos', async (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');
    try {
        const search = req.query.q || '';
        let result;
        
        if (search) {
            result = await pool.query(
                'SELECT * FROM productos WHERE nombre ILIKE $1 ORDER BY nombre',
                [`%${search}%`]
            );
        } else {
            result = await pool.query('SELECT * FROM productos ORDER BY nombre');
        }
        
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/productos/:id', async (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');
    try {
        const result = await pool.query('SELECT * FROM productos WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/productos', async (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');
    try {
        const { nombre, descripcion, precio_unitario, stock } = req.body;
        const result = await pool.query(
            `INSERT INTO productos (nombre, descripcion, precio_unitario, stock) 
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [nombre, descripcion || '', precio_unitario || 0, stock || 0]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/productos/:id', async (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');
    try {
        const id = req.params.id;
        const { nombre, descripcion, precio_unitario, stock, activo } = req.body;
        const result = await pool.query(
            `UPDATE productos SET nombre = $1, descripcion = $2, precio_unitario = $3, stock = $4, activo = $5, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $6 RETURNING *`,
            [nombre, descripcion, precio_unitario, stock, activo ? 1 : 0, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/productos/:id', async (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');
    try {
        const result = await pool.query('DELETE FROM productos WHERE id = $1', [req.params.id]);
        res.json({ deleted: result.rowCount });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Ventas API
app.post('/api/ventas', async (req, res) => {
    if (!req.session.loggedin) return res.status(401).send('Unauthorized');
    try {
        const { cliente_id, cliente_nombre, direccion, productos, forma_pago, pagado } = req.body;
        
        if (!productos || productos.length === 0) {
            return res.status(400).json({ error: 'Debe incluir al menos un producto' });
        }
        
        const estado_pago = pagado ? 'pagado' : 'pendiente';
        const total_monto = productos.reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0);
        const saldo_deuda = pagado ? 0 : total_monto;
        
        // Insert venta
        const ventaResult = await pool.query(
            `INSERT INTO ventas (cliente_id, cliente_nombre, direccion, total_monto, forma_pago, estado_pago, saldo_deuda) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [cliente_id || null, cliente_nombre, direccion, total_monto, forma_pago, estado_pago, saldo_deuda]
        );
        
        const ventaId = ventaResult.rows[0].id;
        let completados = 0;
        
        // Insertar cada producto
        for (const producto of productos) {
            const cantidad = parseFloat(producto.cantidad) || 1;
            const monto = parseFloat(producto.monto) || 0;
            const precio_unitario = cantidad > 0 ? monto / cantidad : 0;
            
            await pool.query(
                `INSERT INTO detalles_venta (venta_id, producto_nombre, cantidad, precio_unitario, monto)
                 VALUES ($1, $2, $3, $4, $5)`,
                [ventaId, producto.producto, cantidad, precio_unitario, monto]
            );
            completados++;
        }
        
        res.json({ id: ventaId, productos_guardados: completados });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log(`Navigate to http://localhost:${port} in your browser`);
});
