"""
Pure function tests for TTS service.
No mocking, no external dependencies, just testing logic.
"""

from readerai.tts import TTSService, WordTiming


def test_cache_key_generation():
    """Test deterministic cache key generation"""
    # Same input should produce same output
    key1 = TTSService._generate_cache_key("Hello world", "Joanna")
    key2 = TTSService._generate_cache_key("Hello world", "Joanna")
    assert key1 == key2
    assert len(key1) == 64  # SHA-256 produces 64 character hex string

    # Different text should produce different key
    key3 = TTSService._generate_cache_key("Goodbye world", "Joanna")
    assert key1 != key3

    # Different voice should produce different key
    key4 = TTSService._generate_cache_key("Hello world", "Matthew")
    assert key1 != key4

    # Empty text should still produce valid key
    key5 = TTSService._generate_cache_key("", "Joanna")
    assert len(key5) == 64


def test_s3_key_structure():
    """Test S3 key path generation"""
    # Note: This is testing a pure function that doesn't need instance
    service = TTSService()

    audio_key, text_key, timings_key = service._build_s3_keys(
        "Joanna", "abc123", "standard"
    )

    assert audio_key == "polly/standard/Joanna/abc123/audio.mp3"
    assert text_key == "polly/standard/Joanna/abc123/text.json"
    assert timings_key == "polly/standard/Joanna/abc123/timings.json"

    # Test with different voice
    audio_key2, _, _ = service._build_s3_keys("Matthew", "xyz789", "standard")
    assert audio_key2 == "polly/standard/Matthew/xyz789/audio.mp3"


def test_speech_marks_parsing():
    """Test parsing of Polly speech marks format"""
    # Sample speech marks from Polly (newline-delimited JSON)
    speech_marks = """{"time":0,"type":"word","start":0,"end":5,"value":"Hello"}
{"time":500,"type":"word","start":6,"end":11,"value":"world"}
{"time":1000,"type":"sentence","start":0,"end":11,"value":"Hello world"}
{"time":1100,"type":"ssml","start":0,"end":11,"value":"<speak>Hello world</speak>"}"""

    timings = TTSService._parse_speech_marks(speech_marks)

    # Should only extract word timings
    assert len(timings) == 2
    assert all(isinstance(t, WordTiming) for t in timings)
    assert all(t.type == "word" for t in timings)

    # Check first word
    assert timings[0].value == "Hello"
    assert timings[0].time == 0
    assert timings[0].start == 0
    assert timings[0].end == 5

    # Check second word
    assert timings[1].value == "world"
    assert timings[1].time == 500
    assert timings[1].start == 6
    assert timings[1].end == 11


def test_speech_marks_parsing_edge_cases():
    """Test speech marks parsing with edge cases"""
    # Empty input
    assert TTSService._parse_speech_marks("") == []

    # Malformed JSON
    malformed = """{"time":0,"type":"word","start":0,"end":5,"value":"Hello"}
{broken json here
{"time":500,"type":"word","start":6,"end":11,"value":"world"}"""

    timings = TTSService._parse_speech_marks(malformed)
    # Should skip the malformed line
    assert len(timings) == 2

    # Only non-word marks
    non_words = """{"time":1000,"type":"sentence","start":0,"end":11,"value":"Hello world"}
{"time":1100,"type":"ssml","start":0,"end":11,"value":"<speak>Hello world</speak>"}"""

    timings = TTSService._parse_speech_marks(non_words)
    assert len(timings) == 0


def test_word_timing_model():
    """Test WordTiming model validation"""
    # Valid timing
    timing = WordTiming(value="Hello", time=100, start=0, end=5, type="word")
    assert timing.value == "Hello"
    assert timing.time == 100

    # Test model serialization
    data = timing.model_dump()
    assert data["value"] == "Hello"
    assert data["time"] == 100
    assert data["start"] == 0
    assert data["end"] == 5
    assert data["type"] == "word"
