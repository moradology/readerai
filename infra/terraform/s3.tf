# S3 Bucket for Audio Cache
# Stores three components per reading session:
# 1. audio.mp3 - The synthesized speech from Polly
# 2. text.json - Original text content
# 3. timings.json - Word-level timing information for synchronization
resource "aws_s3_bucket" "audio_cache" {
  bucket = "${var.project_name}-audio-cache-${var.environment}"

  tags = {
    Name        = "${var.project_name}-audio-cache-${var.environment}"
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "Polly audio cache with text and timings"
  }
}

# Enable versioning (optional, but useful for debugging)
resource "aws_s3_bucket_versioning" "audio_cache" {
  bucket = aws_s3_bucket.audio_cache.id

  versioning_configuration {
    status = "Disabled"  # We can regenerate, so no need for versions
  }
}

# CORS configuration for browser access
resource "aws_s3_bucket_cors_configuration" "audio_cache" {
  bucket = aws_s3_bucket.audio_cache.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"]  # Tighten this in production
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}

# Lifecycle rule to clean up old audio files
resource "aws_s3_bucket_lifecycle_configuration" "audio_cache" {
  bucket = aws_s3_bucket.audio_cache.id

  rule {
    id     = "delete-old-audio"
    status = "Enabled"

    # Filter applies to all objects
    filter {}

    # Delete files not accessed for 90 days
    transition {
      days          = 30
      storage_class = "ONEZONE_IA"  # Move to cheaper storage after 30 days
    }

    expiration {
      days = 90  # Delete after 90 days
    }
  }
}

# Block all public access - we'll use presigned URLs instead
resource "aws_s3_bucket_public_access_block" "audio_cache" {
  bucket = aws_s3_bucket.audio_cache.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Output the bucket name
output "audio_cache_bucket_name" {
  value       = aws_s3_bucket.audio_cache.id
  description = "Name of the S3 bucket for audio cache"
}
