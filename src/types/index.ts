// User Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

// Course Types
export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  longDescription?: string;
  thumbnailUrl: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: number;
  aiInstructorId: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  modules?: Module[];
  aiInstructor?: AIInstructor;
}

export interface Module {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  order: number;
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  description?: string;
  videoUrl: string;
  transcriptUrl: string;
  transcriptData?: TranscriptData;
  duration: number;
  order: number;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TranscriptData {
  sentences: TranscriptSentence[];
}

export interface TranscriptSentence {
  text: string;
  startTime: number;
  endTime: number;
  words?: TranscriptWord[];
}

export interface TranscriptWord {
  text: string;
  startTime: number;
  endTime: number;
}

// Enrollment Types
export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  enrolledAt: string;
  completedAt?: string;
  lastAccessedAt?: string;
  course?: Course;
  progress?: LessonProgress[];
}

export interface LessonProgress {
  id: string;
  enrollmentId: string;
  lessonId: string;
  completed: boolean;
  watchedSeconds: number;
  lastWatchedAt: string;
  completedAt?: string;
}

// Certificate Types
export interface Certificate {
  id: string;
  userId: string;
  courseId: string;
  certificateNumber: string;
  issuedAt: string;
  pdfUrl: string;
  course?: Course;
}

// AI Instructor Types
export interface AIInstructor {
  id: string;
  name: string;
  avatarImageUrl: string;
  baseVideoUrl: string;
  voiceId: string;
  description?: string;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  code: string;
  details?: unknown;
}

// Filter Types
export interface CourseFilters {
  category?: string;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  search?: string;
  page?: number;
  limit?: number;
}

// Progress Types
export interface CourseProgress {
  courseId: string;
  completedLessons: number;
  totalLessons: number;
  percentage: number;
  lastWatchedLesson?: Lesson;
}

// Statistics Types
export interface UserStatistics {
  hoursLearned: number;
  lessonsCompleted: number;
  coursesCompleted: number;
  currentStreak: number;
}
