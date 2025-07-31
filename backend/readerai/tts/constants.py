"""
TTS-related constants
"""

# Default voice for AWS Polly
DEFAULT_VOICE = "Joanna"

# Available voices
ADULT_VOICES = ["Joanna", "Matthew", "Amy", "Brian", "Emma", "Russell"]
CHILD_VOICES = ["Ivy", "Justin", "Kevin"]

# Engine defaults (should be function parameters, not config)
DEFAULT_ENGINE = "neural"  # Use as function default, not global config
DEFAULT_SAMPLE_RATE = 24000
DEFAULT_FORMAT = "mp3"
