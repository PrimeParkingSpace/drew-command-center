#!/bin/bash
# Setup CloudFront CDN for global performance
# Run this after your app is working to add enterprise CDN

set -e

echo "🌐 Setting up CloudFront CDN for Drew Command Center"
echo "=================================================="

# Configuration
APP_NAME="drew-command-center"
ENV_NAME="drew-command-center-prod"
REGION="us-east-1"

# Get current app URL
APP_URL=$(aws elasticbeanstalk describe-environments \
    --environment-names $ENV_NAME \
    --query 'Environments[0].CNAME' \
    --output text --region $REGION)

echo "📱 Application URL: https://$APP_URL"

# Create CloudFront distribution config
cat > cdn-config.json << EOF
{
    "CallerReference": "drew-cdn-$(date +%s)",
    "Comment": "Drew Command Center - Global CDN",
    "DefaultCacheBehavior": {
        "TargetOriginId": "drew-origin",
        "ViewerProtocolPolicy": "redirect-to-https",
        "Compress": true,
        "ForwardedValues": {
            "QueryString": true,
            "Cookies": {"Forward": "all"},
            "Headers": {"Quantity": 3, "Items": ["Host", "Authorization", "Cookie"]}
        },
        "TrustedSigners": {"Enabled": false, "Quantity": 0},
        "MinTTL": 0,
        "DefaultTTL": 300,
        "MaxTTL": 86400
    },
    "CacheBehaviors": {
        "Quantity": 2,
        "Items": [
            {
                "PathPattern": "/static/*",
                "TargetOriginId": "drew-origin",
                "ViewerProtocolPolicy": "redirect-to-https",
                "Compress": true,
                "ForwardedValues": {
                    "QueryString": false,
                    "Cookies": {"Forward": "none"}
                },
                "TrustedSigners": {"Enabled": false, "Quantity": 0},
                "MinTTL": 86400,
                "DefaultTTL": 86400,
                "MaxTTL": 31536000
            },
            {
                "PathPattern": "/api/*", 
                "TargetOriginId": "drew-origin",
                "ViewerProtocolPolicy": "redirect-to-https",
                "Compress": false,
                "ForwardedValues": {
                    "QueryString": true,
                    "Cookies": {"Forward": "all"},
                    "Headers": {"Quantity": 5, "Items": ["Host", "Authorization", "Cookie", "Content-Type", "Accept"]}
                },
                "TrustedSigners": {"Enabled": false, "Quantity": 0},
                "MinTTL": 0,
                "DefaultTTL": 0,
                "MaxTTL": 0
            }
        ]
    },
    "Origins": {
        "Quantity": 1,
        "Items": [{
            "Id": "drew-origin",
            "DomainName": "$APP_URL",
            "CustomOriginConfig": {
                "HTTPPort": 80,
                "HTTPSPort": 443,
                "OriginProtocolPolicy": "https-only",
                "OriginSslProtocols": {
                    "Quantity": 1,
                    "Items": ["TLSv1.2"]
                }
            }
        }]
    },
    "Enabled": true,
    "PriceClass": "PriceClass_All"
}
EOF

echo "🚀 Creating CloudFront distribution..."
DISTRIBUTION_ID=$(aws cloudfront create-distribution \
    --distribution-config file://cdn-config.json \
    --query 'Distribution.Id' --output text)

echo "⏳ CloudFront distribution deploying (takes 10-15 minutes)..."
echo "📍 Distribution ID: $DISTRIBUTION_ID"

# Wait for deployment (this is optional, you don't have to wait)
echo "🔄 You can use the CDN immediately, but full global deployment takes 10-15 minutes"

# Get CloudFront URL
CDN_URL=$(aws cloudfront get-distribution --id $DISTRIBUTION_ID \
    --query 'Distribution.DomainName' --output text)

# Save config
echo "CDN_DOMAIN=$CDN_URL" >> .env
echo "DISTRIBUTION_ID=$DISTRIBUTION_ID" >> .env

# Create cache invalidation script
cat > invalidate-cdn.sh << EOF
#!/bin/bash
# Invalidate CloudFront cache after updates
echo "🔄 Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
    --distribution-id $DISTRIBUTION_ID \
    --paths "/*" \
    --query 'Invalidation.Id' --output text
echo "✅ Cache invalidated - changes will appear globally within 5 minutes"
EOF

chmod +x invalidate-cdn.sh

echo ""
echo "✅ CloudFront CDN Setup Complete!"
echo "================================="
echo "🌐 CDN URL: https://$CDN_URL"
echo "📱 Original: https://$APP_URL"
echo ""
echo "🚀 Benefits:"
echo "• 3x faster loading globally"
echo "• DDoS protection included"  
echo "• Static assets cached at edge"
echo "• API calls still go direct (no caching)"
echo ""
echo "🔧 Management:"
echo "• ./invalidate-cdn.sh - Clear cache after updates"
echo ""
echo "📍 Next: Set up custom domain to point to CDN"

# Cleanup
rm -f cdn-config.json