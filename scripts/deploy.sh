#!/bin/bash

# Production deployment script

set -e

# Configuration
ENVIRONMENT=${1:-production}
REGISTRY=${REGISTRY:-your-registry.com}
PROJECT_NAME="demand-forecasting"
VERSION=${VERSION:-latest}

echo "Starting deployment to $ENVIRONMENT environment..."

# Check if required tools are installed
command -v docker >/dev/null 2>&1 || { echo "Docker is required but not installed. Aborting." >&2; exit 1; }
command -v kubectl >/dev/null 2>&1 || { echo "kubectl is required but not installed. Aborting." >&2; exit 1; }

# Build and push Docker images
echo "Building and pushing Docker images..."

# Build frontend
echo "Building frontend..."
docker build -t "$REGISTRY/$PROJECT_NAME/frontend:$VERSION" ./frontend
docker push "$REGISTRY/$PROJECT_NAME/frontend:$VERSION"

# Build backend services
for service in auth-service data-service dim-service ingest-service; do
  echo "Building $service..."
  docker build -t "$REGISTRY/$PROJECT_NAME/$service:$VERSION" "./services/$service"
  docker push "$REGISTRY/$PROJECT_NAME/$service:$VERSION"
done

# Update Kubernetes manifests with new image tags
echo "Updating Kubernetes manifests..."
sed -i "s|your-registry/|$REGISTRY/$PROJECT_NAME/|g" k8s/*.yaml
sed -i "s|:latest|:$VERSION|g" k8s/*.yaml

# Apply Kubernetes manifests
echo "Applying Kubernetes manifests..."
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/auth-service.yaml
kubectl apply -f k8s/data-service.yaml
kubectl apply -f k8s/dim-service.yaml
kubectl apply -f k8s/ingest-service.yaml
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/ingress.yaml

# Wait for deployment to complete
echo "Waiting for deployment to complete..."
kubectl rollout status deployment/auth-service -n demand-forecasting
kubectl rollout status deployment/data-service -n demand-forecasting
kubectl rollout status deployment/dim-service -n demand-forecasting
kubectl rollout status deployment/ingest-service -n demand-forecasting
kubectl rollout status deployment/frontend -n demand-forecasting

# Verify deployment
echo "Verifying deployment..."
kubectl get pods -n demand-forecasting
kubectl get services -n demand-forecasting
kubectl get ingress -n demand-forecasting

echo "Deployment completed successfully!"
echo "Application should be available at: https://your-domain.com"
