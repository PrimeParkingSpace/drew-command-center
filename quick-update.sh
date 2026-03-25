#!/bin/bash
echo "🚀 Quick Update for Drew Command Center"
echo "======================================"
echo ""

# Create deployment package
VERSION="update-$(date +%Y%m%d-%H%M%S)"

echo "📦 Creating deployment package: $VERSION.zip"
zip -r $VERSION.zip . \
    -x "*.git*" "venv/*" "__pycache__/*" "*.pyc" ".DS_Store" \
       "aws-*.sh" "*.csv" "*.zip" "quick-*.sh" "upload-*.sh" \
       "check-*.sh" "deploy-*.sh"

echo ""
echo "✅ Update package created: $VERSION.zip"
echo ""
echo "📋 TO DEPLOY THIS UPDATE:"
echo "1. Go to: https://console.aws.amazon.com/elasticbeanstalk/"
echo "2. Login: drew-automation / Sp00nt1me!"
echo "3. Click: Drew-command-center-env"
echo "4. Click: 'Upload and deploy'"
echo "5. Choose file: $VERSION.zip"
echo "6. Version label: $VERSION"
echo "7. Click: 'Deploy'"
echo ""
echo "⏱️  Deployment takes ~2-3 minutes"

# Open folder for easy access
echo "📁 Opening folder with deployment file..."
open .