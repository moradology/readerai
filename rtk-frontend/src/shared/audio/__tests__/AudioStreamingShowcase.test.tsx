import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AudioStreamingShowcase } from '../../../showcases/AudioStreamingShowcase';
import '@testing-library/jest-dom';

// Mock the services
vi.mock('../RealAudioDemoService', () => ({
  RealAudioDemoService: vi.fn().mockImplementation(() => ({
    startStream: vi.fn().mockResolvedValue({
      streamId: 'test-stream',
      totalDuration: 60,
      totalChunks: 12,
      chunkDuration: 5,
      format: 'wav',
      sampleRate: 44100,
      bitrate: 128000,
      channels: 1,
    }),
    stopStream: vi.fn(),
    pauseStream: vi.fn(),
    resumeStream: vi.fn(),
    isStreamReady: vi.fn().mockReturnValue(false),
    getChunk: vi.fn().mockRejectedValue(new Error('Stream not initialized. Call startStream() first.')),
    prefetchChunks: vi.fn(),
    getBufferState: vi.fn().mockReturnValue({
      bufferedChunks: [],
      bufferedDuration: 0,
      bufferHealth: 'empty',
      isBuffering: false,
      bufferProgress: 0,
    }),
    clearBuffer: vi.fn(),
    onChunkReady: vi.fn().mockReturnValue(() => {}),
    onBufferStateChange: vi.fn().mockReturnValue(() => {}),
    onStreamError: vi.fn().mockReturnValue(() => {}),
    onStreamEnd: vi.fn().mockReturnValue(() => {}),
    setSimulateNetworkDelay: vi.fn(),
  })),
}));

vi.mock('../convertTimings', () => ({
  loadDemoWordTimings: vi.fn().mockResolvedValue([]),
}));

// Mock fetch
globalThis.fetch = vi.fn().mockResolvedValue({
  ok: true,
  text: async (): Promise<string> => 'Test transcript',
});

describe('AudioStreamingShowcase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without errors', () => {
    render(<AudioStreamingShowcase />);
    expect(screen.getByText('Audio Streaming Infrastructure')).toBeInTheDocument();
  });

  it('should show error when play is clicked before stream is ready', async () => {
    render(<AudioStreamingShowcase />);

    const playButton = screen.getByText('Play');
    fireEvent.click(playButton);

    await waitFor(() => {
      expect(screen.getByText(/Stream not initialized/)).toBeInTheDocument();
    });
  });

  it('should initialize stream when play is clicked', async () => {
    const { RealAudioDemoService } = await import('../RealAudioDemoService');
    const MockedService = RealAudioDemoService as unknown as new () => {
      startStream: ReturnType<typeof vi.fn>;
      isStreamReady: ReturnType<typeof vi.fn>;
    };
    const mockService = new MockedService();

    render(<AudioStreamingShowcase />);

    // Initially not ready
    expect(mockService.isStreamReady()).toBe(false);

    const playButton = screen.getByText('Play');
    fireEvent.click(playButton);

    await waitFor(() => {
      expect(mockService.startStream).toHaveBeenCalled();
    });
  });
});
