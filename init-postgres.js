const pool = require('./db-config');

async function initializeDatabase() {
    const client = await pool.connect();
    try {
        console.log('Inicializando base de datos PostgreSQL...');

        // Crear tablas
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✓ Tabla users creada');

        await client.query(`
            CREATE TABLE IF NOT EXISTS clientes (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(255) UNIQUE NOT NULL,
                direccion TEXT,
                telefono VARCHAR(20),
                email VARCHAR(100),
                saldo_total DECIMAL(10,2) DEFAULT 0,
                activo INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✓ Tabla clientes creada');

        await client.query(`
            CREATE TABLE IF NOT EXISTS productos (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(255) UNIQUE NOT NULL,
                descripcion TEXT,
                precio_unitario DECIMAL(10,2) DEFAULT 0,
                stock INTEGER DEFAULT 0,
                activo INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✓ Tabla productos creada');

        await client.query(`
            CREATE TABLE IF NOT EXISTS ventas (
                id SERIAL PRIMARY KEY,
                cliente_id INTEGER NOT NULL,
                cliente_nombre VARCHAR(255) NOT NULL,
                direccion TEXT,
                total_monto DECIMAL(10,2) NOT NULL,
                forma_pago VARCHAR(50),
                estado_pago VARCHAR(50) DEFAULT 'pendiente',
                saldo_deuda DECIMAL(10,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(cliente_id) REFERENCES clientes(id)
            )
        `);
        console.log('✓ Tabla ventas creada');

        await client.query(`
            CREATE TABLE IF NOT EXISTS detalles_venta (
                id SERIAL PRIMARY KEY,
                venta_id INTEGER NOT NULL,
                producto_nombre VARCHAR(255) NOT NULL,
                cantidad INTEGER NOT NULL,
                precio_unitario DECIMAL(10,2),
                monto DECIMAL(10,2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(venta_id) REFERENCES ventas(id) ON DELETE CASCADE
            )
        `);
        console.log('✓ Tabla detalles_venta creada');

        await client.query(`
            CREATE TABLE IF NOT EXISTS pagos (
                id SERIAL PRIMARY KEY,
                cliente_id INTEGER NOT NULL,
                cliente_nombre VARCHAR(255) NOT NULL,
                monto DECIMAL(10,2) NOT NULL,
                forma_pago VARCHAR(50),
                referencia VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(cliente_id) REFERENCES clientes(id)
            )
        `);
        console.log('✓ Tabla pagos creada');

        await client.query(`
            CREATE TABLE IF NOT EXISTS saldo_cliente (
                id SERIAL PRIMARY KEY,
                cliente_id INTEGER UNIQUE NOT NULL,
                cliente_nombre VARCHAR(255) NOT NULL,
                monto_deuda DECIMAL(10,2) DEFAULT 0,
                monto_pagado DECIMAL(10,2) DEFAULT 0,
                saldo_pendiente DECIMAL(10,2) DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(cliente_id) REFERENCES clientes(id)
            )
        `);
        console.log('✓ Tabla saldo_cliente creada');

        await client.query(`
            CREATE TABLE IF NOT EXISTS pagos_deuda (
                id SERIAL PRIMARY KEY,
                cliente_id INTEGER NOT NULL,
                cliente_nombre VARCHAR(255) NOT NULL,
                monto_pago DECIMAL(10,2) NOT NULL,
                forma_pago VARCHAR(50),
                observaciones TEXT,
                fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(cliente_id) REFERENCES clientes(id)
            )
        `);
        console.log('✓ Tabla pagos_deuda creada');

        await client.query(`
            CREATE TABLE IF NOT EXISTS data_entries (
                id SERIAL PRIMARY KEY,
                cliente_id INTEGER,
                cliente_nombre VARCHAR(255) NOT NULL,
                direccion TEXT,
                producto VARCHAR(255) NOT NULL,
                cantidad INTEGER NOT NULL,
                monto DECIMAL(10,2) NOT NULL,
                saldo DECIMAL(10,2) DEFAULT 0,
                forma_pago VARCHAR(50),
                pagado INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(cliente_id) REFERENCES clientes(id)
            )
        `);
        console.log('✓ Tabla data_entries creada');

        // Crear índices para mejor rendimiento
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON clientes(nombre)
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_clientes_activo ON clientes(activo)
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_ventas_cliente ON ventas(cliente_id)
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_ventas_created ON ventas(created_at)
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_detalles_venta ON detalles_venta(venta_id)
        `);
        console.log('✓ Índices creados');

        // Insertar usuario admin si no existe
        const adminResult = await client.query(
            'SELECT id FROM users WHERE username = $1',
            ['admin']
        );

        if (adminResult.rows.length === 0) {
            await client.query(
                'INSERT INTO users (username, password, role) VALUES ($1, $2, $3)',
                ['admin', 'admin', 'admin']
            );
            console.log('✓ Usuario admin creado (admin/admin)');
        } else {
            console.log('✓ Usuario admin ya existe');
        }

        console.log('\n✅ Base de datos inicializada correctamente');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error inicializando base de datos:', error.message);
        process.exit(1);
    } finally {
        client.release();
    }
}

initializeDatabase().catch(err => {
    console.error(err);
    process.exit(1);
});
