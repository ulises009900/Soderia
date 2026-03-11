const { Pool } = require('pg');
require('dotenv').config();

// Construir la URL de conexión desde variables de entorno
let pool;
const isProduction = process.env.NODE_ENV === 'production';
const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

if (hasDatabaseUrl) {
    // En Render, usar DATABASE_URL directamente
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false // Necesario para Render
        }
    });
    console.log('DB config: usando DATABASE_URL');
} else {
    if (isProduction) {
        console.error('Falta DATABASE_URL en produccion. Configura esta variable en Render.');
        process.exit(1);
    }

    // En desarrollo local
    pool = new Pool({
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'soderia'
    });
    console.log('DB config: usando variables locales DB_HOST/DB_PORT/DB_NAME');
}

// Manejo de errores de conexión
pool.on('error', (err) => {
    console.error('Error inesperado en el pool de conexión', err);
    process.exit(-1);
});

module.exports = pool;
