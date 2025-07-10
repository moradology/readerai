/**
 * Integrated Reading Showcase
 *
 * Combines ReadingView with AudioStreaming to demonstrate
 * the complete reading experience with synchronized audio and text.
 */

import React, { useState, useEffect, useRef } from 'react';
import { ShowcaseContainer, ShowcaseSection } from './components/ShowcaseContainer';
import { ReadingView } from '@features/reading/components/ReadingView';
import { RealAudioDemoService } from '@shared/audio/RealAudioDemoService';
import { SimpleStreamingAudioPlayer } from '@providers/audio/SimpleStreamingAudioPlayer';
import { loadDemoWordTimings } from '@shared/audio/convertTimings';
import type { WordTiming } from '@shared/audio/types';

export function IntegratedReadingShowcase(): React.JSX.Element {
  // State
  const [transcript, setTranscript] = useState('');
  const [wordTimings, setWordTimings] = useState<WordTiming[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isBuffering, setIsBuffering] = useState(false);
  const [streamProgress, setStreamProgress] = useState(0);

  // Service instances
  const streamingService = useRef<RealAudioDemoService | null>(null);
  const audioPlayer = useRef<SimpleStreamingAudioPlayer | null>(null);
  const timeUpdateInterval = useRef<number | null>(null);

  // Initialize services and load data
  useEffect(() => {
    const initializeServices = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Initialize services
        if (!streamingService.current) {
          streamingService.current = new RealAudioDemoService();
        }
        if (!audioPlayer.current) {
          audioPlayer.current = new SimpleStreamingAudioPlayer();
          await audioPlayer.current.initialize();
        }

        // Load transcript
        const transcriptResponse = await fetch('/demo_transcription/transcript.txt');
        const transcriptText = await transcriptResponse.text();
        setTranscript(transcriptText.trim());

        // Load word timings
        const timings = await loadDemoWordTimings();
        setWordTimings(timings);

        setIsLoading(false);
      } catch (err) {
        console.error('[IntegratedReading] Initialization error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize');
        setIsLoading(false);
      }
    };

    initializeServices();

    return () => {
      if (timeUpdateInterval.current) {
        clearInterval(timeUpdateInterval.current);
      }
      streamingService.current?.stopStream();
      audioPlayer.current?.cleanup();
    };
  }, []);

  // Set up audio event listeners
  useEffect(() => {
    if (!audioPlayer.current) return;

    const unsubscribers: (() => void)[] = [];

    // Time update - using polling since the player doesn't have onTimeUpdate for playing state
    const startTimeTracking = () => {
      if (timeUpdateInterval.current) {
        clearInterval(timeUpdateInterval.current);
      }

      timeUpdateInterval.current = window.setInterval(() => {
        if (audioPlayer.current) {
          const time = audioPlayer.current.getCurrentTime();
          setCurrentTime(time);

          // Update duration if needed
          const dur = audioPlayer.current.getDuration();
          if (dur > 0 && dur !== duration) {
            setDuration(dur);
          }

          // Check if still playing
          const playing = audioPlayer.current.isPlaying();
          if (playing !== isPlaying) {
            setIsPlaying(playing);
          }
        }
      }, 100); // Update every 100ms
    };

    // Time update handler
    unsubscribers.push(
      audioPlayer.current.onTimeUpdate((time) => {
        setCurrentTime(time);
      })
    );

    // Ended handler
    unsubscribers.push(
      audioPlayer.current.onEnded(() => {
        setIsPlaying(false);
        if (timeUpdateInterval.current) {
          clearInterval(timeUpdateInterval.current);
        }
      })
    );

    // Error handling
    unsubscribers.push(
      audioPlayer.current.onError((err) => {
        setError(err.message);
        setIsPlaying(false);
        if (timeUpdateInterval.current) {
          clearInterval(timeUpdateInterval.current);
        }
      })
    );

    // Start time tracking if playing
    if (isPlaying) {
      startTimeTracking();
    }

    return () => {
      unsubscribers.forEach(unsub => unsub());
      if (timeUpdateInterval.current) {
        clearInterval(timeUpdateInterval.current);
      }
    };
  }, [isPlaying, duration]);

  // Start streaming audio
  const startStreaming = async () => {
    if (!streamingService.current || !audioPlayer.current) return;

    try {
      setError(null);
      setIsBuffering(true);

      // Start the stream - this returns metadata
      const metadata = await streamingService.current.startStream('demo');

      if (!metadata) {
        throw new Error('No metadata available');
      }

      // Load all chunks into the player
      await audioPlayer.current.loadStream(streamingService.current, metadata);

      setDuration(metadata.totalDuration);
      setIsBuffering(false);

      // Start playback
      await audioPlayer.current.playWhenReady();
      setIsPlaying(true);

    } catch (err) {
      console.error('[IntegratedReading] Streaming error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start streaming');
      setIsBuffering(false);
      setIsPlaying(false);
    }
  };

  // Playback controls
  const togglePlayPause = async () => {
    if (!audioPlayer.current) return;

    try {
      if (isPlaying) {
        audioPlayer.current.pause();
        setIsPlaying(false);
      } else {
        if (currentTime === 0 && !audioPlayer.current.isLoaded()) {
          // Start streaming if at beginning and not loaded
          await startStreaming();
        } else {
          await audioPlayer.current.play();
          setIsPlaying(true);
        }
      }
    } catch (err) {
      console.error('[IntegratedReading] Play/pause error:', err);
      const error = err as Error;
      if (error.name === 'AbortError') {
        setError('Playback was interrupted. Please try clicking Play again.');
      } else {
        setError(error.message);
      }
      setIsPlaying(false);
    }
  };

  const handleSeek = (time: number) => {
    if (!audioPlayer.current) return;
    audioPlayer.current.seek(time);
    setCurrentTime(time);
  };

  const handlePlaybackRateChange = (rate: number) => {
    if (!audioPlayer.current) return;
    audioPlayer.current.setPlaybackRate(rate);
    setPlaybackRate(rate);
  };

  const handleVolumeChange = (vol: number) => {
    if (!audioPlayer.current) return;
    audioPlayer.current.setVolume(vol);
    setVolume(vol);
  };

  // Handle word click in ReadingView
  const handleWordClick = (wordIndex: number, startTime: number) => {
    // startTime is already in seconds from ReadingView
    handleSeek(startTime);
  };

  // Convert word timings format for ReadingView
  const readingViewTimings = wordTimings.map(timing => ({
    word: timing.word,
    start: timing.startTime / 1000, // Convert to seconds
    end: timing.endTime / 1000,
  }));

  if (isLoading) {
    return (
      <ShowcaseContainer
        title="Integrated Reading Experience"
        description="Complete reading experience with synchronized audio and text"
      >
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-600">Loading demo data...</div>
        </div>
      </ShowcaseContainer>
    );
  }

  if (error) {
    return (
      <ShowcaseContainer
        title="Integrated Reading Experience"
        description="Complete reading experience with synchronized audio and text"
      >
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold">Error</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </ShowcaseContainer>
    );
  }

  return (
    <ShowcaseContainer
      title="Integrated Reading Experience"
      description="Complete reading experience with synchronized audio and text"
    >
      {/* Audio Controls */}
      <ShowcaseSection
        title="Audio Controls"
        description="Control audio playback and streaming"
      >
        <div className="space-y-4">
          {/* Main controls */}
          <div className="flex items-center gap-4">
            <button
              onClick={togglePlayPause}
              disabled={isBuffering}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                isBuffering
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {isBuffering ? 'Buffering...' : isPlaying ? 'Pause' : 'Play'}
            </button>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {formatTime(currentTime)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={(e) => handleSeek(Number(e.target.value))}
                  className="flex-1"
                  disabled={!duration}
                />
                <span className="text-sm text-gray-600">
                  {formatTime(duration)}
                </span>
              </div>
            </div>
          </div>

          {/* Playback rate and volume */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Speed: {playbackRate}x
              </label>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.25}
                value={playbackRate}
                onChange={(e) => handlePlaybackRateChange(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Volume: {Math.round(volume * 100)}%
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </ShowcaseSection>

      {/* Reading View */}
      <ShowcaseSection
        title="Synchronized Reading View"
        description="Text highlights in sync with audio playback"
      >
        <ReadingView
          text={transcript}
          wordTimings={readingViewTimings}
          currentTime={currentTime}
          isPlaying={isPlaying}
          onWordClick={handleWordClick}
        />
      </ShowcaseSection>

      {/* Features */}
      <ShowcaseSection
        title="Integration Features"
        description="What this showcase demonstrates"
      >
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>Real audio file streaming (WAV format)</li>
          <li>Word-level timing synchronization from align.json</li>
          <li>Click any word to jump to that position in audio</li>
          <li>Playback speed control affects both audio and highlighting</li>
          <li>Volume control for audio playback</li>
          <li>Buffering state management</li>
          <li>Seamless integration between audio and text components</li>
        </ul>
      </ShowcaseSection>
    </ShowcaseContainer>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
