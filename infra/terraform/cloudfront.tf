# CloudFront Origin Access Control
resource "aws_cloudfront_origin_access_control" "audio_cache" {
  name                              = "${var.project_name}-audio-cache-oac"
  description                       = "OAC for audio cache bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront Distribution for Audio Delivery
resource "aws_cloudfront_distribution" "audio_cdn" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.project_name} audio CDN - ${var.environment}"
  default_root_object = ""
  price_class         = "PriceClass_100"  # Use only NA and EU edge locations to save cost

  origin {
    domain_name              = aws_s3_bucket.audio_cache.bucket_regional_domain_name
    origin_id                = "S3-${aws_s3_bucket.audio_cache.id}"
    origin_access_control_id = aws_cloudfront_origin_access_control.audio_cache.id
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.audio_cache.id}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400    # 1 day
    max_ttl                = 31536000 # 1 year

    # Enable compression
    compress = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name        = "${var.project_name}-audio-cdn-${var.environment}"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Output the CloudFront domain
output "audio_cdn_domain" {
  value       = aws_cloudfront_distribution.audio_cdn.domain_name
  description = "CloudFront distribution domain for audio delivery"
}
