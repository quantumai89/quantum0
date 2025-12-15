#!/usr/bin/env python3
"""
Wav2Lip Course Generation Backend API
Flask server for video generation pipeline
"""

import os
import uuid
import logging
from pathlib import Path
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
# load_dotenv()

# Configure logging
# Configure logging
Path('logs').mkdir(parents=True, exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/app.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Import database and auth modules
from database import init_db, SessionLocal
from services.auth_service import AuthService
from middleware.auth_middleware import require_auth

# Configuration
MODELS_DIR = Path(os.getenv('MODELS_DIR', './models'))
TEMP_DIR = Path(os.getenv('TEMP_DIR', './temp'))
OUTPUT_DIR = Path(os.getenv('OUTPUT_DIR', './output'))
AVATARS_DIR = Path(os.getenv('AVATARS_DIR', './avatars'))

# Ensure directories exist
for d in [MODELS_DIR, TEMP_DIR, OUTPUT_DIR, AVATARS_DIR, Path('logs')]:
    d.mkdir(parents=True, exist_ok=True)


@app.route('/', methods=['GET'])
def root():
    """Root endpoint - API information"""
    return jsonify({
        'service': 'Quantum AI - Wav2Lip Backend',
        'version': '1.0.0',
        'status': 'running',
        'endpoints': {
            'health': '/health',
            'auth_register': '/api/auth/register',
            'auth_login': '/api/auth/login',
            'auth_refresh': '/api/auth/refresh',
            'auth_logout': '/api/auth/logout',
            'auth_me': '/api/auth/me',
            'wav2lip_status': '/api/wav2lip/status',
            'generate_tts': '/api/tts/generate',
            'generate_wav2lip': '/api/wav2lip/generate',
            'transcribe': '/api/transcribe',
            'render': '/api/render',
            'avatars': '/api/avatars',
            'course_generation': '/api/generate/course'
        },
        'frontend_url': 'http://localhost:5173'
    })


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'wav2lip-backend',
        'gpu_available': check_gpu_available()
    })


# ============================================================================
# AUTHENTICATION ROUTES
# ============================================================================

@app.route('/api/auth/register', methods=['POST'])
def auth_register():
    """Register a new user"""
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')
        first_name = data.get('firstName')
        last_name = data.get('lastName')
        
        if not all([email, password, first_name, last_name]):
            return jsonify({'error': 'All fields are required'}), 400
        
        # Create database session
        db = SessionLocal()
        try:
            auth_service = AuthService(db)
            
            # Register user
            user = auth_service.register_user(email, password, first_name, last_name)
            
            # Auto-login: generate tokens
            access_token = auth_service._generate_access_token(user)
            refresh_token = auth_service._create_refresh_token(user)
            
            return jsonify({
                'success': True,
                'user': user.to_dict(),
                'accessToken': access_token,
                'refreshToken': refresh_token
            }), 201
            
        finally:
            db.close()
            
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Registration failed: {e}")
        return jsonify({'error': 'Registration failed'}), 500


@app.route('/api/auth/login', methods=['POST'])
def auth_login():
    """Login user"""
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')
        
        logger.info(f"Login attempt for email: {email}")
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        # Create database session
        db = SessionLocal()
        try:
            auth_service = AuthService(db)
            
            # Login user
            user, access_token, refresh_token = auth_service.login_user(email, password)
            
            logger.info(f"Login successful for user: {email}")
            
            return jsonify({
                'success': True,
                'user': user.to_dict(),
                'accessToken': access_token,
                'refreshToken': refresh_token
            })
            
        finally:
            db.close()
            
    except ValueError as e:
        logger.warning(f"Login failed for {email}: {str(e)}")
        return jsonify({'error': str(e)}), 401
    except Exception as e:
        logger.error(f"Login failed: {e}")
        return jsonify({'error': 'Login failed'}), 500


@app.route('/api/auth/refresh', methods=['POST'])
def auth_refresh():
    """Refresh access token"""
    try:
        data = request.json
        refresh_token = data.get('refreshToken')
        
        if not refresh_token:
            return jsonify({'error': 'Refresh token is required'}), 400
        
        # Create database session
        db = SessionLocal()
        try:
            auth_service = AuthService(db)
            
            # Refresh token
            access_token, user = auth_service.refresh_access_token(refresh_token)
            
            return jsonify({
                'success': True,
                'accessToken': access_token,
                'user': user.to_dict()
            })
            
        finally:
            db.close()
            
    except ValueError as e:
        return jsonify({'error': str(e)}), 401
    except Exception as e:
        logger.error(f"Token refresh failed: {e}")
        return jsonify({'error': 'Token refresh failed'}), 500


@app.route('/api/auth/logout', methods=['POST'])
def auth_logout():
    """Logout user"""
    try:
        data = request.json
        refresh_token = data.get('refreshToken')
        
        if refresh_token:
            # Create database session
            db = SessionLocal()
            try:
                auth_service = AuthService(db)
                auth_service.logout_user(refresh_token)
            finally:
                db.close()
        
        return jsonify({'success': True, 'message': 'Logged out successfully'})
        
    except Exception as e:
        logger.error(f"Logout failed: {e}")
        return jsonify({'error': 'Logout failed'}), 500


@app.route('/api/auth/me', methods=['GET'])
@require_auth
def auth_me(current_user):
    """Get current user profile"""
    try:
        # Create database session
        db = SessionLocal()
        try:
            auth_service = AuthService(db)
            user = auth_service.get_user_by_id(current_user['id'])
            
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            return jsonify({
                'success': True,
                'user': user.to_dict()
            })
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Get user failed: {e}")
        return jsonify({'error': 'Failed to get user'}), 500


@app.route('/api/wav2lip/status', methods=['GET'])
def wav2lip_status():
    """Check Wav2Lip dependencies and readiness"""
    try:
        from services.wav2lip_service import Wav2LipService
        service = Wav2LipService()
        status = service.check_dependencies()
        
        ready = all([
            status.get('wav2lip_dir', False),
            status.get('checkpoint', False),
            status.get('torch', False),
            status.get('ffmpeg', False),
        ])
        
        return jsonify({
            'ready': ready,
            'dependencies': status,
            'avatars': service.get_available_avatars()
        })
    except Exception as e:
        logger.error(f"Wav2Lip status check failed: {e}")
        return jsonify({
            'ready': False,
            'error': str(e)
        }), 500


@app.route('/api/tts/generate', methods=['POST'])
def generate_tts():
    """Generate TTS audio from text"""
    try:
        data = request.json
        text = data.get('text')
        voice_id = data.get('voice_id', 'default')
        job_id = data.get('job_id', str(uuid.uuid4()))
        
        if not text:
            return jsonify({'error': 'Text is required'}), 400
        
        # Import TTS service
        from services.tts_service import TTSService
        tts = TTSService()
        
        audio_path = tts.generate(text, voice_id, job_id)
        
        return jsonify({
            'success': True,
            'job_id': job_id,
            'audio_path': str(audio_path)
        })
        
    except Exception as e:
        logger.error(f"TTS generation failed: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/wav2lip/generate', methods=['POST'])
def generate_wav2lip():
    """Generate lip-synced video using Wav2Lip"""
    try:
        data = request.json
        audio_path = data.get('audio_path')
        avatar_id = data.get('avatar_id', 'default')
        job_id = data.get('job_id', str(uuid.uuid4()))
        
        if not audio_path:
            return jsonify({'error': 'Audio path is required'}), 400
        
        # Import Wav2Lip service
        from services.wav2lip_service import Wav2LipService
        wav2lip = Wav2LipService()
        
        video_path = wav2lip.generate(audio_path, avatar_id, job_id)
        
        return jsonify({
            'success': True,
            'job_id': job_id,
            'video_path': str(video_path)
        })
        
    except Exception as e:
        logger.error(f"Wav2Lip generation failed: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/transcribe', methods=['POST'])
def transcribe_audio():
    """Generate transcript from audio using Whisper with word-level timestamps"""
    try:
        data = request.json
        audio_path = data.get('audio_path')
        job_id = data.get('job_id', str(uuid.uuid4()))
        
        if not audio_path:
            return jsonify({'error': 'Audio path is required'}), 400
        
        # Import transcription service
        from services.transcription_service import TranscriptionService
        transcriber = TranscriptionService()
        
        transcript = transcriber.transcribe(audio_path, job_id)
        
        return jsonify({
            'success': True,
            'job_id': job_id,
            'text': transcript.get('text', ''),
            'language': transcript.get('language', 'en'),
            'duration': transcript.get('duration', 0),
            'word_count': len(transcript.get('words', [])),
            'words': transcript.get('words', []),
            'segments': transcript.get('segments', []),
            'output_paths': transcript.get('output_paths', {})
        })
        
    except Exception as e:
        logger.error(f"Transcription failed: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/render', methods=['POST'])
def render_video():
    """Render final video with audio at 1080p 24-30fps"""
    try:
        data = request.json
        video_path = data.get('video_path')
        audio_path = data.get('audio_path')
        job_id = data.get('job_id', str(uuid.uuid4()))
        
        if not video_path or not audio_path:
            return jsonify({'error': 'Video and audio paths are required'}), 400
        
        # Import render service
        from services.render_service import RenderService
        renderer = RenderService()
        
        result = renderer.render(video_path, audio_path, job_id)
        
        return jsonify({
            'success': True,
            'job_id': job_id,
            'output_path': result['output_path'],
            'thumbnail_path': result['thumbnail_path'],
            'duration': result['duration'],
            'resolution': {
                'width': result['resolution'][0],
                'height': result['resolution'][1]
            },
            'frame_rate': result['frame_rate'],
            'file_size': result['file_size']
        })
        
    except Exception as e:
        logger.error(f"Video rendering failed: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/avatars', methods=['GET'])
def list_avatars():
    """List available AI instructor avatars"""
    try:
        from services.wav2lip_service import Wav2LipService
        service = Wav2LipService()
        return jsonify({'avatars': service.get_available_avatars()})
    except Exception as e:
        logger.error(f"Failed to list avatars: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/generate/course', methods=['POST'])
def start_course_generation():
    """Start course generation from structured content"""
    try:
        data = request.json
        user_id = data.get('user_id')
        source_document_id = data.get('source_document_id')
        ai_instructor_id = data.get('ai_instructor_id', 'default')
        course_structure = data.get('course_structure')
        
        if not user_id or not source_document_id or not course_structure:
            return jsonify({'error': 'user_id, source_document_id, and course_structure are required'}), 400
        
        from services.course_generation_service import CourseGenerationService
        service = CourseGenerationService()
        
        job = service.create_job(user_id, source_document_id, ai_instructor_id, course_structure)
        
        return jsonify({
            'success': True,
            'job_id': job['id'],
            'status': job['status'],
            'total_lessons': len(job['lesson_jobs']),
            'estimated_completion_at': job['estimated_completion_at']
        })
        
    except Exception as e:
        logger.error(f"Course generation start failed: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/generate/<job_id>/status', methods=['GET'])
def get_generation_status(job_id):
    """Get course generation job status"""
    try:
        from services.course_generation_service import CourseGenerationService
        service = CourseGenerationService()
        
        status = service.get_job_status(job_id)
        return jsonify(status)
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        logger.error(f"Failed to get job status: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/generate/<job_id>/progress', methods=['GET'])
def get_generation_progress(job_id):
    """Get detailed progress of course generation"""
    try:
        from services.course_generation_service import CourseGenerationService
        service = CourseGenerationService()
        
        job = service.get_job(job_id)
        if not job:
            return jsonify({'error': 'Job not found'}), 404
        
        return jsonify({
            'job_id': job_id,
            'status': job['status'],
            'current_step': job['current_step'],
            'progress': job['progress'],
            'lesson_jobs': job['lesson_jobs'],
            'course_structure': job['course_structure'],
            'error_message': job.get('error_message')
        })
        
    except Exception as e:
        logger.error(f"Failed to get job progress: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/generate/<job_id>/retry', methods=['POST'])
def retry_generation(job_id):
    """Retry failed generation step"""
    try:
        data = request.json or {}
        lesson_index = data.get('lesson_index')
        
        from services.course_generation_service import CourseGenerationService
        service = CourseGenerationService()
        
        job = service.retry_failed_step(job_id, lesson_index)
        
        return jsonify({
            'success': True,
            'job_id': job_id,
            'status': job['status'],
            'message': 'Retry initiated'
        })
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        logger.error(f"Retry failed: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/generate/queue', methods=['GET'])
def get_generation_queue():
    """Get generation queue status"""
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({'error': 'user_id parameter is required'}), 400
        
        from services.course_generation_service import CourseGenerationService
        service = CourseGenerationService()
        
        jobs = service.list_user_jobs(user_id)
        
        pending = [j for j in jobs if j['status'] == 'pending']
        processing = [j for j in jobs if j['status'] == 'processing']
        completed = [j for j in jobs if j['status'] == 'completed']
        failed = [j for j in jobs if j['status'] == 'failed']
        
        return jsonify({
            'user_id': user_id,
            'total_jobs': len(jobs),
            'pending': len(pending),
            'processing': len(processing),
            'completed': len(completed),
            'failed': len(failed),
            'jobs': jobs[:10]  # Return last 10 jobs
        })
        
    except Exception as e:
        logger.error(f"Failed to get queue: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/job/<job_id>/status', methods=['GET'])
def get_job_status(job_id):
    """Get status of a generation job (legacy endpoint)"""
    try:
        from services.course_generation_service import CourseGenerationService
        service = CourseGenerationService()
        
        status = service.get_job_status(job_id)
        return jsonify(status)
        
    except ValueError:
        return jsonify({
            'job_id': job_id,
            'status': 'unknown',
            'message': 'Job not found'
        }), 404
    except Exception as e:
        logger.error(f"Failed to get job status: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/output/<job_id>/<filename>', methods=['GET'])
def get_output_file(job_id, filename):
    """Download generated output file"""
    file_path = OUTPUT_DIR / job_id / filename
    
    if not file_path.exists():
        return jsonify({'error': 'File not found'}), 404
    
    return send_file(file_path)


@app.route('/api/temp/video/<filename>', methods=['GET'])
def get_temp_video(filename):
    """Serve temporary video files"""
    file_path = TEMP_DIR / 'video' / filename
    
    if not file_path.exists():
        return jsonify({'error': 'File not found'}), 404
        
    return send_file(file_path)


@app.route('/api/temp/audio/<filename>', methods=['GET'])
def get_temp_audio(filename):
    """Serve temporary audio files"""
    file_path = TEMP_DIR / 'audio' / filename
    
    if not file_path.exists():
        return jsonify({'error': 'File not found'}), 404
        
    return send_file(file_path)




def check_gpu_available():
    """Check if CUDA GPU is available"""
    try:
        import torch
        return torch.cuda.is_available()
    except ImportError:
        return False


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', '0') == '1'
    
    # Initialize database
    logger.info("Initializing database...")
    init_db()
    
    logger.info(f"Starting Wav2Lip Backend on port {port}")
    logger.info(f"GPU Available: {check_gpu_available()}")
    
    app.run(host='0.0.0.0', port=port, debug=debug)
