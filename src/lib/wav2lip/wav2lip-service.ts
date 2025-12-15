// Wav2Lip Service - Lip-Sync Video Generation
// Feature: wav2lip-course-generation, Property 11: Wav2Lip produces lip-synced video

import {
  Wav2LipInput,
  Wav2LipOutput,
  VideoResolution,
  VIDEO_SPECS,
  PhonemeTimings,
} from './types';
import { validateWav2LipOutput } from './validators';

export interface Wav2LipServiceConfig {
  apiUrl: string;
  apiKey?: string;
  defaultResolution?: VideoResolution;
  defaultFrameRate?: number;
}

export interface Wav2LipProcessRequest {
  audio_url: string;
  avatar_video_url: string;
  phoneme_timings?: PhonemeTimings[];
  output_resolution?: {
    width: number;
    height: number;
  };
  output_fps?: number;
}

export interface Wav2LipProcessResponse {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  video_url?: string;
  duration?: number;
  resolution?: VideoResolution;
  frame_rate?: number;
  error?: string;
}

/**
 * Wav2Lip Service for generating lip-synced videos
 * Communicates with Python backend running Wav2Lip model
 */
export class Wav2LipService {
  private config: Wav2LipServiceConfig;

  constructor(config: Wav2LipServiceConfig) {
    this.config = {
      ...config,
      defaultResolution: config.defaultResolution || {
        width: VIDEO_SPECS.MIN_RESOLUTION_WIDTH,
        height: VIDEO_SPECS.MIN_RESOLUTION_HEIGHT,
      },
      defaultFrameRate: config.defaultFrameRate || 25,
    };
  }

  /**
   * Generate lip-synced video from audio and avatar
   */
  async generateLipSync(input: Wav2LipInput): Promise<Wav2LipOutput> {
    // Start processing job
    const jobId = await this.startProcessing(input);

    // Poll for completion
    const result = await this.waitForCompletion(jobId);

    // Validate output
    const validation = validateWav2LipOutput(result);
    if (!validation.valid) {
      throw new Error(`Invalid Wav2Lip output: ${validation.errors.join(', ')}`);
    }

    return result;
  }

  /**
   * Start Wav2Lip processing job
   */
  private async startProcessing(input: Wav2LipInput): Promise<string> {
    const request: Wav2LipProcessRequest = {
      audio_url: input.audioUrl,
      avatar_video_url: input.avatarVideoUrl,
      phoneme_timings: input.phonemeTimings,
      output_resolution: this.config.defaultResolution,
      output_fps: this.config.defaultFrameRate,
    };

    const response = await fetch(`${this.config.apiUrl}/wav2lip/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Wav2Lip API error: ${response.status} - ${error}`);
    }

    const data: Wav2LipProcessResponse = await response.json();
    return data.job_id;
  }

  /**
   * Poll for job completion
   */
  private async waitForCompletion(
    jobId: string,
    maxAttempts: number = 120,
    intervalMs: number = 5000
  ): Promise<Wav2LipOutput> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const status = await this.getJobStatus(jobId);

      if (status.status === 'completed') {
        if (!status.video_url) {
          throw new Error('Wav2Lip completed but no video URL returned');
        }
        return {
          videoUrl: status.video_url,
          duration: status.duration || 0,
          resolution: status.resolution || this.config.defaultResolution!,
          frameRate: status.frame_rate || this.config.defaultFrameRate!,
        };
      }

      if (status.status === 'failed') {
        throw new Error(`Wav2Lip processing failed: ${status.error || 'Unknown error'}`);
      }

      // Wait before next poll
      await this.sleep(intervalMs);
    }

    throw new Error('Wav2Lip processing timed out');
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<Wav2LipProcessResponse> {
    const response = await fetch(`${this.config.apiUrl}/wav2lip/status/${jobId}`, {
      headers: {
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get job status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Cancel a processing job
   */
  async cancelJob(jobId: string): Promise<void> {
    const response = await fetch(`${this.config.apiUrl}/wav2lip/cancel/${jobId}`, {
      method: 'POST',
      headers: {
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to cancel job: ${response.status}`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create Wav2Lip service from environment variables
 */
export function createWav2LipService(): Wav2LipService {
  const apiUrl = import.meta.env.VITE_WAV2LIP_API_URL;
  if (!apiUrl) {
    throw new Error('VITE_WAV2LIP_API_URL environment variable is required');
  }

  return new Wav2LipService({
    apiUrl,
    apiKey: import.meta.env.VITE_WAV2LIP_API_KEY,
  });
}

/**
 * Mock Wav2Lip service for testing and development
 */
export class MockWav2LipService extends Wav2LipService {
  private mockJobs: Map<string, Wav2LipProcessResponse> = new Map();

  constructor() {
    super({ apiUrl: 'http://mock-wav2lip-api' });
  }

  async generateLipSync(input: Wav2LipInput): Promise<Wav2LipOutput> {
    // Simulate processing delay
    await this.simulateProcessing();

    // Generate mock output
    const output: Wav2LipOutput = {
      videoUrl: `https://mock-cdn.example.com/video/${Date.now()}.mp4`,
      duration: this.estimateDuration(input.phonemeTimings),
      resolution: {
        width: VIDEO_SPECS.MIN_RESOLUTION_WIDTH,
        height: VIDEO_SPECS.MIN_RESOLUTION_HEIGHT,
      },
      frameRate: 25,
    };

    // Validate output
    const validation = validateWav2LipOutput(output);
    if (!validation.valid) {
      throw new Error(`Invalid mock output: ${validation.errors.join(', ')}`);
    }

    return output;
  }

  private async simulateProcessing(): Promise<void> {
    // Simulate 100-500ms processing time
    const delay = 100 + Math.random() * 400;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  private estimateDuration(phonemeTimings: PhonemeTimings[]): number {
    if (!phonemeTimings || phonemeTimings.length === 0) {
      return 0;
    }
    const lastTiming = phonemeTimings[phonemeTimings.length - 1];
    return lastTiming.endTime / 1000; // Convert ms to seconds
  }

  async getJobStatus(jobId: string): Promise<Wav2LipProcessResponse> {
    const job = this.mockJobs.get(jobId);
    if (!job) {
      return {
        job_id: jobId,
        status: 'completed',
        video_url: `https://mock-cdn.example.com/video/${jobId}.mp4`,
        duration: 60,
        resolution: {
          width: VIDEO_SPECS.MIN_RESOLUTION_WIDTH,
          height: VIDEO_SPECS.MIN_RESOLUTION_HEIGHT,
        },
        frame_rate: 25,
      };
    }
    return job;
  }
}
