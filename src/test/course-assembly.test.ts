import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  CourseAssemblyService,
  CourseAssemblyResult,
} from '../lib/wav2lip/course-assembly-service';
import {
  CourseStructure,
  ModuleStructure,
  LessonStructure,
} from '../lib/wav2lip/types';

// Generators for property-based testing

const lessonStructureGen = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  content: fc.string({ minLength: 10, maxLength: 1000 }),
  order: fc.nat({ max: 100 }),
  estimatedDuration: fc.integer({ min: 300, max: 900 }), // 5-15 minutes in seconds
});

const moduleStructureGen = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.string({ minLength: 10, maxLength: 500 }),
  order: fc.nat({ max: 20 }),
  lessons: fc.array(lessonStructureGen, { minLength: 1, maxLength: 10 }),
});

const courseStructureGen = fc.record({
  title: fc.string({ minLength: 1, maxLength: 200 }),
  description: fc.string({ minLength: 10, maxLength: 1000 }),
  category: fc.constantFrom('Technology', 'Business', 'Science', 'Arts'),
  difficulty: fc.constantFrom('Beginner', 'Intermediate', 'Advanced'),
  modules: fc.array(moduleStructureGen, { minLength: 1, maxLength: 5 }),
  estimatedDuration: fc.integer({ min: 1800, max: 36000 }),
  userModified: fc.boolean(),
});

const completedLessonJobGen = (index: number, courseJobId: string) =>
  fc.record({
    id: fc.uuid(),
    courseGenerationJobId: fc.constant(courseJobId),
    lessonIndex: fc.constant(index),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    content: fc.string({ minLength: 10, maxLength: 1000 }),
    script: fc.string({ minLength: 50, maxLength: 5000 }),
    status: fc.constant('completed' as const),
    audioUrl: fc.webUrl(),
    videoUrl: fc.webUrl(),
    transcriptUrl: fc.webUrl(),
    duration: fc.integer({ min: 60, max: 900 }),
    errorMessage: fc.constant(undefined),
    retryCount: fc.constant(0),
    progress: fc.constant(100),
    createdAt: fc.date(),
    completedAt: fc.date(),
  });

const courseGenerationJobGen = (lessonCount: number) =>
  fc.record({
    id: fc.uuid(),
    userId: fc.uuid(),
    sourceDocumentId: fc.uuid(),
    aiInstructorId: fc.uuid(),
    status: fc.constant('processing' as const),
    currentStep: fc.constant('generating_videos' as const),
    progress: fc.integer({ min: 0, max: 100 }),
    courseStructure: courseStructureGen,
    generatedCourseId: fc.uuid(),
    errorMessage: fc.constant(undefined),
    startedAt: fc.date(),
    completedAt: fc.constant(undefined),
    estimatedCompletionAt: fc.date(),
    createdAt: fc.date(),
  }).map(job => {
    // Create lessons with sequential indices 0, 1, 2, ...
    const lessons: any[] = [];
    for (let i = 0; i < lessonCount; i++) {
      const lessonSample = fc.sample(completedLessonJobGen(i, job.id), 1)[0];
      lessons.push(lessonSample);
    }
    
    return {
      ...job,
      lessonJobs: lessons,
    };
  });

describe('Course Assembly Tests', () => {
  const service = new CourseAssemblyService();

  describe('Property 14: Course assembly maintains lesson order', () => {
    // Feature: wav2lip-course-generation, Property 14: Course assembly maintains lesson order
    // **Validates: Requirements 5.5**
    it('should maintain lesson order for any set of completed lessons', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 20 }).chain(count => courseGenerationJobGen(count)),
          async (job) => {
            // Remove course structure to avoid mismatch
            const jobWithoutStructure: any = { ...job, courseStructure: undefined };
            const result = await service.assembleCourse(jobWithoutStructure, job.lessonJobs);

            // Verify all lessons are present
            const totalLessons = result.modules.reduce(
              (sum, module) => sum + module.lessons.length,
              0
            );
            expect(totalLessons).toBe(job.lessonJobs.length);

            // Verify lessons are in order within each module
            for (const module of result.modules) {
              const orders = module.lessons.map(l => l.order);
              const sortedOrders = [...orders].sort((a, b) => a - b);
              expect(orders).toEqual(sortedOrders);
            }

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    // Feature: wav2lip-course-generation, Property 14: Course assembly maintains lesson order
    // **Validates: Requirements 5.5**
    it('should preserve lesson order regardless of input order', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 3, max: 10 }).chain(count => courseGenerationJobGen(count)),
          async (job) => {
            // Shuffle lesson jobs
            const shuffled = [...job.lessonJobs].sort(() => Math.random() - 0.5);

            // Remove course structure to avoid mismatch
            const jobWithoutStructure: any = { ...job, courseStructure: undefined };
            const result = await service.assembleCourse(jobWithoutStructure, shuffled);

            // Extract all lesson IDs in order
            const lessonIds: string[] = [];
            for (const module of result.modules) {
              for (const lesson of module.lessons) {
                lessonIds.push(lesson.id);
              }
            }

            // Verify lessons are sorted by their original index
            const sortedJobLessons = [...job.lessonJobs].sort(
              (a, b) => a.lessonIndex - b.lessonIndex
            );
            const expectedIds = sortedJobLessons.map(l => l.id);

            expect(lessonIds).toEqual(expectedIds);

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    // Feature: wav2lip-course-generation, Property 14: Course assembly maintains lesson order
    // **Validates: Requirements 5.5**
    it('should reject assembly if lessons are incomplete', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 10 }).chain(count => courseGenerationJobGen(count)),
          async (job) => {
            // Mark one lesson as incomplete
            const incompleteLessons = [...job.lessonJobs];
            incompleteLessons[0] = {
              ...incompleteLessons[0],
              status: 'pending' as const,
            };

            await expect(
              service.assembleCourse(job, incompleteLessons)
            ).rejects.toThrow('not completed');

            return true;
          }
        ),
        { numRuns: 30 }
      );
    });

    // Feature: wav2lip-course-generation, Property 14: Course assembly maintains lesson order
    // **Validates: Requirements 5.5**
    it('should calculate correct total duration', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 15 }).chain(count => courseGenerationJobGen(count)),
          async (job) => {
            const result = await service.assembleCourse(job, job.lessonJobs);

            const expectedDuration = job.lessonJobs.reduce(
              (sum, lesson) => sum + (lesson.duration || 0),
              0
            );

            expect(result.totalDuration).toBe(expectedDuration);

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 15: Progress tracking reflects actual state', () => {
    // Feature: wav2lip-course-generation, Property 15: Progress tracking reflects actual state
    // **Validates: Requirements 6.1, 6.2, 6.5**
    it('should validate assembly result structure', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }).chain(count => courseGenerationJobGen(count)),
          async (job) => {
            // Remove course structure to avoid mismatch
            const jobWithoutStructure: any = { ...job, courseStructure: undefined };
            const result = await service.assembleCourse(jobWithoutStructure, job.lessonJobs);

            const validation = service.validateAssembly(result);

            expect(validation.valid).toBe(true);
            expect(validation.errors).toHaveLength(0);

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should reject invalid assembly results', () => {
      const invalidResult: CourseAssemblyResult = {
        courseId: '',
        title: '',
        description: '',
        totalLessons: 0,
        totalDuration: 0,
        modules: [],
        createdAt: new Date(),
      };

      const validation = service.validateAssembly(invalidResult);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single lesson course', async () => {
      const job = await fc.sample(courseGenerationJobGen(1), 1)[0];

      const result = await service.assembleCourse(job, job.lessonJobs);

      expect(result.totalLessons).toBe(1);
      expect(result.modules.length).toBeGreaterThan(0);
    });

    it('should handle course without structure', async () => {
      const job = await fc.sample(courseGenerationJobGen(3), 1)[0];
      const jobWithoutStructure: any = { ...job, courseStructure: undefined };

      const result = await service.assembleCourse(
        jobWithoutStructure,
        job.lessonJobs
      );

      expect(result.totalLessons).toBe(3);
      expect(result.modules.length).toBe(1); // Should create default module
      expect(result.modules[0].lessons.length).toBe(3);
    });
  });
});
