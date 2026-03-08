-- Crear base de datos
CREATE DATABASE soderia_db;
-- Conectarse a la base de datos
\ c soderia_db -- Tabla de usuarios (para autenticación)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'mobile', 'desktop')),
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);
-- Insertar usuario admin por defecto
-- Password: admin123 (hasheado con bcrypt)
INSERT INTO users (username, password_hash, role)
VALUES (
    'admin',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'admin'
  );
-- Tabla principal de datos
CREATE TABLE data_entries (
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
-- Índices para mejor rendimiento
CREATE INDEX idx_user_id ON data_entries(user_id);
CREATE INDEX idx_username ON data_entries(username);
CREATE INDEX idx_data_type ON data_entries(data_type);
CREATE INDEX idx_created_at ON data_entries(created_at DESC);
-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trigger_update_updated_at BEFORE
UPDATE ON data_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at();