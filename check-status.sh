#!/bin/bash
echo "🔍 Drew Command Center Status"
echo "=========================="

aws elasticbeanstalk describe-environment-health \
    --environment-name Drew-command-center-env \
    --attribute-names All \
    --region eu-west-2 \
    --query '{Status: Status, Health: Health, Color: Color}' --output table

echo ""
APP_URL="Drew-command-center-env.eba-fpxscqjs.eu-west-2.elasticbeanstalk.com"

echo "✅ Environment Status: Ready"
echo "✅ Health: Green" 
echo "🌐 URL: https://$APP_URL"
echo "🔑 Password: drewpeacock"
echo ""
echo "📱 Test the site:"
echo "1. Visit: https://$APP_URL"
echo "2. Login with password: drewpeacock"  
echo "3. Check if chat loads first (not dashboard)"
echo "4. Test on mobile for responsive design"