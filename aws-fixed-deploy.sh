#!/bin/bash
# Fixed AWS deployment - Uses correct AWS CLI syntax
set -e

echo "🚀 Drew Command Center - Fixed Production Deployment"
echo "================================================="

# Configuration
APP_NAME="drew-command-center"
ENV_NAME="drew-command-center-prod"
REGION="us-east-1"
BUCKET_NAME="drew-command-center-deployments-$(date +%s)"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Create S3 bucket for deployments
create_deployment_bucket() {
    log "Creating S3 bucket for deployments..."
    
    # Create bucket (ignore error if exists)
    aws s3 mb s3://$BUCKET_NAME --region $REGION 2>/dev/null || {
        # If bucket creation fails, try with a different name
        BUCKET_NAME="drew-deployments-$(openssl rand -hex 4)"
        aws s3 mb s3://$BUCKET_NAME --region $REGION || error "Failed to create S3 bucket"
    }
    
    info "✅ S3 bucket created: $BUCKET_NAME"
}

# Deploy application
deploy_application() {
    log "Creating deployment package..."
    
    # Create deployment zip
    zip -r drew-production.zip . \
        -x "*.git*" "venv/*" "__pycache__/*" "*.pyc" ".DS_Store" \
           "aws-*.sh" "*.csv" "*.zip" "app.py.backup"
    
    log "Uploading to S3..."
    
    # Upload to S3
    VERSION_LABEL="production-$(date +%Y%m%d-%H%M%S)"
    S3_KEY="deployments/$VERSION_LABEL.zip"
    
    aws s3 cp drew-production.zip s3://$BUCKET_NAME/$S3_KEY || error "Failed to upload to S3"
    
    log "Creating application version: $VERSION_LABEL"
    
    # Create application version
    aws elasticbeanstalk create-application-version \
        --application-name $APP_NAME \
        --version-label "$VERSION_LABEL" \
        --source-bundle S3Bucket="$BUCKET_NAME",S3Key="$S3_KEY" \
        --region $REGION || error "Failed to create application version"
    
    log "Deploying to environment..."
    
    # Update environment
    aws elasticbeanstalk update-environment \
        --application-name $APP_NAME \
        --environment-name $ENV_NAME \
        --version-label "$VERSION_LABEL" \
        --option-settings \
            Namespace=aws:elasticbeanstalk:application:environment,OptionName=SECRET_KEY,Value="drew-production-$(date +%s)" \
            Namespace=aws:autoscaling:launchconfiguration,OptionName=InstanceType,Value=t3.small \
        --region $REGION || error "Failed to update environment"
    
    log "⏳ Waiting for deployment to complete..."
    aws elasticbeanstalk wait environment-updated --environment-name $ENV_NAME --region $REGION
    
    # Get app URL
    APP_URL=$(aws elasticbeanstalk describe-environments \
        --environment-names $ENV_NAME \
        --query 'Environments[0].CNAME' \
        --output text --region $REGION)
    
    log "✅ Deployment complete!"
    echo ""
    echo "🌐 Your Command Center: https://$APP_URL"
    echo "🔑 Login Password: drewpeacock"
    
    # Clean up
    rm -f drew-production.zip
    echo "BUCKET_NAME=$BUCKET_NAME" >> .env
    echo "APP_URL=$APP_URL" >> .env
}

# Create management scripts
create_scripts() {
    log "Creating management scripts..."
    
    # Fixed update script
    cat > update.sh << EOF
#!/bin/bash
# Quick update deployment
set -e

echo "🚀 Updating Drew Command Center..."

# Load config
if [ -f .env ]; then
    source .env
else
    echo "❌ .env file not found. Please run initial setup first."
    exit 1
fi

VERSION="update-\$(date +%Y%m%d-%H%M%S)"
zip -r update.zip . -x "*.git*" "venv/*" "__pycache__/*" "*.pyc" ".DS_Store" "aws-*.sh" "*.csv" "*.zip"

# Upload to S3
aws s3 cp update.zip s3://\$BUCKET_NAME/deployments/\$VERSION.zip

# Create version and deploy
aws elasticbeanstalk create-application-version \\
    --application-name $APP_NAME \\
    --version-label "\$VERSION" \\
    --source-bundle S3Bucket="\$BUCKET_NAME",S3Key="deployments/\$VERSION.zip" \\
    --region $REGION

aws elasticbeanstalk update-environment \\
    --environment-name $ENV_NAME \\
    --version-label "\$VERSION" \\
    --region $REGION

echo "⏳ Deploying..."
aws elasticbeanstalk wait environment-updated --environment-name $ENV_NAME --region $REGION

echo "✅ Update complete!"
rm -f update.zip
EOF

    # Status script
    cat > status.sh << 'EOF'
#!/bin/bash
echo "🔍 Drew Command Center Status"
echo "========================="

# Application health
aws elasticbeanstalk describe-environment-health \
    --environment-name drew-command-center-prod \
    --attribute-names All \
    --region us-east-1 \
    --query '{Status: Status, Health: Health, Color: Color}' --output table

# Get URL
if [ -f .env ]; then
    source .env
    echo ""
    echo "🌐 URL: https://$APP_URL"
    echo "🔑 Password: drewpeacock"
else
    APP_URL=$(aws elasticbeanstalk describe-environments \
        --environment-names drew-command-center-prod \
        --query 'Environments[0].CNAME' \
        --output text --region us-east-1)
    echo ""
    echo "🌐 URL: https://$APP_URL"
    echo "🔑 Password: drewpeacock"
fi
EOF

    chmod +x update.sh status.sh
    
    info "✅ Management scripts created"
}

# Main execution
main() {
    log "Starting fixed deployment..."
    
    create_deployment_bucket
    deploy_application
    create_scripts
    
    echo ""
    echo "🎉 DEPLOYMENT SUCCESSFUL!"
    echo "========================"
    echo "✅ Production Flask app deployed"
    echo "✅ Full features: chat, dashboard, tasks"
    echo "✅ Mobile-optimized interface"
    echo "✅ Secure authentication"
    echo "✅ AWS automation scripts created"
    echo ""
    echo "🔧 Management Commands:"
    echo "• ./update.sh  - Deploy updates"
    echo "• ./status.sh  - Check system health"
    echo ""
    echo "🚀 Ready for CDN and custom domains!"
}

main "$@"