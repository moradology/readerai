import React from 'react';
import { clsx } from 'clsx';

interface ReadingControlsProps {
  // Playback state
  isPlaying: boolean;
  isLoading?: boolean;
  isBuffering?: boolean;

  // Time info
  currentTime: number;
  duration: number;

  // Playback settings
  playbackRate: number;
  volume: number;

  // Callbacks
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onPlaybackRateChange: (rate: number) => void;
  onVolumeChange: (volume: number) => void;
  onRestart?: () => void;

  // Optional customization
  className?: string;
  showVolumeControl?: boolean;
  showSpeedControl?: boolean;
  availableSpeeds?: number[];
}

export const ReadingControls: React.FC<ReadingControlsProps> = ({
  isPlaying,
  isLoading = false,
  isBuffering = false,
  currentTime,
  duration,
  playbackRate,
  volume,
  onPlayPause,
  onSeek,
  onPlaybackRateChange,
  onVolumeChange,
  onRestart,
  className,
  showVolumeControl = true,
  showSpeedControl = true,
  availableSpeeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
}) => {
  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || seconds < 0) {
      return '0:00';
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = (): number => {
    if (!duration || duration === 0) return 0;
    return (currentTime / duration) * 100;
  };

  const isDisabled = isLoading || !duration;

  return (
    <div className={clsx('bg-white rounded-lg shadow-sm p-4', className)}>
      {/* Main playback controls */}
      <div className="flex items-center gap-3 mb-4">
        {/* Play/Pause button */}
        <button
          onClick={onPlayPause}
          disabled={isDisabled}
          className={clsx(
            'relative flex items-center justify-center w-12 h-12 rounded-full transition-all',
            {
              'bg-blue-500 hover:bg-blue-600 text-white': !isDisabled,
              'bg-gray-300 text-gray-500 cursor-not-allowed': isDisabled,
            }
          )}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isBuffering ? (
            // Loading spinner
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : isPlaying ? (
            // Pause icon
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            // Play icon
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>

        {/* Optional restart button */}
        {onRestart && (
          <button
            onClick={onRestart}
            disabled={isDisabled}
            className={clsx(
              'p-2 rounded-lg transition-colors',
              {
                'hover:bg-gray-100 text-gray-700': !isDisabled,
                'text-gray-400 cursor-not-allowed': isDisabled,
              }
            )}
            aria-label="Restart"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3v5h5"
              />
            </svg>
          </button>
        )}

        {/* Progress bar and time */}
        <div className="flex-1 flex items-center gap-3">
          <span className="text-sm text-gray-600 tabular-nums">
            {formatTime(currentTime)}
          </span>

          <div className="flex-1 relative">
            {/* Progress track */}
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              {/* Progress fill */}
              <div
                className="h-full bg-blue-500 transition-all duration-300 ease-out"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>

            {/* Seek slider (invisible, overlaid) */}
            <input
              type="range"
              min={0}
              max={Math.max(duration, 1)}
              value={Math.min(currentTime, Math.max(duration, 1))}
              onChange={(e) => onSeek(Number(e.target.value))}
              disabled={isDisabled}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              aria-label="Seek"
            />
          </div>

          <span className="text-sm text-gray-600 tabular-nums">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Speed and volume controls */}
      {(showSpeedControl || showVolumeControl) && (
        <div className="grid grid-cols-2 gap-4">
          {/* Speed control */}
          {showSpeedControl && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Speed
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={playbackRate}
                  onChange={(e) => onPlaybackRateChange(Number(e.target.value))}
                  disabled={isDisabled}
                  className={clsx(
                    'flex-1 px-3 py-1.5 rounded-lg border transition-colors',
                    {
                      'border-gray-300 hover:border-gray-400': !isDisabled,
                      'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed': isDisabled,
                    }
                  )}
                  aria-label="Playback speed"
                >
                  {availableSpeeds.map(speed => (
                    <option key={speed} value={speed}>
                      {speed}x
                    </option>
                  ))}
                </select>

                {/* Quick speed buttons */}
                <div className="flex gap-1">
                  {[0.75, 1, 1.5].map(speed => (
                    <button
                      key={speed}
                      onClick={() => onPlaybackRateChange(speed)}
                      disabled={isDisabled}
                      className={clsx(
                        'px-2 py-1 text-xs rounded transition-colors',
                        {
                          'bg-blue-500 text-white': playbackRate === speed && !isDisabled,
                          'bg-gray-100 hover:bg-gray-200 text-gray-700':
                            playbackRate !== speed && !isDisabled,
                          'bg-gray-50 text-gray-400 cursor-not-allowed': isDisabled,
                        }
                      )}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Volume control */}
          {showVolumeControl && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Volume
              </label>
              <div className="flex items-center gap-3">
                {/* Volume icon */}
                <button
                  onClick={() => onVolumeChange(volume === 0 ? 1 : 0)}
                  disabled={isDisabled}
                  className={clsx(
                    'p-1.5 rounded transition-colors',
                    {
                      'hover:bg-gray-100 text-gray-700': !isDisabled,
                      'text-gray-400 cursor-not-allowed': isDisabled,
                    }
                  )}
                  aria-label={volume === 0 ? 'Unmute' : 'Mute'}
                >
                  {volume === 0 ? (
                    // Muted icon
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    // Volume icon
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>

                {/* Volume slider */}
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={volume}
                  onChange={(e) => onVolumeChange(Number(e.target.value))}
                  disabled={isDisabled}
                  className={clsx(
                    'flex-1',
                    { 'opacity-50 cursor-not-allowed': isDisabled }
                  )}
                  aria-label="Volume"
                />

                {/* Volume percentage */}
                <span className="text-sm text-gray-600 tabular-nums w-12 text-right">
                  {Math.round(volume * 100)}%
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Story/Demo component for showcasing
export const ReadingControlsStory: React.FC = () => {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [playbackRate, setPlaybackRate] = React.useState(1);
  const [volume, setVolume] = React.useState(1);

  const duration = 300; // 5 minutes

  // Simulate playback
  React.useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentTime(prev => {
        const next = prev + 0.1 * playbackRate;
        if (next >= duration) {
          setIsPlaying(false);
          return duration;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, playbackRate, duration]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Basic Controls</h3>
        <ReadingControls
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          playbackRate={playbackRate}
          volume={volume}
          onPlayPause={() => setIsPlaying(!isPlaying)}
          onSeek={setCurrentTime}
          onPlaybackRateChange={setPlaybackRate}
          onVolumeChange={setVolume}
          onRestart={() => {
            setCurrentTime(0);
            setIsPlaying(false);
          }}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Loading State</h3>
        <ReadingControls
          isPlaying={false}
          isLoading={true}
          currentTime={0}
          duration={0}
          playbackRate={1}
          volume={1}
          onPlayPause={() => {}}
          onSeek={() => {}}
          onPlaybackRateChange={() => {}}
          onVolumeChange={() => {}}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Buffering State</h3>
        <ReadingControls
          isPlaying={true}
          isBuffering={true}
          currentTime={45}
          duration={300}
          playbackRate={1}
          volume={0.7}
          onPlayPause={() => {}}
          onSeek={() => {}}
          onPlaybackRateChange={() => {}}
          onVolumeChange={() => {}}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Minimal (No Speed/Volume)</h3>
        <ReadingControls
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          playbackRate={1}
          volume={1}
          showSpeedControl={false}
          showVolumeControl={false}
          onPlayPause={() => setIsPlaying(!isPlaying)}
          onSeek={setCurrentTime}
          onPlaybackRateChange={() => {}}
          onVolumeChange={() => {}}
        />
      </div>
    </div>
  );
};
