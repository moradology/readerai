# S3 Bucket for Audio Cache
resource "aws_s3_bucket" "audio_cache" {
  bucket = "${var.project_name}-audio-cache-${var.environment}"

  tags = {
    Name        = "${var.project_name}-audio-cache-${var.environment}"
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "Polly audio cache"
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

# Public access block (we'll use CloudFront for public access)
resource "aws_s3_bucket_public_access_block" "audio_cache" {
  bucket = aws_s3_bucket.audio_cache.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Bucket policy for CloudFront access
resource "aws_s3_bucket_policy" "audio_cache" {
  bucket = aws_s3_bucket.audio_cache.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontAccess"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.audio_cache.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.audio_cdn.arn
          }
        }
      }
    ]
  })
}

# Output the bucket name
output "audio_cache_bucket_name" {
  value       = aws_s3_bucket.audio_cache.id
  description = "Name of the S3 bucket for audio cache"
}
