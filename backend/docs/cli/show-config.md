# Show Config Command

The show-config command displays the current ReaderAI configuration, helping with debugging and verification.

## Overview

This command shows:

- Current application settings
- AWS configuration
- Server settings
- LLM configuration
- Active environment variables

## Usage

### Basic Usage

```bash
readerai show-config [SECTION]
```

### Options

- `SECTION` - Optional specific section to display (aws, server, llm)

## Examples

### Show All Configuration

```bash
readerai show-config
```

Output:

```
ReaderAI Configuration
├── Application
│   ├── Name: ReaderAI
│   └── Version: 0.1.0
├── AWS
│   ├── Region: us-east-1
│   ├── Audio Cache Bucket: readerai-audio-cache-prod
│   └── Profile: default
├── Server
│   ├── Host: 0.0.0.0
│   ├── Port: 8000
│   ├── Environment: production
│   └── CORS Origins: ['https://app.readerai.com', 'http://localhost:3000']
└── LLM
    └── API Key: ✓ Set
```

### Show Specific Section

AWS configuration only:

```bash
readerai show-config aws
```

Output:

```
AWS Configuration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Setting              Value
────────────────────────────────────────
Region               us-east-1
Audio Cache Bucket   readerai-audio-cache-prod
Profile              default
```

Server configuration:

```bash
readerai show-config server
```

Output:

```
Server Configuration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Setting        Value
────────────────────────────────────────
Host           0.0.0.0
Port           8000
Environment    production
CORS Origins   ['https://app.readerai.com', 'http://localhost:3000']
```

LLM configuration:

```bash
readerai show-config llm
```

Output:

```
LLM Configuration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Setting    Value
────────────────────────────────────────
API Key    ✓ Set
Model      Set via LLM_MODEL env var (default: openai/gpt-4)
```

## Configuration Sources

The configuration is loaded from multiple sources in priority order:

### 1. Environment Variables (Highest Priority)

```bash
export AWS_PROFILE=prod-profile
export AWS_REGION=us-west-2
export READERAI_AUDIO_CACHE_BUCKET=my-custom-bucket
export LLM_API_KEY=sk-...
export LLM_MODEL=openai/gpt-4-turbo
```

### 2. .env Files

```bash
# .env.local (git-ignored, personal overrides)
AWS_PROFILE=dev-profile
READERAI_SERVER_HOST=localhost
READERAI_SERVER_PORT=8080

# .env (project defaults)
READERAI_APP_NAME=ReaderAI
READERAI_VERSION=0.1.0
```

### 3. Default Configuration (Lowest Priority)

Built-in defaults from `readerai/config.py`

## Configuration Reference

### Application Settings

- `READERAI_APP_NAME` - Application name (default: "ReaderAI")
- `READERAI_VERSION` - Application version

### AWS Settings

- `AWS_REGION` - AWS region (default: "us-east-1")
- `AWS_PROFILE` - AWS credentials profile
- `READERAI_AUDIO_CACHE_BUCKET` - S3 bucket for audio cache

### Server Settings

- `READERAI_SERVER_HOST` - Server bind host (default: "0.0.0.0")
- `READERAI_SERVER_PORT` - Server port (default: 8000)
- `READERAI_SERVER_ENVIRONMENT` - Environment (development/staging/production)
- `READERAI_SERVER_CORS_ORIGINS` - Comma-separated CORS origins

### LLM Settings

- `LLM_API_KEY` - API key for language model
- `LLM_MODEL` - Model identifier (default: "openai/gpt-4")
- `OPENAI_API_KEY` - Fallback if LLM_API_KEY not set
- `GOOGLE_API_KEY` - Fallback for Google models

## Debugging Configuration Issues

### Check Active Configuration

```bash
# See what's actually being used
readerai show-config

# Check specific values
readerai show-config aws | grep Bucket
```

### Verify Environment Variables

```bash
# See all ReaderAI environment variables
env | grep READERAI

# Check AWS variables
env | grep AWS_
```

### Test Configuration Loading

```python
# Python shell test
from readerai.config import get_settings

settings = get_settings()
print(settings.model_dump_json(indent=2))
```

### Common Issues

1. **Wrong S3 Bucket**

   ```bash
   # Check active bucket
   readerai show-config aws

   # Override if needed
   export READERAI_AUDIO_CACHE_BUCKET=correct-bucket-name
   ```

2. **API Key Not Found**

   ```bash
   # Check if key is set
   readerai show-config llm

   # Set the key
   export LLM_API_KEY=your-key-here
   ```

3. **Wrong AWS Profile**

   ```bash
   # Check current profile
   readerai show-config aws

   # Change profile
   export AWS_PROFILE=correct-profile
   ```

## Use Cases

### Development Setup

```bash
# Create local overrides
cat > .env.local << EOF
AWS_PROFILE=dev
READERAI_SERVER_ENVIRONMENT=development
READERAI_AUDIO_CACHE_BUCKET=readerai-dev-bucket
LLM_MODEL=openai/gpt-3.5-turbo
EOF

# Verify
readerai show-config
```

### Production Verification

```bash
# On production server
readerai show-config | tee config-snapshot.txt

# Verify critical settings
readerai show-config aws | grep -E "Bucket|Region"
readerai show-config server | grep Environment
```

### CI/CD Integration

```yaml
# GitLab CI example
verify-config:
  script:
    - readerai show-config
    - readerai show-config aws | grep -q "prod-bucket"
    - readerai show-config server | grep -q "production"
```

### Troubleshooting Script

```bash
#!/bin/bash
# save as check-config.sh

echo "=== ReaderAI Configuration Check ==="
echo

echo "1. Environment Variables:"
env | grep -E "(READERAI|AWS_|LLM_)" | sort

echo -e "\n2. Configuration Files:"
ls -la .env* 2>/dev/null || echo "No .env files found"

echo -e "\n3. Active Configuration:"
readerai show-config

echo -e "\n4. AWS Connectivity:"
aws sts get-caller-identity || echo "AWS not configured"

echo -e "\n5. S3 Bucket Access:"
bucket=$(readerai show-config aws | grep Bucket | awk '{print $NF}')
aws s3 ls s3://$bucket --max-items 1 || echo "Cannot access bucket"
```

## Configuration Best Practices

### 1. Use .env.local for Personal Settings

```bash
# .env.local (git-ignored)
AWS_PROFILE=my-dev-profile
LLM_API_KEY=sk-personal-key
READERAI_SERVER_PORT=3001  # Avoid conflicts
```

### 2. Document Required Variables

```bash
# .env.example
# Required
READERAI_AUDIO_CACHE_BUCKET=your-bucket-here
LLM_API_KEY=your-api-key-here

# Optional
AWS_PROFILE=default
READERAI_SERVER_PORT=8000
```

### 3. Validate Before Deployment

```bash
# Pre-deployment check
required_vars=(
    "READERAI_AUDIO_CACHE_BUCKET"
    "LLM_API_KEY"
    "AWS_REGION"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "ERROR: $var is not set"
        exit 1
    fi
done

readerai show-config
```

### 4. Secure Sensitive Values

```bash
# Never commit these
echo ".env.local" >> .gitignore
echo ".env.production" >> .gitignore

# Use secrets manager in production
aws secretsmanager get-secret-value \
    --secret-id readerai/production/llm-api-key \
    --query SecretString --output text
```

## Integration with Other Commands

The configuration shown by `show-config` affects all other commands:

```bash
# TTS uses the audio bucket
readerai show-config aws  # Check bucket
readerai tts synthesize "Hello"  # Uses that bucket

# Ingest uses AWS settings
readerai show-config aws  # Check region and profile
readerai ingest story "Test" test.txt  # Uses those settings

# Server uses the server configuration
readerai show-config server  # Check host and port
python main.py  # Runs with those settings
```
