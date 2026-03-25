#!/bin/bash
echo "📋 What's Actually in Your AWS Account"
echo "===================================="
echo ""

echo "🚀 Elastic Beanstalk Applications:"
aws elasticbeanstalk describe-applications --query 'Applications[*].ApplicationName' --output text 2>/dev/null | tr '\t' '\n' | sort | sed 's/^/   • /'

echo ""
echo "🌐 Elastic Beanstalk Environments:"
aws elasticbeanstalk describe-environments --query 'Environments[*].{Name:EnvironmentName,App:ApplicationName,Status:Status,URL:CNAME}' --output table 2>/dev/null

echo ""
echo "🗂️ If nothing shows above, try different region:"
echo "aws elasticbeanstalk describe-environments --region eu-west-2 --query 'Environments[*].{Name:EnvironmentName,App:ApplicationName,Status:Status,URL:CNAME}' --output table"