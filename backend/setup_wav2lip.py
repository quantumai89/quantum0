#!/usr/bin/env python3
"""
Wav2Lip Environment Setup Script
Sets up the Python environment for Wav2Lip video generation
"""

import os
import sys
import subprocess
import urllib.request
from pathlib import Path

# Directories
BACKEND_DIR = Path(__file__).parent
PROJECT_ROOT = BACKEND_DIR.parent
WAV2LIP_DIR = PROJECT_ROOT / 'Wav2Lip-master'
MODELS_DIR = BACKEND_DIR / 'models' / 'wav2lip'
AVATARS_DIR = BACKEND_DIR / 'avatars'

# Model URLs (from Wav2Lip repository)
MODEL_URLS = {
    'wav2lip_gan.pth': 'https://iiitaphyd-my.sharepoint.com/:u:/g/personal/radrabha_m_research_iiit_ac_in/Eb3LEzbfuKlJiR600lQWRxgBIY27JZg80f7V9ber9z8A6Q?e=TBFBVW',
    's3fd.pth': 'https://www.adrianbulat.com/downloads/python-fan/s3fd-619a316812.pth',
}


def print_header(text: str):
    """Print a formatted header"""
    print(f"\n{'='*60}")
    print(f"  {text}")
    print(f"{'='*60}\n")


def check_python_version():
    """Check Python version"""
    print_header("Checking Python Version")
    version = sys.version_info
    print(f"Python version: {version.major}.{version.minor}.{version.micro}")
    
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print("ERROR: Python 3.8+ is required")
        return False
    
    print("✓ Python version OK")
    return True


def check_wav2lip_directory():
    """Check if Wav2Lip directory exists"""
    print_header("Checking Wav2Lip Directory")
    
    if WAV2LIP_DIR.exists():
        print(f"✓ Wav2Lip directory found: {WAV2LIP_DIR}")
        return True
    else:
        print(f"✗ Wav2Lip directory not found: {WAV2LIP_DIR}")
        print("\nPlease download Wav2Lip from:")
        print("  https://github.com/Rudrabha/Wav2Lip")
        print(f"\nAnd extract it to: {WAV2LIP_DIR}")
        return False


def setup_directories():
    """Create necessary directories"""
    print_header("Setting Up Directories")
    
    dirs = [
        MODELS_DIR,
        AVATARS_DIR,
        BACKEND_DIR / 'temp' / 'audio',
        BACKEND_DIR / 'temp' / 'video',
        BACKEND_DIR / 'output',
        BACKEND_DIR / 'logs',
    ]
    
    for d in dirs:
        d.mkdir(parents=True, exist_ok=True)
        print(f"✓ Created: {d}")
    
    return True


def check_models():
    """Check if model files exist"""
    print_header("Checking Model Files")
    
    models_ok = True
    
    wav2lip_model = MODELS_DIR / 'wav2lip_gan.pth'
    if wav2lip_model.exists():
        print(f"✓ Wav2Lip model found: {wav2lip_model}")
    else:
        print(f"✗ Wav2Lip model not found: {wav2lip_model}")
        print("\n  Download wav2lip_gan.pth from:")
        print("  https://github.com/Rudrabha/Wav2Lip#getting-the-weights")
        print(f"\n  Place it in: {MODELS_DIR}")
        models_ok = False
    
    s3fd_model = MODELS_DIR / 's3fd.pth'
    if s3fd_model.exists():
        print(f"✓ Face detection model found: {s3fd_model}")
    else:
        print(f"✗ Face detection model not found: {s3fd_model}")
        print("\n  This model is usually downloaded automatically by face-alignment")
        print("  If needed, download from:")
        print("  https://www.adrianbulat.com/downloads/python-fan/s3fd-619a316812.pth")
    
    return models_ok


def check_ffmpeg():
    """Check if FFmpeg is installed"""
    print_header("Checking FFmpeg")
    
    # Check system ffmpeg
    try:
        result = subprocess.run(
            ['ffmpeg', '-version'],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            version_line = result.stdout.split('\n')[0]
            print(f"✓ System FFmpeg found: {version_line}")
            return True
    except FileNotFoundError:
        pass
    
    # Check imageio_ffmpeg
    try:
        import imageio_ffmpeg
        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        print(f"✓ imageio-ffmpeg found: {ffmpeg_exe}")
        return True
    except ImportError:
        pass
    
    print("✗ FFmpeg not found")
    print("\nPlease install FFmpeg (or ensure requirements.txt is installed):")
    print("  pip install imageio-ffmpeg")
    return False


def check_pytorch():
    """Check PyTorch installation"""
    print_header("Checking PyTorch")
    
    try:
        import torch
        print(f"✓ PyTorch version: {torch.__version__}")
        
        if torch.cuda.is_available():
            print(f"✓ CUDA available: {torch.cuda.get_device_name(0)}")
            print(f"  CUDA version: {torch.version.cuda}")
        else:
            print("⚠ CUDA not available - will use CPU (slower)")
        
        return True
    except ImportError:
        print("✗ PyTorch not installed")
        print("\nInstall PyTorch:")
        print("  CPU:      pip install torch torchvision torchaudio")
        print("  CUDA 11.8: pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118")
        print("  CUDA 12.1: pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121")
        return False


def check_dependencies():
    """Check other Python dependencies"""
    print_header("Checking Python Dependencies")
    
    dependencies = [
        ('numpy', 'numpy'),
        ('cv2', 'opencv-python'),
        ('librosa', 'librosa'),
        ('scipy', 'scipy'),
        ('face_alignment', 'face-alignment'),
        ('tqdm', 'tqdm'),
        ('PIL', 'pillow'),
    ]
    
    all_ok = True
    for module, package in dependencies:
        try:
            __import__(module)
            print(f"✓ {package}")
        except ImportError:
            print(f"✗ {package} - install with: pip install {package}")
            all_ok = False
    
    return all_ok


def check_avatars():
    """Check if avatar videos exist"""
    print_header("Checking Avatar Videos")
    
    avatars = list(AVATARS_DIR.glob('*.mp4'))
    
    if avatars:
        print(f"✓ Found {len(avatars)} avatar video(s):")
        for a in avatars:
            print(f"  - {a.name}")
        return True
    else:
        print(f"⚠ No avatar videos found in: {AVATARS_DIR}")
        print("\nTo use Wav2Lip, add an MP4 video with a visible face to:")
        print(f"  {AVATARS_DIR}")
        print("\nThe video should:")
        print("  - Contain a clear, front-facing view of a person")
        print("  - Have good lighting")
        print("  - Be at least 720p resolution")
        return False


def install_requirements():
    """Install Python requirements"""
    print_header("Installing Python Requirements")
    
    requirements_file = BACKEND_DIR / 'requirements.txt'
    
    if not requirements_file.exists():
        print(f"✗ Requirements file not found: {requirements_file}")
        return False
    
    print(f"Installing from: {requirements_file}")
    
    result = subprocess.run(
        [sys.executable, '-m', 'pip', 'install', '-r', str(requirements_file)],
        capture_output=False
    )
    
    return result.returncode == 0


def test_wav2lip_service():
    """Test the Wav2Lip service"""
    print_header("Testing Wav2Lip Service")
    
    try:
        # Add backend to path
        sys.path.insert(0, str(BACKEND_DIR))
        
        from services.wav2lip_service import Wav2LipService
        
        service = Wav2LipService()
        status = service.check_dependencies()
        
        print("Dependency Status:")
        for key, value in status.items():
            symbol = "✓" if value else "✗"
            print(f"  {symbol} {key}: {value}")
        
        return all(status.values())
    except Exception as e:
        print(f"✗ Error testing service: {e}")
        return False


def main():
    """Main setup function"""
    print("\n" + "="*60)
    print("  Wav2Lip Environment Setup")
    print("="*60)
    
    results = {}
    
    results['python'] = check_python_version()
    results['wav2lip_dir'] = check_wav2lip_directory()
    results['directories'] = setup_directories()
    results['models'] = check_models()
    results['ffmpeg'] = check_ffmpeg()
    results['pytorch'] = check_pytorch()
    results['dependencies'] = check_dependencies()
    results['avatars'] = check_avatars()
    
    # Summary
    print_header("Setup Summary")
    
    all_ok = True
    critical = ['python', 'wav2lip_dir', 'models', 'ffmpeg', 'pytorch']
    
    for key, value in results.items():
        symbol = "✓" if value else "✗"
        status = "OK" if value else "MISSING"
        is_critical = key in critical
        
        if not value and is_critical:
            all_ok = False
            status = "REQUIRED"
        elif not value:
            status = "OPTIONAL"
        
        print(f"  {symbol} {key}: {status}")
    
    print()
    
    if all_ok:
        print("✓ Wav2Lip environment is ready!")
        print("\nTo start the backend server:")
        print(f"  cd {BACKEND_DIR}")
        print("  python app.py")
    else:
        print("✗ Some required components are missing.")
        print("  Please install the missing dependencies and run this script again.")
    
    return all_ok


if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
