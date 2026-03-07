# 🔗 SODERIA - Sistema de Gestión Multi-dispositivo

Una webapp completa para conectar teléfonos y PCs remotamente, permitir que móviles carguen datos y que PCs los gestionen en tiempo real.

## 📋 Requisitos

- **Node.js** (v14+)
- **PostgreSQL** (instalado y ejecutándose)
- **npm** 

## ⚙️ Configuración Inicial

### 1. Configurar PostgreSQL

**En Windows (cmd como administrador):**

```powershell
# Abrir psql
psql -U postgres

# Crear base de datos
CREATE DATABASE soderia_db;

# Conectarse a la BD
\c soderia_db

# Ejecutar el script SQL
\i 'C:/Users/pc/Desktop/git/Soderia/database.sql'

# Salir
\q
```

### 2. Configurar Variables de Entorno

Edita el archivo `.env`:

```
PORT=3000
DB_USER=postgres
DB_PASSWORD=tu_password
DB_NAME=soderia_db
DB_HOST=localhost
DB_PORT=5432
NODE_ENV=development
```

### 3. Instalar Dependencias

```powershell
npm install
```

## 🚀 Iniciar la Aplicación

```powershell
node server.js
```

La app estará disponible en: **http://localhost:3000**

## 📱 Uso

### Interfaz Móvil (`/mobile`)
- Ingresa tu nombre
- Selecciona tipo de datos (texto, comando, ubicación, imagen)
- Envía datos en tiempo real
- Ve tu historial de cargas

### Interfaz PC (`/desktop`)
- Ingresa tu nombre
- Ver todos los datos de todos los usuarios
- Filtrar por tipo de dato o usuario
- Editar o eliminar datos
- Ver estadísticas en tiempo real

## 🗂️ Estructura del Proyecto

```
Soderia/
├── server.js              # Servidor principal (Express + Socket.io)
├── config/
│   └── db.js             # Configuración de PostgreSQL
├── public/
│   ├── index.html        # Página de inicio
│   ├── mobile.html       # Interfaz móvil
│   ├── desktop.html      # Interfaz PC
│   ├── css/
│   │   └── style.css     # Estilos (responsive)
│   └── js/
│       ├── mobile.js     # Lógica del móvil
│       └── desktop.js    # Lógica del PC
├── database.sql          # Script SQL
├── .env                  # Variables de entorno
└── package.json          # Dependencias

```

## 🔧 Tecnologías

- **Backend:** Node.js, Express, Socket.io
- **Frontend:** HTML5, CSS3, JavaScript Vanilla
- **Base de Datos:** PostgreSQL
- **Comunicación:** WebSockets

## 📊 Funcionalidades

✅ Registro de usuarios con roles (móvil/desktop)
✅ Carga de datos desde móviles en tiempo real
✅ Sincronización en vivo con Socket.io
✅ Gestión de datos desde PCs (CRUD)
✅ Filtros por tipo y usuario
✅ Obtención de coordenadas GPS
✅ Diseño responsive
✅ Hasta 10 usuarios simultáneos
✅ Persistencia en PostgreSQL
✅ Estadísticas en tiempo real

## 📝 API REST

- `GET /api/data` - Obtener todos los datos
- `GET /api/data/:userId` - Obtener datos de un usuario

## 🔌 WebSocket Events

**Cliente → Servidor:**
- `register` - Registrar usuario
- `submit_data` - Enviar datos
- `delete_data` - Eliminar dato
- `update_data` - Actualizar dato

**Servidor → Cliente:**
- `user_connected` - Usuario conectado
- `user_disconnected` - Usuario desconectado
- `new_data` - Nuevo dato recibido
- `data_deleted` - Dato eliminado
- `data_updated` - Dato actualizado
- `success` - Operación exitosa
- `error` - Error en operación

## 🔒 Seguridad (futuro)

- [ ] Autenticación con JWT
- [ ] Encriptación de datos sensibles
- [ ] Rate limiting
- [ ] Validación de entrada avanzada

## 📞 Contacto

Para reportar issues o sugerencias, contacta al equipo de desarrollo.

---

**Creado con ❤️ para Soderia**
