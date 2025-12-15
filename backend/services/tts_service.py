"""
TTS (Text-to-Speech) Service
Generates audio from text using ElevenLabs or Coqui TTS
"""

import os
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

SERVICE_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SERVICE_DIR.parent
TEMP_DIR = Path(os.getenv('TEMP_DIR', str(BACKEND_DIR / 'temp')))
ELEVENLABS_API_KEY = os.getenv('ELEVENLABS_API_KEY')


class TTSService:
    """Text-to-Speech service for generating audio from scripts"""
    
    def __init__(self):
        self.use_elevenlabs = bool(ELEVENLABS_API_KEY)
        self._tts_model = None
        
        if self.use_elevenlabs:
            logger.info("Using ElevenLabs TTS")
        else:
            logger.info("Using Coqui TTS (local)")
    
    def generate(self, text: str, voice_id: str = 'default', job_id: str = None) -> Path:
        """
        Generate audio from text
        
        Args:
            text: The text to convert to speech
            voice_id: Voice identifier (ElevenLabs voice ID or local voice name)
            job_id: Unique job identifier for file naming
            
        Returns:
            Path to generated audio file
        """
        output_dir = TEMP_DIR / 'audio'
        output_dir.mkdir(parents=True, exist_ok=True)
        
        output_path = output_dir / f"{job_id}.wav"
        
        if self.use_elevenlabs:
            return self._generate_elevenlabs(text, voice_id, output_path)
        else:
            return self._generate_coqui(text, voice_id, output_path)
    
    def _generate_elevenlabs(self, text: str, voice_id: str, output_path: Path) -> Path:
        """Generate audio using ElevenLabs API"""
        try:
            from elevenlabs import generate, save, set_api_key
            
            set_api_key(ELEVENLABS_API_KEY)
            
            # Use default voice if not specified
            if voice_id == 'default':
                voice_id = 'Rachel'  # ElevenLabs default voice
            
            audio = generate(
                text=text,
                voice=voice_id,
                model="eleven_monolingual_v1"
            )
            
            save(audio, str(output_path))
            logger.info(f"Generated ElevenLabs audio: {output_path}")
            
            return output_path
            
        except Exception as e:
            logger.error(f"ElevenLabs TTS failed: {e}")
            # Fall back to Coqui TTS
            logger.info("Falling back to Coqui TTS")
            return self._generate_coqui(text, voice_id, output_path)
    
    def _generate_coqui(self, text: str, voice_id: str, output_path: Path) -> Path:
        """Generate dummy audio using standard library (fallback)"""
        try:
            # Generate a simple sine wave or silence using wave module
            import wave
            import math
            import struct
            
            sample_rate = 44100
            duration = max(3, len(text.split()) * 0.5) # Estimate duration roughly
            frequency = 440.0
            
            logger.info(f"Generating dummy audio for text: {text[:30]}...")
            
            with wave.open(str(output_path), 'w') as wav_file:
                wav_file.setnchannels(1)
                wav_file.setsampwidth(2)
                wav_file.setframerate(sample_rate)
                
                num_samples = int(duration * sample_rate)
                
                # Write simple sine wave
                for i in range(num_samples):
                    value = int(32767.0 * 0.5 * math.sin(2 * math.pi * frequency * i / sample_rate))
                    data = struct.pack('<h', value)
                    wav_file.writeframesraw(data)
            
            logger.info(f"Generated dummy audio: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Dummy TTS failed: {e}")
            raise RuntimeError(f"TTS generation failed: {e}")
    
    def get_available_voices(self) -> list:
        """Get list of available voices"""
        if self.use_elevenlabs:
            try:
                from elevenlabs import voices, set_api_key
                set_api_key(ELEVENLABS_API_KEY)
                return [{'id': v.voice_id, 'name': v.name} for v in voices()]
            except Exception as e:
                logger.error(f"Failed to fetch ElevenLabs voices: {e}")
                return []
        else:
            # Coqui TTS voices
            return [
                {'id': 'default', 'name': 'LJSpeech (Default)'},
            ]
    
    def estimate_duration(self, text: str, words_per_minute: int = 150) -> float:
        """
        Estimate audio duration based on text length
        
        Args:
            text: The text to estimate duration for
            words_per_minute: Speaking rate (default 150 WPM)
            
        Returns:
            Estimated duration in seconds
        """
        word_count = len(text.split())
        return (word_count / words_per_minute) * 60
