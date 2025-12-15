// Wav2Lip Video Generation Types

export interface TTSInput {
  script: string;
  voiceId: string;
  speakingRate?: number; // 0.5 to 2.0, default 1.0
}

export interface TTSOutput {
  audioUrl: string;
  audioDuration: number; // seconds
  phonemeTimings: PhonemeTimings[];
}

export interface PhonemeTimings {
  phoneme: string;
  startTime: number; // milliseconds
  endTime: number; // milliseconds
}

export interface Wav2LipInput {
  audioUrl: string;
  avatarVideoUrl: string;
  phonemeTimings: PhonemeTimings[];
}

export interface Wav2LipOutput {
  videoUrl: string;
  duration: number; // seconds
  resolution: VideoResolution;
  frameRate: number;
}

export interface VideoResolution {
  width: number;
  height: number;
}

export interface VideoRenderInput {
  lipSyncedVideoUrl: string;
  audioUrl: string;
  targetResolution: VideoResolution;
  targetFrameRate: number;
}

export interface VideoRenderOutput {
  finalVideoUrl: string;
  duration: number;
  resolution: VideoResolution;
  frameRate: number;
  fileSize: number; // bytes
}

export interface TranscriptWord {
  word: string;
  startTime: number; // milliseconds
  endTime: number; // milliseconds
  confidence: number; // 0 to 1
}

export interface TranscriptOutput {
  words: TranscriptWord[];
  fullText: string;
  vttUrl: string;
  jsonUrl: string;
}

export interface LessonGenerationJob {
  id: string;
  courseGenerationJobId: string;
  lessonIndex: number;
  title: string;
  content: string;
  script?: string;
  status: 'pending' | 'scripting' | 'tts' | 'lipsync' | 'rendering' | 'transcript' | 'completed' | 'failed';
  audioUrl?: string;
  videoUrl?: string;
  transcriptUrl?: string;
  duration?: number;
  errorMessage?: string;
  retryCount: number;
  progress: number; // 0 to 100
  ttsOutput?: TTSOutput;
  wav2lipOutput?: Wav2LipOutput;
  renderOutput?: VideoRenderOutput;
  transcriptOutput?: TranscriptOutput;
  createdAt: Date;
  completedAt?: Date;
}

export type GenerationStep = 
  | 'queued'
  | 'extracting'
  | 'structuring'
  | 'scripting'
  | 'generating_videos'
  | 'assembling'
  | 'completed'
  | 'failed';

export interface CourseGenerationJob {
  id: string;
  userId: string;
  sourceDocumentId: string;
  aiInstructorId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  currentStep: GenerationStep;
  progress: number; // 0 to 100
  lessonJobs: LessonGenerationJob[];
  courseStructure?: CourseStructure;
  generatedCourseId?: string;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
  estimatedCompletionAt?: Date;
  createdAt: Date;
}

export interface CourseStructure {
  title: string;
  description: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  modules: ModuleStructure[];
  estimatedDuration: number;
  userModified: boolean;
}

export interface ModuleStructure {
  id: string;
  title: string;
  description: string;
  order: number;
  lessons: LessonStructure[];
}

export interface LessonStructure {
  id: string;
  title: string;
  content: string;
  order: number;
  estimatedDuration: number;
}

export interface AIInstructor {
  id: string;
  name: string;
  avatarImageUrl: string;
  baseVideoUrl: string;
  voiceId: string;
  description?: string;
}

// Validation constants
export const VIDEO_SPECS = {
  MIN_RESOLUTION_WIDTH: 1920,
  MIN_RESOLUTION_HEIGHT: 1080,
  MIN_FRAME_RATE: 24,
  MAX_FRAME_RATE: 30,
  SUPPORTED_FORMATS: ['mp4', 'webm'],
} as const;

export const TTS_SPECS = {
  MIN_SPEAKING_RATE: 0.5,
  MAX_SPEAKING_RATE: 2.0,
  DEFAULT_SPEAKING_RATE: 1.0,
  MAX_SCRIPT_LENGTH: 10000, // characters
} as const;
