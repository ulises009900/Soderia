const { Pool } = require('pg');
const fs = require('fs');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function initDatabase() {
  console.log('🔄 Inicializando base de datos Soderia...');

  // Pedir contraseña si no está configurada
  const password = process.env.DB_PASSWORD || 'postgres';

  // Conectar sin especificar base de datos
  const pool = new Pool({
    user: process.env.DB_USER,
    password: password,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: 'postgres'
  });

  try {
    // Probar conexión
    await pool.query('SELECT 1');
    console.log('✅ Conexión a PostgreSQL exitosa');

    // Eliminar BD si existe
    await pool.query('DROP DATABASE IF EXISTS soderia_db');
    console.log('🗑️  Base de datos anterior eliminada');

    // Crear BD
    await pool.query('CREATE DATABASE soderia_db');
    console.log('✅ Base de datos soderia_db creada');

    // Cerrar conexión y reconectar a la nueva BD
    await pool.end();

    const newPool = new Pool({
      user: process.env.DB_USER,
      password: password,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: 'soderia_db'
    });

    // Crear tabla de usuarios
    await newPool.query(`
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
    await newPool.query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)',
      ['admin', hashedPassword, 'admin']
    );
    console.log('✅ Usuario admin creado (usuario: admin, password: admin123)');

    // Crear tabla de datos
    await newPool.query(`
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
    await newPool.query('CREATE INDEX idx_user_id ON data_entries(user_id)');
    await newPool.query('CREATE INDEX idx_username ON data_entries(username)');
    await newPool.query('CREATE INDEX idx_data_type ON data_entries(data_type)');
    await newPool.query('CREATE INDEX idx_created_at ON data_entries(created_at DESC)');
    console.log('✅ Índices creados');

    // Crear trigger para updated_at
    await newPool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await newPool.query(`
      CREATE TRIGGER trigger_update_updated_at
      BEFORE UPDATE ON data_entries
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at()
    `);
    console.log('✅ Trigger creado');

    await newPool.end();
    console.log('');
    console.log('🎉 ¡Base de datos inicializada correctamente!');
    console.log('');
    console.log('👤 Usuario admin creado:');
    console.log('   Usuario: admin');
    console.log('   Password: admin123');
    console.log('');
    console.log('🚀 Ahora puedes ejecutar: npm start');

  } catch (err) {
    console.error('❌ Error inicializando BD:', err.message);
    console.log('');
    console.log('💡 Posibles soluciones:');
    console.log('   1. Asegúrate de que PostgreSQL esté ejecutándose');
    console.log('   2. Verifica la contraseña en el archivo .env');
    console.log('   3. Si no tienes contraseña, deja DB_PASSWORD vacío');
    process.exit(1);
  }
}

initDatabase();

