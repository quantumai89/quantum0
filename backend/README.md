# Wav2Lip Course Generation Backend

Python backend for AI-powered video course generation with lip-synced AI instructors.

## Features

- **TTS (Text-to-Speech)**: Generate natural speech from scripts using ElevenLabs or Coqui TTS
- **Wav2Lip**: Lip-sync AI instructor avatars to generated audio
- **Transcription**: Generate word-level transcripts using OpenAI Whisper
- **Video Rendering**: Combine video and audio into final 1080p output

## Requirements

- Python 3.8+
- CUDA-capable GPU (recommended for Wav2Lip)
- FFmpeg
- 8GB+ RAM

## Quick Start

### 1. Setup Environment

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Linux/Mac)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run Wav2Lip setup script to verify environment
python setup_wav2lip.py
```

### 2. Download Wav2Lip Repository

The Wav2Lip repository should be in the project root:

```bash
# From project root
git clone https://github.com/Rudrabha/Wav2Lip.git Wav2Lip-master
```

Or download and extract from: https://github.com/Rudrabha/Wav2Lip

### 3. Download Models

Download the following models and place them in the `models/` directory:

**Wav2Lip Model:**
- Download `wav2lip_gan.pth` from [Wav2Lip GitHub](https://github.com/Rudrabha/Wav2Lip)
- Place in `models/wav2lip/wav2lip_gan.pth`

**Face Detection Model:**
- Download `s3fd.pth` for face detection
- Place in `models/wav2lip/s3fd.pth`

### 4. Configure Environment

Edit `.env` file:

```env
# ElevenLabs API (optional, for premium TTS)
ELEVENLABS_API_KEY=your_api_key

# GPU settings
CUDA_VISIBLE_DEVICES=0

# Server settings
PORT=5000
```

### 5. Add Avatar Videos

Place instructor avatar videos in the `avatars/` directory:
- Format: MP4
- Resolution: 1080p recommended
- Duration: 10-30 seconds of talking head footage

### 6. Run Server

```bash
python app.py
```

Server will start at `http://localhost:5000`

## API Endpoints

### Health Check
```
GET /health
```

### Wav2Lip Status
```
GET /api/wav2lip/status
```
Returns dependency status and available avatars.

### Generate TTS Audio
```
POST /api/tts/generate
{
  "text": "Hello, welcome to this course.",
  "voice_id": "default",
  "job_id": "unique-id"
}
```

### Generate Lip-Synced Video
```
POST /api/wav2lip/generate
{
  "audio_path": "/path/to/audio.wav",
  "avatar_id": "instructor1",
  "job_id": "unique-id"
}
```

### Transcribe Audio
```
POST /api/transcribe
{
  "audio_path": "/path/to/audio.wav",
  "job_id": "unique-id"
}
```

### Render Final Video
```
POST /api/render
{
  "video_path": "/path/to/video.mp4",
  "audio_path": "/path/to/audio.wav",
  "job_id": "unique-id"
}
```

### List Avatars
```
GET /api/avatars
```

## Directory Structure

```
backend/
├── app.py              # Flask API server
├── setup.py            # Setup script
├── requirements.txt    # Python dependencies
├── .env               # Environment configuration
├── services/
│   ├── tts_service.py          # Text-to-speech
│   ├── wav2lip_service.py      # Lip-sync generation
│   ├── transcription_service.py # Whisper transcription
│   └── render_service.py       # Video rendering
├── models/
│   ├── wav2lip/       # Wav2Lip model weights
│   ├── fomm/          # First Order Motion Model
│   └── whisper/       # Whisper models (auto-downloaded)
├── avatars/           # AI instructor avatar videos
├── temp/              # Temporary processing files
├── output/            # Generated output files
└── logs/              # Application logs
```

## GPU Support

For optimal performance, use a CUDA-capable GPU:

- Minimum: NVIDIA GTX 1060 (6GB VRAM)
- Recommended: NVIDIA RTX 3060+ (8GB+ VRAM)

Check GPU availability:
```python
import torch
print(torch.cuda.is_available())
print(torch.cuda.get_device_name(0))
```

## Troubleshooting

### FFmpeg not found
Install FFmpeg:
- Windows: `winget install FFmpeg`
- Ubuntu: `sudo apt install ffmpeg`
- macOS: `brew install ffmpeg`

### CUDA out of memory
- Reduce batch size in Wav2Lip processing
- Use a smaller Whisper model (`tiny` or `base`)
- Close other GPU applications

### Model not found
Ensure model files are downloaded and placed in correct directories:
- `models/wav2lip/wav2lip_gan.pth`
- `models/wav2lip/s3fd.pth`

## License

Part of the Quantum AI Platform. See main project LICENSE.
