// TTS Service - ElevenLabs Integration
// Feature: wav2lip-course-generation, Property 10: TTS generates audio for valid scripts

import { TTSInput, TTSOutput, PhonemeTimings, TTS_SPECS } from './types';
import { validateTTSInput } from './validators';

export interface TTSServiceConfig {
  apiKey: string;
  baseUrl?: string;
  defaultVoiceId?: string;
}

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  description?: string;
  preview_url?: string;
  labels?: Record<string, string>;
}

export interface ElevenLabsTextToSpeechRequest {
  text: string;
  model_id?: string;
  voice_settings?: {
    stability: number;
    similarity_boost: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
}

/**
 * TTS Service for generating audio from text using ElevenLabs API
 * Supports phoneme timing extraction for lip-sync
 */
export class TTSService {
  private config: TTSServiceConfig;
  private baseUrl: string;

  constructor(config: TTSServiceConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://api.elevenlabs.io/v1';
  }

  /**
   * Generate audio from script text
   * Returns audio URL and phoneme timings for Wav2Lip
   */
  async generateAudio(input: TTSInput): Promise<TTSOutput> {
    // Validate input
    const validation = validateTTSInput(input);
    if (!validation.valid) {
      throw new Error(`Invalid TTS input: ${validation.errors.join(', ')}`);
    }

    const voiceId = input.voiceId || this.config.defaultVoiceId;
    if (!voiceId) {
      throw new Error('Voice ID is required');
    }

    // Generate audio with timestamps
    const response = await this.textToSpeechWithTimestamps(
      input.script,
      voiceId,
      input.speakingRate
    );

    return response;
  }

  /**
   * Call ElevenLabs API to generate speech with character-level timestamps
   */
  private async textToSpeechWithTimestamps(
    text: string,
    voiceId: string,
    speakingRate?: number
  ): Promise<TTSOutput> {
    const url = `${this.baseUrl}/text-to-speech/${voiceId}/with-timestamps`;

    const requestBody: ElevenLabsTextToSpeechRequest = {
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: speakingRate ? this.speakingRateToStyle(speakingRate) : 0.5,
        use_speaker_boost: true,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': this.config.apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    // Extract phoneme timings from character alignments
    const phonemeTimings = this.extractPhonemeTimings(data.alignment);

    // Calculate audio duration from the last timestamp
    const audioDuration = phonemeTimings.length > 0
      ? phonemeTimings[phonemeTimings.length - 1].endTime / 1000
      : 0;

    return {
      audioUrl: data.audio_url || await this.uploadAudioBase64(data.audio_base64),
      audioDuration,
      phonemeTimings,
    };
  }

  /**
   * Extract phoneme timings from ElevenLabs alignment data
   */
  private extractPhonemeTimings(alignment: {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
  }): PhonemeTimings[] {
    if (!alignment || !alignment.characters) {
      return [];
    }

    const timings: PhonemeTimings[] = [];

    for (let i = 0; i < alignment.characters.length; i++) {
      const char = alignment.characters[i];
      // Convert characters to approximate phonemes
      const phoneme = this.charToPhoneme(char);
      if (phoneme) {
        timings.push({
          phoneme,
          startTime: Math.round(alignment.character_start_times_seconds[i] * 1000),
          endTime: Math.round(alignment.character_end_times_seconds[i] * 1000),
        });
      }
    }

    return timings;
  }

  /**
   * Convert character to approximate phoneme for lip-sync
   */
  private charToPhoneme(char: string): string | null {
    const vowels = 'aeiouAEIOU';
    const consonants = 'bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ';

    if (vowels.includes(char)) {
      return char.toLowerCase();
    } else if (consonants.includes(char)) {
      return char.toLowerCase();
    } else if (char === ' ') {
      return 'sil'; // silence
    }
    return null;
  }

  /**
   * Convert speaking rate to ElevenLabs style parameter
   */
  private speakingRateToStyle(rate: number): number {
    // Map speaking rate (0.5-2.0) to style (0-1)
    const normalized = (rate - TTS_SPECS.MIN_SPEAKING_RATE) /
      (TTS_SPECS.MAX_SPEAKING_RATE - TTS_SPECS.MIN_SPEAKING_RATE);
    return Math.max(0, Math.min(1, normalized));
  }

  /**
   * Upload base64 audio to storage and return URL
   */
  private async uploadAudioBase64(base64Audio: string): Promise<string> {
    // In production, upload to S3/CDN
    // For now, return a data URL or placeholder
    return `data:audio/mpeg;base64,${base64Audio}`;
  }

  /**
   * Get list of available voices
   */
  async getVoices(): Promise<ElevenLabsVoice[]> {
    const response = await fetch(`${this.baseUrl}/voices`, {
      headers: {
        'xi-api-key': this.config.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch voices: ${response.status}`);
    }

    const data = await response.json();
    return data.voices;
  }

  /**
   * Get voice details by ID
   */
  async getVoice(voiceId: string): Promise<ElevenLabsVoice> {
    const response = await fetch(`${this.baseUrl}/voices/${voiceId}`, {
      headers: {
        'xi-api-key': this.config.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch voice: ${response.status}`);
    }

    return response.json();
  }
}

/**
 * Create TTS service instance from environment variables
 */
export function createTTSService(): TTSService {
  const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('VITE_ELEVENLABS_API_KEY environment variable is required');
  }

  return new TTSService({
    apiKey,
    defaultVoiceId: import.meta.env.VITE_ELEVENLABS_DEFAULT_VOICE_ID,
  });
}

/**
 * Mock TTS service for testing and development
 */
export class MockTTSService extends TTSService {
  constructor() {
    super({ apiKey: 'mock-api-key' });
  }

  async generateAudio(input: TTSInput): Promise<TTSOutput> {
    const validation = validateTTSInput(input);
    if (!validation.valid) {
      throw new Error(`Invalid TTS input: ${validation.errors.join(', ')}`);
    }

    // Generate mock phoneme timings based on text
    const words = input.script.split(/\s+/);
    const phonemeTimings: PhonemeTimings[] = [];
    let currentTime = 0;

    for (const word of words) {
      for (const char of word) {
        const duration = 50 + Math.random() * 100; // 50-150ms per character
        phonemeTimings.push({
          phoneme: char.toLowerCase(),
          startTime: currentTime,
          endTime: currentTime + duration,
        });
        currentTime += duration;
      }
      // Add silence between words
      phonemeTimings.push({
        phoneme: 'sil',
        startTime: currentTime,
        endTime: currentTime + 100,
      });
      currentTime += 100;
    }

    const audioDuration = currentTime / 1000;

    return {
      audioUrl: `https://mock-cdn.example.com/audio/${Date.now()}.mp3`,
      audioDuration,
      phonemeTimings,
    };
  }

  async getVoices(): Promise<ElevenLabsVoice[]> {
    return [
      {
        voice_id: 'mock-voice-1',
        name: 'Sarah',
        category: 'professional',
        description: 'Professional female voice',
        preview_url: 'https://example.com/preview1.mp3',
      },
      {
        voice_id: 'mock-voice-2',
        name: 'James',
        category: 'professional',
        description: 'Professional male voice',
        preview_url: 'https://example.com/preview2.mp3',
      },
    ];
  }
}
