@echo off
echo Installing PyTorch with CUDA support...
echo.
echo Uninstalling CPU version...
pip uninstall -y torch torchvision torchaudio

echo.
echo Installing CUDA 12.1 version (most common)...
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

echo.
echo Verifying installation...
python -c "import torch; print('PyTorch version:', torch.__version__); print('CUDA available:', torch.cuda.is_available()); print('CUDA version:', torch.version.cuda if torch.cuda.is_available() else 'N/A')"

echo.
echo Done! If CUDA is still not available, you may need to:
echo 1. Install NVIDIA CUDA Toolkit from https://developer.nvidia.com/cuda-downloads
echo 2. Update your NVIDIA GPU drivers
echo 3. Try CUDA 11.8 version: pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
pause
