"""
Course Generation Service
Manages course generation jobs and orchestrates the video generation pipeline
Feature: wav2lip-course-generation
"""

import os
import json
import logging
import uuid
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

TEMP_DIR = Path(os.getenv('TEMP_DIR', './temp'))
OUTPUT_DIR = Path(os.getenv('OUTPUT_DIR', './output'))


class CourseGenerationService:
    """Service for managing course generation jobs"""
    
    def __init__(self):
        self.jobs_dir = OUTPUT_DIR / 'jobs'
        self.jobs_dir.mkdir(parents=True, exist_ok=True)
    
    def create_job(
        self,
        user_id: str,
        source_document_id: str,
        ai_instructor_id: str,
        course_structure: Dict
    ) -> Dict:
        """
        Create a new course generation job
        
        Args:
            user_id: User ID
            source_document_id: Source PDF document ID
            ai_instructor_id: AI instructor to use
            course_structure: Course structure with modules and lessons
            
        Returns:
            Job dictionary
        """
        job_id = str(uuid.uuid4())
        
        job = {
            'id': job_id,
            'user_id': user_id,
            'source_document_id': source_document_id,
            'ai_instructor_id': ai_instructor_id,
            'status': 'pending',
            'current_step': 'queued',
            'progress': 0,
            'lesson_jobs': [],
            'course_structure': course_structure,
            'generated_course_id': None,
            'error_message': None,
            'started_at': None,
            'completed_at': None,
            'estimated_completion_at': None,
            'created_at': datetime.utcnow().isoformat(),
        }
        
        # Create lesson jobs
        lesson_jobs = self._create_lesson_jobs(job_id, course_structure)
        job['lesson_jobs'] = lesson_jobs
        
        # Estimate completion time
        total_lessons = len(lesson_jobs)
        estimated_minutes = total_lessons * 5  # Rough estimate: 5 min per lesson
        job['estimated_completion_at'] = (
            datetime.utcnow() + timedelta(minutes=estimated_minutes)
        ).isoformat()
        
        # Save job
        self._save_job(job)
        
        logger.info(f"Created course generation job: {job_id}")
        return job
    
    def _create_lesson_jobs(self, course_job_id: str, course_structure: Dict) -> List[Dict]:
        """Create lesson generation jobs from course structure"""
        lesson_jobs = []
        lesson_index = 0
        
        for module in course_structure.get('modules', []):
            for lesson in module.get('lessons', []):
                lesson_job = {
                    'id': str(uuid.uuid4()),
                    'course_generation_job_id': course_job_id,
                    'lesson_index': lesson_index,
                    'title': lesson.get('title', f'Lesson {lesson_index + 1}'),
                    'content': lesson.get('content', ''),
                    'script': None,
                    'status': 'pending',
                    'audio_url': None,
                    'video_url': None,
                    'transcript_url': None,
                    'duration': None,
                    'error_message': None,
                    'retry_count': 0,
                    'progress': 0,
                    'created_at': datetime.utcnow().isoformat(),
                    'completed_at': None,
                }
                lesson_jobs.append(lesson_job)
                lesson_index += 1
        
        return lesson_jobs
    
    def get_job(self, job_id: str) -> Optional[Dict]:
        """Get job by ID"""
        job_file = self.jobs_dir / f"{job_id}.json"
        if not job_file.exists():
            return None
        
        with open(job_file, 'r') as f:
            return json.load(f)
    
    def update_job(self, job_id: str, updates: Dict) -> Dict:
        """Update job with new data"""
        job = self.get_job(job_id)
        if not job:
            raise ValueError(f"Job not found: {job_id}")
        
        job.update(updates)
        self._save_job(job)
        return job
    
    def update_job_progress(
        self,
        job_id: str,
        current_step: str,
        progress: int,
        status: str = None
    ) -> Dict:
        """Update job progress"""
        updates = {
            'current_step': current_step,
            'progress': progress,
        }
        
        if status:
            updates['status'] = status
        
        if current_step == 'completed':
            updates['completed_at'] = datetime.utcnow().isoformat()
            updates['status'] = 'completed'
        
        return self.update_job(job_id, updates)
    
    def update_lesson_job(
        self,
        job_id: str,
        lesson_index: int,
        updates: Dict
    ) -> Dict:
        """Update a specific lesson job"""
        job = self.get_job(job_id)
        if not job:
            raise ValueError(f"Job not found: {job_id}")
        
        lesson_jobs = job.get('lesson_jobs', [])
        if lesson_index >= len(lesson_jobs):
            raise ValueError(f"Lesson index {lesson_index} out of range")
        
        lesson_jobs[lesson_index].update(updates)
        
        # Update overall job progress
        completed_lessons = sum(1 for l in lesson_jobs if l['status'] == 'completed')
        total_lessons = len(lesson_jobs)
        overall_progress = int((completed_lessons / total_lessons) * 100) if total_lessons > 0 else 0
        
        job['lesson_jobs'] = lesson_jobs
        job['progress'] = overall_progress
        
        self._save_job(job)
        return job
    
    def get_job_status(self, job_id: str) -> Dict:
        """Get job status summary"""
        job = self.get_job(job_id)
        if not job:
            raise ValueError(f"Job not found: {job_id}")
        
        lesson_jobs = job.get('lesson_jobs', [])
        completed = sum(1 for l in lesson_jobs if l['status'] == 'completed')
        failed = sum(1 for l in lesson_jobs if l['status'] == 'failed')
        
        return {
            'job_id': job_id,
            'status': job['status'],
            'current_step': job['current_step'],
            'progress': job['progress'],
            'total_lessons': len(lesson_jobs),
            'completed_lessons': completed,
            'failed_lessons': failed,
            'estimated_completion_at': job.get('estimated_completion_at'),
            'error_message': job.get('error_message'),
        }
    
    def retry_failed_step(self, job_id: str, lesson_index: Optional[int] = None) -> Dict:
        """Retry a failed job or lesson"""
        job = self.get_job(job_id)
        if not job:
            raise ValueError(f"Job not found: {job_id}")
        
        if lesson_index is not None:
            # Retry specific lesson
            lesson_jobs = job.get('lesson_jobs', [])
            if lesson_index >= len(lesson_jobs):
                raise ValueError(f"Lesson index {lesson_index} out of range")
            
            lesson = lesson_jobs[lesson_index]
            lesson['status'] = 'pending'
            lesson['error_message'] = None
            lesson['retry_count'] += 1
            
            job['lesson_jobs'] = lesson_jobs
            self._save_job(job)
            
            logger.info(f"Retrying lesson {lesson_index} in job {job_id}")
        else:
            # Retry entire job
            job['status'] = 'pending'
            job['current_step'] = 'queued'
            job['error_message'] = None
            self._save_job(job)
            
            logger.info(f"Retrying job {job_id}")
        
        return job
    
    def _save_job(self, job: Dict):
        """Save job to disk"""
        job_file = self.jobs_dir / f"{job['id']}.json"
        with open(job_file, 'w') as f:
            json.dump(job, f, indent=2)
    
    def list_user_jobs(self, user_id: str) -> List[Dict]:
        """List all jobs for a user"""
        jobs = []
        for job_file in self.jobs_dir.glob('*.json'):
            with open(job_file, 'r') as f:
                job = json.load(f)
                if job.get('user_id') == user_id:
                    jobs.append(job)
        
        # Sort by created_at descending
        jobs.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        return jobs
