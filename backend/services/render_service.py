"""
Video Render Service
Combines lip-synced video with audio and renders final output at 1080p 24-30fps
Feature: wav2lip-course-generation, Property 12: Video rendering meets specifications
"""

import os
import json
import logging
import subprocess
from pathlib import Path
from typing import Optional, Dict, Tuple

logger = logging.getLogger(__name__)

TEMP_DIR = Path(os.getenv('TEMP_DIR', './temp'))
OUTPUT_DIR = Path(os.getenv('OUTPUT_DIR', './output'))
OUTPUT_FPS = int(os.getenv('OUTPUT_VIDEO_FPS', '25'))
OUTPUT_RESOLUTION = os.getenv('OUTPUT_VIDEO_RESOLUTION', '1080p')

# Video specifications from requirements
VIDEO_SPECS = {
    'MIN_WIDTH': 1920,
    'MIN_HEIGHT': 1080,
    'MIN_FPS': 24,
    'MAX_FPS': 30,
    'CODEC': 'libx264',
    'AUDIO_CODEC': 'aac',
    'AUDIO_BITRATE': '192k',
    'CRF': 23,  # Quality (lower = better, 18-28 is good range)
}


class RenderService:
    """
    Video rendering service for final output
    Validates: Requirements 5.3 - Render final video at 1080p resolution with 24-30 fps
    """
    
    def __init__(self):
        self.fps = self._validate_fps(OUTPUT_FPS)
        self.resolution = self._parse_resolution(OUTPUT_RESOLUTION)
        
        # Verify FFmpeg is available
        if not self._check_ffmpeg():
            logger.warning("FFmpeg not found. Video rendering may fail.")
    
    def _validate_fps(self, fps: int) -> int:
        """Validate FPS is within 24-30 range"""
        if fps < VIDEO_SPECS['MIN_FPS']:
            logger.warning(f"FPS {fps} below minimum, using {VIDEO_SPECS['MIN_FPS']}")
            return VIDEO_SPECS['MIN_FPS']
        if fps > VIDEO_SPECS['MAX_FPS']:
            logger.warning(f"FPS {fps} above maximum, using {VIDEO_SPECS['MAX_FPS']}")
            return VIDEO_SPECS['MAX_FPS']
        return fps
    
    def render(self, video_path: str, audio_path: str, job_id: str) -> Dict:
        """
        Render final video with audio at 1080p 24-30fps
        
        Args:
            video_path: Path to lip-synced video
            audio_path: Path to audio file
            job_id: Unique job identifier
            
        Returns:
            Dictionary with output path and video metadata
        """
        video_path = Path(video_path)
        audio_path = Path(audio_path)
        
        if not video_path.exists():
            raise FileNotFoundError(f"Video file not found: {video_path}")
        if not audio_path.exists():
            raise FileNotFoundError(f"Audio file not found: {audio_path}")
        
        # Create output directory
        output_dir = OUTPUT_DIR / 'videos' / job_id
        output_dir.mkdir(parents=True, exist_ok=True)
        
        output_path = output_dir / f"{job_id}_final.mp4"
        
        # Render video
        self._render_video(video_path, audio_path, output_path)
        
        # Generate thumbnail
        thumbnail_path = output_dir / f"{job_id}_thumb.jpg"
        self._generate_thumbnail(output_path, thumbnail_path)
        
        # Get video info and validate
        video_info = self.get_video_info(str(output_path))
        self._validate_output(video_info)
        
        return {
            'output_path': str(output_path),
            'thumbnail_path': str(thumbnail_path),
            'duration': self._get_duration(video_info),
            'resolution': self.resolution,
            'frame_rate': self.fps,
            'file_size': output_path.stat().st_size,
        }
    
    def _render_video(self, video_path: Path, audio_path: Path, output_path: Path):
        """Render video using FFmpeg"""
        logger.info(f"Rendering video: {output_path}")
        
        width, height = self.resolution
        
        cmd = [
            'ffmpeg',
            '-y',  # Overwrite output
            '-i', str(video_path),  # Input video
            '-i', str(audio_path),  # Input audio
            '-c:v', 'libx264',  # Video codec
            '-preset', 'medium',  # Encoding preset
            '-crf', '23',  # Quality (lower = better)
            '-c:a', 'aac',  # Audio codec
            '-b:a', '192k',  # Audio bitrate
            '-r', str(self.fps),  # Frame rate
            '-vf', f'scale={width}:{height}',  # Resolution
            '-map', '0:v:0',  # Use video from first input
            '-map', '1:a:0',  # Use audio from second input
            '-shortest',  # Match shortest stream
            str(output_path)
        ]
        
        logger.info(f"Running FFmpeg: {' '.join(cmd)}")
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            logger.error(f"FFmpeg error: {result.stderr}")
            raise RuntimeError(f"Video rendering failed: {result.stderr}")
        
        logger.info(f"Video rendered successfully: {output_path}")
    
    def _generate_thumbnail(self, video_path: Path, output_path: Path):
        """Generate thumbnail from video"""
        cmd = [
            'ffmpeg',
            '-y',
            '-i', str(video_path),
            '-ss', '00:00:01',  # 1 second into video
            '-vframes', '1',  # Single frame
            '-vf', 'scale=640:360',  # Thumbnail size
            str(output_path)
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            logger.info(f"Thumbnail generated: {output_path}")
        else:
            logger.warning(f"Thumbnail generation failed: {result.stderr}")
    
    def _parse_resolution(self, resolution: str) -> Tuple[int, int]:
        """Parse resolution string to width, height - minimum 1080p"""
        resolutions = {
            '720p': (1280, 720),
            '1080p': (1920, 1080),
            '1440p': (2560, 1440),
            '4k': (3840, 2160)
        }
        width, height = resolutions.get(resolution.lower(), (1920, 1080))
        
        # Enforce minimum 1080p per requirements
        if width < VIDEO_SPECS['MIN_WIDTH'] or height < VIDEO_SPECS['MIN_HEIGHT']:
            logger.warning(f"Resolution {resolution} below 1080p minimum, using 1080p")
            return (VIDEO_SPECS['MIN_WIDTH'], VIDEO_SPECS['MIN_HEIGHT'])
        
        return (width, height)
    
    def _validate_output(self, video_info: Dict):
        """Validate rendered video meets specifications"""
        streams = video_info.get('streams', [])
        video_stream = next((s for s in streams if s.get('codec_type') == 'video'), None)
        
        if not video_stream:
            raise ValueError("No video stream found in output")
        
        width = video_stream.get('width', 0)
        height = video_stream.get('height', 0)
        
        if width < VIDEO_SPECS['MIN_WIDTH'] or height < VIDEO_SPECS['MIN_HEIGHT']:
            raise ValueError(
                f"Output resolution {width}x{height} below minimum "
                f"{VIDEO_SPECS['MIN_WIDTH']}x{VIDEO_SPECS['MIN_HEIGHT']}"
            )
        
        # Check frame rate
        fps_str = video_stream.get('r_frame_rate', '0/1')
        if '/' in fps_str:
            num, den = map(int, fps_str.split('/'))
            fps = num / den if den > 0 else 0
        else:
            fps = float(fps_str)
        
        if fps < VIDEO_SPECS['MIN_FPS'] or fps > VIDEO_SPECS['MAX_FPS']:
            logger.warning(f"Output FPS {fps} outside {VIDEO_SPECS['MIN_FPS']}-{VIDEO_SPECS['MAX_FPS']} range")
        
        logger.info(f"Video validated: {width}x{height} @ {fps}fps")
    
    def _get_duration(self, video_info: Dict) -> float:
        """Extract duration from video info"""
        format_info = video_info.get('format', {})
        duration = format_info.get('duration', '0')
        return float(duration)
    
    def _check_ffmpeg(self) -> bool:
        """Check if FFmpeg is available"""
        try:
            result = subprocess.run(
                ['ffmpeg', '-version'],
                capture_output=True
            )
            return result.returncode == 0
        except FileNotFoundError:
            return False
    
    def get_video_info(self, video_path: str) -> dict:
        """Get video file information"""
        video_path = Path(video_path)
        
        if not video_path.exists():
            raise FileNotFoundError(f"Video not found: {video_path}")
        
        cmd = [
            'ffprobe',
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_format',
            '-show_streams',
            str(video_path)
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            raise RuntimeError(f"Failed to get video info: {result.stderr}")
        
        import json
        return json.loads(result.stdout)
