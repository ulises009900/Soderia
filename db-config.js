const { Pool } = require('pg');
require('dotenv').config();

// Construir la URL de conexión desde variables de entorno
let pool;
const isProduction = process.env.NODE_ENV === 'production';
const isRender = process.env.RENDER === 'true' ||
    Boolean(process.env.RENDER_SERVICE_ID) ||
    Boolean(process.env.RENDER_EXTERNAL_HOSTNAME);
const directDatabaseUrl = (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.RENDER_DATABASE_URL ||
    ''
).trim();

function buildConnectionStringFromParts() {
    const user = (process.env.PGUSER || process.env.DB_USER || '').trim();
    const password = (process.env.PGPASSWORD || process.env.DB_PASSWORD || '').trim();
    const host = (process.env.PGHOST || process.env.DB_HOST || '').trim();
    const port = (process.env.PGPORT || process.env.DB_PORT || '5432').trim();
    const database = (process.env.PGDATABASE || process.env.DB_NAME || '').trim();

    if (!user || !host || !database) {
        return '';
    }

    const encodedUser = encodeURIComponent(user);
    const encodedPassword = encodeURIComponent(password);
    const auth = password ? `${encodedUser}:${encodedPassword}` : encodedUser;
    return `postgresql://${auth}@${host}:${port}/${database}`;
}

const databaseUrl = directDatabaseUrl || buildConnectionStringFromParts();
const hasDatabaseUrl = databaseUrl.length > 0;

function buildSslConfig() {
    const sslMode = (process.env.PGSSLMODE || '').toLowerCase();
    if (sslMode === 'disable') return false;
    if (sslMode === 'no-verify') return { rejectUnauthorized: false };

    // Por defecto en Render/produccion usamos SSL tolerante para certificados administrados.
    if (isRender || isProduction) return { rejectUnauthorized: false };

    return false;
}

if (hasDatabaseUrl) {
    const ssl = buildSslConfig();
    pool = new Pool({
        connectionString: databaseUrl,
        ssl
    });
    try {
        const host = new URL(databaseUrl).hostname;
        console.log(`DB config: usando URL para host ${host}`);
    } catch {
        console.log('DB config: usando URL de conexion');
    }
} else {
    if (isProduction || isRender) {
        console.error('Falta URL de PostgreSQL en Render/produccion (DATABASE_URL/POSTGRES_URL o PG*).');
        process.exit(1);
    }

    // En desarrollo local
    pool = new Pool({
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        host: process.env.DB_HOST || '127.0.0.1',
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
