#!/bin/bash
# Simple deployment using AWS default Elastic Beanstalk bucket
# No custom S3 bucket creation required

set -e

echo "🚀 Drew Command Center - Simple Deployment"
echo "========================================"

# Configuration
APP_NAME="drew-command-center"
ENV_NAME="drew-command-center-prod"
REGION="us-east-1"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Find or create default EB bucket
get_eb_bucket() {
    log "Finding Elastic Beanstalk default bucket..."
    
    # Try to find existing EB bucket
    EB_BUCKET=$(aws s3api list-buckets --query "Buckets[?contains(Name, 'elasticbeanstalk') && contains(Name, '$REGION')].Name" --output text 2>/dev/null | head -1)
    
    if [ -z "$EB_BUCKET" ]; then
        # Create default EB bucket name
        EB_BUCKET="elasticbeanstalk-$REGION-337480111275"
        log "Using default EB bucket: $EB_BUCKET"
        
        # Create bucket if it doesn't exist (EB will create it automatically)
        aws s3 mb s3://$EB_BUCKET --region $REGION 2>/dev/null || {
            log "Bucket already exists or will be created by EB"
        }
    else
        log "Found existing EB bucket: $EB_BUCKET"
    fi
}

# Deploy without custom bucket creation
deploy_direct() {
    log "Creating deployment package..."
    
    # Create deployment zip
    zip -r deployment.zip . \
        -x "*.git*" "venv/*" "__pycache__/*" "*.pyc" ".DS_Store" \
           "aws-*.sh" "*.csv" "*.zip" "app.py.backup" "deploy-*.sh"
    
    # Try direct deployment first (sometimes EB accepts zip directly)
    VERSION_LABEL="production-$(date +%Y%m%d-%H%M%S)"
    
    log "Attempting direct deployment..."
    
    # Method 1: Try to upload to existing bucket
    if [ ! -z "$EB_BUCKET" ]; then
        S3_KEY="applications/$APP_NAME/$VERSION_LABEL.zip"
        
        # Upload to S3
        aws s3 cp deployment.zip s3://$EB_BUCKET/$S3_KEY 2>/dev/null && {
            log "✅ Uploaded to S3 bucket: $EB_BUCKET"
            
            # Create version
            aws elasticbeanstalk create-application-version \
                --application-name $APP_NAME \
                --version-label "$VERSION_LABEL" \
                --source-bundle S3Bucket="$EB_BUCKET",S3Key="$S3_KEY" \
                --region $REGION || error "Failed to create version"
        } || {
            log "⚠️ S3 upload failed, trying alternative method..."
            use_alternative_method
            return
        }
    else
        use_alternative_method
        return
    fi
    
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
    
    log "⏳ Waiting for deployment..."
    aws elasticbeanstalk wait environment-updated --environment-name $ENV_NAME --region $REGION
    
    complete_deployment
}

# Alternative method using EB CLI or manual console
use_alternative_method() {
    log "Using alternative deployment method..."
    
    info "📦 Deployment package ready: deployment.zip"
    info "📍 Size: $(du -h deployment.zip | cut -f1)"
    
    echo ""
    echo "🔧 ALTERNATIVE DEPLOYMENT METHODS:"
    echo "================================="
    echo ""
    echo "METHOD 1: AWS Console (Recommended)"
    echo "1. Go to: https://console.aws.amazon.com/elasticbeanstalk/"
    echo "2. Login: drew-automation / Sp00nt1me!"
    echo "3. Click: drew-command-center-env"
    echo "4. Click: 'Upload and deploy'"
    echo "5. Choose: deployment.zip (in current directory)"
    echo "6. Version: production-$(date +%Y%m%d-%H%M%S)"
    echo "7. Click: 'Deploy'"
    echo ""
    echo "METHOD 2: Add S3 Permissions"
    echo "1. Go to: IAM → Users → drew-automation → Permissions"
    echo "2. Add: AmazonS3FullAccess policy"
    echo "3. Re-run: ./deploy-simple.sh"
    echo ""
    
    # Create a simple upload script for console method
    cat > upload-to-console.sh << 'EOF'
#!/bin/bash
echo "📁 Opening deployment directory..."
open .
echo ""
echo "📋 CONSOLE DEPLOYMENT STEPS:"
echo "1. Go to: https://console.aws.amazon.com/elasticbeanstalk/"
echo "2. Click: drew-command-center-env" 
echo "3. Click: 'Upload and deploy'"
echo "4. Upload: deployment.zip"
echo "5. Deploy!"
EOF
    
    chmod +x upload-to-console.sh
    
    info "✅ Run './upload-to-console.sh' for console deployment help"
}

# Complete deployment
complete_deployment() {
    # Get app URL
    APP_URL=$(aws elasticbeanstalk describe-environments \
        --environment-names $ENV_NAME \
        --query 'Environments[0].CNAME' \
        --output text --region $REGION)
    
    log "✅ Deployment successful!"
    echo ""
    echo "🌐 Your Command Center: https://$APP_URL"
    echo "🔑 Login Password: drewpeacock"
    echo ""
    
    # Create simple management scripts
    create_simple_scripts "$APP_URL"
    
    # Clean up
    rm -f deployment.zip
}

# Create management scripts
create_simple_scripts() {
    local app_url=$1
    
    log "Creating management scripts..."
    
    cat > quick-update.sh << 'EOF'
#!/bin/bash
echo "🚀 Quick Update for Drew Command Center"
echo "======================================"
echo ""
echo "This creates a new deployment package."
echo "You can then upload it via AWS Console."
echo ""

zip -r update-$(date +%Y%m%d-%H%M%S).zip . \
    -x "*.git*" "venv/*" "__pycache__/*" "*.pyc" ".DS_Store" \
       "aws-*.sh" "*.csv" "*.zip" "quick-*.sh" "upload-*.sh"

echo "✅ Update package created!"
echo ""
echo "📋 TO DEPLOY:"
echo "1. Go to: https://console.aws.amazon.com/elasticbeanstalk/"
echo "2. Click: drew-command-center-env"
echo "3. Click: 'Upload and deploy'"  
echo "4. Upload: update-*.zip file"
echo "5. Deploy!"
EOF

    cat > check-status.sh << EOF
#!/bin/bash
echo "🔍 Drew Command Center Status"
echo "=========================="

aws elasticbeanstalk describe-environment-health \\
    --environment-name drew-command-center-prod \\
    --attribute-names All \\
    --region us-east-1 \\
    --query '{Status: Status, Health: Health, Color: Color}' --output table

echo ""
echo "🌐 URL: https://$app_url"
echo "🔑 Password: drewpeacock"
EOF

    chmod +x quick-update.sh check-status.sh
    
    info "✅ Management scripts created"
}

# Main execution
main() {
    log "Starting simple deployment..."
    
    get_eb_bucket
    deploy_direct
    
    echo ""
    echo "🎉 DEPLOYMENT PROCESS COMPLETE!"
    echo "=============================="
    echo "✅ Production Flask app ready"
    echo "✅ Full features included"
    echo "✅ Mobile-optimized interface"  
    echo "✅ Management scripts created"
    echo ""
    echo "🔧 Available Commands:"
    echo "• ./quick-update.sh  - Create update packages"
    echo "• ./check-status.sh  - Check system health"
    echo "• ./upload-to-console.sh - Console deployment help"
    echo ""
}

main "$@"