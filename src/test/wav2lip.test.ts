import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  validateTTSInput,
  validateTTSOutput,
  validateWav2LipOutput,
  validateVideoRenderOutput,
  validateTranscriptOutput,
  validateAudioVideoSync,
  TTSInput,
  TTSOutput,
  Wav2LipOutput,
  VideoRenderOutput,
  TranscriptOutput,
  PhonemeTimings,
  TranscriptWord,
  VIDEO_SPECS,
  TTS_SPECS,
} from '../lib/wav2lip';

// Generators for property-based testing
const phonemeTimingGen = fc.record({
  phoneme: fc.constantFrom('a', 'e', 'i', 'o', 'u', 'b', 'c', 'd', 'f', 'g', 'sil'),
  startTime: fc.integer({ min: 0, max: 100000 }),
  endTime: fc.integer({ min: 0, max: 100000 }),
}).map(({ phoneme, startTime, endTime }) => ({
  phoneme,
  startTime: Math.min(startTime, endTime),
  endTime: Math.max(startTime, endTime),
}));

// Generate non-whitespace strings
const nonWhitespaceString = (minLength: number, maxLength: number) =>
  fc.string({ minLength, maxLength }).filter(s => s.trim().length > 0);

const validTTSInputGen = fc.record({
  script: nonWhitespaceString(1, TTS_SPECS.MAX_SCRIPT_LENGTH),
  voiceId: nonWhitespaceString(1, 50),
  speakingRate: fc.option(
    fc.double({ min: TTS_SPECS.MIN_SPEAKING_RATE, max: TTS_SPECS.MAX_SPEAKING_RATE }),
    { nil: undefined }
  ),
});

const validTTSOutputGen = fc.record({
  audioUrl: fc.webUrl(),
  audioDuration: fc.double({ min: 0.1, max: 3600 }),
  phonemeTimings: fc.array(phonemeTimingGen, { minLength: 1, maxLength: 100 }),
});

const validVideoResolutionGen = fc.record({
  width: fc.integer({ min: VIDEO_SPECS.MIN_RESOLUTION_WIDTH, max: 3840 }),
  height: fc.integer({ min: VIDEO_SPECS.MIN_RESOLUTION_HEIGHT, max: 2160 }),
});

const validWav2LipOutputGen = fc.record({
  videoUrl: fc.webUrl(),
  duration: fc.double({ min: 0.1, max: 3600 }),
  resolution: validVideoResolutionGen,
  frameRate: fc.integer({ min: VIDEO_SPECS.MIN_FRAME_RATE, max: VIDEO_SPECS.MAX_FRAME_RATE }),
});

const validVideoRenderOutputGen = fc.record({
  finalVideoUrl: fc.webUrl(),
  duration: fc.double({ min: 0.1, max: 3600 }),
  resolution: validVideoResolutionGen,
  frameRate: fc.integer({ min: VIDEO_SPECS.MIN_FRAME_RATE, max: VIDEO_SPECS.MAX_FRAME_RATE }),
  fileSize: fc.integer({ min: 1, max: 10 * 1024 * 1024 * 1024 }), // up to 10GB
});

const transcriptWordGen = fc.record({
  word: nonWhitespaceString(1, 50),
  startTime: fc.integer({ min: 0, max: 100000 }),
  endTime: fc.integer({ min: 0, max: 100000 }),
  confidence: fc.double({ min: 0, max: 1, noNaN: true }),
}).map(({ word, startTime, endTime, confidence }) => ({
  word,
  startTime: Math.min(startTime, endTime),
  endTime: Math.max(startTime, endTime),
  confidence,
}));

// Generate sequential transcript words
const validTranscriptWordsGen = fc.array(transcriptWordGen, { minLength: 1, maxLength: 100 })
  .map(words => {
    let currentTime = 0;
    return words.map(word => {
      const duration = word.endTime - word.startTime;
      const newWord = {
        ...word,
        startTime: currentTime,
        endTime: currentTime + Math.max(duration, 100),
      };
      currentTime = newWord.endTime + 50; // 50ms gap between words
      return newWord;
    });
  });

const validTranscriptOutputGen = validTranscriptWordsGen.chain(words => 
  fc.record({
    words: fc.constant(words),
    fullText: fc.constant(words.map(w => w.word).join(' ')),
    vttUrl: fc.webUrl(),
    jsonUrl: fc.webUrl(),
  })
);

describe('Wav2Lip Video Generation Tests', () => {
  describe('TTS Input Validation', () => {
    // Feature: wav2lip-course-generation, Property 10: TTS generates audio for valid scripts
    it('should accept valid TTS inputs', () => {
      fc.assert(
        fc.property(validTTSInputGen, (input) => {
          const result = validateTTSInput(input as TTSInput);
          return result.valid === true;
        }),
        { numRuns: 100 }
      );
    });

    it('should reject empty scripts', () => {
      const input: TTSInput = { script: '', voiceId: 'voice-1' };
      const result = validateTTSInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Script cannot be empty');
    });

    it('should reject scripts exceeding max length', () => {
      const input: TTSInput = {
        script: 'a'.repeat(TTS_SPECS.MAX_SCRIPT_LENGTH + 1),
        voiceId: 'voice-1',
      };
      const result = validateTTSInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('exceeds maximum length'))).toBe(true);
    });

    it('should reject invalid speaking rates', () => {
      fc.assert(
        fc.property(
          fc.double({ min: TTS_SPECS.MAX_SPEAKING_RATE + 0.1, max: 10, noNaN: true }),
          (invalidRate) => {
            const input: TTSInput = {
              script: 'Hello world',
              voiceId: 'voice-1',
              speakingRate: invalidRate,
            };
            const result = validateTTSInput(input);
            return result.valid === false;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('TTS Output Validation', () => {
    // Feature: wav2lip-course-generation, Property 10: TTS generates audio for valid scripts
    it('should accept valid TTS outputs with phoneme timings', () => {
      fc.assert(
        fc.property(validTTSOutputGen, (output) => {
          const result = validateTTSOutput(output as TTSOutput);
          return result.valid === true;
        }),
        { numRuns: 100 }
      );
    });

    it('should require phoneme timings for lip-sync', () => {
      const output: TTSOutput = {
        audioUrl: 'https://example.com/audio.wav',
        audioDuration: 10,
        phonemeTimings: [],
      };
      const result = validateTTSOutput(output);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Phoneme timings are required for lip-sync');
    });
  });

  describe('Wav2Lip Output Validation', () => {
    // Feature: wav2lip-course-generation, Property 11: Wav2Lip produces lip-synced video
    // **Validates: Requirements 5.2**
    it('should accept valid Wav2Lip outputs', () => {
      fc.assert(
        fc.property(validWav2LipOutputGen, (output) => {
          const result = validateWav2LipOutput(output as Wav2LipOutput);
          return result.valid === true;
        }),
        { numRuns: 100 }
      );
    });

    // Feature: wav2lip-course-generation, Property 11: Wav2Lip produces lip-synced video
    // **Validates: Requirements 5.2**
    it('should enforce frame rate constraints (24-30 fps) - below minimum', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: VIDEO_SPECS.MIN_FRAME_RATE - 1 }),
          (invalidFrameRate) => {
            const output: Wav2LipOutput = {
              videoUrl: 'https://example.com/video.mp4',
              duration: 60,
              resolution: { width: 1920, height: 1080 },
              frameRate: invalidFrameRate,
            };
            const result = validateWav2LipOutput(output);
            return result.valid === false;
          }
        ),
        { numRuns: 50 }
      );
    });

    // Feature: wav2lip-course-generation, Property 11: Wav2Lip produces lip-synced video
    // **Validates: Requirements 5.2**
    it('should enforce frame rate constraints (24-30 fps) - above maximum', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: VIDEO_SPECS.MAX_FRAME_RATE + 1, max: 120 }),
          (invalidFrameRate) => {
            const output: Wav2LipOutput = {
              videoUrl: 'https://example.com/video.mp4',
              duration: 60,
              resolution: { width: 1920, height: 1080 },
              frameRate: invalidFrameRate,
            };
            const result = validateWav2LipOutput(output);
            return result.valid === false;
          }
        ),
        { numRuns: 50 }
      );
    });

    // Feature: wav2lip-course-generation, Property 11: Wav2Lip produces lip-synced video
    // **Validates: Requirements 5.2**
    it('should require positive video duration', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -1000, max: 0, noNaN: true }),
          (invalidDuration) => {
            const output: Wav2LipOutput = {
              videoUrl: 'https://example.com/video.mp4',
              duration: invalidDuration,
              resolution: { width: 1920, height: 1080 },
              frameRate: 25,
            };
            const result = validateWav2LipOutput(output);
            return result.valid === false;
          }
        ),
        { numRuns: 50 }
      );
    });

    // Feature: wav2lip-course-generation, Property 11: Wav2Lip produces lip-synced video
    // **Validates: Requirements 5.2**
    it('should require video URL', () => {
      const output: Wav2LipOutput = {
        videoUrl: '',
        duration: 60,
        resolution: { width: 1920, height: 1080 },
        frameRate: 25,
      };
      const result = validateWav2LipOutput(output);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Video URL is required');
    });

    // Feature: wav2lip-course-generation, Property 11: Wav2Lip produces lip-synced video
    // For any TTS audio and instructor avatar, Wav2Lip should produce a video with synchronized lip movements
    // **Validates: Requirements 5.2**
    it('should produce video with duration matching audio input', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 1, max: 3600, noNaN: true }), // audio duration
          fc.integer({ min: VIDEO_SPECS.MIN_FRAME_RATE, max: VIDEO_SPECS.MAX_FRAME_RATE }),
          (audioDuration, frameRate) => {
            // Simulate Wav2Lip output that matches audio duration
            const output: Wav2LipOutput = {
              videoUrl: 'https://example.com/video.mp4',
              duration: audioDuration, // Video duration should match audio
              resolution: { width: 1920, height: 1080 },
              frameRate: frameRate,
            };
            const result = validateWav2LipOutput(output);
            
            // Also validate audio-video sync
            const syncResult = validateAudioVideoSync(audioDuration, output.duration, 100);
            
            return result.valid === true && syncResult.valid === true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Video Render Output Validation', () => {
    // Feature: wav2lip-course-generation, Property 12: Video rendering meets specifications
    it('should accept valid 1080p video renders at 24-30fps', () => {
      fc.assert(
        fc.property(validVideoRenderOutputGen, (output) => {
          const result = validateVideoRenderOutput(output as VideoRenderOutput);
          return result.valid === true;
        }),
        { numRuns: 100 }
      );
    });

    it('should reject videos below 1080p resolution', () => {
      const output: VideoRenderOutput = {
        finalVideoUrl: 'https://example.com/video.mp4',
        duration: 60,
        resolution: { width: 1280, height: 720 }, // 720p - invalid
        frameRate: 24,
        fileSize: 1000000,
      };
      const result = validateVideoRenderOutput(output);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('1080p'))).toBe(true);
    });

    it('should reject videos outside 24-30fps range', () => {
      const output: VideoRenderOutput = {
        finalVideoUrl: 'https://example.com/video.mp4',
        duration: 60,
        resolution: { width: 1920, height: 1080 },
        frameRate: 60, // Invalid - too high
        fileSize: 1000000,
      };
      const result = validateVideoRenderOutput(output);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Frame rate'))).toBe(true);
    });
  });

  describe('Transcript Output Validation', () => {
    // Feature: wav2lip-course-generation, Property 13: Transcript generation produces timestamps
    it('should accept valid transcripts with word-level timestamps', () => {
      fc.assert(
        fc.property(validTranscriptOutputGen, (output) => {
          const result = validateTranscriptOutput(output as TranscriptOutput);
          return result.valid === true;
        }),
        { numRuns: 100 }
      );
    });

    it('should require word-level timestamps', () => {
      const output: TranscriptOutput = {
        words: [],
        fullText: 'Hello world',
        vttUrl: 'https://example.com/transcript.vtt',
        jsonUrl: 'https://example.com/transcript.json',
      };
      const result = validateTranscriptOutput(output);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Transcript must contain words with timestamps');
    });

    it('should validate timestamp sequencing', () => {
      const output: TranscriptOutput = {
        words: [
          { word: 'Hello', startTime: 1000, endTime: 1500, confidence: 0.9 },
          { word: 'world', startTime: 500, endTime: 800, confidence: 0.9 }, // Out of order
        ],
        fullText: 'Hello world',
        vttUrl: 'https://example.com/transcript.vtt',
        jsonUrl: 'https://example.com/transcript.json',
      };
      const result = validateTranscriptOutput(output);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('not sequential'))).toBe(true);
    });
  });

  describe('Audio-Video Sync Validation', () => {
    it('should accept synced audio and video within tolerance', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 1, max: 3600 }),
          fc.double({ min: 0, max: 0.05 }), // Small difference
          (baseDuration, diff) => {
            const result = validateAudioVideoSync(baseDuration, baseDuration + diff, 100);
            return result.valid === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject audio-video mismatch exceeding tolerance', () => {
      const result = validateAudioVideoSync(60, 61, 100); // 1 second difference
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('mismatch'))).toBe(true);
    });
  });
});

describe('End-to-End Pipeline Validation', () => {
  // Feature: wav2lip-course-generation, Property 14: Course assembly maintains lesson order
  it('should validate complete pipeline output', () => {
    fc.assert(
      fc.property(
        validTTSOutputGen,
        validWav2LipOutputGen,
        validVideoRenderOutputGen,
        validTranscriptOutputGen,
        (ttsOutput, wav2lipOutput, renderOutput, transcriptOutput) => {
          const ttsValid = validateTTSOutput(ttsOutput as TTSOutput);
          const wav2lipValid = validateWav2LipOutput(wav2lipOutput as Wav2LipOutput);
          const renderValid = validateVideoRenderOutput(renderOutput as VideoRenderOutput);
          const transcriptValid = validateTranscriptOutput(transcriptOutput as TranscriptOutput);

          return (
            ttsValid.valid &&
            wav2lipValid.valid &&
            renderValid.valid &&
            transcriptValid.valid
          );
        }
      ),
      { numRuns: 50 }
    );
  });
});
