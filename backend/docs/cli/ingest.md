# Ingest Commands

The ingest module handles content processing, from simple stories to complex books with automatic chapter detection.

## Overview

ReaderAI's ingestion system:

- Processes text files into reading-ready content
- Automatically detects chapter boundaries in books
- Generates audio for all content using AWS Polly
- Organizes content with metadata for easy retrieval

## Commands

### `readerai ingest story`

Ingest a single story and pre-generate all audio chunks.

#### Usage

```bash
readerai ingest story TITLE TEXT_FILE [OPTIONS]
```

#### Options

- `--voice, -v` - AWS Polly voice ID
- `--grade, -g` - Grade level (1-12)
- `--tags, -t` - Comma-separated tags
- `--bucket, -b` - S3 bucket name
- `--region, -r` - AWS region

#### Examples

Basic story ingestion:

```bash
readerai ingest story "The Three Little Pigs" ./stories/three_pigs.txt
```

With metadata:

```bash
readerai ingest story "Goldilocks" ./goldilocks.txt \
  --grade 2 \
  --tags "fairy-tale,classic" \
  --voice Ivy
```

Output example:

```
📚 Ingesting story: The Three Little Pigs
Voice: Joanna
Text length: 4,523 characters
Bucket: readerai-audio-cache
Region: us-east-1
Created 6 chunks

Generating audio chunks... [████████████████] 6/6

✓ Successfully ingested 'The Three Little Pigs'
  - 6 chunks generated
  - 1,234 total words
  - Stored in: s3://readerai-audio-cache/stories/the-three-little-pigs/
```

### `readerai ingest book`

Process a book with automatic chapter detection and audio generation.

#### Usage

```bash
readerai ingest book TITLE TEXT_FILE [OPTIONS]
```

#### Options

- `--author, -a` - Book author
- `--voice, -v` - AWS Polly voice ID
- `--grade, -g` - Grade level
- `--tags, -t` - Comma-separated tags
- `--force-single` - Treat as single story even if chapters detected

#### Chapter Detection Patterns

Automatically detects:

- `Chapter 1`, `Chapter 2`, etc.
- `CHAPTER I`, `CHAPTER II` (Roman numerals)
- `Part One`, `Part Two`
- `1. Chapter Title`
- ALL CAPS TITLES

#### Examples

Ingest a book:

```bash
readerai ingest book "Alice in Wonderland" ./alice.txt \
  --author "Lewis Carroll" \
  --grade 5 \
  --voice Amy
```

Force single story mode:

```bash
readerai ingest book "Short Essay" ./essay.txt --force-single
```

Output example:

```
📚 Processing book: Alice in Wonderland
Author: Lewis Carroll
File: alice.txt (2.3 MB)
Voice: Amy

Scanning for chapter boundaries...
Line 45: Chapter 1: Down the Rabbit Hole
Line 523: Chapter 2: The Pool of Tears
Line 1072: Chapter 3: A Caucus Race

Detected 12 chapters:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Chapter  Line    Pattern
────────────────────────────────────────────────────
Chapter 1: Down...    45      numbered
Chapter 2: The Po...  523     numbered
Chapter 3: A Cauc...  1072    numbered
...

Proceed with chapter extraction? [Y/n]: y

Extracted 12 chapters

Processing chapters... [████████████████] 12/12

✓ Successfully processed 'Alice in Wonderland'
  - 12 chapters
  - 26,432 total words
  - Stored in: s3://readerai-audio-cache/content/alice-in-wonderland/
```

### `readerai ingest bulk`

Bulk process all .txt files in a directory.

#### Usage

```bash
readerai ingest bulk DIRECTORY [OPTIONS]
```

#### Options

- `--voice, -v` - Voice ID for all stories
- `--bucket, -b` - S3 bucket name
- `--region, -r` - AWS region

#### Examples

Process a directory:

```bash
readerai ingest bulk ./stories/grade2/
```

With custom voice:

```bash
readerai ingest bulk ./fairy_tales/ --voice Ivy
```

Output example:

```
Found 15 stories to ingest

════════════════════════════════════════════════════════════
📚 Ingesting story: The Ugly Duckling
Voice: Ivy
Text length: 5,234 characters
Created 7 chunks
Generating audio chunks... Done!
✓ Successfully ingested 'The Ugly Duckling'

════════════════════════════════════════════════════════════
📚 Ingesting story: Little Red Riding Hood
Voice: Ivy
Text length: 3,456 characters
Created 5 chunks
Generating audio chunks... Done!
✓ Successfully ingested 'Little Red Riding Hood'

[... continues for all files ...]

✓ Bulk ingestion complete!
```

### `readerai ingest list-stories`

List all ingested content with metadata.

#### Usage

```bash
readerai ingest list-stories [OPTIONS]
```

#### Options

- `--bucket, -b` - S3 bucket name
- `--region, -r` - AWS region

#### Examples

List all content:

```bash
readerai ingest list-stories
```

Output example:

```
Ingested Stories:

• Alice in Wonderland
  Slug: alice-in-wonderland
  Type: book
  Chapters: 12
  Words: 26,432
  Voice: Amy
  Grade: 5
  Author: Lewis Carroll
  Tags: classic, fantasy

• The Three Little Pigs
  Slug: the-three-little-pigs
  Type: story
  Chunks: 6
  Words: 1,234
  Voice: Joanna
  Grade: 2
  Tags: fairy-tale, classic

• The Ugly Duckling
  Slug: the-ugly-duckling
  Type: story
  Chunks: 7
  Words: 1,567
  Voice: Ivy
  Grade: 3
  Tags: fairy-tale, andersen
```

## Content Organization

### S3 Structure

Stories are organized as:

```
s3://bucket/
├── stories/
│   └── {story-slug}/
│       ├── metadata.json
│       └── {voice-id}/
│           └── chunk_{index}_{cache_key}.mp3
└── content/
    └── {book-slug}/
        ├── metadata.json
        └── chapters/
            └── {chapter-number}-{chapter-slug}/
                ├── audio.mp3
                ├── text.json
                └── timings.json
```

### Metadata Format

Story metadata:

```json
{
  "title": "The Three Little Pigs",
  "slug": "the-three-little-pigs",
  "total_words": 1234,
  "chunks": [
    {
      "chunk_index": 0,
      "s3_key": "stories/the-three-little-pigs/...",
      "cache_key": "a7b9c2d4...",
      "word_count": 245,
      "text_preview": "Once upon a time..."
    }
  ],
  "voice_id": "Joanna",
  "grade_level": 2,
  "tags": ["fairy-tale", "classic"]
}
```

Book metadata:

```json
{
  "title": "Alice in Wonderland",
  "slug": "alice-in-wonderland",
  "content_type": "book",
  "total_words": 26432,
  "chapters": [
    {
      "chapter_number": 1,
      "chapter_title": "Down the Rabbit Hole",
      "audio_key": "content/alice-in-wonderland/chapters/001-down-the-rabbit-hole/audio.mp3",
      "text_key": "content/alice-in-wonderland/chapters/001-down-the-rabbit-hole/text.json",
      "timings_key": "content/alice-in-wonderland/chapters/001-down-the-rabbit-hole/timings.json",
      "word_count": 2234
    }
  ],
  "voice_id": "Amy",
  "grade_level": 5,
  "tags": ["classic", "fantasy"],
  "author": "Lewis Carroll"
}
```

## Text Processing

### Chunking Strategy

For stories, text is split into chunks:

- Default: 400 words per chunk
- Splits at paragraph boundaries
- Maintains narrative flow
- Optimizes for streaming

Example of custom chunking:

```bash
# Smaller chunks for younger readers
readerai ingest story "Simple Story" ./simple.txt \
  --grade 1 \
  --chunk-size 200

# Larger chunks for advanced readers
readerai ingest story "Complex Story" ./complex.txt \
  --grade 8 \
  --chunk-size 600
```

### Chapter Detection

The system uses regex patterns to identify chapters:

```python
# Example patterns detected:
"Chapter 1: The Beginning"
"CHAPTER I"
"Part One"
"1. Introduction"
"THE FIRST ADVENTURE"  # All caps titles
```

Preview detection without processing:

```bash
# Just detect chapters without ingesting
readerai ingest book "Test Book" ./book.txt --force-single
# Then cancel when prompted
```

### Text Cleaning

Automatic cleaning includes:

- Removing page numbers
- Stripping headers/footers
- Cleaning copyright notices
- Normalizing whitespace

## Grade Level Guidelines

Recommended settings by grade:

| Grade | Voice         | Chunk Size | Tags          |
| ----- | ------------- | ---------- | ------------- |
| K-2   | Ivy, Justin   | 200-300    | early-reader  |
| 3-5   | Amy, Joanna   | 300-400    | elementary    |
| 6-8   | Matthew, Amy  | 400-500    | middle-school |
| 9-12  | Joanna, Brian | 500-600    | high-school   |

## Batch Processing Tips

### Organizing Content

Structure your files for efficient bulk processing:

```
stories/
├── grade1/
│   ├── cat_in_hat.txt
│   └── green_eggs.txt
├── grade2/
│   ├── charlotte_web.txt
│   └── magic_treehouse.txt
└── classics/
    ├── alice_wonderland.txt
    └── wizard_oz.txt
```

Process by grade:

```bash
for grade in grade1 grade2 grade3; do
  readerai ingest bulk ./stories/$grade/ --voice Ivy
done
```

### Preprocessing Files

Clean text files before ingestion:

```bash
# Remove Windows line endings
dos2unix story.txt

# Remove page numbers (example)
sed -i '/^[0-9]\+$/d' story.txt

# Check encoding
file -i story.txt
```

## Integration Examples

### Python Script for Bulk Processing

```python
import subprocess
import json
from pathlib import Path

def ingest_library(library_path, metadata_file):
    """Ingest a library with metadata"""

    with open(metadata_file) as f:
        metadata = json.load(f)

    for book in metadata['books']:
        file_path = Path(library_path) / book['file']

        cmd = [
            'readerai', 'ingest', 'book',
            book['title'],
            str(file_path),
            '--author', book['author'],
            '--grade', str(book['grade']),
            '--voice', book.get('voice', 'Amy'),
            '--tags', ','.join(book['tags'])
        ]

        print(f"Processing: {book['title']}")
        subprocess.run(cmd)

# Usage
ingest_library('./library/', './library_metadata.json')
```

### Monitoring Ingestion

Track ingestion progress:

```bash
# Watch S3 bucket growth
watch -n 10 'aws s3 ls s3://bucket/content/ --recursive --summarize | tail -n 2'

# Monitor recent ingestions
readerai ingest list-stories | head -20
```

## Troubleshooting

### Common Issues

1. **Chapter detection missing chapters**
   - Check chapter title format
   - Look for consistent patterns
   - Use `--force-single` if needed

2. **Large file processing fails**
   - Split very large books
   - Increase system memory
   - Process during off-peak

3. **Special characters in text**
   - Ensure UTF-8 encoding
   - Clean smart quotes
   - Remove non-printable characters

### Validation Commands

```bash
# Validate text file
file -i story.txt  # Check encoding
wc -w story.txt    # Word count
head -50 story.txt # Preview beginning

# Test chapter detection
grep -n "^Chapter" book.txt  # Find chapter markers

# Verify S3 upload
aws s3 ls s3://bucket/stories/story-slug/ --recursive
```

## Best Practices

1. **File Preparation**
   - Use UTF-8 encoding
   - Clean formatting
   - Consistent chapter markers

2. **Metadata Standards**
   - Always include grade level
   - Use descriptive tags
   - Include author for books

3. **Voice Selection**
   - Match voice to content
   - Consider audience age
   - Be consistent within books

4. **Testing**
   - Test with small files first
   - Verify audio quality
   - Check chapter boundaries
