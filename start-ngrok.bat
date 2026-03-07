@echo off
echo.
echo =================================================
echo    INICIANDO NGROK PARA SODERIA EN PUERTO 3000
echo =================================================
echo.
echo Asegurate de que ngrok.exe este en esta carpeta.
echo Asegurate de que el servidor (node server.js) ya este corriendo.
echo.

ngrok http 3000

pause