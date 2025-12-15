"""
Wav2Lip Service
Generates lip-synced video from audio and avatar video using the Wav2Lip model
"""

import os
import sys
import logging
import subprocess
from pathlib import Path
from typing import Optional, Tuple
import tempfile
import imageio_ffmpeg

logger = logging.getLogger(__name__)

# Configuration from environment
SERVICE_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SERVICE_DIR.parent
PROJECT_ROOT = BACKEND_DIR.parent

MODELS_DIR = Path(os.getenv('MODELS_DIR', str(BACKEND_DIR / 'models')))
TEMP_DIR = Path(os.getenv('TEMP_DIR', str(BACKEND_DIR / 'temp')))
AVATARS_DIR = Path(os.getenv('AVATARS_DIR', str(BACKEND_DIR / 'avatars')))
WAV2LIP_DIR = Path(os.getenv('WAV2LIP_DIR', str(PROJECT_ROOT / 'Wav2Lip-master')))


class Wav2LipService:
    """Wav2Lip lip-sync video generation service"""
    
    def __init__(self):
        self.wav2lip_dir = WAV2LIP_DIR.resolve()
        self.checkpoint_path = MODELS_DIR / 'wav2lip' / 'wav2lip_gan.pth'
        self.face_det_path = MODELS_DIR / 'wav2lip' / 's3fd.pth'
        self._model = None
        self._device = None
        
        # Get FFmpeg executable path
        # Get FFmpeg executable path
        self.ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()
        
        # Verify ffmpeg works, otherwise fall back to system command
        try:
            subprocess.run([self.ffmpeg_path, '-version'], capture_output=True, check=True)
            logger.info(f"Using imageio-ffmpeg at: {self.ffmpeg_path}")
        except Exception:
            logger.warning(f"imageio-ffmpeg at {self.ffmpeg_path} failed, trying system 'ffmpeg' command")
            self.ffmpeg_path = 'ffmpeg'
        
        # Ensure temp directories exist
        (TEMP_DIR / 'video').mkdir(parents=True, exist_ok=True)
        (TEMP_DIR / 'audio').mkdir(parents=True, exist_ok=True)
        
        # Verify Wav2Lip directory exists
        if not self.wav2lip_dir.exists():
            logger.warning(f"Wav2Lip directory not found at {self.wav2lip_dir}")
        
        # Verify model exists
        if not self.checkpoint_path.exists():
            logger.warning(f"Wav2Lip model not found at {self.checkpoint_path}")
            logger.info("Download wav2lip_gan.pth from: https://github.com/Rudrabha/Wav2Lip")
    
    def generate(self, audio_path: str, avatar_id: str = 'default', job_id: str = None) -> Path:
        """
        Generate lip-synced video
        
        Args:
            audio_path: Path to input audio file
            avatar_id: ID of the avatar video to use
            job_id: Unique job identifier
            
        Returns:
            Path to generated video file
        """
        audio_path = Path(audio_path)
        
        if not audio_path.exists():
            raise FileNotFoundError(f"Audio file not found: {audio_path}")
        
        # Get avatar video path
        avatar_path = self._get_avatar_path(avatar_id)
        
        # Output path
        output_dir = TEMP_DIR / 'video'
        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = output_dir / f"{job_id}_lipsync.mp4"
        
        # Run Wav2Lip inference
        try:
            self._run_wav2lip(avatar_path, audio_path, output_path)
            return output_path
        except Exception as e:
            logger.error(f"Wav2Lip generation failed: {e}")
            logger.info("Falling back to original avatar video (no lip-sync)")
            # Return the original avatar path (or copy it to output if needed)
            import shutil
            shutil.copy2(avatar_path, output_path)
            return output_path
    
    def _get_avatar_path(self, avatar_id: str) -> Path:
        """Get path to avatar video or image file"""
        AVATARS_DIR.mkdir(parents=True, exist_ok=True)
        
        if avatar_id == 'default':
            # Look for any avatar video or image
            avatars = list(AVATARS_DIR.glob('*.mp4')) + list(AVATARS_DIR.glob('*.jpg')) + list(AVATARS_DIR.glob('*.png'))
            if avatars:
                return avatars[0]
            else:
                raise FileNotFoundError(
                    f"No avatar files found in {AVATARS_DIR}. "
                    "Please add an MP4 video or JPG/PNG image."
                )
        
        # Try extensions
        for ext in ['.mp4', '.jpg', '.jpeg', '.png']:
            path = AVATARS_DIR / f"{avatar_id}{ext}"
            if path.exists():
                return path
        
        raise FileNotFoundError(f"Avatar not found: {avatar_id}")

    def _run_wav2lip(self, face_path: Path, audio_path: Path, output_path: Path):
        """
        Run Wav2Lip inference using the Wav2Lip-master inference script
        """
        # Check if model exists
        if not self.checkpoint_path.exists():
            raise FileNotFoundError(
                f"Wav2Lip model not found at {self.checkpoint_path}. "
                "Please download wav2lip_gan.pth from https://github.com/Rudrabha/Wav2Lip "
                "and place it in the models/wav2lip directory."
            )
        
        logger.info(f"Running Wav2Lip inference...")
        logger.info(f"  Face input: {face_path}")
        logger.info(f"  Audio: {audio_path}")
        logger.info(f"  Output: {output_path}")
        logger.info(f"  Checkpoint: {self.checkpoint_path}")
        
        # If input is an image, we MUST use subprocess (native implementation here is video-only)
        is_image = face_path.suffix.lower() in ['.jpg', '.jpeg', '.png']
        
        if is_image:
            logger.info("Input is an image, using subprocess inference")
            self._run_wav2lip_subprocess(face_path, audio_path, output_path)
            return

        # Try native Python integration first, fall back to subprocess
        try:
            self._run_wav2lip_native(face_path, audio_path, output_path)
        except Exception as e:
            logger.warning(f"Native Wav2Lip failed: {e}, trying subprocess method")
            self._run_wav2lip_subprocess(face_path, audio_path, output_path)
    
    # ... (rest of native methods) ...

    def get_available_avatars(self) -> list:
        """Get list of available avatar videos and images"""
        AVATARS_DIR.mkdir(parents=True, exist_ok=True)
        
        avatars = []
        # Scan for supported extensions
        files = []
        for ext in ['*.mp4', '*.jpg', '*.jpeg', '*.png']:
            files.extend(AVATARS_DIR.glob(ext))
            
        for f in files:
            avatars.append({
                'id': f.stem,
                'name': f.stem.replace('_', ' ').replace('-', ' ').title(),
                'path': str(f),
                'type': 'image' if f.suffix.lower() in ['.jpg', '.jpeg', '.png'] else 'video'
            })
        return avatars
    
    def _run_wav2lip_native(self, face_path: Path, audio_path: Path, output_path: Path):
        """Run Wav2Lip using native Python integration"""
        import torch
        import numpy as np
        import cv2
        
        # Add Wav2Lip directory to path
        wav2lip_path = str(self.wav2lip_dir)
        if wav2lip_path not in sys.path:
            sys.path.insert(0, wav2lip_path)
        
        # Import Wav2Lip modules
        try:
            import audio as wav2lip_audio
            from models import Wav2Lip
        except ImportError as e:
            raise ImportError(f"Failed to import Wav2Lip modules: {e}")
        
        # Set device
        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        logger.info(f"Using device: {device}")
        
        # Load model
        if self._model is None:
            self._model = self._load_wav2lip_model(device)
            self._device = device
        
        # Process video
        self._process_video_native(
            face_path, audio_path, output_path, 
            self._model, device
        )
        
        logger.info(f"Wav2Lip generation complete: {output_path}")
    
    def _load_wav2lip_model(self, device: str):
        """Load the Wav2Lip model"""
        import torch
        
        # Add Wav2Lip to path
        wav2lip_path = str(self.wav2lip_dir)
        if wav2lip_path not in sys.path:
            sys.path.insert(0, wav2lip_path)
        
        from models import Wav2Lip
        
        model = Wav2Lip()
        logger.info(f"Loading checkpoint from: {self.checkpoint_path}")
        
        if device == 'cuda':
            checkpoint = torch.load(self.checkpoint_path)
        else:
            checkpoint = torch.load(
                self.checkpoint_path, 
                map_location=lambda storage, loc: storage
            )
        
        # Handle state dict with 'module.' prefix
        state_dict = checkpoint["state_dict"]
        new_state_dict = {}
        for k, v in state_dict.items():
            new_state_dict[k.replace('module.', '')] = v
        
        model.load_state_dict(new_state_dict)
        model = model.to(device)
        
        logger.info("Wav2Lip model loaded successfully")
        return model.eval()

    def _process_video_native(
        self, 
        face_path: Path, 
        audio_path: Path, 
        output_path: Path,
        model,
        device: str
    ):
        """Process video with Wav2Lip model natively"""
        import torch
        import numpy as np
        import cv2
        
        # Add Wav2Lip to path
        wav2lip_path = str(self.wav2lip_dir)
        if wav2lip_path not in sys.path:
            sys.path.insert(0, wav2lip_path)
        
        import audio as wav2lip_audio
        import face_detection
        
        # Configuration
        img_size = 96
        mel_step_size = 16
        batch_size = 128
        pads = [0, 10, 0, 0]  # top, bottom, left, right
        
        # Read video frames
        video_stream = cv2.VideoCapture(str(face_path))
        fps = video_stream.get(cv2.CAP_PROP_FPS) or 25
        
        full_frames = []
        while True:
            ret, frame = video_stream.read()
            if not ret:
                break
            full_frames.append(frame)
        video_stream.release()
        
        if not full_frames:
            raise ValueError(f"Could not read frames from {face_path}")
        
        logger.info(f"Read {len(full_frames)} frames at {fps} fps")
        
        # Convert audio to wav if needed and load mel spectrogram
        audio_file = str(audio_path)
        if not audio_file.endswith('.wav'):
            temp_wav = TEMP_DIR / 'audio' / 'temp_audio.wav'
            subprocess.call([
                self.ffmpeg_path, '-y', '-i', audio_file, 
                '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1',
                str(temp_wav)
            ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            audio_file = str(temp_wav)
        
        wav = wav2lip_audio.load_wav(audio_file, 16000)
        mel = wav2lip_audio.melspectrogram(wav)
        
        if np.isnan(mel.reshape(-1)).sum() > 0:
            raise ValueError('Mel spectrogram contains NaN values')
        
        # Create mel chunks
        mel_chunks = []
        mel_idx_multiplier = 80.0 / fps
        i = 0
        while True:
            start_idx = int(i * mel_idx_multiplier)
            if start_idx + mel_step_size > len(mel[0]):
                mel_chunks.append(mel[:, len(mel[0]) - mel_step_size:])
                break
            mel_chunks.append(mel[:, start_idx:start_idx + mel_step_size])
            i += 1
        
        logger.info(f"Created {len(mel_chunks)} mel chunks")
        
        # Trim frames to match mel chunks
        full_frames = full_frames[:len(mel_chunks)]
        
        # Detect faces
        detector = face_detection.FaceAlignment(
            face_detection.LandmarksType._2D,
            flip_input=False,
            device=device
        )
        
        face_det_results = self._detect_faces(full_frames, detector, pads)
        del detector
        
        # Generate lip-synced frames
        frame_h, frame_w = full_frames[0].shape[:2]
        temp_video = TEMP_DIR / 'video' / 'temp_result.avi'
        
        out = cv2.VideoWriter(
            str(temp_video),
            cv2.VideoWriter_fourcc(*'DIVX'),
            fps,
            (frame_w, frame_h)
        )
        
        # Process in batches
        for batch_data in self._generate_batches(
            full_frames, mel_chunks, face_det_results, img_size, batch_size
        ):
            img_batch, mel_batch, frame_batch, coords_batch = batch_data
            
            img_batch = torch.FloatTensor(
                np.transpose(img_batch, (0, 3, 1, 2))
            ).to(device)
            mel_batch = torch.FloatTensor(
                np.transpose(mel_batch, (0, 3, 1, 2))
            ).to(device)
            
            with torch.no_grad():
                pred = model(mel_batch, img_batch)
            
            pred = pred.cpu().numpy().transpose(0, 2, 3, 1) * 255.0
            
            for p, f, c in zip(pred, frame_batch, coords_batch):
                y1, y2, x1, x2 = c
                p = cv2.resize(p.astype(np.uint8), (x2 - x1, y2 - y1))
                f[y1:y2, x1:x2] = p
                out.write(f)
        
        out.release()
        
        # Combine video with audio using ffmpeg
        subprocess.call([
            self.ffmpeg_path, '-y',
            '-i', str(audio_path),
            '-i', str(temp_video),
            '-strict', '-2',
            '-q:v', '1',
            str(output_path)
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        # Cleanup temp file
        if temp_video.exists():
            temp_video.unlink()

    def _detect_faces(self, frames: list, detector, pads: list) -> list:
        """Detect faces in all frames"""
        import numpy as np
        
        batch_size = 16
        predictions = []
        
        for i in range(0, len(frames), batch_size):
            batch = np.array(frames[i:i + batch_size])
            preds = detector.get_detections_for_batch(batch)
            predictions.extend(preds)
        
        results = []
        pady1, pady2, padx1, padx2 = pads
        
        for rect, image in zip(predictions, frames):
            if rect is None:
                raise ValueError(
                    'Face not detected in frame. '
                    'Ensure the video contains a visible face in all frames.'
                )
            
            y1 = max(0, rect[1] - pady1)
            y2 = min(image.shape[0], rect[3] + pady2)
            x1 = max(0, rect[0] - padx1)
            x2 = min(image.shape[1], rect[2] + padx2)
            
            results.append([image[y1:y2, x1:x2], (y1, y2, x1, x2)])
        
        return results
    
    def _generate_batches(
        self, 
        frames: list, 
        mels: list, 
        face_det_results: list,
        img_size: int,
        batch_size: int
    ):
        """Generate batches for Wav2Lip inference"""
        import numpy as np
        import cv2
        
        img_batch, mel_batch, frame_batch, coords_batch = [], [], [], []
        
        for i, m in enumerate(mels):
            idx = i % len(frames)
            frame_to_save = frames[idx].copy()
            face, coords = face_det_results[idx]
            face = face.copy()
            
            face = cv2.resize(face, (img_size, img_size))
            
            img_batch.append(face)
            mel_batch.append(m)
            frame_batch.append(frame_to_save)
            coords_batch.append(coords)
            
            if len(img_batch) >= batch_size:
                img_batch = np.asarray(img_batch)
                mel_batch = np.asarray(mel_batch)
                
                # Mask lower half of face
                img_masked = img_batch.copy()
                img_masked[:, img_size // 2:] = 0
                
                img_batch = np.concatenate((img_masked, img_batch), axis=3) / 255.0
                mel_batch = np.reshape(
                    mel_batch, 
                    [len(mel_batch), mel_batch.shape[1], mel_batch.shape[2], 1]
                )
                
                yield img_batch, mel_batch, frame_batch, coords_batch
                img_batch, mel_batch, frame_batch, coords_batch = [], [], [], []
        
        # Yield remaining
        if len(img_batch) > 0:
            img_batch = np.asarray(img_batch)
            mel_batch = np.asarray(mel_batch)
            
            img_masked = img_batch.copy()
            img_masked[:, img_size // 2:] = 0
            
            img_batch = np.concatenate((img_masked, img_batch), axis=3) / 255.0
            mel_batch = np.reshape(
                mel_batch, 
                [len(mel_batch), mel_batch.shape[1], mel_batch.shape[2], 1]
            )
            
            yield img_batch, mel_batch, frame_batch, coords_batch
    
    def _run_wav2lip_subprocess(self, face_path: Path, audio_path: Path, output_path: Path):
        """Run Wav2Lip using subprocess (fallback method)"""
        inference_script = self.wav2lip_dir / 'inference.py'
        
        if not inference_script.exists():
            raise FileNotFoundError(f"Wav2Lip inference.py not found at {inference_script}")
        
        # Ensure temp directory exists in Wav2Lip folder
        wav2lip_temp = self.wav2lip_dir / 'temp'
        wav2lip_temp.mkdir(exist_ok=True)
        
        # Prepare environment with ffmpeg in path
        env = os.environ.copy()
        ffmpeg_dir = str(Path(self.ffmpeg_path).parent)
        env['PATH'] = f"{ffmpeg_dir}{os.pathsep}{env.get('PATH', '')}"
        
        cmd = [
            sys.executable,
            str(inference_script),
            '--checkpoint_path', str(self.checkpoint_path),
            '--face', str(face_path),
            '--audio', str(audio_path),
            '--outfile', str(output_path),
            '--pads', '0', '10', '0', '0',
        ]
        
        logger.info(f"Running Wav2Lip subprocess: {' '.join(cmd)}")
        logger.info(f"Using FFmpeg dir in PATH: {ffmpeg_dir}")
        
        result = subprocess.run(
            cmd,
            cwd=str(self.wav2lip_dir),
            capture_output=True,
            text=True,
            env=env
        )
        
        if result.returncode != 0:
            logger.error(f"Wav2Lip stderr: {result.stderr}")
            raise RuntimeError(f"Wav2Lip inference failed: {result.stderr}")
        
        if not output_path.exists():
            raise RuntimeError(f"Wav2Lip did not produce output file: {output_path}")
        
        logger.info(f"Wav2Lip subprocess complete: {output_path}")
    
    def get_available_avatars(self) -> list:
        """Get list of available avatar videos and images"""
        AVATARS_DIR.mkdir(parents=True, exist_ok=True)
        
        avatars = []
        # Scan for supported extensions
        files = []
        for ext in ['*.mp4', '*.jpg', '*.jpeg', '*.png']:
            files.extend(AVATARS_DIR.glob(ext))
            
        for f in files:
            avatars.append({
                'id': f.stem,
                'name': f.stem.replace('_', ' ').replace('-', ' ').title(),
                'path': str(f),
                'type': 'image' if f.suffix.lower() in ['.jpg', '.jpeg', '.png'] else 'video'
            })
        return avatars
    
    def check_dependencies(self) -> dict:
        """Check if all Wav2Lip dependencies are available"""
        status = {
            'wav2lip_dir': self.wav2lip_dir.exists(),
            'checkpoint': self.checkpoint_path.exists(),
            'torch': False,
            'cuda': False,
            'ffmpeg': False,
            'face_detection': False,
        }
        
        try:
            import torch
            status['torch'] = True
            status['cuda'] = torch.cuda.is_available()
        except ImportError:
            pass
        
        # Check ffmpeg via imageio_ffmpeg or subprocess
        if self.ffmpeg_path and Path(self.ffmpeg_path).exists():
            status['ffmpeg'] = True
        else:
            try:
                result = subprocess.run(
                    ['ffmpeg', '-version'], 
                    capture_output=True, 
                    text=True
                )
                status['ffmpeg'] = result.returncode == 0
            except FileNotFoundError:
                pass
        
        try:
            # Add Wav2Lip to path for check
            wav2lip_path = str(self.wav2lip_dir)
            if wav2lip_path not in sys.path:
                sys.path.insert(0, wav2lip_path)
                
            import face_detection
            status['face_detection'] = True
        except ImportError:
            pass
        
        return status

