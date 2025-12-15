#!/usr/bin/env python3
"""
Wav2Lip Backend Setup Script
Sets up the Python environment for Wav2Lip video generation
"""

import os
import sys
import subprocess
import platform
from pathlib import Path

def run_command(cmd, description, check=True):
    """Run a shell command with error handling"""
    print(f"\n{'='*60}")
    print(f"[SETUP] {description}")
    print(f"{'='*60}")
    print(f"Running: {cmd}")
    
    result = subprocess.run(cmd, shell=True, capture_output=False)
    if check and result.returncode != 0:
        print(f"[ERROR] Failed: {description}")
        return False
    return True

def check_python_version():
    """Ensure Python 3.8+ is installed"""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print(f"[ERROR] Python 3.8+ required. Found: {version.major}.{version.minor}")
        return False
    print(f"[OK] Python version: {version.major}.{version.minor}.{version.micro}")
    return True

def check_gpu():
    """Check for CUDA GPU availability"""
    try:
        import torch
        if torch.cuda.is_available():
            gpu_name = torch.cuda.get_device_name(0)
            print(f"[OK] CUDA GPU detected: {gpu_name}")
            return True
        else:
            print("[WARN] No CUDA GPU detected. Wav2Lip will run on CPU (slower)")
            return False
    except ImportError:
        print("[INFO] PyTorch not installed yet. GPU check will run after installation.")
        return None

def create_directories():
    """Create required directory structure"""
    dirs = [
        "models/wav2lip",
        "models/fomm",
        "models/whisper",
        "temp/audio",
        "temp/video",
        "temp/frames",
        "output/videos",
        "output/transcripts",
        "avatars",
        "logs"
    ]
    
    for d in dirs:
        Path(d).mkdir(parents=True, exist_ok=True)
        print(f"[OK] Created directory: {d}")
    
    return True

def install_dependencies():
    """Install Python dependencies"""
    # Upgrade pip first
    run_command(
        f"{sys.executable} -m pip install --upgrade pip",
        "Upgrading pip"
    )
    
    # Install PyTorch with CUDA support
    system = platform.system()
    if system == "Windows":
        torch_cmd = f"{sys.executable} -m pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121"
    else:
        torch_cmd = f"{sys.executable} -m pip install torch torchvision torchaudio"
    
    run_command(torch_cmd, "Installing PyTorch with CUDA support")
    
    # Install other requirements
    run_command(
        f"{sys.executable} -m pip install -r requirements.txt",
        "Installing Python dependencies"
    )
    
    return True

def download_wav2lip_model():
    """Download Wav2Lip pretrained model"""
    model_path = Path("models/wav2lip/wav2lip_gan.pth")
    
    if model_path.exists():
        print(f"[OK] Wav2Lip model already exists: {model_path}")
        return True
    
    print("[INFO] Wav2Lip model needs to be downloaded manually.")
    print("       Download from: https://github.com/Rudrabha/Wav2Lip")
    print(f"       Place in: {model_path}")
    
    # Create placeholder file with instructions
    model_path.parent.mkdir(parents=True, exist_ok=True)
    with open(model_path.parent / "README.md", "w") as f:
        f.write("""# Wav2Lip Models

Download the following models and place them in this directory:

1. **wav2lip_gan.pth** - Main Wav2Lip GAN model
   - Download from: https://github.com/Rudrabha/Wav2Lip#getting-the-weights
   
2. **wav2lip.pth** - Alternative Wav2Lip model (optional)
   - Download from same source

## Instructions

1. Visit the Wav2Lip GitHub repository
2. Follow their instructions to download the pretrained weights
3. Place the .pth files in this directory
""")
    
    return True

def download_face_detection_model():
    """Download face detection model for Wav2Lip"""
    model_path = Path("models/wav2lip/s3fd.pth")
    
    if model_path.exists():
        print(f"[OK] Face detection model already exists: {model_path}")
        return True
    
    print("[INFO] Face detection model (s3fd.pth) needs to be downloaded.")
    print("       This is required for Wav2Lip face detection.")
    
    return True

def setup_ffmpeg():
    """Check and setup FFmpeg"""
    try:
        result = subprocess.run(["ffmpeg", "-version"], capture_output=True)
        if result.returncode == 0:
            print("[OK] FFmpeg is installed")
            return True
    except FileNotFoundError:
        pass
    
    print("[WARN] FFmpeg not found in PATH")
    print("       Please install FFmpeg:")
    if platform.system() == "Windows":
        print("       - Download from: https://ffmpeg.org/download.html")
        print("       - Or use: winget install FFmpeg")
    else:
        print("       - Ubuntu/Debian: sudo apt install ffmpeg")
        print("       - macOS: brew install ffmpeg")
    
    return False

def create_env_file():
    """Create .env file template"""
    env_path = Path(".env")
    
    if env_path.exists():
        print(f"[OK] .env file already exists")
        return True
    
    env_content = """# Wav2Lip Backend Configuration

# Server settings
FLASK_ENV=development
FLASK_DEBUG=1
PORT=5000

# Redis for job queue
REDIS_URL=redis://localhost:6379/0

# ElevenLabs TTS API (optional)
ELEVENLABS_API_KEY=your_api_key_here

# OpenAI Whisper settings
WHISPER_MODEL=base

# GPU settings
CUDA_VISIBLE_DEVICES=0

# Output settings
OUTPUT_VIDEO_FPS=25
OUTPUT_VIDEO_RESOLUTION=1080p

# Paths
MODELS_DIR=./models
TEMP_DIR=./temp
OUTPUT_DIR=./output
AVATARS_DIR=./avatars
"""
    
    with open(env_path, "w") as f:
        f.write(env_content)
    
    print(f"[OK] Created .env file template")
    return True

def main():
    """Main setup function"""
    print("\n" + "="*60)
    print("  Wav2Lip Backend Setup")
    print("  Quantum AI Platform - Course Generation")
    print("="*60)
    
    # Change to backend directory
    backend_dir = Path(__file__).parent
    os.chdir(backend_dir)
    print(f"\n[INFO] Working directory: {backend_dir}")
    
    steps = [
        ("Checking Python version", check_python_version),
        ("Creating directories", create_directories),
        ("Creating .env file", create_env_file),
        ("Installing dependencies", install_dependencies),
        ("Checking GPU", check_gpu),
        ("Setting up FFmpeg", setup_ffmpeg),
        ("Downloading Wav2Lip model", download_wav2lip_model),
        ("Downloading face detection model", download_face_detection_model),
    ]
    
    results = []
    for description, func in steps:
        try:
            result = func()
            results.append((description, result))
        except Exception as e:
            print(f"[ERROR] {description}: {e}")
            results.append((description, False))
    
    # Summary
    print("\n" + "="*60)
    print("  Setup Summary")
    print("="*60)
    
    for description, result in results:
        status = "[OK]" if result else "[WARN]" if result is None else "[FAIL]"
        print(f"  {status} {description}")
    
    print("\n" + "="*60)
    print("  Next Steps:")
    print("="*60)
    print("  1. Download Wav2Lip model weights (see models/wav2lip/README.md)")
    print("  2. Configure .env file with your API keys")
    print("  3. Place avatar videos in the avatars/ directory")
    print("  4. Run: python app.py")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
