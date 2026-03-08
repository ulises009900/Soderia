const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function initDatabase() {
  console.log('🔄 Verificando base de datos Soderia...');

  // Intentar conectar a soderia_db directamente
  const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: 'soderia_db'
  });

  try {
    // Probar conexión
    await pool.query('SELECT 1');
    console.log('✅ Conexión a soderia_db exitosa');

    // Verificar si las tablas existen
    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('users', 'data_entries')
    `);

    const existingTables = tablesResult.rows.map(row => row.table_name);

    if (existingTables.includes('users') && existingTables.includes('data_entries')) {
      console.log('✅ Tablas ya existen');

      // Verificar si el usuario admin existe
      const adminResult = await pool.query("SELECT id FROM users WHERE username = 'admin'");
      if (adminResult.rows.length > 0) {
        console.log('✅ Usuario admin ya existe');
      } else {
        // Crear usuario admin
        const adminPassword = 'admin123';
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

        await pool.query(
          'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)',
          ['admin', hashedPassword, 'admin']
        );
        console.log('✅ Usuario admin creado (usuario: admin, password: admin123)');
      }
    } else {
      console.log('📝 Creando tablas...');

      // Crear tabla de usuarios
      await pool.query(`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'mobile', 'desktop')),
          created_at TIMESTAMP DEFAULT NOW(),
          last_login TIMESTAMP
        )
      `);
      console.log('✅ Tabla users creada');

      // Crear hash de la contraseña admin
      const adminPassword = 'admin123';
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

      // Insertar usuario admin
      await pool.query(
        'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)',
        ['admin', hashedPassword, 'admin']
      );
      console.log('✅ Usuario admin creado (usuario: admin, password: admin123)');

      // Crear tabla de datos
      await pool.query(`
        CREATE TABLE data_entries (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          username VARCHAR(50) NOT NULL,
          data_type VARCHAR(50) NOT NULL CHECK (data_type IN ('text', 'command', 'location', 'image')),
          content TEXT NOT NULL,
          coordinates JSONB,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('✅ Tabla data_entries creada');

      // Crear índices
      await pool.query('CREATE INDEX idx_user_id ON data_entries(user_id)');
      await pool.query('CREATE INDEX idx_username ON data_entries(username)');
      await pool.query('CREATE INDEX idx_data_type ON data_entries(data_type)');
      await pool.query('CREATE INDEX idx_created_at ON data_entries(created_at DESC)');
      console.log('✅ Índices creados');

      // Crear trigger para updated_at
      await pool.query(`
        CREATE OR REPLACE FUNCTION update_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
      `);

      await pool.query(`
        CREATE TRIGGER trigger_update_updated_at
        BEFORE UPDATE ON data_entries
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at()
      `);
      console.log('✅ Trigger creado');
    }

    await pool.end();
    console.log('');
    console.log('🎉 ¡Base de datos lista!');
    console.log('');
    console.log('👤 Credenciales de admin:');
    console.log('   Usuario: admin');
    console.log('   Password: admin123');
    console.log('');
    console.log('🚀 Ejecuta: npm start');

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.log('');
    console.log('💡 Soluciones:');
    console.log('   1. Asegúrate de que PostgreSQL esté ejecutándose');
    console.log('   2. Crea la BD manualmente: CREATE DATABASE soderia_db;');
    console.log('   3. O ejecuta el script setup-manual.sql en pgAdmin');
    process.exit(1);
  }
}

initDatabase();