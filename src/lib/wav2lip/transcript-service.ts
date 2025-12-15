// Transcript Service - Speech Recognition with Whisper
// Feature: wav2lip-course-generation, Property 13: Transcript generation produces timestamps

import { TranscriptOutput, TranscriptWord } from './types';
import { validateTranscriptOutput } from './validators';

export interface TranscriptServiceConfig {
  apiUrl: string;
  apiKey?: string;
  model?: 'whisper-1' | 'whisper-large-v3';
}

export interface WhisperTranscriptRequest {
  audio_url: string;
  model?: string;
  language?: string;
  response_format?: 'json' | 'verbose_json' | 'vtt' | 'srt';
  timestamp_granularities?: ('word' | 'segment')[];
}

export interface WhisperTranscriptResponse {
  task: string;
  language: string;
  duration: number;
  text: string;
  words?: {
    word: string;
    start: number;
    end: number;
  }[];
  segments?: {
    id: number;
    start: number;
    end: number;
    text: string;
  }[];
}

/**
 * Transcript Service for generating word-level timestamps using Whisper
 */
export class TranscriptService {
  private config: TranscriptServiceConfig;

  constructor(config: TranscriptServiceConfig) {
    this.config = {
      ...config,
      model: config.model || 'whisper-1',
    };
  }

  /**
   * Generate transcript with word-level timestamps
   */
  async generateTranscript(audioUrl: string): Promise<TranscriptOutput> {
    // Get transcript with word timestamps
    const whisperResponse = await this.transcribeAudio(audioUrl);

    // Convert to our format
    const words = this.convertWords(whisperResponse.words || []);

    // Generate VTT file
    const vttContent = this.generateVTT(words);
    const vttUrl = await this.uploadVTT(vttContent);

    // Generate JSON transcript
    const jsonUrl = await this.uploadJSON(words, whisperResponse.text);

    const output: TranscriptOutput = {
      words,
      fullText: whisperResponse.text,
      vttUrl,
      jsonUrl,
    };

    // Validate output
    const validation = validateTranscriptOutput(output);
    if (!validation.valid) {
      throw new Error(`Invalid transcript output: ${validation.errors.join(', ')}`);
    }

    return output;
  }

  /**
   * Call Whisper API to transcribe audio
   */
  private async transcribeAudio(audioUrl: string): Promise<WhisperTranscriptResponse> {
    const request: WhisperTranscriptRequest = {
      audio_url: audioUrl,
      model: this.config.model,
      response_format: 'verbose_json',
      timestamp_granularities: ['word'],
    };

    const response = await fetch(`${this.config.apiUrl}/transcribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Whisper API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Convert Whisper word format to our format
   */
  private convertWords(whisperWords: { word: string; start: number; end: number }[]): TranscriptWord[] {
    return whisperWords.map(w => ({
      word: w.word.trim(),
      startTime: Math.round(w.start * 1000), // Convert to milliseconds
      endTime: Math.round(w.end * 1000),
      confidence: 0.95, // Whisper doesn't provide per-word confidence, use default
    }));
  }

  /**
   * Generate WebVTT format transcript
   */
  private generateVTT(words: TranscriptWord[]): string {
    let vtt = 'WEBVTT\n\n';

    // Group words into cues (roughly 5-10 words per cue)
    const cues = this.groupWordsIntoCues(words, 7);

    cues.forEach((cue, index) => {
      const startTime = this.formatVTTTime(cue.startTime);
      const endTime = this.formatVTTTime(cue.endTime);
      const text = cue.words.map(w => w.word).join(' ');

      vtt += `${index + 1}\n`;
      vtt += `${startTime} --> ${endTime}\n`;
      vtt += `${text}\n\n`;
    });

    return vtt;
  }

  /**
   * Group words into cues for VTT
   */
  private groupWordsIntoCues(
    words: TranscriptWord[],
    wordsPerCue: number
  ): { startTime: number; endTime: number; words: TranscriptWord[] }[] {
    const cues: { startTime: number; endTime: number; words: TranscriptWord[] }[] = [];

    for (let i = 0; i < words.length; i += wordsPerCue) {
      const cueWords = words.slice(i, i + wordsPerCue);
      if (cueWords.length > 0) {
        cues.push({
          startTime: cueWords[0].startTime,
          endTime: cueWords[cueWords.length - 1].endTime,
          words: cueWords,
        });
      }
    }

    return cues;
  }

  /**
   * Format time for VTT (HH:MM:SS.mmm)
   */
  private formatVTTTime(ms: number): string {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  }

  /**
   * Upload VTT file to storage
   */
  private async uploadVTT(content: string): Promise<string> {
    // In production, upload to S3/CDN
    // For now, return a data URL
    const base64 = btoa(unescape(encodeURIComponent(content)));
    return `data:text/vtt;base64,${base64}`;
  }

  /**
   * Upload JSON transcript to storage
   */
  private async uploadJSON(words: TranscriptWord[], fullText: string): Promise<string> {
    const json = JSON.stringify({ words, fullText }, null, 2);
    const base64 = btoa(unescape(encodeURIComponent(json)));
    return `data:application/json;base64,${base64}`;
  }
}

/**
 * Create Transcript service from environment variables
 */
export function createTranscriptService(): TranscriptService {
  const apiUrl = import.meta.env.VITE_WHISPER_API_URL;
  if (!apiUrl) {
    throw new Error('VITE_WHISPER_API_URL environment variable is required');
  }

  return new TranscriptService({
    apiUrl,
    apiKey: import.meta.env.VITE_WHISPER_API_KEY,
  });
}

/**
 * Mock Transcript service for testing
 */
export class MockTranscriptService extends TranscriptService {
  constructor() {
    super({ apiUrl: 'http://mock-whisper-api' });
  }

  async generateTranscript(audioUrl: string): Promise<TranscriptOutput> {
    // Generate mock transcript
    const mockText = 'Welcome to this lesson. Today we will learn about artificial intelligence and machine learning. These technologies are transforming how we work and live.';
    const mockWords = this.generateMockWords(mockText);

    const vttContent = this.generateMockVTT(mockWords);

    const output: TranscriptOutput = {
      words: mockWords,
      fullText: mockText,
      vttUrl: `https://mock-cdn.example.com/transcript/${Date.now()}.vtt`,
      jsonUrl: `https://mock-cdn.example.com/transcript/${Date.now()}.json`,
    };

    const validation = validateTranscriptOutput(output);
    if (!validation.valid) {
      throw new Error(`Invalid mock output: ${validation.errors.join(', ')}`);
    }

    return output;
  }

  private generateMockWords(text: string): TranscriptWord[] {
    const words = text.split(/\s+/);
    const result: TranscriptWord[] = [];
    let currentTime = 0;

    for (const word of words) {
      const duration = 200 + word.length * 50; // Longer words take more time
      result.push({
        word,
        startTime: currentTime,
        endTime: currentTime + duration,
        confidence: 0.9 + Math.random() * 0.1,
      });
      currentTime += duration + 100; // 100ms gap between words
    }

    return result;
  }

  private generateMockVTT(words: TranscriptWord[]): string {
    let vtt = 'WEBVTT\n\n';
    const wordsPerCue = 7;

    for (let i = 0; i < words.length; i += wordsPerCue) {
      const cueWords = words.slice(i, i + wordsPerCue);
      if (cueWords.length > 0) {
        const startTime = this.formatTime(cueWords[0].startTime);
        const endTime = this.formatTime(cueWords[cueWords.length - 1].endTime);
        const text = cueWords.map(w => w.word).join(' ');

        vtt += `${Math.floor(i / wordsPerCue) + 1}\n`;
        vtt += `${startTime} --> ${endTime}\n`;
        vtt += `${text}\n\n`;
      }
    }

    return vtt;
  }

  private formatTime(ms: number): string {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  }
}
