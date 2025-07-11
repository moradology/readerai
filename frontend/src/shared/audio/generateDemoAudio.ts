/**
 * Generate Demo Audio
 *
 * Creates a simple audio file using Web Audio API for testing
 */

export async function generateDemoAudio(): Promise<Blob> {
  // Create an audio context
  const AudioContextClass = window.AudioContext || ((window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) as typeof AudioContext;
  const audioContext = new AudioContextClass();

  // Create a buffer for 2 minutes at 44.1kHz
  const duration = 120; // seconds
  const sampleRate = audioContext.sampleRate;
  const numSamples = duration * sampleRate;
  const buffer = audioContext.createBuffer(1, numSamples, sampleRate);
  const channelData = buffer.getChannelData(0);

  // Generate a simple tone that changes pitch over time (to simulate speech patterns)
  const words = "The quick brown fox jumps over the lazy dog".split(' ');
  const wordsPerSecond = words.length / 10; // Speak all words in 10 seconds, then repeat

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const wordIndex = Math.floor((t * wordsPerSecond) % words.length);

    // Change frequency based on word (simulate pitch variation)
    const baseFreq = 200;
    const freqVariation = 50 + (wordIndex * 20);
    const frequency = baseFreq + freqVariation + Math.sin(t * 2) * 10; // Add vibrato

    // Generate tone with envelope
    const envelope = Math.sin((t % 0.5) * Math.PI * 2) * 0.5; // Word envelope
    const sample = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3;

    // Add some noise for realism
    const noise = (Math.random() - 0.5) * 0.02;

    channelData[i] = sample + noise;
  }

  // Convert buffer to WAV blob
  return bufferToWav(buffer);
}

function bufferToWav(buffer: AudioBuffer): Blob {
  const length = buffer.length * buffer.numberOfChannels * 2 + 44;
  const arrayBuffer = new ArrayBuffer(length);
  const view = new DataView(arrayBuffer);
  const channels: Float32Array[] = [];
  let offset = 0;
  let pos = 0;

  // Write WAV header
  const setUint16 = (data: number): void => {
    view.setUint16(pos, data, true);
    pos += 2;
  };

  const setUint32 = (data: number): void => {
    view.setUint32(pos, data, true);
    pos += 4;
  };

  // RIFF identifier (big-endian)
  view.setUint8(pos++, 0x52); // R
  view.setUint8(pos++, 0x49); // I
  view.setUint8(pos++, 0x46); // F
  view.setUint8(pos++, 0x46); // F
  // file length
  setUint32(length - 8);
  // WAVE identifier (big-endian)
  view.setUint8(pos++, 0x57); // W
  view.setUint8(pos++, 0x41); // A
  view.setUint8(pos++, 0x56); // V
  view.setUint8(pos++, 0x45); // E
  // fmt sub-chunk (big-endian)
  view.setUint8(pos++, 0x66); // f
  view.setUint8(pos++, 0x6d); // m
  view.setUint8(pos++, 0x74); // t
  view.setUint8(pos++, 0x20); // space
  // sub-chunk size
  setUint32(16);
  // format (1 = PCM)
  setUint16(1);
  // channels
  setUint16(buffer.numberOfChannels);
  // sample rate
  setUint32(buffer.sampleRate);
  // byte rate
  setUint32(buffer.sampleRate * 2 * buffer.numberOfChannels);
  // block align
  setUint16(buffer.numberOfChannels * 2);
  // bits per sample
  setUint16(16);
  // data sub-chunk (big-endian)
  view.setUint8(pos++, 0x64); // d
  view.setUint8(pos++, 0x61); // a
  view.setUint8(pos++, 0x74); // t
  view.setUint8(pos++, 0x61); // a
  // sub-chunk size
  setUint32(length - pos - 4);

  // Write interleaved data
  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      const channel = channels[i];
      if (channel && offset < channel.length) {
        const sample = Math.max(-1, Math.min(1, channel[offset] ?? 0));
        view.setInt16(pos, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      } else {
        view.setInt16(pos, 0, true); // Silence if no data
      }
      pos += 2;
    }
    offset++;
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}
