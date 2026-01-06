@echo off
REM Script di avvio per Make it Meme - Terminal Edition (Windows)

echo 🎮 Avvio Make it Meme...
echo.

REM Controlla se Python è installato
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python non è installato!
    echo Installa Python e riprova.
    pause
    exit /b 1
)

REM Esegui il gioco
python main.py
pause
