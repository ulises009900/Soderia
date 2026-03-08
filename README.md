# Soderia Web App

Sistema completo de gestión para una soderia con Node.js, SQLite, HTML/CSS/JS.

## Características principales

- **🔐 Login Seguro**: Autenticación de administrador con sesiones
- **📱 Tres Modos de Operación**:
  - **Administración**: Gestión completa de clientes y productos
  - **Modo PC**: Visualización y edición de ventas
  - **Modo Móvil**: Carga rápida de ventas desde dispositivos móviles
- **🗄️ Base de Datos SQLite**: 9 tablas con relaciones FK para datos estructurados
- **🌐 Acceso Remoto**: Integración con ngrok para HTTPS seguro
- **📊 Gestión Completa**: CRUD completo para clientes, productos y ventas

## Estructura del proyecto

```
Soderia/
├── public/css/           # Estilos CSS (style.css, extra-style.css)
├── views/                # Páginas HTML del frontend
│   ├── login.html        # Página de login
│   ├── selector.html     # Selector de modo de operación
│   ├── admin.html        # Panel de administración
│   ├── pc.html           # Modo PC (gestión de ventas)
│   └── movil.html        # Modo móvil (carga de ventas)
├── soderia.db            # Base de datos SQLite (creada automáticamente)
├── server.js             # Servidor Express con APIs REST
├── package.json          # Dependencias y scripts
└── README.md             # Este archivo
```

## Funcionalidades por Módulo

### 🔧 Panel de Administración (`/admin`)
- **👥 Gestión de Clientes**:
  - ✅ Agregar nuevos clientes
  - ✏️ Editar datos (nombre, dirección, teléfono, email)
  - 🚫/✅ Activar/desactivar clientes
  - 🗑️ Eliminar clientes permanentemente
- **📦 Gestión de Productos**:
  - ✅ Agregar nuevos productos
  - ✏️ Editar información (nombre, descripción, precio, stock)
  - 🚫/✅ Activar/desactivar productos
  - 🗑️ Eliminar productos permanentemente

### 💻 Modo PC (`/pc`)
- 📊 Visualización de todas las ventas en tabla
- 🔍 Filtros por cliente y forma de pago
- ✏️ Editar ventas existentes
- 🗑️ Eliminar ventas
- 📈 Información completa de cada venta

### 📱 Modo Móvil (`/movil`)
- 🔍 Búsqueda inteligente de clientes
- 📦 Selector de productos (solo activos)
- ➕ Carrito de compras con múltiples productos
- 💰 Cálculo automático de totales
- 💳 Múltiples formas de pago
- 📝 Registro automático con fecha/hora

## Base de Datos

### Tablas Principales
- `users`: Credenciales de administradores
- `clientes`: Información de clientes (con campo `activo`)
- `productos`: Catálogo de productos (con campo `activo`)
- `ventas`: Cabecera de ventas
- `detalles_venta`: Detalles de productos por venta
- `pagos`: Registro de pagos
- `saldo_cliente`: Saldos pendientes por cliente
- `data_entries`: Tabla legacy para compatibilidad

### Relaciones
- Ventas → Clientes (FK)
- Detalles_Venta → Ventas (FK) y Productos (FK)
- Pagos → Clientes (FK)
- Saldo_Cliente → Clientes (FK)

## Instalación y Uso

### 1. Instalar dependencias
```bash
npm install
```

### 2. Iniciar la aplicación
```bash
# Opción 1: Servidor local
npm start

# Opción 2: Con ngrok (acceso remoto)
# Configurar token de ngrok en .env
npm run start-ngrok
```

### 3. Acceder a la aplicación
1. Abrir navegador en `http://localhost:3000`
2. Iniciar sesión con:
   - **Usuario**: `admin`
   - **Contraseña**: `admin`
3. Seleccionar el modo de operación deseado

### 4. Configuración inicial (opcional)
```bash
# Copiar archivo de configuración de ejemplo
cp .env.example .env

# Editar .env con tu token de ngrok
# NGROK_TOKEN=tu_token_aqui

# Cargar datos de ejemplo
node seed-clientes.js    # Carga 10 clientes de ejemplo
node seed-productos.js   # Carga 15 productos de ejemplo
```

## APIs REST Disponibles

### Autenticación Requerida
Todas las APIs requieren sesión activa (`req.session.loggedin`)

### Clientes
- `GET /api/clientes` - Listar todos los clientes
- `GET /api/clientes/:id` - Obtener cliente específico
- `POST /api/clientes` - Crear nuevo cliente
- `PUT /api/clientes/:id` - Actualizar cliente
- `DELETE /api/clientes/:id` - Eliminar cliente

### Productos
- `GET /api/productos` - Listar todos los productos
- `GET /api/productos/:id` - Obtener producto específico
- `POST /api/productos` - Crear nuevo producto
- `PUT /api/productos/:id` - Actualizar producto
- `DELETE /api/productos/:id` - Eliminar producto

### Ventas (Legacy)
- `GET /api/data` - Listar todas las ventas
- `POST /api/data` - Crear nueva venta
- `PUT /api/data/:id` - Actualizar venta
- `DELETE /api/data/:id` - Eliminar venta

## Estados de Clientes/Productos

Los campos `activo` permiten gestionar el ciclo de vida:
- **Activo (1)**: Visible en todas las interfaces
- **Inactivo (0)**: Oculto en modo móvil, visible en administración

## Configuración de ngrok

1. Instalar ngrok desde [ngrok.com](https://ngrok.com)
2. Obtener token de autenticación
3. Crear archivo `.env`:
```
NGROK_TOKEN=tu_token_aqui
```
4. Ejecutar: `npm run start-ngrok`

## Solución de Problemas

### Base de datos
- **Resetear DB**: Eliminar `soderia.db` y reiniciar servidor
- **Ver estructura**: `node db-info.js`

### Conexión remota
- Verificar token de ngrok en `.env`
- Revisar `CONNECT.md` para instrucciones detalladas

### Errores comunes
- **"Unauthorized"**: Verificar sesión activa
- **"Table not found"**: Reiniciar servidor para crear tablas
- **"ngrok failed"**: Verificar token y conexión a internet

## Scripts Disponibles

```bash
npm start              # Iniciar servidor local
npm run start-ngrok    # Iniciar con ngrok (requiere .env)
npm run dev           # Modo desarrollo con reinicio automático
```

## Tecnologías Utilizadas

- **Backend**: Node.js + Express.js
- **Base de Datos**: SQLite3 con sqlite3
- **Autenticación**: express-session
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Acceso Remoto**: ngrok
- **Desarrollo**: npm scripts

## Seguridad

- Sesiones HTTP seguras
- Validación de entrada en APIs
- Autenticación requerida para todas las operaciones
- HTTPS automático con ngrok

## Próximas Mejoras

- [ ] Dashboard con estadísticas
- [ ] Exportación de reportes (PDF/Excel)
- [ ] API de pagos integrada
- [ ] Notificaciones push
- [ ] Backup automático de base de datos

---

**Creado para gestionar eficientemente una soderia con operaciones desde múltiples dispositivos y ubicaciones.**
