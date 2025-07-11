# ReaderAI AWS Architecture

## Overview

ReaderAI uses AWS services to provide scalable, cost-effective text-to-speech functionality with intelligent caching.

## Architecture Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   Backend   │────▶│  AWS Polly  │
│  (Browser)  │     │   Server    │     │    (TTS)    │
└─────────────┘     └─────────────┘     └─────────────┘
       ▲                    │                    │
       │                    │                    │
       │                    ▼                    ▼
       │            ┌─────────────┐     ┌─────────────┐
       │            │   S3 Cache  │     │  CloudFront │
       └────────────│  ONEZONE_IA │◀────│    (CDN)    │
                    └─────────────┘     └─────────────┘
```

## Cost Analysis

### AWS Polly Pricing

- Standard voices: $4.00 per 1 million characters
- Neural voices: $16.00 per 1 million characters
- Example: 2,000 word story ≈ 12,000 characters = $0.048 (standard)

### S3 Storage (ONEZONE_IA)

- Storage: $0.01 per GB/month
- Requests: $0.001 per 1,000 requests
- Example: 10,000 cached stories (50GB) = $0.50/month

### CloudFront CDN

- Data transfer: $0.085 per GB (first 10TB/month)
- HTTP requests: $0.0075 per 10,000 requests
- Example: 100GB/month = $8.50

### Total Monthly Cost Estimate (1,000 daily users)

- Polly generation: ~$20 (assuming 20% cache miss rate)
- S3 storage: ~$1
- CloudFront: ~$10
- **Total: ~$31/month**

## Caching Strategy

### Cache Key Generation

```python
cache_key = sha256(f"{text}:{voice_id}:{speed}").hexdigest()
```

### Cache Lifecycle

1. **First request**: Generate with Polly, store in S3
2. **Subsequent requests**: Serve from S3/CloudFront
3. **After 30 days**: Move to ONEZONE_IA (automatic)
4. **After 90 days**: Delete (automatic)

## Text Processing Strategy

### Chunk Sizing

- Target: 400-500 words per chunk (~2-3 minutes audio)
- Constraints:
  - Minimum: 200 words (avoid tiny chunks)
  - Maximum: 800 words (Polly limits)
  - Break at paragraph/sentence boundaries

### Example Chunking

```python
def create_chunks(text: str, target_size: int = 400) -> List[str]:
    paragraphs = text.split('\n\n')
    chunks = []
    current_chunk = []
    current_size = 0

    for para in paragraphs:
        para_size = len(para.split())
        if current_size + para_size > target_size and current_chunk:
            chunks.append('\n\n'.join(current_chunk))
            current_chunk = [para]
            current_size = para_size
        else:
            current_chunk.append(para)
            current_size += para_size

    if current_chunk:
        chunks.append('\n\n'.join(current_chunk))

    return chunks
```

## Security Considerations

1. **S3 Access**: Bucket is private, accessed only via CloudFront
2. **CloudFront**: HTTPS only, with Origin Access Control
3. **IAM Roles**: Least privilege for backend services
4. **Cache Keys**: Use SHA-256 to prevent enumeration

## Monitoring

### Key Metrics

- Polly API calls/minute (rate limiting)
- Cache hit rate (target >80%)
- S3 storage usage
- CloudFront bandwidth

### Alarms

- High Polly API errors
- Low cache hit rate (<60%)
- Unusual bandwidth spikes
