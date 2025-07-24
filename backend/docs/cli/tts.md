# TTS (Text-to-Speech) Commands

The TTS module provides commands for synthesizing speech using AWS Polly with intelligent caching.

## Overview

ReaderAI's TTS system:

- Uses AWS Polly for high-quality neural speech synthesis
- Caches all generated audio in S3 to avoid redundant synthesis
- Generates word-level timing for synchronized highlighting
- Supports batch processing for efficiency

## Commands

### `readerai tts synthesize`

Convert text to speech with caching.

#### Usage

```bash
readerai tts synthesize TEXT [OPTIONS]
```

#### Options

- `--voice, -v` - Polly voice ID (default: from config or "Joanna")
- `--output, -o` - Save audio to local file
- `--timings, -t` - Display word-level timings

#### Examples

Basic synthesis:

```bash
readerai tts synthesize "Once upon a time, in a land far away"
```

Use a different voice:

```bash
readerai tts synthesize "Welcome to our story" --voice Matthew
```

Save audio locally:

```bash
readerai tts synthesize "Chapter 1 begins here" --output chapter1.mp3
```

Show word timings:

```bash
readerai tts synthesize "The quick brown fox" --timings
```

Output example:

```
✓ Using cached audio
Cache key: a7b9c2d4e5f6...
Audio URL: https://s3.amazonaws.com/bucket/polly/standard/Joanna/a7b9c2d4e5f6/audio.mp3

Word Timings
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Word        Time (ms)
────────────────────────────
The         0
quick       250
brown       520
fox         890
```

### `readerai tts pregen`

Pre-generate audio for entire books or long stories.

#### Usage

```bash
readerai tts pregen BOOK_PATH [OPTIONS]
```

#### Options

- `--voice, -v` - Polly voice ID
- `--batch-size, -b` - Concurrent chunk processing (default: 5)
- `--chunk-size, -c` - Target words per chunk (default: 400)
- `--metadata, -m` - Save chunk metadata to JSON file

#### Examples

Pre-generate a book:

```bash
readerai tts pregen ./books/alice_wonderland.txt --voice Amy
```

With custom chunking:

```bash
readerai tts pregen ./stories/long_story.txt \
  --chunk-size 300 \
  --batch-size 10 \
  --metadata story_metadata.json
```

Output example:

```
📚 Pre-generating audio for: alice_wonderland.txt
📄 Split into 127 chunks

Processing chunks with voice 'Amy' [████████████████] 127/127

✅ Pre-generation complete!
   Total chunks: 127
   Voice: Amy
   All audio cached in S3

Now you can serve this content using the cache endpoints:
  GET /api/tts/{cache_key}/audio
  GET /api/tts/{cache_key}/text
  GET /api/tts/{cache_key}/timings
  GET /api/tts/{cache_key}/all
```

### `readerai tts cache-info`

Inspect cached synthesis data.

#### Usage

```bash
readerai tts cache-info CACHE_KEY [OPTIONS]
```

#### Options

- `--voice, -v` - Voice ID (default: Joanna)
- `--engine, -e` - Polly engine: 'standard' or 'neural'

#### Examples

Check cache entry:

```bash
readerai tts cache-info a7b9c2d4e5f6g8h9
```

With specific voice/engine:

```bash
readerai tts cache-info a7b9c2d4e5f6g8h9 --voice Matthew --engine neural
```

Output example:

```
Cache Key: a7b9c2d4e5f6g8h9
Voice ID: Joanna
Engine: standard
S3 Bucket: readerai-audio-cache

✓ Audio:
  Key: polly/standard/Joanna/a7b9c2d4e5f6g8h9/audio.mp3
  Size: 125,432 bytes
  Modified: 2024-01-15 10:23:45

✓ Text:
  Key: polly/standard/Joanna/a7b9c2d4e5f6g8h9/text.json
  Size: 1,245 bytes
  Modified: 2024-01-15 10:23:45

✓ Timings:
  Key: polly/standard/Joanna/a7b9c2d4e5f6g8h9/timings.json
  Size: 3,567 bytes
  Modified: 2024-01-15 10:23:45

Text Preview: Once upon a time, in a land far away, there lived a young princess who...
```

### `readerai tts batch-synth`

Batch synthesize multiple texts from a JSON file.

#### Usage

```bash
readerai tts batch-synth INPUT_FILE [OPTIONS]
```

#### Options

- `--voice, -v` - Voice ID for all texts
- `--output, -o` - Save results to JSON file

#### Input Format

```json
[
  "First text to synthesize",
  "Second text to synthesize",
  "Third text to synthesize"
]
```

Or:

```json
{
  "texts": ["First text", "Second text"]
}
```

#### Examples

Basic batch synthesis:

```bash
readerai tts batch-synth vocabulary_phrases.json
```

With output file:

```bash
readerai tts batch-synth phrases.json --output results.json --voice Kevin
```

Output example:

```
📋 Loaded 25 texts to synthesize
Synthesizing 25 texts... Done!

Batch Synthesis Results
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#    Cache Key        Cached  Text Preview
──────────────────────────────────────────────────────
1    a7b9c2d4e5f6... ✓       What does ethereal mean?...
2    b8c0d3e5f6g7... ✨      The luminescent glow...
3    c9d1e4f6g7h8... ✓       In the subterranean...

✓ Saved results to results.json
```

## Cache System

### How Caching Works

1. **Cache Key Generation**
   - SHA-256 hash of `text:voice_id:engine`
   - Deterministic - same input always produces same key
   - Collision-resistant

2. **S3 Structure**

   ```
   s3://bucket/
   └── polly/
       ├── standard/
       │   └── Joanna/
       │       └── a7b9c2d4e5f6.../
       │           ├── audio.mp3
       │           ├── text.json
       │           └── timings.json
       └── neural/
           └── Amy/
               └── b8c0d3e5f6g7.../
                   └── ...
   ```

3. **Cache Lookup**
   - Check if audio.mp3 exists
   - If yes, return presigned URLs
   - If no, synthesize and store

### Cache Benefits

- **Cost Savings**: Polly charges per character synthesized
- **Performance**: Instant retrieval vs synthesis time
- **Consistency**: Same audio for repeated content
- **Reliability**: Reduced dependency on Polly availability

## Voice Selection

### Available Voices

Standard voices (faster, lower cost):

- Joanna (default) - US English, female
- Matthew - US English, male
- Amy - British English, female
- Brian - British English, male

Neural voices (more natural, higher cost):

- All standard voices in neural version
- Additional child voices: Kevin, Justin, Ivy

### Voice Selection Strategy

1. **For Stories**: Use engaging voices like Amy or Ivy
2. **For Instructions**: Clear voices like Joanna or Matthew
3. **For Children**: Child voices or energetic adult voices
4. **For Long Content**: Consistent voice throughout

Example comparing voices:

```bash
# Compare different voices
for voice in Joanna Matthew Amy Kevin; do
  echo "Testing voice: $voice"
  readerai tts synthesize "Welcome to ReaderAI" --voice $voice
done
```

## Performance Tips

### Batch Processing

Always use batch commands for multiple texts:

```bash
# Good - single batch request
readerai tts batch-synth all_phrases.json

# Bad - multiple individual requests
for phrase in "${phrases[@]}"; do
  readerai tts synthesize "$phrase"
done
```

### Pre-generation

Pre-generate content during off-peak hours:

```bash
# Schedule with cron for 3 AM
0 3 * * * /path/to/readerai tts pregen /new/content/*.txt
```

### Chunk Size Optimization

- Smaller chunks (200-300 words): Better for interactive reading
- Larger chunks (400-600 words): More efficient synthesis
- Balance based on use case

## Integration with API

The cached audio is served through REST endpoints:

```python
# Python example
import requests

# Get all URLs for a cache key
response = requests.get(
    f"https://api.readerai.com/api/tts/{cache_key}/all",
    params={"voice_id": "Joanna", "engine": "standard"}
)
urls = response.json()

# Stream audio
audio_url = urls["presigned_audio_url"]
audio_response = requests.get(audio_url, stream=True)

# Get timings for synchronization
timings_response = requests.get(urls["presigned_timings_url"])
timings = timings_response.json()
```

## Troubleshooting

### Common Issues

1. **"Cache key not found"**
   - Verify the exact cache key
   - Check voice_id and engine match
   - Use `cache-info` to debug

2. **"Access Denied" errors**
   - Check S3 bucket permissions
   - Verify AWS credentials
   - Ensure bucket exists

3. **Slow synthesis**
   - Use neural engine only when needed
   - Increase batch size for bulk operations
   - Check AWS service health

### Debug Commands

```bash
# Verify AWS connectivity
aws s3 ls s3://your-bucket/polly/

# Test Polly access
aws polly synthesize-speech \
  --text "Test" \
  --voice-id Joanna \
  --output-format mp3 \
  test.mp3

# Check cache structure
readerai tts cache-info <cache_key> --voice Joanna
```
