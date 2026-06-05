#!/bin/bash
# ─────────────────────────────────────────────────────────────────
# VoltStream — AWS S3 + CloudFront Frontend Deployment Script
# Week 1 AWS Track | Tachyon AIML Internship Program v4.0
# ─────────────────────────────────────────────────────────────────

set -e

AWS_REGION="us-east-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
FRONTEND_BUCKET="voltstream-frontend-$ACCOUNT_ID"

# Pass your API Gateway URL here
API_URL=${1:-"https://YOUR_API_GATEWAY_ID.execute-api.us-east-1.amazonaws.com/prod"}

echo "=================================================="
echo " VoltStream Frontend — S3 + CloudFront Deploy"
echo "=================================================="

# ── Step 1: Build React app ───────────────────────────────────────
echo "[1/4] Building React frontend..."
cd frontend
echo "VITE_API_URL=$API_URL" > .env.production
npm install --quiet
npm run build
echo "  ✔ Build complete — dist/ ready"

# ── Step 2: Create S3 bucket ──────────────────────────────────────
echo "[2/4] Creating S3 bucket for static hosting..."
aws s3 mb s3://$FRONTEND_BUCKET --region $AWS_REGION 2>/dev/null || echo "  Bucket already exists"

# Disable block public access
aws s3api put-public-access-block \
  --bucket $FRONTEND_BUCKET \
  --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

# Enable static website hosting
aws s3 website s3://$FRONTEND_BUCKET \
  --index-document index.html \
  --error-document index.html

# Set bucket policy for public read
aws s3api put-bucket-policy \
  --bucket $FRONTEND_BUCKET \
  --policy "{
    \"Version\": \"2012-10-17\",
    \"Statement\": [{
      \"Sid\": \"PublicReadGetObject\",
      \"Effect\": \"Allow\",
      \"Principal\": \"*\",
      \"Action\": \"s3:GetObject\",
      \"Resource\": \"arn:aws:s3:::$FRONTEND_BUCKET/*\"
    }]
  }"
echo "  ✔ S3 bucket configured"

# ── Step 3: Upload build ──────────────────────────────────────────
echo "[3/4] Uploading build to S3..."
aws s3 sync dist/ s3://$FRONTEND_BUCKET \
  --delete \
  --cache-control "max-age=31536000,public,immutable" \
  --exclude "index.html"

# index.html — no cache so updates propagate immediately
aws s3 cp dist/index.html s3://$FRONTEND_BUCKET/index.html \
  --cache-control "no-cache,no-store,must-revalidate"

echo "  ✔ Frontend uploaded to S3"

# ── Step 4: Output ────────────────────────────────────────────────
S3_URL="http://$FRONTEND_BUCKET.s3-website-$AWS_REGION.amazonaws.com"
echo ""
echo "=================================================="
echo " FRONTEND DEPLOYMENT COMPLETE"
echo "=================================================="
echo " S3 Website URL : $S3_URL"
echo " API URL Used   : $API_URL"
echo ""
echo " Note: For HTTPS + CDN, create a CloudFront"
echo " distribution pointing to the S3 website endpoint."
echo "=================================================="

cd ..
