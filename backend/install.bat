@echo off
REM Wav2Lip Backend Installation Script for Windows
echo ============================================
echo  Wav2Lip Backend Setup - Windows
echo ============================================

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Please install Python 3.8+
    exit /b 1
)

REM Create virtual environment
echo.
echo [1/4] Creating virtual environment...
python -m venv venv

REM Activate virtual environment
echo [2/4] Activating virtual environment...
call venv\Scripts\activate.bat

REM Upgrade pip
echo [3/4] Upgrading pip...
python -m pip install --upgrade pip

REM Run setup script
echo [4/4] Running setup...
python setup.py

echo.
echo ============================================
echo  Setup Complete!
echo ============================================
echo.
echo Next steps:
echo   1. Download Wav2Lip model weights
echo   2. Configure .env file
echo   3. Add avatar videos to avatars/
echo   4. Run: python app.py
echo.
pause
