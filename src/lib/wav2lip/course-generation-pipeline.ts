// Course Generation Pipeline - Orchestrates TTS → Wav2Lip → Render → Transcript
// Feature: wav2lip-course-generation, Property 14: Course assembly maintains lesson order

import {
  TTSInput,
  TTSOutput,
  Wav2LipInput,
  Wav2LipOutput,
  VideoRenderInput,
  VideoRenderOutput,
  TranscriptOutput,
  LessonGenerationJob,
  AIInstructor,
  VIDEO_SPECS,
} from './types';
import { TTSService, MockTTSService } from './tts-service';
import { Wav2LipService, MockWav2LipService } from './wav2lip-service';
import { VideoRenderService, MockVideoRenderService } from './video-render-service';
import { TranscriptService, MockTranscriptService } from './transcript-service';

export interface PipelineConfig {
  ttsService: TTSService;
  wav2lipService: Wav2LipService;
  videoRenderService: VideoRenderService;
  transcriptService: TranscriptService;
  onProgress?: (job: LessonGenerationJob) => void;
}

export interface LessonInput {
  lessonId: string;
  script: string;
  instructor: AIInstructor;
}

export interface GeneratedLesson {
  lessonId: string;
  videoUrl: string;
  transcriptUrl: string;
  vttUrl: string;
  duration: number;
  resolution: { width: number; height: number };
  frameRate: number;
}

/**
 * Course Generation Pipeline
 * Orchestrates the full video generation workflow:
 * Script → TTS → Wav2Lip → Video Render → Transcript
 */
export class CourseGenerationPipeline {
  private config: PipelineConfig;

  constructor(config: PipelineConfig) {
    this.config = config;
  }

  /**
   * Generate a single lesson video
   */
  async generateLesson(input: LessonInput): Promise<GeneratedLesson> {
    const job: LessonGenerationJob = {
      id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      courseGenerationJobId: 'temp-course-id',
      lessonIndex: 0,
      title: 'Lesson',
      content: input.script,
      script: input.script,
      status: 'pending',
      progress: 0,
      retryCount: 0,
      createdAt: new Date(),
    };

    try {
      // Step 1: Generate TTS audio
      this.updateJob(job, 'tts', 10);
      const ttsOutput = await this.generateTTS(input.script, input.instructor.voiceId);
      job.ttsOutput = ttsOutput;
      this.updateJob(job, 'tts', 25);

      // Step 2: Generate lip-synced video
      this.updateJob(job, 'lipsync', 30);
      const wav2lipOutput = await this.generateLipSync(
        ttsOutput,
        input.instructor.baseVideoUrl
      );
      job.wav2lipOutput = wav2lipOutput;
      this.updateJob(job, 'lipsync', 55);

      // Step 3: Render final video
      this.updateJob(job, 'rendering', 60);
      const renderOutput = await this.renderVideo(wav2lipOutput, ttsOutput.audioUrl);
      job.renderOutput = renderOutput;
      this.updateJob(job, 'rendering', 80);

      // Step 4: Generate transcript
      this.updateJob(job, 'transcript', 85);
      const transcriptOutput = await this.generateTranscript(ttsOutput.audioUrl);
      job.transcriptOutput = transcriptOutput;
      this.updateJob(job, 'transcript', 95);

      // Step 5: Complete
      this.updateJob(job, 'completed', 100);
      job.completedAt = new Date();

      return {
        lessonId: input.lessonId,
        videoUrl: renderOutput.finalVideoUrl,
        transcriptUrl: transcriptOutput.jsonUrl,
        vttUrl: transcriptOutput.vttUrl,
        duration: renderOutput.duration,
        resolution: renderOutput.resolution,
        frameRate: renderOutput.frameRate,
      };
    } catch (error) {
      job.status = 'failed';
      job.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.config.onProgress?.(job);
      throw error;
    }
  }

  /**
   * Generate multiple lessons in order
   * Property 14: Course assembly maintains lesson order
   */
  async generateCourse(
    lessons: LessonInput[],
    onLessonComplete?: (lesson: GeneratedLesson, index: number) => void
  ): Promise<GeneratedLesson[]> {
    const results: GeneratedLesson[] = [];

    // Process lessons sequentially to maintain order
    for (let i = 0; i < lessons.length; i++) {
      const lesson = lessons[i];
      const result = await this.generateLesson(lesson);
      results.push(result);
      onLessonComplete?.(result, i);
    }

    return results;
  }

  /**
   * Generate TTS audio from script
   */
  private async generateTTS(script: string, voiceId: string): Promise<TTSOutput> {
    const input: TTSInput = {
      script,
      voiceId,
    };
    return this.config.ttsService.generateAudio(input);
  }

  /**
   * Generate lip-synced video
   */
  private async generateLipSync(
    ttsOutput: TTSOutput,
    avatarVideoUrl: string
  ): Promise<Wav2LipOutput> {
    const input: Wav2LipInput = {
      audioUrl: ttsOutput.audioUrl,
      avatarVideoUrl,
      phonemeTimings: ttsOutput.phonemeTimings,
    };
    return this.config.wav2lipService.generateLipSync(input);
  }

  /**
   * Render final video at 1080p
   */
  private async renderVideo(
    wav2lipOutput: Wav2LipOutput,
    audioUrl: string
  ): Promise<VideoRenderOutput> {
    const input: VideoRenderInput = {
      lipSyncedVideoUrl: wav2lipOutput.videoUrl,
      audioUrl,
      targetResolution: {
        width: VIDEO_SPECS.MIN_RESOLUTION_WIDTH,
        height: VIDEO_SPECS.MIN_RESOLUTION_HEIGHT,
      },
      targetFrameRate: 25,
    };
    return this.config.videoRenderService.renderVideo(input);
  }

  /**
   * Generate transcript with word-level timestamps
   */
  private async generateTranscript(audioUrl: string): Promise<TranscriptOutput> {
    return this.config.transcriptService.generateTranscript(audioUrl);
  }

  /**
   * Update job status and notify progress
   */
  private updateJob(
    job: LessonGenerationJob,
    status: LessonGenerationJob['status'],
    progress: number
  ): void {
    job.status = status;
    job.progress = progress;
    this.config.onProgress?.(job);
  }
}

/**
 * Create pipeline with real services from environment variables
 */
export function createPipeline(onProgress?: (job: LessonGenerationJob) => void): CourseGenerationPipeline {
  // Import service creators
  const { createTTSService } = require('./tts-service');
  const { createWav2LipService } = require('./wav2lip-service');
  const { createVideoRenderService } = require('./video-render-service');
  const { createTranscriptService } = require('./transcript-service');

  return new CourseGenerationPipeline({
    ttsService: createTTSService(),
    wav2lipService: createWav2LipService(),
    videoRenderService: createVideoRenderService(),
    transcriptService: createTranscriptService(),
    onProgress,
  });
}

/**
 * Create pipeline with mock services for testing
 */
export function createMockPipeline(
  onProgress?: (job: LessonGenerationJob) => void
): CourseGenerationPipeline {
  return new CourseGenerationPipeline({
    ttsService: new MockTTSService(),
    wav2lipService: new MockWav2LipService(),
    videoRenderService: new MockVideoRenderService(),
    transcriptService: new MockTranscriptService(),
    onProgress,
  });
}
