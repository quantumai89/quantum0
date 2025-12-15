import os
import requests
from pathlib import Path

# URLs (Direct download links where possible)
MODELS = {
    "s3fd.pth": "https://www.adrianbulat.com/downloads/python-fan/s3fd-619a316812.pth",
    "wav2lip_gan.pth": "https://huggingface.co/camenduru/Wav2Lip/resolve/main/checkpoints/wav2lip_gan.pth"
}

MODELS_DIR = Path("backend/models/wav2lip")
MODELS_DIR.mkdir(parents=True, exist_ok=True)

def download_file(url, path):
    print(f"Downloading {url} to {path}...")
    try:
        response = requests.get(url, stream=True)
        response.raise_for_status()
        with open(path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        print(f"Downloaded {path}")
        return True
    except Exception as e:
        print(f"Failed to download {url}: {e}")
        return False

def main():
    for name, url in MODELS.items():
        path = MODELS_DIR / name
        if path.exists():
            print(f"{name} already exists.")
            continue
        
        success = download_file(url, path)
        if not success:
            print(f"Could not download {name}")

if __name__ == "__main__":
    main()
