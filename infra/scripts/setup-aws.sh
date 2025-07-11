#!/bin/bash

# Setup script for ReaderAI AWS infrastructure

set -e

echo "🚀 ReaderAI AWS Infrastructure Setup"
echo "===================================="

# Check prerequisites
command -v aws >/dev/null 2>&1 || { echo "❌ AWS CLI is required but not installed. Aborting." >&2; exit 1; }
command -v terraform >/dev/null 2>&1 || { echo "❌ Terraform is required but not installed. Aborting." >&2; exit 1; }

# Check AWS credentials
if ! aws sts get-caller-identity >/dev/null 2>&1; then
    echo "❌ AWS credentials not configured. Please run 'aws configure' first."
    exit 1
fi

echo "✅ Prerequisites checked"

# Get AWS account info
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=${AWS_REGION:-us-east-1}

echo "📋 AWS Account: $AWS_ACCOUNT_ID"
echo "📋 Region: $AWS_REGION"

# Ask for environment
read -p "Enter environment name (dev/staging/prod) [dev]: " ENVIRONMENT
ENVIRONMENT=${ENVIRONMENT:-dev}

# Navigate to terraform directory
cd "$(dirname "$0")/../terraform"

# Initialize Terraform
echo ""
echo "🔧 Initializing Terraform..."
terraform init

# Create terraform.tfvars if it doesn't exist
if [ ! -f terraform.tfvars ]; then
    echo ""
    echo "📝 Creating terraform.tfvars..."
    cat > terraform.tfvars <<EOF
aws_region   = "$AWS_REGION"
environment  = "$ENVIRONMENT"
project_name = "readerai"
EOF
fi

# Plan the deployment
echo ""
echo "📊 Planning infrastructure changes..."
terraform plan -out=tfplan

# Ask for confirmation
echo ""
read -p "Do you want to apply these changes? (yes/no) [no]: " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Deployment cancelled"
    exit 0
fi

# Apply the changes
echo ""
echo "🚀 Deploying infrastructure..."
terraform apply tfplan

# Save outputs to env file
echo ""
echo "💾 Saving environment variables..."
terraform output -raw env_file_content > ../../.env.aws

echo ""
echo "✅ Infrastructure setup complete!"
echo ""
echo "Next steps:"
echo "1. Review the generated .env.aws file"
echo "2. Update your backend application with these environment variables"
echo "3. Test audio generation with: python infra/scripts/test-polly.py"
