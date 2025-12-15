import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { generateTTS, generateWav2Lip } from '@/lib/api';

export const VideoLearningPage = () => {
  const { lessonId } = useParams();
  const [currentTime, setCurrentTime] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  // Mock data
  const lesson = {
    id: lessonId,
    title: 'What is Machine Learning?',
    // Default fallback video removed
    duration: 596,
  };

  const transcript = [
    { id: '1', text: 'Welcome to this lesson on Machine Learning.', startTime: 0, endTime: 3 },
    { id: '2', text: 'Machine Learning is a subset of artificial intelligence.', startTime: 3, endTime: 7 },
    { id: '3', text: 'It focuses on building systems that learn from data.', startTime: 7, endTime: 11 },
  ];

  useEffect(() => {
    const generateVideo = async () => {
      // If we already have a videoUrl, we don't need to regenerate
      if (videoUrl) return;

      try {
        setLoading(true);
        setStatus('Generating audio...');

        // 1. Generate Audio
        const fullText = transcript.map(t => t.text).join(' ');
        const ttsResponse = await generateTTS(fullText);

        if (!ttsResponse.success) {
          throw new Error('Failed to generate audio');
        }

        // Store audio URL
        const audioFilename = ttsResponse.audio_path.split(/[\\/]/).pop();
        const audioUrl = `http://localhost:5000/api/temp/audio/${audioFilename}`;

        setStatus('Generating lip-synced video (this may take a minute)...');

        // 2. Generate Video
        const wav2lipResponse = await generateWav2Lip(ttsResponse.audio_path, 'ai_model');

        if (wav2lipResponse.success) {
          const filename = wav2lipResponse.video_path.split(/[\\/]/).pop();
          const vUrl = `http://localhost:5000/api/temp/video/${filename}`;
          setVideoUrl(vUrl);

          // Auto-play audio when video is ready
          const audio = new Audio(audioUrl);
          (window as any).currentAudio = audio; // Keep reference

          // Try to sync play
          const video = document.querySelector('video');
          if (video) {
            video.onplay = () => audio.play();
            video.onpause = () => audio.pause();
            video.onseeked = () => { audio.currentTime = video.currentTime; };
            video.muted = true;
          }
        }

      } catch (error) {
        console.error('Error generating video:', error);
        setStatus('Error generating video');
      } finally {
        setLoading(false);
      }
    };

    generateVideo();

    return () => {
      // Cleanup audio
      if ((window as any).currentAudio) {
        (window as any).currentAudio.pause();
        (window as any).currentAudio = null;
      }
    };
  }, [lessonId]);

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Video Player */}
          <div className="lg:col-span-2">
            <div className="bg-black rounded-lg overflow-hidden aspect-video flex items-center justify-center relative">
              {loading ? (
                <div className="text-center">
                  <Loader2 className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-2" />
                  <p className="text-gray-400">{status}</p>
                </div>
              ) : videoUrl ? (
                <video
                  src={videoUrl}
                  controls
                  className="w-full h-full"
                  onTimeUpdate={(e) => {
                    setCurrentTime(e.currentTarget.currentTime);
                    // Sync audio if needed
                    const audio = (window as any).currentAudio;
                    if (audio && Math.abs(audio.currentTime - e.currentTarget.currentTime) > 0.5) {
                      audio.currentTime = e.currentTarget.currentTime;
                    }
                  }}
                  onPlay={() => (window as any).currentAudio?.play()}
                  onPause={() => (window as any).currentAudio?.pause()}
                  muted
                />
              ) : (
                <div className="text-center text-gray-400">
                  <p>Failed to load video</p>
                  <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">
                    Retry
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-4 bg-gray-800 rounded-lg p-6">
              <h1 className="text-2xl font-bold text-white mb-2">{lesson.title}</h1>
              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm">
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <span className="text-gray-400">Lesson 1 of 12</span>
                <Button variant="primary" size="sm">
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>

          {/* Transcript Panel */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg p-6 h-full">
              <h2 className="text-xl font-bold text-white mb-4">Transcript</h2>
              <div className="space-y-4">
                {transcript.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded cursor-pointer transition ${currentTime >= item.startTime && currentTime < item.endTime
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                  >
                    <p className="text-sm">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
