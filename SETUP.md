# Configuración de Sodería Web App

## Acceso Remoto con ngrok

### 1. Instalar ngrok
1. Descargar desde https://ngrok.com/download
2. Crear cuenta gratuita
3. Obtener token de autenticación

### 2. Configurar Token
```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar .env y agregar tu token
NGROK_TOKEN=2abc123def456ghi789jkl...
```

### 3. Iniciar con Acceso Remoto
```bash
npm run start-ngrok
```

### 4. Compartir URL
ngrok proporcionará una URL HTTPS como:
`https://abc123.ngrok.io`

Comparte esta URL con tus vendedores para acceso remoto.

## Datos de Prueba

Usuario: `admin`
Contraseña: `admin`

## Funcionalidades Disponibles

- 📊 **Dashboard**: Vista general con estadísticas
- ⚙️ **Administración**: Gestionar clientes y productos
- 💻 **Modo PC**: Ver y editar ventas
- 📱 **Modo Móvil**: Cargar ventas rápidamente

## Solución de Problemas

### ngrok no inicia
- Verificar token en `.env`
- Verificar conexión a internet
- Verificar que ngrok esté instalado

### Base de datos
- Resetear: `rm soderia.db && npm start`
- Ver estructura: `node db-info.js`

### Acceso denegado
- Verificar sesión activa
- Intentar cerrar sesión y volver a entrar