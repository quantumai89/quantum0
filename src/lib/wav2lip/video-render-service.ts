// Video Render Service - Final Video Encoding
// Feature: wav2lip-course-generation, Property 12: Video rendering meets specifications

import {
  VideoRenderInput,
  VideoRenderOutput,
  VideoResolution,
  VIDEO_SPECS,
} from './types';
import { validateVideoRenderOutput } from './validators';

export interface VideoRenderServiceConfig {
  apiUrl: string;
  apiKey?: string;
}

export interface VideoRenderRequest {
  lip_synced_video_url: string;
  audio_url: string;
  target_resolution: {
    width: number;
    height: number;
  };
  target_fps: number;
  output_format?: 'mp4' | 'webm';
  quality?: 'low' | 'medium' | 'high' | 'ultra';
}

export interface VideoRenderResponse {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  video_url?: string;
  duration?: number;
  resolution?: VideoResolution;
  frame_rate?: number;
  file_size?: number;
  error?: string;
}

/**
 * Video Render Service for final video encoding
 * Combines lip-synced video with audio and encodes to 1080p
 */
export class VideoRenderService {
  private config: VideoRenderServiceConfig;

  constructor(config: VideoRenderServiceConfig) {
    this.config = config;
  }

  /**
   * Render final video at 1080p 24-30fps
   */
  async renderVideo(input: VideoRenderInput): Promise<VideoRenderOutput> {
    // Validate input resolution meets 1080p requirement
    if (input.targetResolution.width < VIDEO_SPECS.MIN_RESOLUTION_WIDTH ||
        input.targetResolution.height < VIDEO_SPECS.MIN_RESOLUTION_HEIGHT) {
      throw new Error(`Target resolution must be at least ${VIDEO_SPECS.MIN_RESOLUTION_WIDTH}x${VIDEO_SPECS.MIN_RESOLUTION_HEIGHT}`);
    }

    // Validate frame rate
    if (input.targetFrameRate < VIDEO_SPECS.MIN_FRAME_RATE ||
        input.targetFrameRate > VIDEO_SPECS.MAX_FRAME_RATE) {
      throw new Error(`Frame rate must be between ${VIDEO_SPECS.MIN_FRAME_RATE} and ${VIDEO_SPECS.MAX_FRAME_RATE} fps`);
    }

    // Start render job
    const jobId = await this.startRender(input);

    // Poll for completion
    const result = await this.waitForCompletion(jobId);

    // Validate output
    const validation = validateVideoRenderOutput(result);
    if (!validation.valid) {
      throw new Error(`Invalid render output: ${validation.errors.join(', ')}`);
    }

    return result;
  }

  /**
   * Start video render job
   */
  private async startRender(input: VideoRenderInput): Promise<string> {
    const request: VideoRenderRequest = {
      lip_synced_video_url: input.lipSyncedVideoUrl,
      audio_url: input.audioUrl,
      target_resolution: input.targetResolution,
      target_fps: input.targetFrameRate,
      output_format: 'mp4',
      quality: 'high',
    };

    const response = await fetch(`${this.config.apiUrl}/render/video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Video render API error: ${response.status} - ${error}`);
    }

    const data: VideoRenderResponse = await response.json();
    return data.job_id;
  }

  /**
   * Poll for render completion
   */
  private async waitForCompletion(
    jobId: string,
    maxAttempts: number = 60,
    intervalMs: number = 5000
  ): Promise<VideoRenderOutput> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const status = await this.getJobStatus(jobId);

      if (status.status === 'completed') {
        if (!status.video_url) {
          throw new Error('Render completed but no video URL returned');
        }
        return {
          finalVideoUrl: status.video_url,
          duration: status.duration || 0,
          resolution: status.resolution || {
            width: VIDEO_SPECS.MIN_RESOLUTION_WIDTH,
            height: VIDEO_SPECS.MIN_RESOLUTION_HEIGHT,
          },
          frameRate: status.frame_rate || 25,
          fileSize: status.file_size || 0,
        };
      }

      if (status.status === 'failed') {
        throw new Error(`Video render failed: ${status.error || 'Unknown error'}`);
      }

      await this.sleep(intervalMs);
    }

    throw new Error('Video render timed out');
  }

  /**
   * Get render job status
   */
  async getJobStatus(jobId: string): Promise<VideoRenderResponse> {
    const response = await fetch(`${this.config.apiUrl}/render/status/${jobId}`, {
      headers: {
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get render status: ${response.status}`);
    }

    return response.json();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create Video Render service from environment variables
 */
export function createVideoRenderService(): VideoRenderService {
  const apiUrl = import.meta.env.VITE_VIDEO_RENDER_API_URL;
  if (!apiUrl) {
    throw new Error('VITE_VIDEO_RENDER_API_URL environment variable is required');
  }

  return new VideoRenderService({
    apiUrl,
    apiKey: import.meta.env.VITE_VIDEO_RENDER_API_KEY,
  });
}

/**
 * Mock Video Render service for testing
 */
export class MockVideoRenderService extends VideoRenderService {
  constructor() {
    super({ apiUrl: 'http://mock-render-api' });
  }

  async renderVideo(input: VideoRenderInput): Promise<VideoRenderOutput> {
    // Validate input
    if (input.targetResolution.width < VIDEO_SPECS.MIN_RESOLUTION_WIDTH ||
        input.targetResolution.height < VIDEO_SPECS.MIN_RESOLUTION_HEIGHT) {
      throw new Error(`Target resolution must be at least ${VIDEO_SPECS.MIN_RESOLUTION_WIDTH}x${VIDEO_SPECS.MIN_RESOLUTION_HEIGHT}`);
    }

    if (input.targetFrameRate < VIDEO_SPECS.MIN_FRAME_RATE ||
        input.targetFrameRate > VIDEO_SPECS.MAX_FRAME_RATE) {
      throw new Error(`Frame rate must be between ${VIDEO_SPECS.MIN_FRAME_RATE} and ${VIDEO_SPECS.MAX_FRAME_RATE} fps`);
    }

    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

    const output: VideoRenderOutput = {
      finalVideoUrl: `https://mock-cdn.example.com/rendered/${Date.now()}.mp4`,
      duration: 60, // Mock 60 second video
      resolution: input.targetResolution,
      frameRate: input.targetFrameRate,
      fileSize: 50 * 1024 * 1024, // Mock 50MB file
    };

    const validation = validateVideoRenderOutput(output);
    if (!validation.valid) {
      throw new Error(`Invalid mock output: ${validation.errors.join(', ')}`);
    }

    return output;
  }

  async getJobStatus(jobId: string): Promise<VideoRenderResponse> {
    return {
      job_id: jobId,
      status: 'completed',
      video_url: `https://mock-cdn.example.com/rendered/${jobId}.mp4`,
      duration: 60,
      resolution: {
        width: VIDEO_SPECS.MIN_RESOLUTION_WIDTH,
        height: VIDEO_SPECS.MIN_RESOLUTION_HEIGHT,
      },
      frame_rate: 25,
      file_size: 50 * 1024 * 1024,
    };
  }
}
