// Wav2Lip Validation Functions

import {
  TTSInput,
  TTSOutput,
  Wav2LipOutput,
  VideoRenderOutput,
  TranscriptOutput,
  VIDEO_SPECS,
  TTS_SPECS,
} from './types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates TTS input parameters
 */
export function validateTTSInput(input: TTSInput): ValidationResult {
  const errors: string[] = [];

  if (!input.script || input.script.trim().length === 0) {
    errors.push('Script cannot be empty');
  }

  if (input.script && input.script.length > TTS_SPECS.MAX_SCRIPT_LENGTH) {
    errors.push(`Script exceeds maximum length of ${TTS_SPECS.MAX_SCRIPT_LENGTH} characters`);
  }

  if (!input.voiceId || input.voiceId.trim().length === 0) {
    errors.push('Voice ID is required');
  }

  if (input.speakingRate !== undefined) {
    if (input.speakingRate < TTS_SPECS.MIN_SPEAKING_RATE || input.speakingRate > TTS_SPECS.MAX_SPEAKING_RATE) {
      errors.push(`Speaking rate must be between ${TTS_SPECS.MIN_SPEAKING_RATE} and ${TTS_SPECS.MAX_SPEAKING_RATE}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates TTS output meets requirements
 */
export function validateTTSOutput(output: TTSOutput): ValidationResult {
  const errors: string[] = [];

  if (!output.audioUrl || output.audioUrl.trim().length === 0) {
    errors.push('Audio URL is required');
  }

  if (output.audioDuration <= 0) {
    errors.push('Audio duration must be positive');
  }

  if (!output.phonemeTimings || output.phonemeTimings.length === 0) {
    errors.push('Phoneme timings are required for lip-sync');
  }

  // Validate phoneme timing consistency
  if (output.phonemeTimings) {
    for (let i = 0; i < output.phonemeTimings.length; i++) {
      const timing = output.phonemeTimings[i];
      if (timing.startTime < 0 || timing.endTime < 0) {
        errors.push(`Phoneme timing ${i} has negative time values`);
      }
      if (timing.startTime > timing.endTime) {
        errors.push(`Phoneme timing ${i} has start time after end time`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates Wav2Lip output meets video specifications
 * Property 11: Wav2Lip produces lip-synced video
 */
export function validateWav2LipOutput(output: Wav2LipOutput): ValidationResult {
  const errors: string[] = [];

  if (!output.videoUrl || output.videoUrl.trim().length === 0) {
    errors.push('Video URL is required');
  }

  if (output.duration <= 0) {
    errors.push('Video duration must be positive');
  }

  if (output.frameRate < VIDEO_SPECS.MIN_FRAME_RATE || output.frameRate > VIDEO_SPECS.MAX_FRAME_RATE) {
    errors.push(`Frame rate must be between ${VIDEO_SPECS.MIN_FRAME_RATE} and ${VIDEO_SPECS.MAX_FRAME_RATE} fps`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates final video render meets specifications
 * Property 12: Video rendering meets specifications (1080p, 24-30fps)
 */
export function validateVideoRenderOutput(output: VideoRenderOutput): ValidationResult {
  const errors: string[] = [];

  if (!output.finalVideoUrl || output.finalVideoUrl.trim().length === 0) {
    errors.push('Final video URL is required');
  }

  if (output.duration <= 0) {
    errors.push('Video duration must be positive');
  }

  // Check 1080p resolution
  if (output.resolution.width < VIDEO_SPECS.MIN_RESOLUTION_WIDTH) {
    errors.push(`Video width must be at least ${VIDEO_SPECS.MIN_RESOLUTION_WIDTH}px for 1080p`);
  }

  if (output.resolution.height < VIDEO_SPECS.MIN_RESOLUTION_HEIGHT) {
    errors.push(`Video height must be at least ${VIDEO_SPECS.MIN_RESOLUTION_HEIGHT}px for 1080p`);
  }

  // Check frame rate 24-30fps
  if (output.frameRate < VIDEO_SPECS.MIN_FRAME_RATE || output.frameRate > VIDEO_SPECS.MAX_FRAME_RATE) {
    errors.push(`Frame rate must be between ${VIDEO_SPECS.MIN_FRAME_RATE} and ${VIDEO_SPECS.MAX_FRAME_RATE} fps`);
  }

  if (output.fileSize <= 0) {
    errors.push('File size must be positive');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates transcript output has word-level timestamps
 * Property 13: Transcript generation produces timestamps
 */
export function validateTranscriptOutput(output: TranscriptOutput): ValidationResult {
  const errors: string[] = [];

  if (!output.words || output.words.length === 0) {
    errors.push('Transcript must contain words with timestamps');
  }

  if (!output.fullText || output.fullText.trim().length === 0) {
    errors.push('Full transcript text is required');
  }

  if (!output.vttUrl || output.vttUrl.trim().length === 0) {
    errors.push('VTT file URL is required');
  }

  // Validate word timestamps
  if (output.words) {
    for (let i = 0; i < output.words.length; i++) {
      const word = output.words[i];
      // Skip validation for whitespace-only words (silence markers)
      if (word.word.trim().length === 0) {
        continue;
      }
      if (word.startTime < 0 || word.endTime < 0) {
        errors.push(`Word ${i} has negative time values`);
      }
      if (word.startTime > word.endTime) {
        errors.push(`Word ${i} has start time after end time`);
      }
      if (word.confidence < 0 || word.confidence > 1) {
        errors.push(`Word ${i} has invalid confidence value`);
      }
    }

    // Check timestamps are sequential
    for (let i = 1; i < output.words.length; i++) {
      if (output.words[i].startTime < output.words[i - 1].startTime) {
        errors.push(`Word timestamps are not sequential at index ${i}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates that audio and video durations match within tolerance
 */
export function validateAudioVideoSync(
  audioDuration: number,
  videoDuration: number,
  toleranceMs: number = 100
): ValidationResult {
  const errors: string[] = [];
  const diff = Math.abs(audioDuration - videoDuration) * 1000; // convert to ms

  if (diff > toleranceMs) {
    errors.push(`Audio and video duration mismatch: ${diff}ms difference exceeds ${toleranceMs}ms tolerance`);
  }

  return { valid: errors.length === 0, errors };
}
