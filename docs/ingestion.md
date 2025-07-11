# Story Ingestion Guide

The `readerai-ingest` CLI tool pre-generates audio for stories using AWS Polly, storing them in S3 for instant playback.

## Prerequisites

1. AWS credentials configured (`aws configure`)
2. S3 bucket created (see `infra/` directory)
3. ReaderAI installed: `uv sync`

## Usage

### Ingest a Single Story

```bash
readerai-ingest story "Tommy the Turtle" sample_stories/tommy_turtle.txt

# With options
readerai-ingest story "Tommy the Turtle" sample_stories/tommy_turtle.txt \
  --voice Matthew \
  --grade 3 \
  --tags "adventure,animals,home"
```

### Bulk Ingest Directory

```bash
# Ingest all .txt files in a directory
readerai-ingest bulk sample_stories/

# With different voice
readerai-ingest bulk sample_stories/ --voice Joanna
```

### List Ingested Stories

```bash
readerai-ingest list-stories
```

## How It Works

1. **Text Chunking**: Stories are split into ~400 word chunks at paragraph boundaries
2. **Audio Generation**: Each chunk is sent to AWS Polly for synthesis
3. **S3 Storage**: Audio files stored as `/stories/{slug}/{voice}/chunk_001_{hash}.mp3`
4. **Metadata**: Story metadata saved as JSON for easy retrieval

## S3 Structure

```
s3://bucket/
└── stories/
    └── tommy-the-turtle/
        ├── metadata.json
        └── Joanna/
            ├── chunk_000_a1b2c3d4.mp3
            ├── chunk_001_e5f6g7h8.mp3
            └── chunk_002_i9j0k1l2.mp3
```

## Available Voices

Popular AWS Polly voices:

- **Joanna** (US English, Female) - Default
- **Matthew** (US English, Male)
- **Amy** (British English, Female)
- **Brian** (British English, Male)
- **Ivy** (US English, Female, Child)
- **Justin** (US English, Male, Child)

## Cost Estimation

- **One-time generation**: ~$0.05 per story (2000 words)
- **Storage**: ~$0.01/month for 100 stories
- **Transfer**: Free within AWS, $0.09/GB to internet

## Tips

1. **Chunk Size**: Default 400 words works well for 2-3 minute segments
2. **Voice Selection**: Use child voices (Ivy, Justin) for younger audiences
3. **Metadata**: Always include grade level and tags for better organization
4. **Naming**: Use clear, descriptive titles (used for URL slugs)

## Example Workflow

```bash
# 1. Create story file
echo "Your story text..." > stories/my_story.txt

# 2. Ingest with metadata
readerai-ingest story "My Amazing Story" stories/my_story.txt \
  --grade 4 \
  --tags "fiction,adventure" \
  --voice Ivy

# 3. Verify ingestion
readerai-ingest list-stories

# 4. Audio files ready for streaming!
```
