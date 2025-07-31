# Infrastructure Commands

The infra module manages AWS infrastructure deployment using Terraform.

## Overview

ReaderAI's infrastructure management:

- Deploys complete AWS infrastructure with one command
- Uses Terraform for infrastructure as code
- Manages S3, CloudFront, IAM, and networking resources
- Provides status monitoring and safe destruction

## Commands

### `readerai infra status`

Check the current infrastructure deployment status.

#### Usage

```bash
readerai infra status [OPTIONS]
```

#### Options

- `--detailed` - Show detailed resource information

#### Examples

Basic status check:

```bash
readerai infra status
```

Detailed status:

```bash
readerai infra status --detailed
```

Output example:

```
🔍 Checking infrastructure status...

✅ Terraform initialized: Yes
📊 Workspace: default
🚀 Deployment status: Applied

Resources:
- S3 Bucket: readerai-audio-cache-prod ✓
- CloudFront Distribution: E2EXAMPLE123 ✓
- IAM Roles: 3 created ✓
- Route53 Records: 2 created ✓

Last deployed: 2024-01-15 14:32:10
Terraform version: 1.6.0

Use 'readerai infra plan' to preview any pending changes.
```

### `readerai infra init`

Initialize Terraform in the infrastructure directory.

#### Usage

```bash
readerai infra init
```

#### Examples

First-time setup:

```bash
readerai infra init
```

Output example:

```
🔧 Initializing Terraform...

Initializing the backend...
Initializing provider plugins...
- Finding hashicorp/aws versions matching "~> 5.0"...
- Installing hashicorp/aws v5.31.0...

Terraform has been successfully initialized!

You may now begin working with Terraform. Try running "terraform plan" to see
any changes that are required for your infrastructure.

✅ Terraform initialization complete!
Next step: Run 'readerai infra plan' to preview infrastructure.
```

### `readerai infra plan`

Preview infrastructure changes without applying them.

#### Usage

```bash
readerai infra plan
```

#### Examples

Preview changes:

```bash
readerai infra plan
```

Output example:

```
📋 Planning infrastructure changes...

Terraform will perform the following actions:

  # aws_s3_bucket.audio_cache will be created
  + resource "aws_s3_bucket" "audio_cache" {
      + arn                     = (known after apply)
      + bucket                  = "readerai-audio-cache-prod"
      + force_destroy           = false
      + hosted_zone_id          = (known after apply)
      + id                      = (known after apply)
      + region                  = (known after apply)
      + tags                    = {
          + "Environment" = "production"
          + "Project"     = "ReaderAI"
        }
    }

  # aws_cloudfront_distribution.cdn will be created
  + resource "aws_cloudfront_distribution" "cdn" {
      + arn                            = (known after apply)
      + caller_reference               = (known after apply)
      + default_root_object            = "index.html"
      + domain_name                    = (known after apply)
      + enabled                        = true
      + etag                          = (known after apply)
      + hosted_zone_id                 = (known after apply)
      + http_version                   = "http2"
      + id                            = (known after apply)
      + in_progress_validation_batches = 0
      + is_ipv6_enabled               = true
      + last_modified_time            = (known after apply)
      + price_class                   = "PriceClass_100"
      + status                        = (known after apply)
      + tags                          = {
          + "Environment" = "production"
          + "Project"     = "ReaderAI"
        }
    }

Plan: 12 to add, 0 to change, 0 to destroy.

💡 Review the changes above. Run 'readerai infra apply' to apply them.
```

### `readerai infra apply`

Apply infrastructure changes (standard Terraform command).

#### Usage

```bash
readerai infra apply [OPTIONS]
```

#### Options

- `--plan, -p` - Apply a specific plan file
- `--auto-approve` - Skip confirmation prompt (use with caution)
- `--env, -e` - Environment (dev/staging/prod)

#### Examples

Interactive apply:

```bash
readerai infra apply
```

Apply from plan file:

```bash
readerai infra plan -o myplan
readerai infra apply --plan myplan
```

Auto-approved apply:

```bash
readerai infra apply --auto-approve
```

Direct apply with environment:

```bash
readerai infra apply --env production
```

Output example:

```
🚀 Applying infrastructure changes...

Do you want to perform these actions?
  Terraform will perform the actions described above.
  Only 'yes' will be accepted to approve.

  Enter a value: yes

aws_iam_role.lambda_role: Creating...
aws_s3_bucket.audio_cache: Creating...
aws_iam_role.lambda_role: Creation complete after 2s
aws_s3_bucket.audio_cache: Creation complete after 3s
aws_s3_bucket_public_access_block.audio_cache: Creating...
aws_s3_bucket_versioning.audio_cache: Creating...
aws_s3_bucket_public_access_block.audio_cache: Creation complete after 1s
aws_s3_bucket_versioning.audio_cache: Creation complete after 2s
aws_cloudfront_distribution.cdn: Creating...
aws_cloudfront_distribution.cdn: Still creating... [10s elapsed]
aws_cloudfront_distribution.cdn: Still creating... [20s elapsed]
aws_cloudfront_distribution.cdn: Creation complete after 25s

Apply complete! Resources: 12 added, 0 changed, 0 destroyed.

Outputs:
audio_bucket_name = "readerai-audio-cache-prod"
cloudfront_domain = "d1234567890.cloudfront.net"
api_gateway_url = "https://api-id.execute-api.us-east-1.amazonaws.com/prod"

✅ Infrastructure applied successfully!

Important endpoints:
- Audio CDN: https://d1234567890.cloudfront.net
- API Gateway: https://api-id.execute-api.us-east-1.amazonaws.com/prod
- S3 Bucket: readerai-audio-cache-prod

Next steps:
1. Update your .env file with the new endpoints
2. Run 'readerai show-config' to verify configuration
3. Test with 'readerai tts synthesize "Hello"'
```

### `readerai infra destroy`

Destroy all infrastructure resources.

#### Usage

```bash
readerai infra destroy [OPTIONS]
```

#### Options

- `--force` - Skip confirmation prompt (dangerous!)

#### Examples

Safe destruction with confirmation:

```bash
readerai infra destroy
```

Output example:

```
⚠️  WARNING: This will destroy all infrastructure!

This includes:
- S3 buckets (and all data!)
- CloudFront distributions
- API Gateways
- IAM roles and policies
- All other managed resources

Are you sure you want to destroy all infrastructure? Type 'destroy' to confirm: destroy

🗑️  Destroying infrastructure...

aws_cloudfront_distribution.cdn: Destroying...
aws_api_gateway_deployment.api: Destroying...
aws_iam_role_policy_attachment.lambda_logs: Destroying...
aws_api_gateway_deployment.api: Destruction complete after 1s
aws_iam_role_policy_attachment.lambda_logs: Destruction complete after 1s
aws_cloudfront_distribution.cdn: Still destroying... [10s elapsed]
aws_cloudfront_distribution.cdn: Destruction complete after 15s
aws_s3_bucket.audio_cache: Destroying...
aws_s3_bucket.audio_cache: Destruction complete after 2s

Destroy complete! Resources: 12 destroyed.

✅ Infrastructure destroyed successfully.
```

## Infrastructure Components

### Core Resources

1. **S3 Buckets**
   - Audio cache bucket (with versioning)
   - Lifecycle policies for cost optimization
   - CORS configuration for web access

2. **CloudFront CDN**
   - Global edge caching
   - HTTPS only
   - Optimized for audio streaming

3. **IAM Roles & Policies**
   - Backend service role
   - Lambda execution roles
   - Minimal privilege principles

4. **API Gateway** (if applicable)
   - RESTful API endpoints
   - Rate limiting
   - API key management

### Architecture Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│ CloudFront  │────▶│  S3 Bucket  │
│  (Browser)  │     │    (CDN)    │     │   (Audio)   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                                         │
       │                                         │
       ▼                                         ▼
┌─────────────┐                         ┌─────────────┐
│ API Gateway │                         │   Backend   │
│  (Optional) │                         │  (FastAPI)  │
└─────────────┘                         └─────────────┘
```

## Configuration

### Terraform Variables

Key variables in `infra/terraform/terraform.tfvars`:

```hcl
project_name = "readerai"
environment  = "production"
aws_region   = "us-east-1"

# S3 Configuration
audio_bucket_name = "readerai-audio-cache-prod"
enable_versioning = true
lifecycle_days    = 90

# CloudFront Configuration
enable_cdn = true
price_class = "PriceClass_100"  # US, Canada, Europe

# Optional Features
enable_api_gateway = false
enable_route53     = false
domain_name        = ""  # Set if using custom domain
```

### Environment-Specific Deployments

Use Terraform workspaces for multiple environments:

```bash
# Development environment
terraform workspace new dev
readerai infra apply

# Production environment
terraform workspace new prod
readerai infra apply

# Switch between environments
terraform workspace select dev
readerai infra status
```

## Cost Optimization

### S3 Lifecycle Policies

Automatically applied policies:

- Transition to IA storage after 30 days
- Transition to Glacier after 90 days
- Delete after 365 days (configurable)

### CloudFront Optimization

Cost-saving settings:

```hcl
# Use PriceClass_100 for most regions
price_class = "PriceClass_100"

# Cache everything for 24 hours
default_cache_behavior {
  default_ttl = 86400
  max_ttl     = 31536000
}
```

### Monitoring Costs

```bash
# Check S3 storage usage
aws s3 ls s3://readerai-audio-cache-prod --recursive --summarize \
  | tail -n 2

# Estimate monthly costs
aws ce get-cost-forecast \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --metric UNBLENDED_COST \
  --granularity MONTHLY
```

## Troubleshooting

### Common Issues

1. **"Backend initialization required"**

   ```bash
   readerai infra init
   ```

2. **"Error acquiring state lock"**
   - Someone else is running Terraform
   - Or previous run was interrupted

   ```bash
   terraform force-unlock <LOCK_ID>
   ```

3. **"Access Denied" errors**
   - Check AWS credentials
   - Verify IAM permissions

   ```bash
   aws sts get-caller-identity
   ```

4. **"Resource already exists"**
   - Import existing resources
   ```bash
   terraform import aws_s3_bucket.audio_cache bucket-name
   ```

### Required IAM Permissions

Minimum permissions for deployment:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:*", "cloudfront:*", "iam:*", "route53:*", "apigateway:*"],
      "Resource": "*"
    }
  ]
}
```

### State Management

Terraform state location:

```bash
# Local state (default)
infra/terraform/terraform.tfstate

# Remote state (recommended for teams)
# Configure in infra/terraform/backend.tf
terraform {
  backend "s3" {
    bucket = "my-terraform-state"
    key    = "readerai/terraform.tfstate"
    region = "us-east-1"
  }
}
```

## Best Practices

1. **Always Plan Before Apply**

   ```bash
   readerai infra plan
   # Review carefully
   readerai infra apply
   ```

2. **Use Workspaces for Environments**

   ```bash
   terraform workspace list
   terraform workspace new staging
   ```

3. **Tag All Resources**
   - Consistent tagging for cost tracking
   - Environment separation
   - Project attribution

4. **Regular State Backups**

   ```bash
   cp terraform.tfstate terraform.tfstate.backup
   ```

5. **Infrastructure as Code**
   - Commit all changes to git
   - Review infrastructure PRs
   - Document customizations

## Advanced Usage

### Custom Modules

Add custom Terraform modules:

```hcl
# infra/terraform/my_module.tf
module "custom_feature" {
  source = "./modules/custom_feature"

  project_name = var.project_name
  environment  = var.environment
}
```

### Outputs for Integration

Access infrastructure outputs:

```bash
# Get all outputs
cd infra/terraform && terraform output -json

# Get specific output
terraform output cloudfront_domain

# Use in scripts
BUCKET=$(terraform output -raw audio_bucket_name)
aws s3 ls s3://$BUCKET
```

### CI/CD Integration

GitLab CI example:

```yaml
apply-infrastructure:
  stage: deploy
  script:
    - readerai infra init
    - readerai infra plan
    - readerai infra apply --auto-approve
  only:
    - main
  environment:
    name: production
```

## Disaster Recovery

### Backup Strategy

1. **State File Backup**
   - Use remote state with versioning
   - Regular snapshots

2. **S3 Data Backup**
   - Cross-region replication
   - Versioning enabled

3. **Infrastructure Recreation**
   ```bash
   # Destroy and recreate
   readerai infra destroy
   readerai infra init
   readerai infra apply
   ```

### Recovery Procedures

From state file corruption:

```bash
# Restore from backup
cp terraform.tfstate.backup terraform.tfstate

# Or reimport resources
terraform import aws_s3_bucket.audio_cache bucket-name
```
