#!/bin/bash
# Setup custom domains for Drew Command Center
# Configures drewpeacock.ai and dashboard.primeparking.space

set -e

echo "🌐 Setting up Custom Domains for Drew Command Center"
echo "=================================================="

# Configuration - Update these with your actual domains
PRIMARY_DOMAIN="drewpeacock.ai"
ALT_DOMAIN="dashboard.primeparking.space"

# Check if CDN is set up
if [ ! -f .env ] || ! grep -q "CDN_DOMAIN" .env; then
    echo "❌ CloudFront CDN not found. Please run ./setup-cdn.sh first"
    exit 1
fi

# Load CDN config
source .env
echo "📍 CDN Domain: $CDN_DOMAIN"
echo "📍 Distribution ID: $DISTRIBUTION_ID"

# Function to setup domain
setup_domain() {
    local domain=$1
    echo ""
    echo "🔧 Setting up domain: $domain"
    
    # Request SSL certificate
    echo "📜 Requesting SSL certificate for $domain..."
    CERT_ARN=$(aws acm request-certificate \
        --domain-name $domain \
        --subject-alternative-names "www.$domain" \
        --validation-method DNS \
        --region us-east-1 \
        --query 'CertificateArn' --output text)
    
    echo "📍 Certificate ARN: $CERT_ARN"
    
    # Get DNS validation records
    echo "⏳ Getting DNS validation records..."
    sleep 5  # Wait for certificate request to process
    
    aws acm describe-certificate \
        --certificate-arn $CERT_ARN \
        --region us-east-1 \
        --query 'Certificate.DomainValidationOptions[*].ResourceRecord.{Name:Name,Type:Type,Value:Value}' \
        --output table
    
    echo ""
    echo "📋 DNS Setup Required:"
    echo "1. Add the CNAME records above to your DNS provider"
    echo "2. Wait for DNS validation (5-30 minutes)"
    echo "3. Run this script again to complete domain setup"
    echo ""
    
    # Save certificate info
    echo "${domain}_CERT_ARN=$CERT_ARN" >> .env
}

# Function to complete domain setup (after DNS validation)
complete_domain_setup() {
    local domain=$1
    local cert_var="${domain//./_}_CERT_ARN"
    local cert_arn=$(grep "$cert_var" .env | cut -d'=' -f2)
    
    if [ -z "$cert_arn" ]; then
        echo "❌ Certificate ARN not found for $domain"
        return 1
    fi
    
    # Check certificate status
    echo "🔍 Checking certificate status for $domain..."
    CERT_STATUS=$(aws acm describe-certificate \
        --certificate-arn $cert_arn \
        --region us-east-1 \
        --query 'Certificate.Status' --output text)
    
    if [ "$CERT_STATUS" != "ISSUED" ]; then
        echo "⏳ Certificate not ready yet. Status: $CERT_STATUS"
        echo "Please wait for DNS validation to complete."
        return 1
    fi
    
    echo "✅ Certificate ready for $domain"
    
    # Update CloudFront distribution with custom domain
    echo "🔧 Adding $domain to CloudFront distribution..."
    
    # Get current distribution config
    ETAG=$(aws cloudfront get-distribution-config \
        --id $DISTRIBUTION_ID \
        --query 'ETag' --output text)
    
    # Create updated config (simplified - you'd need the full config in production)
    cat > domain-update.json << EOF
{
    "Aliases": {
        "Quantity": 2,
        "Items": ["$PRIMARY_DOMAIN", "www.$PRIMARY_DOMAIN"]
    },
    "ViewerCertificate": {
        "ACMCertificateArn": "$cert_arn",
        "SSLSupportMethod": "sni-only",
        "MinimumProtocolVersion": "TLSv1.2_2021"
    }
}
EOF
    
    echo "📍 Domain $domain will be configured with CloudFront"
    echo "⚠️  Manual step required: Update full CloudFront config via AWS Console"
}

# Check what user wants to do
echo "What would you like to do?"
echo "1. Request SSL certificates and get DNS records"
echo "2. Complete domain setup (after DNS validation)"
echo "3. Check certificate status"
echo ""
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo "🚀 Requesting SSL certificates..."
        setup_domain $PRIMARY_DOMAIN
        if [ -n "$ALT_DOMAIN" ]; then
            setup_domain $ALT_DOMAIN
        fi
        ;;
    2)
        echo ""
        echo "🔧 Completing domain setup..."
        complete_domain_setup $PRIMARY_DOMAIN
        ;;
    3)
        echo ""
        echo "🔍 Certificate Status Check"
        echo "=========================="
        for cert_line in $(grep "_CERT_ARN=" .env); do
            domain=$(echo $cert_line | cut -d'_' -f1)
            cert_arn=$(echo $cert_line | cut -d'=' -f2)
            status=$(aws acm describe-certificate --certificate-arn $cert_arn --region us-east-1 --query 'Certificate.Status' --output text)
            echo "$domain: $status"
        done
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "📋 Domain Setup Summary:"
echo "======================="
echo "🎯 Primary Domain: $PRIMARY_DOMAIN"
echo "🎯 Alt Domain: $ALT_DOMAIN" 
echo ""
echo "📝 Next Steps:"
echo "1. Add DNS CNAME records to validate certificates"
echo "2. Run this script again with option 2"
echo "3. Update your domain's DNS to point to CloudFront:"
echo "   CNAME: $PRIMARY_DOMAIN → $CDN_DOMAIN"
echo ""
echo "🔧 After domain setup:"
echo "• Your Command Center will be available at https://$PRIMARY_DOMAIN"
echo "• SSL certificates automatically managed by AWS"
echo "• Global CDN performance included"

# Cleanup
rm -f domain-update.json