# Cloud Deployment Guide

This guide covers deploying the Demand Forecasting application to cloud platforms.

## 🏗️ Deployment Options

### 1. Kubernetes (Recommended for Production)

#### Prerequisites
- Kubernetes cluster (EKS, GKE, AKS, or self-managed)
- kubectl configured
- Container registry access
- SSL certificates

#### Steps
1. **Prepare Environment Variables**
   ```bash
   # Update secrets.yaml with base64 encoded values
   echo -n "your-password" | base64
   ```

2. **Deploy Infrastructure**
   ```bash
   # Apply Kubernetes manifests
   kubectl apply -f k8s/namespace.yaml
   kubectl apply -f k8s/configmap.yaml
   kubectl apply -f k8s/secrets.yaml
   kubectl apply -f k8s/postgres.yaml
   kubectl apply -f k8s/redis.yaml
   ```

3. **Deploy Services**
   ```bash
   kubectl apply -f k8s/auth-service.yaml
   kubectl apply -f k8s/data-service.yaml
   kubectl apply -f k8s/dim-service.yaml
   kubectl apply -f k8s/ingest-service.yaml
   kubectl apply -f k8s/frontend.yaml
   kubectl apply -f k8s/ingress.yaml
   ```

4. **Verify Deployment**
   ```bash
   kubectl get pods -n demand-forecasting
   kubectl get services -n demand-forecasting
   kubectl get ingress -n demand-forecasting
   ```

### 2. Docker Compose (Single Server)

#### Prerequisites
- Docker and Docker Compose
- SSL certificates
- Domain name configured

#### Steps
1. **Prepare Environment**
   ```bash
   # Copy environment template
   cp env.production.example .env.production
   
   # Update with your values
   nano .env.production
   ```

2. **Deploy with Docker Compose**
   ```bash
   # Use production compose file
   docker-compose -f docker-compose.production.yml up -d
   ```

3. **Verify Deployment**
   ```bash
   docker-compose -f docker-compose.production.yml ps
   docker-compose -f docker-compose.production.yml logs
   ```

### 3. AWS Cloud (Terraform)

#### Prerequisites
- AWS CLI configured
- Terraform installed
- Domain name and SSL certificate

#### Steps
1. **Initialize Terraform**
   ```bash
   cd terraform
   terraform init
   ```

2. **Configure Variables**
   ```bash
   # Create terraform.tfvars
   cat > terraform.tfvars << EOF
   aws_region = "us-west-2"
   db_password = "your-secure-password"
   domain_name = "your-domain.com"
   EOF
   ```

3. **Deploy Infrastructure**
   ```bash
   terraform plan
   terraform apply
   ```

4. **Deploy Application**
   ```bash
   # Use the generated outputs to configure your application
   terraform output
   ```

## 🔧 Configuration

### Environment Variables

#### Required Variables
```bash
# Database
POSTGRES_PASSWORD=your-secure-password
POSTGRES_USER=postgres
POSTGRES_DB=postgres

# Redis
REDIS_PASSWORD=your-redis-password

# Security
INTERNAL_SHARED_SECRET=your-very-long-random-secret
JWT_ACCESS_SECRET=your-jwt-access-secret
JWT_REFRESH_SECRET=your-jwt-refresh-secret

# Frontend
VITE_AUTH_URL=https://your-domain.com/api/auth
VITE_DATA_URL=https://your-domain.com/api/data
VITE_DIM_URL=https://your-domain.com/api/dim
VITE_INGEST_URL=https://your-domain.com/api/ingest
VITE_DATA_API_KEY=your-api-key

# CORS
CORS_ORIGINS=https://your-domain.com
```

### SSL/TLS Configuration

#### Using Let's Encrypt
```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create ClusterIssuer
kubectl apply -f - << EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@domain.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

#### Using Custom Certificates
```bash
# Create TLS secret
kubectl create secret tls demand-forecasting-tls \
  --cert=path/to/cert.pem \
  --key=path/to/key.pem \
  -n demand-forecasting
```

## 📊 Monitoring and Observability

### Prometheus and Grafana Setup
```bash
# Deploy monitoring stack
docker-compose -f monitoring/docker-compose.monitoring.yml up -d

# Access Grafana
open http://localhost:3000
# Username: admin, Password: admin
```

### Log Aggregation
- **Centralized Logging**: Redis Streams for application logs
- **System Logs**: Prometheus + Grafana for infrastructure metrics
- **Error Tracking**: Application logs with structured JSON format

## 🔄 CI/CD Pipeline

### GitHub Actions
The `.github/workflows/deploy.yml` file provides:
- Automated testing
- Docker image building and pushing
- Kubernetes deployment
- Health checks

### Manual Deployment
```bash
# Build and push images
./scripts/deploy.sh production

# Backup before deployment
./scripts/backup.sh
```

## 🔐 Security Considerations

### Network Security
- **VPC**: Isolated network with public/private subnets
- **Security Groups**: Restrictive firewall rules
- **Load Balancer**: SSL termination and rate limiting

### Application Security
- **Secrets Management**: Kubernetes secrets or external secret management
- **API Authentication**: JWT tokens and API keys
- **Input Validation**: Comprehensive validation on all endpoints
- **Rate Limiting**: Nginx rate limiting and application-level limits

### Database Security
- **Encryption**: At rest and in transit
- **Backup Encryption**: Encrypted backups
- **Access Control**: Restricted database access
- **Network Isolation**: Database in private subnet

## 📈 Scaling Considerations

### Horizontal Scaling
- **Kubernetes HPA**: Automatic scaling based on CPU/memory
- **Load Balancer**: Distribute traffic across multiple instances
- **Database Connection Pooling**: Efficient database connections

### Vertical Scaling
- **Resource Limits**: Configured in Kubernetes manifests
- **Monitoring**: Prometheus alerts for resource usage
- **Auto-scaling Groups**: AWS/GCP/Azure managed scaling

## 🔄 Backup and Recovery

### Automated Backups
```bash
# Schedule daily backups
crontab -e
# Add: 0 2 * * * /path/to/scripts/backup.sh
```

### Backup Components
- **Database**: PostgreSQL dumps with compression
- **Redis**: RDB snapshots
- **Application Logs**: Compressed log archives
- **Configuration**: Kubernetes manifests and secrets

### Recovery Procedures
1. **Database Recovery**
   ```bash
   # Restore from backup
   pg_restore -h postgres -U postgres -d postgres backup.dump
   ```

2. **Application Recovery**
   ```bash
   # Redeploy from last known good version
   kubectl rollout undo deployment/app-service
   ```

## 🚨 Troubleshooting

### Common Issues

#### Pod Startup Issues
```bash
# Check pod status
kubectl describe pod <pod-name> -n demand-forecasting

# Check logs
kubectl logs <pod-name> -n demand-forecasting
```

#### Database Connection Issues
```bash
# Test database connectivity
kubectl exec -it <pod-name> -n demand-forecasting -- pg_isready -h postgres-service
```

#### SSL Certificate Issues
```bash
# Check certificate status
kubectl describe certificate demand-forecasting-tls -n demand-forecasting
```

### Health Checks
- **Application Health**: `/health` endpoints on all services
- **Database Health**: Connection and query tests
- **Redis Health**: Ping and basic operations
- **Load Balancer Health**: Target group health checks

## 📞 Support

### Monitoring Dashboards
- **Grafana**: http://your-domain.com:3000
- **Prometheus**: http://your-domain.com:9090

### Log Access
- **Application Logs**: Kubernetes logs or centralized logging system
- **System Logs**: Prometheus metrics and alerts

### Emergency Procedures
1. **Service Outage**: Check health endpoints and restart services
2. **Database Issues**: Restore from backup and verify data integrity
3. **SSL Issues**: Renew certificates and update ingress
4. **Performance Issues**: Scale resources and investigate bottlenecks
