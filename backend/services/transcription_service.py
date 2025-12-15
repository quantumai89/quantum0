"""
Transcription Service
Generates transcripts with word-level timestamps using OpenAI Whisper
Feature: wav2lip-course-generation, Property 13: Transcript generation produces timestamps
Validates: Requirements 5.4
"""

import os
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

TEMP_DIR = Path(os.getenv('TEMP_DIR', './temp'))
OUTPUT_DIR = Path(os.getenv('OUTPUT_DIR', './output'))
WHISPER_MODEL = os.getenv('WHISPER_MODEL', 'base')


class TranscriptionService:
    """
    Transcription service using OpenAI Whisper
    Generates word-level timestamps for interactive transcripts
    """
    
    def __init__(self):
        self._model = None
        self.model_name = WHISPER_MODEL
    
    def transcribe(self, audio_path: str, job_id: str = None) -> Dict:
        """
        Transcribe audio file with word-level timestamps
        
        Args:
            audio_path: Path to audio file
            job_id: Unique job identifier
            
        Returns:
            Dictionary containing transcript and word-level timestamps
        """
        audio_path = Path(audio_path)
        
        if not audio_path.exists():
            raise FileNotFoundError(f"Audio file not found: {audio_path}")
        
        # Load model if not loaded
        if self._model is None:
            self._load_model()
        
        # Transcribe
        result = self._transcribe_audio(audio_path)
        
        # Validate word-level timestamps exist
        if not result.get('words') or len(result['words']) == 0:
            raise ValueError("Transcription failed to produce word-level timestamps")
        
        # Save outputs
        output_paths = {}
        if job_id:
            output_paths = self._save_outputs(result, job_id)
        
        # Add output paths to result
        result['output_paths'] = output_paths
        
        return result
    
    def _load_model(self):
        """Load Whisper model"""
        try:
            import whisper
            
            logger.info(f"Loading Whisper model: {self.model_name}")
            self._model = whisper.load_model(self.model_name)
            logger.info("Whisper model loaded successfully")
            
        except ImportError:
            raise RuntimeError("OpenAI Whisper not installed. Run: pip install openai-whisper")
    
    def _transcribe_audio(self, audio_path: Path) -> Dict:
        """Run Whisper transcription"""
        import whisper
        
        logger.info(f"Transcribing: {audio_path}")
        
        # Transcribe with word timestamps
        result = self._model.transcribe(
            str(audio_path),
            word_timestamps=True,
            verbose=False
        )
        
        # Extract word-level timestamps
        words = []
        for segment in result.get('segments', []):
            for word_info in segment.get('words', []):
                words.append({
                    'word': word_info['word'].strip(),
                    'start': round(word_info['start'], 3),
                    'end': round(word_info['end'], 3)
                })
        
        transcript = {
            'text': result['text'],
            'language': result.get('language', 'en'),
            'duration': result['segments'][-1]['end'] if result['segments'] else 0,
            'segments': [
                {
                    'id': seg['id'],
                    'start': round(seg['start'], 3),
                    'end': round(seg['end'], 3),
                    'text': seg['text'].strip()
                }
                for seg in result.get('segments', [])
            ],
            'words': words
        }
        
        logger.info(f"Transcription complete: {len(words)} words")
        return transcript
    
    def _save_outputs(self, transcript: Dict, job_id: str) -> Dict:
        """Save transcript in multiple formats"""
        output_dir = OUTPUT_DIR / 'transcripts'
        output_dir.mkdir(parents=True, exist_ok=True)
        
        paths = {}
        
        # Save JSON with word-level timestamps
        json_path = output_dir / f"{job_id}.json"
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(transcript, f, indent=2, ensure_ascii=False)
        logger.info(f"Saved JSON transcript: {json_path}")
        paths['json'] = str(json_path)
        
        # Save VTT (WebVTT format)
        vtt_path = output_dir / f"{job_id}.vtt"
        self._save_vtt(transcript, vtt_path)
        logger.info(f"Saved VTT transcript: {vtt_path}")
        paths['vtt'] = str(vtt_path)
        
        # Save SRT
        srt_path = output_dir / f"{job_id}.srt"
        self._save_srt(transcript, srt_path)
        logger.info(f"Saved SRT transcript: {srt_path}")
        paths['srt'] = str(srt_path)
        
        # Save word-level JSON for interactive transcript
        words_path = output_dir / f"{job_id}_words.json"
        self._save_words_json(transcript, words_path)
        logger.info(f"Saved word-level transcript: {words_path}")
        paths['words'] = str(words_path)
        
        return paths
    
    def _save_words_json(self, transcript: Dict, output_path: Path):
        """Save word-level timestamps as separate JSON for interactive transcript"""
        words_data = {
            'words': transcript.get('words', []),
            'duration': transcript.get('duration', 0),
            'language': transcript.get('language', 'en'),
            'word_count': len(transcript.get('words', []))
        }
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(words_data, f, indent=2, ensure_ascii=False)
    
    def _save_vtt(self, transcript: Dict, output_path: Path):
        """Save transcript in WebVTT format"""
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write("WEBVTT\n\n")
            
            for i, segment in enumerate(transcript['segments']):
                start = self._format_timestamp_vtt(segment['start'])
                end = self._format_timestamp_vtt(segment['end'])
                f.write(f"{start} --> {end}\n")
                f.write(f"{segment['text']}\n\n")
    
    def _save_srt(self, transcript: Dict, output_path: Path):
        """Save transcript in SRT format"""
        with open(output_path, 'w', encoding='utf-8') as f:
            for i, segment in enumerate(transcript['segments'], 1):
                start = self._format_timestamp_srt(segment['start'])
                end = self._format_timestamp_srt(segment['end'])
                f.write(f"{i}\n")
                f.write(f"{start} --> {end}\n")
                f.write(f"{segment['text']}\n\n")
    
    def _format_timestamp_vtt(self, seconds: float) -> str:
        """Format timestamp for VTT (HH:MM:SS.mmm)"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = seconds % 60
        return f"{hours:02d}:{minutes:02d}:{secs:06.3f}"
    
    def _format_timestamp_srt(self, seconds: float) -> str:
        """Format timestamp for SRT (HH:MM:SS,mmm)"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        millis = int((seconds % 1) * 1000)
        return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"
