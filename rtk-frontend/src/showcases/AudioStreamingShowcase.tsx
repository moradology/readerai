/**
 * Audio Streaming Showcase
 *
 * Demonstrates HTTP audio streaming with:
 * - Chunk-based loading
 * - Buffer visualization
 * - Playback controls
 * - Network simulation
 * - Word timing synchronization
 */

import React, { useState, useEffect, useRef } from 'react';
import { ShowcaseContainer, ShowcaseSection } from './components/ShowcaseContainer';
import { RealAudioDemoService } from '@shared/audio/RealAudioDemoService';
import { SimpleStreamingAudioPlayer } from '@providers/audio/SimpleStreamingAudioPlayer';
import { loadDemoWordTimings } from '@shared/audio/convertTimings';
import type { AudioBufferState, WordTiming } from '@shared/audio/types';

export function AudioStreamingShowcase(): React.JSX.Element {
  // Demo text and word timings
  const [demoWords, setDemoWords] = useState<string[]>([]);
  const [wordTimings, setWordTimings] = useState<WordTiming[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferState, setBufferState] = useState<AudioBufferState>({
    bufferedChunks: [],
    bufferedDuration: 0,
    bufferHealth: 'empty',
    isBuffering: false,
    bufferProgress: 0,
  });
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);

  // Network simulation settings
  const [simulateDelay, setSimulateDelay] = useState(true);
  const [networkDelay, setNetworkDelay] = useState(200);
  const [simulateErrors, setSimulateErrors] = useState(false);
  const [errorRate, setErrorRate] = useState(0.1);

  // Service instances
  const streamingService = useRef<RealAudioDemoService | null>(null);
  const audioPlayer = useRef<SimpleStreamingAudioPlayer | null>(null);

  // Initialize services and load data on mount
  useEffect(() => {
    // Initialize services
    if (!streamingService.current) {
      streamingService.current = new RealAudioDemoService();
    }
    if (!audioPlayer.current) {
      audioPlayer.current = new SimpleStreamingAudioPlayer();
    }

    // Load demo transcript and timings
    fetch('/demo_transcription/transcript.txt')
      .then(res => res.text())
      .then(text => {
        setDemoWords(text.trim().split(/\s+/));
      })
      .catch(error => {
        // eslint-disable-next-line no-console
        console.error('[AudioShowcase] Failed to load transcript:', error);
      });

    // Load word timings
    loadDemoWordTimings()
      .then(timings => {
        setWordTimings(timings);
        // eslint-disable-next-line no-console
        console.log('[AudioShowcase] Loaded word timings:', timings.length);
      })
      .catch(error => {
        // eslint-disable-next-line no-console
        console.error('[AudioShowcase] Failed to load word timings:', error);
      });

    // Initialize audio player
    audioPlayer.current.initialize().catch((err) => {
      // eslint-disable-next-line no-console
      console.error(err);
    });

    return () => {
      streamingService.current?.stopStream();
      audioPlayer.current?.cleanup();
    };
  }, []); // Empty dependency array - only run once on mount

  // Set up event listeners when services are ready
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    if (audioPlayer.current) {
      unsubscribers.push(
        audioPlayer.current.onTimeUpdate((time) => {
          setCurrentTime(time);
          // Update current word
          const wordIndex = audioPlayer.current?.getCurrentWordIndex(wordTimings) ?? -1;
          setCurrentWordIndex(wordIndex);
        })
      );

      unsubscribers.push(
        audioPlayer.current.onEnded(() => {
          setIsPlaying(false);
          setCurrentWordIndex(-1);
        })
      );

      unsubscribers.push(
        audioPlayer.current.onError((err) => {
          setError(err.message);
          setIsPlaying(false);
        })
      );

      unsubscribers.push(
        audioPlayer.current.onLoadStart(() => setIsLoading(true))
      );

      unsubscribers.push(
        audioPlayer.current.onLoadComplete(() => setIsLoading(false))
      );
    }

    if (streamingService.current) {
      unsubscribers.push(
        streamingService.current.onBufferStateChange((state) => {
          setBufferState(state);
        })
      );
    }

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [wordTimings]); // This effect depends on wordTimings for getCurrentWordIndex

  // Update network simulation settings
  useEffect(() => {
    if (streamingService.current) {
      streamingService.current.setSimulateNetworkDelay(simulateDelay, networkDelay);
    }
  }, [simulateDelay, networkDelay]);

  const handleStartStream = async (): Promise<void> => {
    if (!streamingService.current || !audioPlayer.current) return;

    try {
      setError(null);
      setIsLoading(true);

      // eslint-disable-next-line no-console
      console.log('[AudioShowcase] Starting stream...');
      const metadata = await streamingService.current.startStream('/demo_transcription/a.wav');

      if (!metadata) {
        throw new Error('Failed to get stream metadata');
      }

      // eslint-disable-next-line no-console
      console.log('[AudioShowcase] Stream metadata:', metadata);
      setDuration(metadata.totalDuration);

      // eslint-disable-next-line no-console
      console.log('[AudioShowcase] Loading stream into player...');
      await audioPlayer.current.loadStream(streamingService.current, metadata);

      // eslint-disable-next-line no-console
      console.log('[AudioShowcase] Stream loaded successfully');
      setIsLoading(false);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[AudioShowcase] Stream start error:', err);
      setError((err as Error).message);
      setIsLoading(false);
    }
  };

  const handlePlay = async (): Promise<void> => {
    if (!audioPlayer.current || !streamingService.current) return;

    try {
      // Always ensure stream is started first
      if (!streamingService.current.isStreamReady()) {
        // eslint-disable-next-line no-console
        console.log('[AudioShowcase] Stream not ready, starting stream before play...');
        await handleStartStream();
      }

      await audioPlayer.current.playWhenReady();
      setIsPlaying(true);
      setError(null); // Clear any previous errors
    } catch (err) {
      const error = err as Error;
      // eslint-disable-next-line no-console
      console.error('[AudioShowcase] Play error:', error);
      // Handle autoplay errors specifically
      if (error.name === 'AbortError') {
        setError('Playback was interrupted. Please try clicking Play again.');
      } else {
        setError(error.message);
      }
      setIsPlaying(false);
    }
  };

  const handlePause = (): void => {
    audioPlayer.current?.pause();
    streamingService.current?.pauseStream();
    setIsPlaying(false);
  };

  const handleStop = (): void => {
    audioPlayer.current?.stop();
    streamingService.current?.stopStream();
    setIsPlaying(false);
    setCurrentTime(0);
    setCurrentWordIndex(-1);
    setDuration(0);
    setBufferState({
      bufferedChunks: [],
      bufferedDuration: 0,
      bufferHealth: 'empty',
      isBuffering: false,
      bufferProgress: 0,
    });
  };

  const handleSeek = (time: number): void => {
    if (audioPlayer.current) {
      audioPlayer.current.seekToTime(time).catch((err) => {
        // eslint-disable-next-line no-console
        console.error(err);
      });
    }
  };

  const handlePlaybackRateChange = (rate: number): void => {
    setPlaybackRate(rate);
    audioPlayer.current?.setPlaybackRate(rate);
  };

  const handleVolumeChange = (vol: number): void => {
    setVolume(vol);
    audioPlayer.current?.setVolume(vol);
  };

  const getBufferHealthColor = (health: AudioBufferState['bufferHealth']): string => {
    switch (health) {
      case 'empty': return 'bg-red-500';
      case 'low': return 'bg-orange-500';
      case 'good': return 'bg-green-500';
      case 'full': return 'bg-blue-500';
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <ShowcaseContainer
      title="Audio Streaming Infrastructure"
      description="HTTP-based audio streaming with intelligent buffering and synchronization"
    >
      <ShowcaseSection
        title="Streaming Controls"
        description="Control audio playback with streaming capabilities"
      >
        <div className="space-y-4">
          {/* Playback Controls */}
          <div className="flex items-center gap-4">
            <button
              onClick={isPlaying ? handlePause : handlePlay}
              disabled={isLoading}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                isLoading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : isPlaying
                  ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {isLoading ? 'Loading...' : isPlaying ? 'Pause' : 'Play'}
            </button>

            <button
              onClick={handleStop}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
            >
              Stop
            </button>

            <div className="flex-1 flex items-center gap-2">
              <span className="text-sm text-gray-600">{formatTime(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={duration}
                value={currentTime}
                onChange={(e) => handleSeek(Number(e.target.value))}
                className="flex-1"
                disabled={duration === 0}
              />
              <span className="text-sm text-gray-600">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Playback Settings */}
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Speed:</label>
              <select
                value={playbackRate}
                onChange={(e) => handlePlaybackRateChange(Number(e.target.value))}
                className="px-2 py-1 border rounded text-sm"
              >
                <option value={0.5}>0.5x</option>
                <option value={0.75}>0.75x</option>
                <option value={1}>1x</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2x</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Volume:</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="w-24"
              />
              <span className="text-sm text-gray-600">{Math.round(volume * 100)}%</span>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              Error: {error}
            </div>
          )}
        </div>
      </ShowcaseSection>

      <ShowcaseSection
        title="Buffer Visualization"
        description="Monitor streaming buffer health and chunk loading"
      >
        <div className="space-y-4">
          {/* Buffer Health Indicator */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full ${getBufferHealthColor(bufferState.bufferHealth)}`} />
              <span className="font-medium capitalize">{bufferState.bufferHealth}</span>
            </div>
            <div className="text-sm text-gray-600">
              {bufferState.bufferedDuration.toFixed(1)}s buffered
            </div>
            {bufferState.isBuffering && (
              <div className="text-sm text-blue-600 animate-pulse">Buffering...</div>
            )}
          </div>

          {/* Buffer Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Buffer Progress</span>
              <span>{bufferState.bufferProgress.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${bufferState.bufferProgress}%` }}
              />
            </div>
          </div>

          {/* Chunk Visualization */}
          <div className="space-y-1">
            <div className="text-sm text-gray-600">Loaded Chunks</div>
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: 24 }, (_, i) => (
                <div
                  key={i}
                  className={`w-8 h-8 rounded text-xs flex items-center justify-center font-mono ${
                    bufferState.bufferedChunks.includes(i)
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {i}
                </div>
              ))}
            </div>
          </div>
        </div>
      </ShowcaseSection>

      <ShowcaseSection
        title="Word Synchronization"
        description="Demonstrates word-level timing synchronization with real TTS audio"
      >
        <div className="p-4 bg-gray-50 rounded-lg max-h-96 overflow-y-auto">
          <p className="text-lg leading-relaxed">
            {demoWords.length > 0 ? (
              demoWords.map((word, index) => (
                <span
                  key={index}
                  className={`inline-block px-1 py-0.5 rounded transition-all duration-200 ${
                    index === currentWordIndex
                      ? 'bg-yellow-300 text-black transform scale-110'
                      : index < currentWordIndex
                      ? 'text-gray-500'
                      : 'text-gray-800'
                  }`}
                >
                  {word}
                </span>
              ))
            ) : (
              <span className="text-gray-500 italic">Loading transcript...</span>
            )}
          </p>
        </div>
      </ShowcaseSection>

      <ShowcaseSection
        title="Network Simulation"
        description="Test streaming behavior under different network conditions"
      >
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-medium text-gray-700">Network Delay</h4>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={simulateDelay}
                onChange={(e) => setSimulateDelay(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Simulate network delay</span>
            </label>

            {simulateDelay && (
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={1000}
                  step={50}
                  value={networkDelay}
                  onChange={(e) => setNetworkDelay(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm text-gray-600 w-16">{networkDelay}ms</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-gray-700">Network Errors</h4>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={simulateErrors}
                onChange={(e) => setSimulateErrors(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Simulate random errors</span>
            </label>

            {simulateErrors && (
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={0.5}
                  step={0.05}
                  value={errorRate}
                  onChange={(e) => setErrorRate(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm text-gray-600 w-16">{(errorRate * 100).toFixed(0)}%</span>
              </div>
            )}
          </div>
        </div>
      </ShowcaseSection>

      <ShowcaseSection
        title="Implementation Features"
        description="Key capabilities of the audio streaming system"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Streaming Features</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>✓ HTTP chunk-based streaming</li>
              <li>✓ Intelligent prefetching</li>
              <li>✓ Adaptive buffer management</li>
              <li>✓ Seek with chunk loading</li>
              <li>✓ MediaSource API integration</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-gray-700 mb-2">Synchronization</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>✓ Word-level timing accuracy</li>
              <li>✓ Playback rate adjustment</li>
              <li>✓ Smooth highlighting transitions</li>
              <li>✓ Binary search for performance</li>
              <li>✓ Frame-accurate seeking</li>
            </ul>
          </div>
        </div>
      </ShowcaseSection>
    </ShowcaseContainer>
  );
}
