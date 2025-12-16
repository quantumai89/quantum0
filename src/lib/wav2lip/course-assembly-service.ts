// Course Assembly Service
// Feature: wav2lip-course-generation, Property 14: Course assembly maintains lesson order
// Validates: Requirements 5.5

import {
  CourseGenerationJob,
  LessonGenerationJob,
  CourseStructure,
} from './types';

export interface CourseAssemblyResult {
  courseId: string;
  title: string;
  description: string;
  totalLessons: number;
  totalDuration: number;
  modules: AssembledModule[];
  createdAt: Date;
}

export interface AssembledModule {
  id: string;
  title: string;
  order: number;
  lessons: AssembledLesson[];
}

export interface AssembledLesson {
  id: string;
  title: string;
  order: number;
  videoUrl: string;
  transcriptUrl: string;
  duration: number;
}

/**
 * Course Assembly Service
 * Assembles all lesson videos into a complete course with proper ordering
 */
export class CourseAssemblyService {
  /**
   * Assemble course from completed lesson jobs
   * Property 14: Course assembly maintains lesson order
   */
  async assembleCourse(
    job: CourseGenerationJob,
    lessonJobs: LessonGenerationJob[]
  ): Promise<CourseAssemblyResult> {
    // Validate all lessons are completed
    this.validateLessonsComplete(lessonJobs);

    // Sort lessons by index to maintain order
    const sortedLessons = this.sortLessonsByOrder(lessonJobs);

    // Validate order is maintained
    this.validateLessonOrder(sortedLessons);

    // Group lessons into modules based on course structure
    const modules = this.groupLessonsIntoModules(
      sortedLessons,
      job.courseStructure
    );

    // Calculate total duration
    const totalDuration = this.calculateTotalDuration(sortedLessons);

    const result: CourseAssemblyResult = {
      courseId: job.generatedCourseId || `course-${job.id}`,
      title: job.courseStructure?.title || 'Generated Course',
      description: job.courseStructure?.description || '',
      totalLessons: sortedLessons.length,
      totalDuration,
      modules,
      createdAt: new Date(),
    };

    return result;
  }

  /**
   * Validate all lessons are completed
   */
  private validateLessonsComplete(lessons: LessonGenerationJob[]): void {
    const incomplete = lessons.filter(l => l.status !== 'completed');
    if (incomplete.length > 0) {
      throw new Error(
        `Cannot assemble course: ${incomplete.length} lessons not completed`
      );
    }

    const missingVideo = lessons.filter(l => !l.videoUrl);
    if (missingVideo.length > 0) {
      throw new Error(
        `Cannot assemble course: ${missingVideo.length} lessons missing video URL`
      );
    }
  }

  /**
   * Sort lessons by their index to maintain order
   * Property 14: For any set of generated lesson videos, 
   * the assembled course should contain all lessons in the correct order
   */
  private sortLessonsByOrder(lessons: LessonGenerationJob[]): LessonGenerationJob[] {
    return [...lessons].sort((a, b) => a.lessonIndex - b.lessonIndex);
  }

  /**
   * Validate lesson order is sequential
   */
  private validateLessonOrder(lessons: LessonGenerationJob[]): void {
    for (let i = 0; i < lessons.length; i++) {
      if (lessons[i].lessonIndex !== i) {
        throw new Error(
          `Lesson order validation failed: expected index ${i}, got ${lessons[i].lessonIndex}`
        );
      }
    }
  }

  /**
   * Group lessons into modules based on course structure
   */
  private groupLessonsIntoModules(
    lessons: LessonGenerationJob[],
    structure?: CourseStructure
  ): AssembledModule[] {
    if (!structure || !structure.modules || structure.modules.length === 0) {
      // Create single module with all lessons
      return [
        {
          id: 'module-1',
          title: 'Course Content',
          order: 0,
          lessons: lessons.map((lesson, index) => this.createAssembledLesson(lesson, index)),
        },
      ];
    }

    // Map lessons to modules based on structure
    const modules: AssembledModule[] = [];
    let lessonIndex = 0;

    for (const moduleStructure of structure.modules) {
      const moduleLessons: AssembledLesson[] = [];

      for (const lessonStructure of moduleStructure.lessons) {
        if (lessonIndex < lessons.length) {
          const lesson = lessons[lessonIndex];
          moduleLessons.push(
            this.createAssembledLesson(lesson, lessonStructure.order)
          );
          lessonIndex++;
        }
      }

      if (moduleLessons.length > 0) {
        modules.push({
          id: moduleStructure.id,
          title: moduleStructure.title,
          order: moduleStructure.order,
          lessons: moduleLessons,
        });
      }
    }

    return modules;
  }

  /**
   * Create assembled lesson from lesson job
   */
  private createAssembledLesson(
    lesson: LessonGenerationJob,
    order: number
  ): AssembledLesson {
    return {
      id: lesson.id,
      title: lesson.title,
      order,
      videoUrl: lesson.videoUrl!,
      transcriptUrl: lesson.transcriptUrl || '',
      duration: lesson.duration || 0,
    };
  }

  /**
   * Calculate total duration of all lessons
   */
  private calculateTotalDuration(lessons: LessonGenerationJob[]): number {
    return lessons.reduce((total, lesson) => total + (lesson.duration || 0), 0);
  }

  /**
   * Validate course assembly result
   */
  validateAssembly(result: CourseAssemblyResult): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!result.courseId) {
      errors.push('Course ID is required');
    }

    if (!result.title || result.title.trim().length === 0) {
      errors.push('Course title is required');
    }

    if (result.totalLessons === 0) {
      errors.push('Course must have at least one lesson');
    }

    if (result.modules.length === 0) {
      errors.push('Course must have at least one module');
    }

    // Validate lesson order within each module
    for (const module of result.modules) {
      const lessonOrders = module.lessons.map(l => l.order);
      const sortedOrders = [...lessonOrders].sort((a, b) => a - b);
      
      for (let i = 0; i < lessonOrders.length; i++) {
        if (lessonOrders[i] !== sortedOrders[i]) {
          errors.push(`Module "${module.title}" has lessons out of order`);
          break;
        }
      }

      // Validate all lessons have required fields
      for (const lesson of module.lessons) {
        if (!lesson.videoUrl) {
          errors.push(`Lesson "${lesson.title}" missing video URL`);
        }
        if (lesson.duration <= 0) {
          errors.push(`Lesson "${lesson.title}" has invalid duration`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

/**
 * Create Course Assembly service
 */
export function createCourseAssemblyService(): CourseAssemblyService {
  return new CourseAssemblyService();
}
