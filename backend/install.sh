#!/bin/bash
# Wav2Lip Backend Installation Script for Linux/macOS

echo "============================================"
echo " Wav2Lip Backend Setup - Linux/macOS"
echo "============================================"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python 3 not found. Please install Python 3.8+"
    exit 1
fi

# Create virtual environment
echo ""
echo "[1/4] Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "[2/4] Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "[3/4] Upgrading pip..."
pip install --upgrade pip

# Run setup script
echo "[4/4] Running setup..."
python setup.py

echo ""
echo "============================================"
echo " Setup Complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo "  1. Download Wav2Lip model weights"
echo "  2. Configure .env file"
echo "  3. Add avatar videos to avatars/"
echo "  4. Run: python app.py"
echo ""
