@echo off
chcp 65001 >nul
title AcordesPro

set FRONTEND=C:\Users\CHELO\ACORDES\frontend
set SCRAPER=C:\Users\CHELO\ACORDES-ESPECIAL\scraper

:: Verificar dependencias frontend
if not exist "%FRONTEND%\node_modules" (
    echo Instalando dependencias del frontend...
    cd /d "%FRONTEND%"
    call npm install
)

:: Verificar dependencias scraper
if not exist "%SCRAPER%\node_modules" (
    echo Instalando dependencias del scraper...
    cd /d "%SCRAPER%"
    call npm install
    call npx playwright install chromium
)

echo.
echo  Iniciando AcordesPro...
echo.

:: Iniciar scraper
start "Scraper Cifraclub" cmd /k "cd /d %SCRAPER% && node server.js"
timeout /t 2 /nobreak >nul

:: Iniciar frontend
start "AcordesPro Frontend" cmd /k "cd /d %FRONTEND% && npm run dev"

:: Esperar hasta que el frontend esté listo (máx 60 seg)
echo  Esperando que el frontend inicie...
powershell -Command "$puerto = $null; $puertos = @(5173,5174,5175); $fin = (Get-Date).AddSeconds(60); while((Get-Date) -lt $fin){ foreach($p in $puertos){ try{ $tcp = New-Object System.Net.Sockets.TcpClient; $tcp.Connect('localhost',$p); $tcp.Close(); $puerto = $p; break }catch{} }; if($puerto){ break }; Start-Sleep -Seconds 1 }; if($puerto){ Start-Process \"http://localhost:$puerto\" }else{ Write-Host 'No se pudo detectar el puerto. Abriendo 5173 por defecto...'; Start-Process 'http://localhost:5173' }"

echo.
echo  Todo iniciado. Podes cerrar esta ventana.
pause
