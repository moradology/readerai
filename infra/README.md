# ReaderAI Infrastructure

This directory contains AWS infrastructure configuration for the ReaderAI application.

## Overview

ReaderAI uses the following AWS services:

- **S3**: Audio file caching with ONEZONE_IA storage class
- **Polly**: Text-to-speech synthesis
- **CloudFront**: CDN for audio delivery (optional)
- **DynamoDB/RDS**: Metadata storage (TBD)

## Directory Structure

```
infra/
├── README.md           # This file
├── terraform/          # Terraform IaC configuration
├── scripts/            # Deployment and utility scripts
└── docs/              # Infrastructure documentation
```

## Audio Caching Architecture

```
Text + Voice ID → Polly API → S3 (ONEZONE_IA) → CloudFront → Users
                     ↓
                  Cache Key
                     ↓
                Check First
```

### Cache Key Generation

- SHA-256 hash of: `{text_content}:{voice_id}:{speed}`
- Ensures identical requests return same audio
- Shared across all users

### Storage Costs

- ONEZONE_IA: $0.01/GB/month
- Example: 10,000 passages (50GB) = $0.50/month

## Getting Started

1. Install AWS CLI and configure credentials
2. Install Terraform (if using IaC)
3. Run setup scripts in `scripts/`

## Environment Variables

```bash
AWS_REGION=us-east-1
AUDIO_CACHE_BUCKET=readerai-audio-cache
POLLY_VOICE_ID=Joanna
```
