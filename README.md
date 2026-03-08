# Soderia Web App

Sistema completo de gestión para una soderia con Node.js, **PostgreSQL 18**, HTML/CSS/JS.

## ✨ Actualización: PostgreSQL en Render

**Migración completada** de SQLite a PostgreSQL 18.

✓ BD profesional en Render
✓ Código async/await moderno  
✓ Escalable a usuarios ilimitados
✓ Backups automáticos

👉 [Ver Guía de Setup en Render](RENDER_DEPLOYMENT_STEPS.md)

## Características principales

- **🔐 Login Seguro**: Autenticación de administrador con sesiones
- **📱 Tres Modos de Operación**:
  - **Administración**: Gestión completa de clientes y productos
  - **Modo PC**: Visualización y edición de ventas
  - **Modo Móvil**: Carga rápida de ventas desde dispositivos móviles
- **🗄️ Base de Datos PostgreSQL 18**: 9 tablas con relaciones FK para datos estructurados en cloud
- **☁️ Hosting en Render**: Despliegue automático desde Git, HTTPS, BBD administrada
- **📊 Gestión Completa**: CRUD completo para clientes, productos y ventas

## Estructura del proyecto

```
Soderia/
├── public/css/                    # Estilos CSS
├── views/                         # Páginas HTML del frontend
│   ├── login.html
│   ├── selector.html
│   ├── admin.html
│   ├── pc.html
│   └── movil.html
├── db-config.js                   # ✨ Configuración PostgreSQL
├── init-postgres.js               # ✨ Inicialización automática de BD
├── server-postgres.js             # ✨ Servidor con async/await (main)
├── server.js                      # (Referencia SQLite - backup)
├── package.json                   # Dependencias y scripts
├── .env.example                   # ✨ Variables de entorno
├── render.yaml                    # ✨ Configuración Render
├── RENDER_DEPLOYMENT_STEPS.md     # ✨ Guía paso a paso
├── QUICK_START.md                 # ✨ Inicio rápido
└── README.md                      # Este archivo
```

✨ = Archivos nuevos para PostgreSQL

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

### ⚡ Inicio Rápido (Render)

**👉 [Ver instrucciones paso a paso aquí](RENDER_DEPLOYMENT_STEPS.md)**

1. Crear BD PostgreSQL en Render (2 min)
2. Configurar variable `DATABASE_URL` (1 min)
3. Push a Git → Auto-deploy (3 min)
4. ¡Listo! 🚀

### 🖥️ Desarrollo Local

#### Requisitos
- Node.js 14+
- PostgreSQL 12+ (opcional, para testing local)

#### Instalación

```bash
# 1. Clonar repositorio
git clone <tu-repo>
cd Soderia

# 2. Instalar dependencias
npm install

# 3. Crear archivo .env
cp .env.example .env

# Editar .env si usas PostgreSQL local:
# DATABASE_URL=postgresql://postgres:password@localhost:5432/soderia
```

#### Correr la aplicación

```bash
# OPCIÓN 1: Usar SQLite (server-sqlite.js - si quieres volver atrás)
npm start

# OPCIÓN 2: Usar PostgreSQL (recomendado - server-postgres.js)
# (Requiere BD PostgreSQL creada previamente)
npm run init-db   # Crear tablas
npm start         # Iniciar servidor
```

#### Cargar datos de ejemplo (opcional)

```bash
node seed-clientes.js    # 10 clientes de ejemplo
node seed-productos.js   # 15 productos de ejemplo
```

#### Acceder a la app

Abre en navegador: `http://localhost:3000`

```
Usuario: admin
Contraseña: admin
```

### 🌐 Despliegue en Render

**Pasos detallados:** [Guía completa aquí](RENDER_DEPLOYMENT_STEPS.md)

```
1. Crear BD PostgreSQL en Render
2. Obtener DATABASE_URL
3. Agregar variables de entorno
4. git push
5. ¡Listo!
```

**Estado actual:** 
✓ Código listo para Render
✓ Docker configurado
✓ Init automático de BD
✓ Solo faltan credenciales de Render

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
