import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RealAudioDemoService } from '../RealAudioDemoService';

// Mock fetch for realistic WAV file simulation
global.fetch = vi.fn();

// Create a valid WAV header for testing
function createMockWavBuffer(sizeInBytes: number = 10000): ArrayBuffer {
  const buffer = new ArrayBuffer(sizeInBytes);
  const view = new DataView(buffer);

  // RIFF header
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, sizeInBytes - 8, true); // File size - 8
  view.setUint32(8, 0x57415645, false); // "WAVE"

  // fmt chunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true); // Chunk size
  view.setUint16(20, 1, true); // Audio format (PCM)
  view.setUint16(22, 1, true); // Number of channels
  view.setUint32(24, 44100, true); // Sample rate
  view.setUint32(28, 88200, true); // Byte rate
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample

  // data chunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, sizeInBytes - 44, true); // Data size

  return buffer;
}

describe('RealAudioDemoService - totalChunks error reproduction', () => {
  let service: RealAudioDemoService;

  beforeEach(() => {
    service = new RealAudioDemoService();
    vi.clearAllMocks();
  });

  describe('Reproduce the exact error scenario', () => {
    it('should handle null metadata access in getChunk', async () => {
      // This test reproduces the exact error the user is seeing

      // Step 1: Service is created but not initialized
      expect(service.isStreamReady()).toBe(false);

      // Step 2: User clicks play, which calls getChunk before stream is ready
      await expect(service.getChunk(0)).rejects.toThrow('Stream not initialized');
    });

    it('should handle race condition between startStream and getChunk', async () => {
      // Mock successful audio file fetch
      const mockBuffer = createMockWavBuffer(10000);
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => mockBuffer,
      });

      // Start stream initialization (don't await)
      const startPromise = service.startStream('/test.wav');

      // Immediately try to get chunk (simulating race condition)
      await expect(service.getChunk(0)).rejects.toThrow('Stream not initialized');

      // Now wait for start to complete
      const metadata = await startPromise;
      expect(metadata).toBeDefined();
      expect(metadata.totalChunks).toBeGreaterThan(0);

      // Now getChunk should work
      const chunk = await service.getChunk(0);
      expect(chunk).toBeDefined();
    });

    it('should handle concurrent getChunk calls during initialization', async () => {
      const mockBuffer = createMockWavBuffer(50000);
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => mockBuffer,
      });

      // Initialize stream
      const metadata = await service.startStream('/test.wav');

      // Only request chunks that exist
      const numChunksToRequest = Math.min(3, metadata.totalChunks);
      const chunkPromises = [];
      for (let i = 0; i < numChunksToRequest; i++) {
        chunkPromises.push(service.getChunk(i));
      }

      // All should succeed without null reference errors
      const chunks = await Promise.all(chunkPromises);
      expect(chunks).toHaveLength(numChunksToRequest);
      chunks.forEach((chunk, index) => {
        expect(chunk.sequenceNumber).toBe(index);
      });
    });

    it('should maintain metadata consistency during chunk loading', async () => {
      const mockBuffer = createMockWavBuffer(100000);
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => mockBuffer,
      });

      const metadata = await service.startStream('/test.wav');
      const initialTotalChunks = metadata.totalChunks;

      // Load multiple chunks
      for (let i = 0; i < Math.min(5, initialTotalChunks); i++) {
        const chunk = await service.getChunk(i);
        expect(chunk).toBeDefined();

        // Verify metadata hasn't become null during loading
        expect(service.isStreamReady()).toBe(true);
      }
    });

    it('should handle stopStream during active chunk loading', async () => {
      const mockBuffer = createMockWavBuffer(50000);
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => mockBuffer,
      });

      await service.startStream('/test.wav');

      // Start loading a chunk with simulated delay
      service.setSimulateNetworkDelay(true, 10);
      const chunkPromise = service.getChunk(0);

      // Wait a bit then stop stream
      await new Promise(resolve => setTimeout(resolve, 5));
      service.stopStream();

      // The in-flight chunk request should complete since it captured
      // the metadata reference before the async operation
      const chunk = await chunkPromise;
      expect(chunk).toBeDefined();

      // Metadata should be cleared immediately after stopStream
      expect(service.isStreamReady()).toBe(false);

      // New requests should fail
      await expect(service.getChunk(0)).rejects.toThrow('Stream not initialized');
    });
  });

  describe('Test the exact user flow', () => {
    it('should reproduce the user error flow', async () => {
      // This simulates the exact sequence that causes the error:
      // 1. Component mounts and creates services
      // 2. User clicks play
      // 3. handlePlay checks isStreamReady() - returns false
      // 4. handlePlay calls handleStartStream
      // 5. handleStartStream calls startStream and loadStream
      // 6. Somewhere during this, getChunk is called prematurely

      // Simulate delayed fetch response
      let resolveArrayBuffer: (value: ArrayBuffer) => void;
      const fetchPromise = new Promise<ArrayBuffer>(resolve => {
        resolveArrayBuffer = resolve;
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => fetchPromise,
      });

      // Start stream (non-blocking)
      const startPromise = service.startStream('/test.wav');

      // Check if ready (should be false)
      expect(service.isStreamReady()).toBe(false);

      // Try to get chunk (this is what causes the error)
      await expect(service.getChunk(0)).rejects.toThrow('Stream not initialized');

      // Now complete the fetch
      resolveArrayBuffer!(createMockWavBuffer(10000));

      // Wait for initialization to complete
      await startPromise;

      // Now it should work
      expect(service.isStreamReady()).toBe(true);
      const chunk = await service.getChunk(0);
      expect(chunk).toBeDefined();
    });
  });

  describe('Validate fix strategies', () => {
    it('should properly guard against null metadata in loadChunk', async () => {
      // Test that loadChunk method has proper null checks
      const mockBuffer = createMockWavBuffer(10000);
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => mockBuffer,
      });

      await service.startStream('/test.wav');

      // Manually clear metadata to simulate error condition
      // We'll need to use type assertion to access private property for testing
      (service as any).metadata = null;

      // Should throw meaningful error, not null reference
      await expect(service.getChunk(0)).rejects.toThrow('Stream not initialized');
    });

    it('should handle edge case of totalChunks being 0 or negative', async () => {
      // Create a very small buffer that might result in 0 chunks
      const mockBuffer = createMockWavBuffer(100); // Very small
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => mockBuffer,
      });

      const metadata = await service.startStream('/test.wav');

      // Should always have at least 1 chunk
      expect(metadata.totalChunks).toBeGreaterThanOrEqual(1);
    });
  });
});
