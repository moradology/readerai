# ReaderAI CLI Documentation

The ReaderAI CLI provides a comprehensive set of commands for managing the reading application, including text-to-speech synthesis, content ingestion, and infrastructure management.

## Installation

The CLI is automatically installed when you set up the ReaderAI backend:

```bash
cd backend
uv sync
```

This creates the `readerai` command in your virtual environment.

## Command Structure

ReaderAI uses a hierarchical command structure with subcommands grouped by functionality:

```
readerai [OPTIONS] COMMAND [ARGS]...
```

## Available Commands

### Core Commands

- **[tts](tts.md)** - Text-to-speech synthesis and caching
  - `synthesize` - Convert text to speech with AWS Polly
  - `pregen` - Pre-generate audio for books/stories
  - `cache-info` - Inspect cached synthesis data
  - `batch-synth` - Batch process multiple texts

- **[ingest](ingest.md)** - Content ingestion and preprocessing
  - `story` - Ingest a single story with audio generation
  - `book` - Process books with automatic chapter detection
  - `bulk` - Bulk process multiple text files
  - `list-stories` - List all ingested content

- **[infra](infra.md)** - Infrastructure management
  - `status` - Check infrastructure deployment status
  - `init` - Initialize Terraform
  - `plan` - Preview infrastructure changes
  - `apply` - Apply infrastructure changes
  - `destroy` - Tear down infrastructure
  - `validate` - Validate Terraform configuration

- **[show-config](show-config.md)** - Display current configuration
  - Shows AWS, server, and LLM settings
  - Useful for debugging configuration issues

## Common Options

Most commands support these common options:

- `--help` - Show command-specific help
- `--voice` - Override default AWS Polly voice
- `--bucket` - Override default S3 bucket
- `--region` - Override default AWS region

## Configuration

ReaderAI uses a hierarchical configuration system:

1. **Environment Variables** (highest priority)
   - `AWS_PROFILE` - AWS credential profile
   - `AWS_REGION` - AWS region
   - `READERAI_AUDIO_CACHE_BUCKET` - S3 bucket for audio
   - `LLM_API_KEY` - API key for language model

2. **`.env` Files**
   - `.env.local` (git-ignored, for local overrides)
   - `.env` (project defaults)

3. **Default Configuration** (lowest priority)
   - Built-in defaults in `readerai/config.py`

## Quick Start Examples

### Synthesize Text

```bash
readerai tts synthesize "Hello, welcome to ReaderAI!"
```

### Ingest a Story

```bash
readerai ingest story "The Little Prince" ./little_prince.txt --grade 4
```

### Check Infrastructure Status

```bash
readerai infra status
```

### View Current Configuration

```bash
readerai show-config
```

## AWS Integration

ReaderAI integrates deeply with AWS services:

- **AWS Polly** - Neural text-to-speech synthesis
- **S3** - Audio file caching and storage
- **CloudFront** - CDN for audio delivery (when deployed)

### Authentication

Configure AWS credentials using one of:

1. AWS Profile (recommended for development):

   ```bash
   export AWS_PROFILE=your-profile-name
   ```

2. Environment variables:

   ```bash
   export AWS_ACCESS_KEY_ID=...
   export AWS_SECRET_ACCESS_KEY=...
   ```

3. IAM roles (for production deployments)

## Advanced Usage

### Batch Processing

For processing multiple files or texts efficiently:

```bash
# Bulk ingest directory of stories
readerai ingest bulk ./stories/

# Batch synthesize from JSON
readerai tts batch-synth texts.json --output results.json
```

### Pre-generation for Production

Pre-generate all audio for a book to ensure smooth playback:

```bash
readerai ingest book "Alice in Wonderland" alice.txt \
  --voice Amy \
  --grade 5 \
  --tags "classic,fantasy"
```

### Cache Management

Inspect and verify cached content:

```bash
# Check specific cache entry
readerai tts cache-info abc123def456

# List all cached stories
readerai ingest list-stories
```

## Troubleshooting

### Common Issues

1. **AWS Credentials Not Found**

   ```
   Error: Unable to locate credentials
   ```

   Solution: Set AWS_PROFILE or configure AWS credentials

2. **S3 Bucket Access Denied**

   ```
   Error: Access Denied to bucket
   ```

   Solution: Check IAM permissions for the bucket

3. **LLM API Key Missing**
   ```
   Error: LLM API key not found
   ```
   Solution: Set LLM_API_KEY in environment or .env file

### Debug Mode

Enable debug logging with:

```bash
export READERAI_LOG_LEVEL=DEBUG
readerai [command]
```

## Best Practices

1. **Use Profiles for Different Environments**
   - Create `.env.local` for development
   - Use AWS profiles to separate dev/staging/prod

2. **Pre-generate Content**
   - Use `pregen` and `book` commands for production content
   - This ensures consistent performance and reduces latency

3. **Monitor Cache Usage**
   - Regularly check S3 storage costs
   - Use lifecycle policies for old content

4. **Batch Operations**
   - Use batch commands for bulk processing
   - More efficient than individual operations

## Next Steps

- Explore individual command documentation for detailed examples
- Set up your development environment with proper AWS credentials
- Try the quick start examples to familiarize yourself with the CLI
