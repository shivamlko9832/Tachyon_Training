#!/bin/bash
# ─────────────────────────────────────────────────────────────────
# VoltStream — AWS Lambda + API Gateway Deployment Script
# Week 1 AWS Track | Tachyon AIML Internship Program v4.0
# ─────────────────────────────────────────────────────────────────

set -e

# ── CONFIG — edit these ──────────────────────────────────────────
AWS_REGION="us-east-1"
LAMBDA_FUNCTION_NAME="voltstream-api"
IAM_ROLE_NAME="voltstream-lambda-role"
API_NAME="voltstream-api-gateway"
S3_BUCKET="voltstream-deployments-$(aws sts get-caller-identity --query Account --output text)"

echo "=================================================="
echo " VoltStream AWS Lambda Deployment"
echo "=================================================="

# ── Step 1: Create deployment package ───────────────────────────
echo "[1/7] Creating Lambda deployment package..."
cd backend
pip install -r requirements.txt --target ./package --quiet
cp main.py ./package/
cp lambda_handler.py ./package/
cd package
zip -r9 ../lambda_package.zip . --quiet
cd ..
echo "  ✔ lambda_package.zip created ($(du -sh lambda_package.zip | cut -f1))"

# ── Step 2: Create S3 bucket for deployment artifacts ───────────
echo "[2/7] Creating S3 bucket..."
aws s3 mb s3://$S3_BUCKET --region $AWS_REGION 2>/dev/null || echo "  Bucket already exists"
aws s3 cp lambda_package.zip s3://$S3_BUCKET/lambda_package.zip
echo "  ✔ Package uploaded to s3://$S3_BUCKET"

# ── Step 3: Create IAM Role ──────────────────────────────────────
echo "[3/7] Creating IAM execution role..."
TRUST_POLICY='{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "lambda.amazonaws.com" },
    "Action": "sts:AssumeRole"
  }]
}'

ROLE_ARN=$(aws iam create-role \
  --role-name $IAM_ROLE_NAME \
  --assume-role-policy-document "$TRUST_POLICY" \
  --query 'Role.Arn' --output text 2>/dev/null || \
  aws iam get-role --role-name $IAM_ROLE_NAME --query 'Role.Arn' --output text)

aws iam attach-role-policy \
  --role-name $IAM_ROLE_NAME \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole 2>/dev/null || true

echo "  ✔ IAM Role ARN: $ROLE_ARN"
echo "  Waiting 10s for IAM propagation..."
sleep 10

# ── Step 4: Deploy Lambda Function ───────────────────────────────
echo "[4/7] Deploying Lambda function..."
EXISTING=$(aws lambda get-function --function-name $LAMBDA_FUNCTION_NAME --region $AWS_REGION 2>/dev/null || echo "")

if [ -z "$EXISTING" ]; then
  aws lambda create-function \
    --function-name $LAMBDA_FUNCTION_NAME \
    --runtime python3.12 \
    --role $ROLE_ARN \
    --handler lambda_handler.handler \
    --code S3Bucket=$S3_BUCKET,S3Key=lambda_package.zip \
    --timeout 30 \
    --memory-size 256 \
    --region $AWS_REGION \
    --environment "Variables={ENV=production}" \
    --description "VoltStream FastAPI backend — Tachyon Internship Week 1"
  echo "  ✔ Lambda function created"
else
  aws lambda update-function-code \
    --function-name $LAMBDA_FUNCTION_NAME \
    --s3-bucket $S3_BUCKET \
    --s3-key lambda_package.zip \
    --region $AWS_REGION
  echo "  ✔ Lambda function updated"
fi

# ── Step 5: Create API Gateway ────────────────────────────────────
echo "[5/7] Creating API Gateway (HTTP API)..."
API_ID=$(aws apigatewayv2 create-api \
  --name $API_NAME \
  --protocol-type HTTP \
  --region $AWS_REGION \
  --query 'ApiId' --output text 2>/dev/null || \
  aws apigatewayv2 get-apis --region $AWS_REGION \
    --query "Items[?Name=='$API_NAME'].ApiId" --output text)

LAMBDA_ARN=$(aws lambda get-function \
  --function-name $LAMBDA_FUNCTION_NAME \
  --region $AWS_REGION \
  --query 'Configuration.FunctionArn' --output text)

# Create integration
INTEGRATION_ID=$(aws apigatewayv2 create-integration \
  --api-id $API_ID \
  --integration-type AWS_PROXY \
  --integration-uri $LAMBDA_ARN \
  --payload-format-version "2.0" \
  --region $AWS_REGION \
  --query 'IntegrationId' --output text)

# Catch-all route
aws apigatewayv2 create-route \
  --api-id $API_ID \
  --route-key "ANY /{proxy+}" \
  --target "integrations/$INTEGRATION_ID" \
  --region $AWS_REGION > /dev/null

# Deploy stage
aws apigatewayv2 create-stage \
  --api-id $API_ID \
  --stage-name prod \
  --auto-deploy \
  --region $AWS_REGION > /dev/null 2>&1 || true

echo "  ✔ API Gateway created: $API_ID"

# ── Step 6: Add Lambda permission for API Gateway ─────────────────
echo "[6/7] Granting API Gateway permission to invoke Lambda..."
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
aws lambda add-permission \
  --function-name $LAMBDA_FUNCTION_NAME \
  --statement-id apigateway-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:$AWS_REGION:$ACCOUNT_ID:$API_ID/*/*" \
  --region $AWS_REGION 2>/dev/null || true
echo "  ✔ Permission granted"

# ── Step 7: Output ────────────────────────────────────────────────
API_URL="https://$API_ID.execute-api.$AWS_REGION.amazonaws.com/prod"
echo ""
echo "=================================================="
echo " DEPLOYMENT COMPLETE"
echo "=================================================="
echo " API Base URL : $API_URL"
echo " API Docs     : $API_URL/docs"
echo " Health Check : $API_URL/"
echo ""
echo " Test endpoints:"
echo "  curl $API_URL/api/v1/dashboard/live"
echo "  curl $API_URL/api/v1/devices"
echo "=================================================="

cd ..
