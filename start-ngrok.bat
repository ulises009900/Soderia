@echo off
echo.
echo =================================================
echo    INICIANDO NGROK PARA SODERIA EN PUERTO 3000
echo =================================================
echo.
echo Asegurate de que ngrok.exe este en esta carpeta.
echo Asegurate de que el servidor (node server.js) ya este corriendo.
echo.

:: --- INSTRUCCIONES ---
:: Para usar una URL FIJA, sigue los pasos en CONEXION_REMOTA.md,
:: luego comenta la línea de URL Aleatoria y descomenta la de URL Fija.

:: OPCION 1: URL Aleatoria (cambia cada vez que se inicia)
ngrok http 3000

:: OPCION 2: URL Fija (requiere un dominio estático de tu cuenta de Ngrok)
:: ngrok http --domain=TU-DOMINIO-AQUI.ngrok-free.app 3000

pause