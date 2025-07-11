# IAM Role for Backend Application
resource "aws_iam_role" "backend_role" {
  name = "${var.project_name}-backend-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"  # Adjust based on your deployment (ECS, Lambda, etc.)
        }
      }
    ]
  })

  tags = {
    Name        = "${var.project_name}-backend-role-${var.environment}"
    Environment = var.environment
    Project     = var.project_name
  }
}

# IAM Policy for Polly Access
resource "aws_iam_role_policy" "polly_access" {
  name = "${var.project_name}-polly-access"
  role = aws_iam_role.backend_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "polly:SynthesizeSpeech",
          "polly:DescribeVoices"
        ]
        Resource = "*"
      }
    ]
  })
}

# IAM Policy for S3 Audio Cache Access
resource "aws_iam_role_policy" "s3_audio_cache_access" {
  name = "${var.project_name}-s3-audio-cache-access"
  role = aws_iam_role.backend_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:HeadObject"
        ]
        Resource = "${aws_s3_bucket.audio_cache.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = aws_s3_bucket.audio_cache.arn
      }
    ]
  })
}

# Output the role ARN
output "backend_role_arn" {
  value       = aws_iam_role.backend_role.arn
  description = "ARN of the backend IAM role"
}
