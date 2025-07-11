/**
 * Provider Demo Component
 *
 * Demonstrates the provider system in action
 * Shows how to use TTS, Audio Player, and Reading Session providers
 */

import { useState, useEffect } from 'react';
import {
  useTTSProvider,
  useAudioPlayerProvider,
  useReadingSessionProvider,
  useProvidersReady,
  useProviderError
} from '@providers/index';

const DEMO_TEXT = "Once upon a time, in a peaceful pond surrounded by tall grass and colorful flowers, there lived a young turtle named Tommy.";

export function ProviderDemo() {
  const providersReady = useProvidersReady();
  const providerError = useProviderError();

  // Removed unused state variables from outer component

  // Hooks will throw if providers aren't ready, so we check first
  if (!providersReady) {
    if (providerError) {
      return (
        <div className="p-4 bg-red-100 rounded">
          <p className="text-red-700">Provider initialization failed: {providerError.message}</p>
        </div>
      );
    }
    return (
      <div className="p-4 bg-gray-100 rounded">
        <p>Initializing providers...</p>
      </div>
    );
  }

  // Now safe to use provider hooks
  return <ProviderDemoContent />;
}

function ProviderDemoContent() {
  const ttsProvider = useTTSProvider();
  const audioPlayer = useAudioPlayerProvider();
  const sessionProvider = useReadingSessionProvider();

  const [isProcessing, setIsProcessing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionState, setSessionState] = useState<string>('idle');
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Subscribe to session state changes
  useEffect(() => {
    const unsubscribe = sessionProvider.onSessionStateChange((state: string) => {
      setSessionState(state);
    });
    return unsubscribe;
  }, [sessionProvider]);

  // Subscribe to audio player time updates
  useEffect(() => {
    const unsubscribe = audioPlayer.onTimeUpdate((time: number) => {
      setCurrentTime(time);
    });
    return unsubscribe;
  }, [audioPlayer]);

  const handleGenerateAudio = async () => {
    try {
      setIsProcessing(true);

      // Generate TTS
      const result = await ttsProvider.synthesize(DEMO_TEXT);
      setAudioUrl(result.audioUrl);

      console.log('TTS Result:', result);
    } catch (error) {
      console.error('TTS Error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartSession = async () => {
    try {
      // Start reading session
      const id = await sessionProvider.startSession('demo-passage-1');
      setSessionId(id);

      // Load audio if available
      if (audioUrl) {
        await audioPlayer.load(audioUrl);
        await audioPlayer.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Session Error:', error);
    }
  };

  const handlePlayPause = async () => {
    if (isPlaying) {
      audioPlayer.pause();
      sessionProvider.pauseSession();
      setIsPlaying(false);
    } else {
      await audioPlayer.play();
      sessionProvider.resumeSession();
      setIsPlaying(true);
    }
  };

  const handleStop = () => {
    audioPlayer.stop();
    sessionProvider.endSession('abandoned');
    setIsPlaying(false);
    setSessionId(null);
  };

  return (
    <div className="space-y-4 p-4 bg-white rounded shadow">
      <h3 className="text-lg font-semibold">Provider System Demo</h3>

      {/* Provider Status */}
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div className="p-2 bg-green-100 rounded">
          <p className="font-medium">TTS Provider</p>
          <p className="text-green-700">{ttsProvider.name}</p>
        </div>
        <div className="p-2 bg-green-100 rounded">
          <p className="font-medium">Audio Player</p>
          <p className="text-green-700">{audioPlayer.name}</p>
        </div>
        <div className="p-2 bg-green-100 rounded">
          <p className="font-medium">Session Provider</p>
          <p className="text-green-700">{sessionProvider.name}</p>
        </div>
      </div>

      {/* Demo Text */}
      <div className="p-3 bg-gray-50 rounded">
        <p className="text-sm font-medium mb-1">Demo Text:</p>
        <p className="text-gray-700">{DEMO_TEXT}</p>
      </div>

      {/* Controls */}
      <div className="space-y-2">
        {!audioUrl && (
          <button
            onClick={handleGenerateAudio}
            disabled={isProcessing}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isProcessing ? 'Generating...' : 'Generate Audio (TTS)'}
          </button>
        )}

        {audioUrl && !sessionId && (
          <button
            onClick={handleStartSession}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Start Reading Session
          </button>
        )}

        {sessionId && (
          <div className="flex gap-2">
            <button
              onClick={handlePlayPause}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button
              onClick={handleStop}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Stop
            </button>
          </div>
        )}
      </div>

      {/* Session Info */}
      {sessionId && (
        <div className="p-3 bg-blue-50 rounded space-y-1 text-sm">
          <p><span className="font-medium">Session ID:</span> {sessionId}</p>
          <p><span className="font-medium">State:</span> {sessionState}</p>
          <p><span className="font-medium">Current Time:</span> {currentTime.toFixed(1)}s</p>
          <p><span className="font-medium">Words/Min:</span> {sessionProvider.getWordsPerMinute()}</p>
        </div>
      )}

      {/* Generated Audio Info */}
      {audioUrl && (
        <div className="p-3 bg-gray-100 rounded text-sm">
          <p className="font-medium">Generated Audio URL:</p>
          <p className="text-gray-600 break-all">{audioUrl}</p>
        </div>
      )}
    </div>
  );
}
