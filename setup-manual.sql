-- Script SQL para inicializar Soderia
-- Ejecuta esto en pgAdmin o psql
-- 1. Crear base de datos (si no existe)
CREATE DATABASE IF NOT EXISTS soderia_db;
-- 2. Conectarse a la base de datos
-- En psql: \c soderia_db
-- En pgAdmin: selecciona la BD soderia_db
-- 3. Crear tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'mobile', 'desktop')),
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);
-- 4. Insertar usuario admin (password: admin123)
-- Hash generado con bcrypt: $2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
INSERT INTO users (username, password_hash, role)
VALUES (
    'admin',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'admin'
  ) ON CONFLICT (username) DO NOTHING;
-- 5. Crear tabla de datos
CREATE TABLE IF NOT EXISTS data_entries (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  username VARCHAR(50) NOT NULL,
  data_type VARCHAR(50) NOT NULL CHECK (
    data_type IN ('text', 'command', 'location', 'image')
  ),
  content TEXT NOT NULL,
  coordinates JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
-- 6. Crear índices
CREATE INDEX IF NOT EXISTS idx_user_id ON data_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_username ON data_entries(username);
CREATE INDEX IF NOT EXISTS idx_data_type ON data_entries(data_type);
CREATE INDEX IF NOT EXISTS idx_created_at ON data_entries(created_at DESC);
-- 7. Crear función y trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_update_updated_at ON data_entries;
CREATE TRIGGER trigger_update_updated_at BEFORE
UPDATE ON data_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at();
-- Verificar que todo esté creado
SELECT 'Usuarios:' as info,
  COUNT(*) as count
FROM users
UNION ALL
SELECT 'Datos:',
  COUNT(*)
FROM data_entries;