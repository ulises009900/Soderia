# 📡 Conexión Remota con Ngrok

Este documento explica cómo exponer tu aplicación Soderia a Internet usando ngrok,
pasando por alto la red local y permitiendo que teléfonos y PCs se conecten desde
cualquier lugar.

---

## 🔧 Preparar ngrok

1. Visita https://ngrok.com y crea una cuenta gratuita.
2. En el panel de ngrok copia tu **authtoken**.
3. Abre el archivo `.env` en la raíz del proyecto y añade:

   ```env
   NGROK_TOKEN=tu_authtoken_aqui
   ```

   Si omites este paso, ngrok seguirá funcionando pero la URL cambiará en cada
   reinicio y no podrás usar subdominios personalizados.

4. Instala el paquete de Node.js (ya se hizo anteriormente):

   ```bash
   npm install ngrok
   ```

5. (Opcional) descarga `ngrok.exe` y colócalo en la carpeta del proyecto para usar
   el archivo por lotes `start-ngrok.bat` (ya incluido).

---

## 🚀 Iniciar el servidor con ngrok integrado

En la terminal, ve a la carpeta `Soderia` y ejecuta:

```powershell
npm start
```

El script `start.js` arranca el servidor HTTP y, justo después, lanza ngrok.
En la salida verás algo como esto:

```
📱 Acceso local: http://192.168.1.26:3000
📱 Móvil: http://192.168.1.26:3000/mobile
💻 PC: http://192.168.1.26:3000/desktop

🌍 Acceso remoto seguro a través de ngrok:
   https://abcd-1234.ngrok-free.app
   https://abcd-1234.ngrok-free.app/mobile
   https://abcd-1234.ngrok-free.app/desktop
   (Puedes definir NGROK_TOKEN en .env para usar tu cuenta y conservar la URL)
```

Comparte cualquiera de esas URLs con un dispositivo fuera de tu red WiFi
(4G/5G o red diferente). La conexión será en **HTTPS cifrado**.


## 📝 Adicionales

- Si necesitas una URL fija, crea un subdominio en tu cuenta ngrok y especifica
  `--domain=myname.ngrok-free.app` en el archivo `start-ngrok.bat` o en la
  llamada a `ngrok.connect`.

- Para detener ngrok presiona `CTRL+C` en la consola.

- Puedes combinar nginx o cualquier reverse proxy si prefieres no depender de
  ngrok, pero la configuración ya incluida es suficiente para pruebas.

---

Con esto tu aplicación puede ser accedida de forma segura desde **cualquier red**,
directamente desde tu teléfono o PC sin complicaciones de NAT o firewall.
