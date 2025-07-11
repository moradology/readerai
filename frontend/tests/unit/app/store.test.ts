import { describe, it, expect } from 'vitest';
import { store } from '@app/store';
import { play, pause, updateProgress } from '@features/reading/store/readingSlice';

describe('Redux Store', () => {
  it('should have initial state', () => {
    const state = store.getState();
    expect(state.reading.status).toBe('idle');
    expect(state.reading.currentWordIndex).toBe(-1);
  });

  it('should handle play action', () => {
    store.dispatch(play());
    const state = store.getState();
    expect(state.reading.status).toBe('playing');
  });

  it('should handle pause action', () => {
    store.dispatch(play());
    store.dispatch(pause());
    const state = store.getState();
    expect(state.reading.status).toBe('paused');
  });

  it('should handle progress updates', () => {
    store.dispatch(updateProgress({ currentWordIndex: 5, currentTime: 2.5 }));
    const state = store.getState();
    expect(state.reading.currentWordIndex).toBe(5);
    expect(state.reading.currentTime).toBe(2.5);
  });
});
