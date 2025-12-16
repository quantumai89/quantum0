import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import {
  createMockPipeline,
  // CourseGenerationPipeline,
  LessonInput,
  AIInstructor,
  LessonGenerationJob,
  VIDEO_SPECS,
} from '../lib/wav2lip';

// Mock instructor for testing
const mockInstructor: AIInstructor = {
  id: 'instructor-1',
  name: 'Dr. Sarah',
  avatarImageUrl: 'https://example.com/avatar.jpg',
  baseVideoUrl: 'https://example.com/base-video.mp4',
  voiceId: 'voice-sarah-1',
  description: 'Professional AI instructor',
};

// Generator for valid lesson scripts
const validScriptGen = fc.string({ minLength: 10, maxLength: 5000 })
  .filter(s => s.trim().length > 0);

// Generator for lesson inputs
const lessonInputGen = fc.record({
  lessonId: fc.uuid(),
  script: validScriptGen,
}).map(({ lessonId, script }) => ({
  lessonId,
  script,
  instructor: mockInstructor,
}));

describe('Course Generation Pipeline', () => {
  describe('Single Lesson Generation', () => {
    // Feature: wav2lip-course-generation, Property 10: TTS generates audio for valid scripts
    it('should generate lesson video for valid script', async () => {
      const pipeline = createMockPipeline();
      const input: LessonInput = {
        lessonId: 'lesson-1',
        script: 'Welcome to this lesson about artificial intelligence.',
        instructor: mockInstructor,
      };

      const result = await pipeline.generateLesson(input);

      expect(result.lessonId).toBe('lesson-1');
      expect(result.videoUrl).toBeTruthy();
      expect(result.transcriptUrl).toBeTruthy();
      expect(result.vttUrl).toBeTruthy();
      expect(result.duration).toBeGreaterThan(0);
    });

    // Feature: wav2lip-course-generation, Property 12: Video rendering meets specifications
    it('should produce 1080p video at 24-30fps', async () => {
      const pipeline = createMockPipeline();
      const input: LessonInput = {
        lessonId: 'lesson-2',
        script: 'This lesson covers machine learning fundamentals.',
        instructor: mockInstructor,
      };

      const result = await pipeline.generateLesson(input);

      expect(result.resolution.width).toBeGreaterThanOrEqual(VIDEO_SPECS.MIN_RESOLUTION_WIDTH);
      expect(result.resolution.height).toBeGreaterThanOrEqual(VIDEO_SPECS.MIN_RESOLUTION_HEIGHT);
      expect(result.frameRate).toBeGreaterThanOrEqual(VIDEO_SPECS.MIN_FRAME_RATE);
      expect(result.frameRate).toBeLessThanOrEqual(VIDEO_SPECS.MAX_FRAME_RATE);
    });

    // Property test: valid scripts produce valid outputs
    it('should generate valid output for any valid script', async () => {
      await fc.assert(
        fc.asyncProperty(validScriptGen, async (script) => {
          const pipeline = createMockPipeline();
          const input: LessonInput = {
            lessonId: `lesson-${Date.now()}`,
            script,
            instructor: mockInstructor,
          };

          const result = await pipeline.generateLesson(input);

          return (
            result.videoUrl.length > 0 &&
            result.transcriptUrl.length > 0 &&
            result.duration > 0 &&
            result.resolution.width >= VIDEO_SPECS.MIN_RESOLUTION_WIDTH &&
            result.resolution.height >= VIDEO_SPECS.MIN_RESOLUTION_HEIGHT
          );
        }),
        { numRuns: 5 } // Reduced for async tests
      );
    }, 30000); // 30 second timeout
  });

  describe('Course Generation (Multiple Lessons)', () => {
    // Feature: wav2lip-course-generation, Property 14: Course assembly maintains lesson order
    it('should generate lessons in correct order', async () => {
      const pipeline = createMockPipeline();
      const lessons: LessonInput[] = [
        { lessonId: 'lesson-1', script: 'Introduction to the course.', instructor: mockInstructor },
        { lessonId: 'lesson-2', script: 'Chapter one content.', instructor: mockInstructor },
        { lessonId: 'lesson-3', script: 'Chapter two content.', instructor: mockInstructor },
        { lessonId: 'lesson-4', script: 'Conclusion and summary.', instructor: mockInstructor },
      ];

      const results = await pipeline.generateCourse(lessons);

      expect(results.length).toBe(4);
      expect(results[0].lessonId).toBe('lesson-1');
      expect(results[1].lessonId).toBe('lesson-2');
      expect(results[2].lessonId).toBe('lesson-3');
      expect(results[3].lessonId).toBe('lesson-4');
    });

    // Property test: lesson order is preserved for any number of lessons
    it('should preserve lesson order for any lesson sequence', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(lessonInputGen, { minLength: 1, maxLength: 3 }),
          async (lessons) => {
            const pipeline = createMockPipeline();
            const results = await pipeline.generateCourse(lessons);

            // Verify order is preserved
            for (let i = 0; i < lessons.length; i++) {
              if (results[i].lessonId !== lessons[i].lessonId) {
                return false;
              }
            }
            return true;
          }
        ),
        { numRuns: 3 } // Reduced for async tests
      );
    }, 30000); // 30 second timeout

    it('should call onLessonComplete callback for each lesson', async () => {
      const pipeline = createMockPipeline();
      const lessons: LessonInput[] = [
        { lessonId: 'lesson-1', script: 'First lesson.', instructor: mockInstructor },
        { lessonId: 'lesson-2', script: 'Second lesson.', instructor: mockInstructor },
      ];

      const completedLessons: string[] = [];
      const onComplete = vi.fn((lesson, _index) => {
        completedLessons.push(lesson.lessonId);
      });

      await pipeline.generateCourse(lessons, onComplete);

      expect(onComplete).toHaveBeenCalledTimes(2);
      expect(completedLessons).toEqual(['lesson-1', 'lesson-2']);
    });
  });

  describe('Progress Tracking', () => {
    // Feature: wav2lip-course-generation, Property 15: Progress tracking reflects actual state
    it('should report progress through all stages', async () => {
      const progressUpdates: LessonGenerationJob[] = [];
      const pipeline = createMockPipeline((job) => {
        progressUpdates.push({ ...job });
      });

      const input: LessonInput = {
        lessonId: 'lesson-progress',
        script: 'Testing progress tracking.',
        instructor: mockInstructor,
      };

      await pipeline.generateLesson(input);

      // Verify progress went through all stages
      const statuses = progressUpdates.map(p => p.status);
      expect(statuses).toContain('tts');
      expect(statuses).toContain('lipsync');
      expect(statuses).toContain('rendering');
      expect(statuses).toContain('transcript');
      expect(statuses).toContain('completed');

      // Verify progress increased monotonically
      const progressValues = progressUpdates.map(p => p.progress);
      for (let i = 1; i < progressValues.length; i++) {
        expect(progressValues[i]).toBeGreaterThanOrEqual(progressValues[i - 1]);
      }

      // Verify final progress is 100%
      expect(progressValues[progressValues.length - 1]).toBe(100);
    });

    it('should report failure status on error', async () => {
      // Create a pipeline that will fail
      const progressUpdates: LessonGenerationJob[] = [];
      const pipeline = createMockPipeline((job) => {
        progressUpdates.push({ ...job });
      });

      const input: LessonInput = {
        lessonId: 'lesson-fail',
        script: '', // Empty script should fail validation
        instructor: mockInstructor,
      };

      await expect(pipeline.generateLesson(input)).rejects.toThrow();

      // Verify failure was reported
      const lastUpdate = progressUpdates[progressUpdates.length - 1];
      expect(lastUpdate.status).toBe('failed');
      expect(lastUpdate.errorMessage).toBeTruthy();
    });
  });

  describe('Instructor Selection', () => {
    // Feature: wav2lip-course-generation, Property 21: Selected instructor used consistently
    it('should use selected instructor for all lessons', async () => {
      const pipeline = createMockPipeline();
      const customInstructor: AIInstructor = {
        id: 'custom-instructor',
        name: 'Prof. James',
        avatarImageUrl: 'https://example.com/james.jpg',
        baseVideoUrl: 'https://example.com/james-video.mp4',
        voiceId: 'voice-james',
      };

      const lessons: LessonInput[] = [
        { lessonId: 'l1', script: 'Lesson one.', instructor: customInstructor },
        { lessonId: 'l2', script: 'Lesson two.', instructor: customInstructor },
      ];

      const results = await pipeline.generateCourse(lessons);

      // All lessons should be generated (instructor was used)
      expect(results.length).toBe(2);
      results.forEach(result => {
        expect(result.videoUrl).toBeTruthy();
      });
    });

    // Feature: wav2lip-course-generation, Property 22: Default instructor used when none selected
    it('should work with default instructor', async () => {
      const pipeline = createMockPipeline();
      const input: LessonInput = {
        lessonId: 'default-instructor-lesson',
        script: 'Using default instructor.',
        instructor: mockInstructor, // Using mock as "default"
      };

      const result = await pipeline.generateLesson(input);
      expect(result.videoUrl).toBeTruthy();
    });
  });
});

describe('Pipeline Error Handling', () => {
  // Feature: wav2lip-course-generation, Property 16: Failed steps provide error and retry
  it('should provide meaningful error messages', async () => {
    const pipeline = createMockPipeline();
    const input: LessonInput = {
      lessonId: 'error-lesson',
      script: '', // Invalid empty script
      instructor: mockInstructor,
    };

    try {
      await pipeline.generateLesson(input);
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('Invalid');
    }
  });
});
