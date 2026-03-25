#!/bin/bash
echo "🔍 Finding Your Drew Command Center Environment"
echo "=============================================="
echo ""

echo "🌍 Checking different regions for Elastic Beanstalk environments..."
echo ""

# Check common regions
regions=("us-east-1" "us-west-2" "eu-west-1" "eu-west-2")

for region in "${regions[@]}"; do
    echo "📍 Checking region: $region"
    
    # List all applications in this region
    apps=$(aws elasticbeanstalk describe-applications --region $region --query 'Applications[*].ApplicationName' --output text 2>/dev/null)
    
    if [ ! -z "$apps" ]; then
        echo "✅ Found applications in $region:"
        for app in $apps; do
            echo "   📱 Application: $app"
            
            # List environments for this application
            envs=$(aws elasticbeanstalk describe-environments --application-name $app --region $region --query 'Environments[*].{Name:EnvironmentName,Status:Status,Health:Health,URL:CNAME}' --output table 2>/dev/null)
            
            if [ ! -z "$envs" ]; then
                echo "      Environments:"
                echo "$envs" | sed 's/^/      /'
            fi
        done
        echo ""
    fi
done

echo ""
echo "🔧 If you found your environment above:"
echo "1. Note the correct EnvironmentName"
echo "2. Note the region" 
echo "3. I'll update the scripts with the correct names"
echo ""

# Also check what you might have from the console deployment
echo "📋 Recent deployments in your account:"
aws elasticbeanstalk describe-applications --query 'Applications[*].{Name:ApplicationName,Created:DateCreated}' --output table 2>/dev/null || echo "No applications found in default region"