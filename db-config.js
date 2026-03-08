const { Pool } = require('pg');
require('dotenv').config();

// Construir la URL de conexión desde variables de entorno
let pool;

if (process.env.DATABASE_URL) {
    // En Render, usar DATABASE_URL directamente
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false // Necesario para Render
        }
    });
} else {
    // En desarrollo local
    pool = new Pool({
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'soderia'
    });
}

// Manejo de errores de conexión
pool.on('error', (err) => {
    console.error('Error inesperado en el pool de conexión', err);
    process.exit(-1);
});

module.exports = pool;
