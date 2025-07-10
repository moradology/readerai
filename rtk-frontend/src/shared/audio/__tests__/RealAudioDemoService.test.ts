import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RealAudioDemoService } from '../RealAudioDemoService';

// Mock fetch
globalThis.fetch = vi.fn();

describe('RealAudioDemoService', () => {
  let service: RealAudioDemoService;

  beforeEach(() => {
    service = new RealAudioDemoService();
    vi.clearAllMocks();
  });

  describe('initialization flow', () => {
    it('should not be ready before startStream is called', () => {
      expect(service.isStreamReady()).toBe(false);
    });

    it('should throw error when getChunk is called before startStream', async () => {
      await expect(service.getChunk(0)).rejects.toThrow('Stream not initialized');
    });

    it('should properly initialize when startStream is called', async () => {
      // Mock successful audio file fetch
      const mockArrayBuffer = new ArrayBuffer(1000);
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async (): Promise<ArrayBuffer> => mockArrayBuffer,
      });

      const metadata = await service.startStream('/test.wav');

      expect(service.isStreamReady()).toBe(true);
      expect(metadata).toBeDefined();
      expect(metadata.totalChunks).toBeGreaterThan(0);
    });

    it('should be able to get chunks after initialization', async () => {
      // Mock successful audio file fetch
      const mockArrayBuffer = new ArrayBuffer(1000);
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async (): Promise<ArrayBuffer> => mockArrayBuffer,
      });

      await service.startStream('/test.wav');

      // Now getChunk should work
      const chunk = await service.getChunk(0);
      expect(chunk).toBeDefined();
      expect(chunk.sequenceNumber).toBe(0);
    });

    it('should handle stopStream correctly', async () => {
      // Initialize first
      const mockArrayBuffer = new ArrayBuffer(1000);
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async (): Promise<ArrayBuffer> => mockArrayBuffer,
      });

      await service.startStream('/test.wav');
      expect(service.isStreamReady()).toBe(true);

      // Stop stream
      service.stopStream();

      // Should still be ready because we keep the audio buffer
      expect(service.isStreamReady()).toBe(false); // metadata is cleared
    });
  });

  describe('error handling', () => {
    it('should handle fetch errors gracefully', async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

      await expect(service.startStream('/test.wav')).rejects.toThrow();
    });

    it('should handle invalid audio buffer', async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async (): Promise<ArrayBuffer> => null as unknown as ArrayBuffer,
      });

      await expect(service.startStream('/test.wav')).rejects.toThrow();
    });
  });
});
