# 🚀 SODERIA - COMO CONECTARSE

## ✅ SERVIDOR ACTIVO EN PUERTO 3000 (CON ACCESO SEGURO)

Tu servidor está ejecutándose. Para conectar un dispositivo, primero deberás **iniciar sesión**.

---

## ➡️ PASO 1: INICIAR EL SERVIDOR

En tu PC, abre una terminal (PowerShell o CMD) y ejecuta:
```powershell
cd C:\Users\pc\Desktop\git\Soderia
node server.js
```

La terminal te mostrará las URLs de acceso local y remoto.

---

## ➡️ PASO 2: CONECTARSE E INICIAR SESIÓN

Ya sea desde la misma red WiFi o desde cualquier otra red (4G/5G), abre un navegador y usa la URL que te proporcionó la terminal.

### 📱 CONEXIÓN LOCAL (misma red WiFi)

1. En tu PC o Teléfono en la misma WiFi, abre cualquier navegador.
2. Busca tu IP local. En PowerShell, escribe `ipconfig` y busca la `Dirección IPv4` (ej: `192.168.1.45`).
3. En el navegador, ve a `http://[TU-IP-LOCAL]:3000`.
   - **Ejemplo:** `http://192.168.1.45:3000`

---

### 🌍 CONEXIÓN REMOTA (desde cualquier lugar con Internet)

El servidor usa **localtunnel** para crear una URL pública.

### En la terminal donde iniciaste el servidor, busca la URL pública:
```
🌍 ACCESO REMOTO (desde cualquier red 4G/5G/Wifi):
   https://lucky-dog-45.loca.lt
```

**Usa esa URL desde cualquier lugar del mundo:**
- `https://lucky-dog-45.loca.lt` (Página principal)

> **⚠️ ¡NOTA IMPORTANTE!**
> Si la URL de `localtunnel` te da **Error 503**, significa que su servicio está saturado. Usa la **SOLUCIÓN DEFINITIVA** que se explica a continuación.

---

## ✅ SOLUCIÓN DEFINITIVA: Conexión con NGROK (100% Estable)

**ngrok** es la herramienta profesional para esto. Es gratis y nunca falla.

### Paso A: Configuración (Solo se hace una vez)

1.  **Descargar ngrok:** Ve a ngrok.com/download, descarga el archivo ZIP para Windows.
2.  **Mover el archivo:** Descomprime el ZIP y mueve el archivo `ngrok.exe` a la carpeta de tu proyecto: `C:\Users\pc\Desktop\git\Soderia\`.
3.  **Conectar tu cuenta (Opcional pero recomendado):**
    *   Regístrate gratis en la web de ngrok.
    *   En su panel, copia tu "Authtoken".
    *   Abre una terminal en la carpeta Soderia y ejecuta: `.\ngrok.exe config add-authtoken TU_TOKEN_AQUI`

### Paso B: Cómo Conectarse (El uso diario)

1.  **Inicia tu servidor:** Abre una terminal y ejecuta `node server.js` como siempre. Déjala abierta.

2.  **Inicia el túnel seguro:** En la carpeta del proyecto, simplemente haz **doble clic** en el archivo `start-ngrok.bat` que creamos.

3.  **Conéctate desde tu teléfono:** Se abrirá una pantalla negra de ngrok. Copia la URL que dice `Forwarding` y que empieza por `https://` (ej: `https://random-word.ngrok-free.app`).

    ```
    Forwarding                    https://b9a8-200-51-134-78.ngrok-free.app -> http://localhost:3000
    ```

    **¡Esa es la URL que debes usar en tu teléfono con datos!** Funciona siempre.

---

### Paso 1: Inicia el servidor
```powershell
cd C:\Users\pc\Desktop\git\Soderia
npm start
```

### Paso 2: Abre en navegador (en mismo dispositivo o red)
```
http://localhost:3000
```

O si es otro dispositivo en la misma WiFi:
```
http://[tu-ip-local]:3000
```

### Paso 3: Desde otro lugar del mundo
Usa la URL que genera localtunnel (sale en la consola)

---

## 💡 REFERENCIA DE RUTAS

| Ruta | Función |
|------|---------|
| `/` | Página de inicio (elige móvil o PC) |
| `/mobile` | Interface para cargar datos |
| `/desktop` | Panel para gestionar datos |
| `/api/data` | Obtener todos los datos (JSON) |

---

## 📝 FUNCIONALIDADES

✅ Los **teléfonos** cargan:
- Texto
- Comandos
- Ubicación GPS
- URLs de imágenes

✅ Las **PCs** pueden:
- Ver todos los datos en tiempo real
- Filtrar por tipo y usuario
- Editar o eliminar datos
- Ver estadísticas

---

## 🔌 MANEJO DE USUARIOS

- Cada usuario se registra con su nombre
- El rol se asigna automáticamente (móvil/desktop)
- Los datos se sincronizan en tiempo real con WebSockets
- Se almacenan en PostgreSQL (soderia_db)

---

## 🆘 PROBLEMAS COMUNES

### "No me conecta desde otro dispositivo"
- Verifica que ambos estén en la **misma WiFi**
- Usa tu IP local, no "localhost"
- Permite el firewall de Windows si pide

### "La URL pública no funciona"
- El localtunnel solo dura mientras corre el servidor
- Reinicia `npm start` para generar nueva URL
- Asegúrate de tener internet

### "No encuentro mi IP local"
En PowerShell:
```powershell
ipconfig | findstr IPv4
```
Busca la que empieza con 192.168 o 10.0

---

## 🎯 TU CONFIGURACIÓN

- **Servidor:** `http://localhost:3000`
- **Base de datos:** PostgreSQL (soderia_db)
- **Usuarios:** Hasta 10 simultáneos
- **Actualizaciones:** En tiempo real (WebSockets)

¡Listo! Ya puedes conectar teléfonos y PCs desde cualquier lugar. 🚀
