import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { ReadingControls } from '../ReadingControls';

describe('ReadingControls', () => {
  const defaultProps = {
    isPlaying: false,
    currentTime: 0,
    duration: 100,
    playbackRate: 1,
    volume: 1,
    onPlayPause: vi.fn(),
    onSeek: vi.fn(),
    onPlaybackRateChange: vi.fn(),
    onVolumeChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders basic controls correctly', () => {
    render(<ReadingControls {...defaultProps} />);

    // Check main elements exist
    expect(screen.getByLabelText('Play')).toBeInTheDocument();
    expect(screen.getByLabelText('Seek')).toBeInTheDocument();
    expect(screen.getByLabelText('Playback speed')).toBeInTheDocument();
    expect(screen.getByLabelText('Volume')).toBeInTheDocument();
    expect(screen.getByText('0:00')).toBeInTheDocument();
    expect(screen.getByText('1:40')).toBeInTheDocument(); // 100 seconds
  });

  it('shows pause button when playing', () => {
    render(<ReadingControls {...defaultProps} isPlaying={true} />);
    expect(screen.getByLabelText('Pause')).toBeInTheDocument();
  });

  it('calls onPlayPause when play/pause button clicked', () => {
    render(<ReadingControls {...defaultProps} />);

    const playButton = screen.getByLabelText('Play');
    fireEvent.click(playButton);

    expect(defaultProps.onPlayPause).toHaveBeenCalledTimes(1);
  });

  it('displays current time and duration correctly', () => {
    render(
      <ReadingControls
        {...defaultProps}
        currentTime={65.5}
        duration={185}
      />
    );

    expect(screen.getByText('1:05')).toBeInTheDocument();
    expect(screen.getByText('3:05')).toBeInTheDocument();
  });

  it('shows progress bar at correct position', () => {
    const { container } = render(
      <ReadingControls
        {...defaultProps}
        currentTime={25}
        duration={100}
      />
    );

    const progressBar = container.querySelector('[style*="width: 25%"]');
    expect(progressBar).toBeInTheDocument();
  });

  it('calls onSeek when progress bar clicked', () => {
    render(<ReadingControls {...defaultProps} />);

    const seekSlider = screen.getByLabelText('Seek');
    fireEvent.change(seekSlider, { target: { value: '50' } });

    expect(defaultProps.onSeek).toHaveBeenCalledWith(50);
  });

  it('shows restart button when onRestart provided', () => {
    const onRestart = vi.fn();
    render(<ReadingControls {...defaultProps} onRestart={onRestart} />);

    const restartButton = screen.getByLabelText('Restart');
    expect(restartButton).toBeInTheDocument();

    fireEvent.click(restartButton);
    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  it('disables controls when loading', () => {
    render(<ReadingControls {...defaultProps} isLoading={true} />);

    expect(screen.getByLabelText('Play')).toBeDisabled();
    expect(screen.getByLabelText('Seek')).toBeDisabled();
    expect(screen.getByLabelText('Playback speed')).toBeDisabled();
    expect(screen.getByLabelText('Volume')).toBeDisabled();
  });

  it('shows buffering state', () => {
    const { container } = render(
      <ReadingControls {...defaultProps} isBuffering={true} />
    );

    // Should show spinner
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('handles playback rate changes', () => {
    render(<ReadingControls {...defaultProps} />);

    const speedSelect = screen.getByLabelText('Playback speed');
    fireEvent.change(speedSelect, { target: { value: '1.5' } });

    expect(defaultProps.onPlaybackRateChange).toHaveBeenCalledWith(1.5);
  });

  it('shows quick speed buttons', () => {
    render(<ReadingControls {...defaultProps} />);

    // Quick speed buttons
    const speed075 = screen.getByRole('button', { name: '0.75x' });
    const speed1 = screen.getByRole('button', { name: '1x' });
    const speed15 = screen.getByRole('button', { name: '1.5x' });

    expect(speed075).toBeInTheDocument();
    expect(speed1).toBeInTheDocument();
    expect(speed15).toBeInTheDocument();

    fireEvent.click(speed15);
    expect(defaultProps.onPlaybackRateChange).toHaveBeenCalledWith(1.5);
  });

  it('highlights active speed button', () => {
    render(<ReadingControls {...defaultProps} playbackRate={1.5} />);

    const speed15 = screen.getByRole('button', { name: '1.5x' });
    expect(speed15).toHaveClass('bg-blue-500');
  });

  it('handles volume changes', () => {
    render(<ReadingControls {...defaultProps} />);

    const volumeSlider = screen.getByLabelText('Volume');
    fireEvent.change(volumeSlider, { target: { value: '0.5' } });

    expect(defaultProps.onVolumeChange).toHaveBeenCalledWith(0.5);
  });

  it('shows volume percentage', () => {
    render(<ReadingControls {...defaultProps} volume={0.7} />);
    expect(screen.getByText('70%')).toBeInTheDocument();
  });

  it('toggles mute when volume icon clicked', () => {
    render(<ReadingControls {...defaultProps} volume={0.8} />);

    const muteButton = screen.getByLabelText('Mute');
    fireEvent.click(muteButton);

    expect(defaultProps.onVolumeChange).toHaveBeenCalledWith(0);
  });

  it('unmutes to full volume when muted icon clicked', () => {
    render(<ReadingControls {...defaultProps} volume={0} />);

    const unmuteButton = screen.getByLabelText('Unmute');
    fireEvent.click(unmuteButton);

    expect(defaultProps.onVolumeChange).toHaveBeenCalledWith(1);
  });

  it('hides volume control when showVolumeControl is false', () => {
    render(<ReadingControls {...defaultProps} showVolumeControl={false} />);

    expect(screen.queryByLabelText('Volume')).not.toBeInTheDocument();
    expect(screen.queryByText('Volume')).not.toBeInTheDocument();
  });

  it('hides speed control when showSpeedControl is false', () => {
    render(<ReadingControls {...defaultProps} showSpeedControl={false} />);

    expect(screen.queryByLabelText('Playback speed')).not.toBeInTheDocument();
    expect(screen.queryByText('Speed')).not.toBeInTheDocument();
  });

  it('uses custom available speeds', () => {
    render(
      <ReadingControls
        {...defaultProps}
        availableSpeeds={[0.5, 1, 2]}
      />
    );

    const speedSelect = screen.getByLabelText('Playback speed');
    const options = speedSelect.querySelectorAll('option');

    expect(options).toHaveLength(3);
    expect(options[0]).toHaveValue('0.5');
    expect(options[1]).toHaveValue('1');
    expect(options[2]).toHaveValue('2');
  });

  it('applies custom className', () => {
    const { container } = render(
      <ReadingControls {...defaultProps} className="custom-class" />
    );

    const controls = container.firstChild;
    expect(controls).toHaveClass('custom-class');
    expect(controls).toHaveClass('bg-white'); // Should still have default classes
  });

  it('handles edge case of zero duration', () => {
    const { container } = render(
      <ReadingControls
        {...defaultProps}
        currentTime={50}
        duration={0}
      />
    );

    // Should show 0% progress
    const progressBar = container.querySelector('[style*="width: 0%"]');
    expect(progressBar).toBeInTheDocument();

    // Controls should be disabled
    expect(screen.getByLabelText('Play')).toBeDisabled();
  });
});
