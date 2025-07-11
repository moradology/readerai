import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { ReadingView } from '../ReadingView';

// Mock scrollTo since it's not available in jsdom
beforeAll(() => {
  Element.prototype.scrollTo = vi.fn();
});

describe('ReadingView', () => {
  const mockText = "The quick brown fox jumps over the lazy dog.";
  const mockWordTimings = [
    { word: "The", start: 0.0, end: 0.3 },
    { word: "quick", start: 0.3, end: 0.7 },
    { word: "brown", start: 0.7, end: 1.1 },
    { word: "fox", start: 1.1, end: 1.4 },
    { word: "jumps", start: 1.4, end: 1.8 },
    { word: "over", start: 1.8, end: 2.1 },
    { word: "the", start: 2.1, end: 2.3 },
    { word: "lazy", start: 2.3, end: 2.7 },
    { word: "dog.", start: 2.7, end: 3.0 },
  ];

  it('renders text correctly', () => {
    render(
      <ReadingView
        text={mockText}
        wordTimings={mockWordTimings}
        currentTime={0}
        isPlaying={false}
      />
    );

    // Check that all words are rendered
    mockWordTimings.forEach((timing) => {
      expect(screen.getByText(timing.word)).toBeInTheDocument();
    });
  });

  it('highlights the active word based on currentTime', () => {
    const { rerender } = render(
      <ReadingView
        text={mockText}
        wordTimings={mockWordTimings}
        currentTime={0.5} // During "quick"
        isPlaying={true}
      />
    );

    // "quick" should be highlighted with active classes
    const quickWord = screen.getByText('quick');
    expect(quickWord).toHaveClass('bg-blue-500');
    expect(quickWord).toHaveClass('text-white');
    expect(quickWord).toHaveClass('ring-2');

    // Update time to highlight "fox"
    rerender(
      <ReadingView
        text={mockText}
        wordTimings={mockWordTimings}
        currentTime={1.2} // During "fox"
        isPlaying={true}
      />
    );

    const foxWord = screen.getByText('fox');
    expect(foxWord).toHaveClass('bg-blue-500');
    expect(foxWord).toHaveClass('text-white');
  });

  it('marks past words appropriately', () => {
    render(
      <ReadingView
        text={mockText}
        wordTimings={mockWordTimings}
        currentTime={1.5} // During "jumps"
        isPlaying={true}
      />
    );

    // Words before "jumps" should have past styling
    const theWord = screen.getByText('The');
    const quickWord = screen.getByText('quick');

    expect(theWord).toHaveClass('bg-gray-100');
    expect(quickWord).toHaveClass('bg-gray-100');

    // Active word should not have past styling
    const jumpsWord = screen.getByText('jumps');
    expect(jumpsWord).not.toHaveClass('bg-gray-100');
    expect(jumpsWord).toHaveClass('bg-blue-500');
  });

  it('handles word clicks when callback provided', () => {
    const mockOnWordClick = vi.fn();

    render(
      <ReadingView
        text={mockText}
        wordTimings={mockWordTimings}
        currentTime={0}
        isPlaying={false}
        onWordClick={mockOnWordClick}
      />
    );

    // Click on "brown" (index 2)
    const brownWord = screen.getByText('brown');
    fireEvent.click(brownWord);

    expect(mockOnWordClick).toHaveBeenCalledWith(2, 0.7);
  });

  it('does not allow clicks when no callback provided', () => {
    render(
      <ReadingView
        text={mockText}
        wordTimings={mockWordTimings}
        currentTime={0}
        isPlaying={false}
      />
    );

    const brownWord = screen.getByText('brown');
    expect(brownWord).toHaveClass('cursor-default');
  });

  it('handles keyboard navigation on clickable words', () => {
    const mockOnWordClick = vi.fn();

    render(
      <ReadingView
        text={mockText}
        wordTimings={mockWordTimings}
        currentTime={0}
        isPlaying={false}
        onWordClick={mockOnWordClick}
      />
    );

    const foxWord = screen.getByText('fox');

    // Test Enter key
    fireEvent.keyDown(foxWord, { key: 'Enter' });
    expect(mockOnWordClick).toHaveBeenCalledWith(3, 1.1);

    // Test Space key
    mockOnWordClick.mockClear();
    fireEvent.keyDown(foxWord, { key: ' ' });
    expect(mockOnWordClick).toHaveBeenCalledWith(3, 1.1);
  });

  it('handles missing word timings gracefully', () => {
    render(
      <ReadingView
        text="Hello world"
        wordTimings={[]}
        currentTime={0}
        isPlaying={false}
      />
    );

    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('world')).toBeInTheDocument();
  });

  it('groups words into sentences', () => {
    const sentenceText = "First sentence. Second one! Third?";
    const sentenceTimings = [
      { word: "First", start: 0, end: 0.5 },
      { word: "sentence.", start: 0.5, end: 1.2 },
      { word: "Second", start: 1.5, end: 2.0 },
      { word: "one!", start: 2.0, end: 2.4 },
      { word: "Third?", start: 2.6, end: 3.0 },
    ];

    render(
      <ReadingView
        text={sentenceText}
        wordTimings={sentenceTimings}
        currentTime={0}
        isPlaying={false}
      />
    );

    // All words should be rendered
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('sentence.')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });

  it('provides appropriate ARIA labels', () => {
    const mockOnWordClick = vi.fn();

    render(
      <ReadingView
        text={mockText}
        wordTimings={mockWordTimings}
        currentTime={0.5} // "quick" is active
        isPlaying={true}
        onWordClick={mockOnWordClick}
      />
    );

    const quickWord = screen.getByText('quick');
    expect(quickWord).toHaveAttribute('aria-label', 'Currently reading: quick');

    const foxWord = screen.getByText('fox');
    expect(foxWord).toHaveAttribute('aria-label', 'Jump to: fox');
  });

  it('handles currentTime beyond last word', () => {
    render(
      <ReadingView
        text={mockText}
        wordTimings={mockWordTimings}
        currentTime={10.0} // Way past end
        isPlaying={false}
      />
    );

    // Last word should be highlighted
    const lastWord = screen.getByText('dog.');
    expect(lastWord).toHaveClass('bg-blue-500');
  });

  it('applies hover and shadow styles to clickable words', () => {
    const mockOnWordClick = vi.fn();

    render(
      <ReadingView
        text={mockText}
        wordTimings={mockWordTimings}
        currentTime={0}
        isPlaying={false}
        onWordClick={mockOnWordClick}
      />
    );

    const brownWord = screen.getByText('brown');
    expect(brownWord).toHaveClass('hover:bg-gray-200');
    expect(brownWord).toHaveClass('cursor-pointer');
  });

  it('applies ring to active word without layout shift', () => {
    render(
      <ReadingView
        text={mockText}
        wordTimings={mockWordTimings}
        currentTime={0.5} // "quick" is active
        isPlaying={true}
      />
    );

    const quickWord = screen.getByText('quick');
    expect(quickWord).toHaveClass('ring-2');
    expect(quickWord).toHaveClass('ring-blue-300');
    expect(quickWord).not.toHaveClass('font-semibold'); // No font weight change
  });
});
