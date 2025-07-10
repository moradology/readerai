/**
 * Integrated Reading Showcase
 *
 * Combines ReadingView with AudioStreaming to demonstrate
 * the complete reading experience with synchronized audio and text.
 */

import React, { useState, useEffect, useRef } from 'react';
import { ShowcaseContainer, ShowcaseSection } from './components/ShowcaseContainer';
import { ReadingView } from '@features/reading/components/ReadingView';
import { ReadingControls } from '@features/reading/components/ReadingControls';
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
        if (!transcriptResponse.ok) {
          throw new Error(`Failed to load transcript: ${transcriptResponse.status} ${transcriptResponse.statusText}`);
        }
        const transcriptText = await transcriptResponse.text();
        setTranscript(transcriptText.trim());

        // Load word timings
        const timings = await loadDemoWordTimings();
        setWordTimings(timings);

        // Get metadata to know duration (but don't start playing yet)
        console.log('[IntegratedReading] Getting stream metadata...');
        const metadata = await streamingService.current.startStream('demo');
        if (metadata) {
          setDuration(metadata.totalDuration);
          console.log('[IntegratedReading] Duration set to:', metadata.totalDuration);
        }

        setIsLoading(false);
        console.log('[IntegratedReading] Initialization complete:', {
          transcriptLength: transcriptText.length,
          wordTimingsCount: timings.length,
          duration: metadata?.totalDuration || 0,
        });
      } catch (err) {
        console.error('[IntegratedReading] Initialization error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize';
        setError(`Initialization failed: ${errorMessage}`);
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

      // Check if we already have metadata (from initialization)
      let metadata = streamingService.current.currentMetadata;

      if (!metadata) {
        // Start the stream - this returns metadata
        console.log('[IntegratedReading] Starting new stream...');
        metadata = await streamingService.current.startStream('demo');
      } else {
        console.log('[IntegratedReading] Using existing metadata');
      }

      if (!metadata) {
        throw new Error('No metadata available');
      }

      // Load all chunks into the player
      console.log('[IntegratedReading] Loading stream into player...');
      await audioPlayer.current.loadStream(streamingService.current, metadata);

      setDuration(metadata.totalDuration);
      setIsBuffering(false);

      // Start playback
      console.log('[IntegratedReading] Starting playback...');
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
    if (!audioPlayer.current) {
      console.error('[IntegratedReading] Audio player not initialized');
      return;
    }

    try {
      console.log('[IntegratedReading] Toggle play/pause:', {
        isPlaying,
        currentTime,
        isLoaded: audioPlayer.current.isLoaded(),
      });

      if (isPlaying) {
        audioPlayer.current.pause();
        setIsPlaying(false);
      } else {
        if (!audioPlayer.current.isLoaded()) {
          // Need to load the audio stream first
          console.log('[IntegratedReading] Audio not loaded, starting stream...');
          await startStreaming();
        } else {
          console.log('[IntegratedReading] Playing existing audio...');
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
        <ReadingControls
          isPlaying={isPlaying}
          isLoading={isLoading}
          isBuffering={isBuffering}
          currentTime={currentTime}
          duration={duration}
          playbackRate={playbackRate}
          volume={volume}
          onPlayPause={togglePlayPause}
          onSeek={handleSeek}
          onPlaybackRateChange={handlePlaybackRateChange}
          onVolumeChange={handleVolumeChange}
          onRestart={() => {
            handleSeek(0);
            setIsPlaying(false);
          }}
        />
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
