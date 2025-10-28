# 🚀 Deployment Guide - Insurance Management System

This guide covers deploying the Insurance Management System to production using Docker.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start with Docker](#quick-start-with-docker)
3. [Production Deployment](#production-deployment)
4. [Environment Configuration](#environment-configuration)
5. [SSL/TLS Setup](#ssltls-setup)
6. [Database Migrations](#database-migrations)
7. [Monitoring & Logs](#monitoring--logs)
8. [Backup & Recovery](#backup--recovery)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **Docker** >= 20.10
- **Docker Compose** >= 2.0
- **Git**

### Server Requirements (Minimum)
- **CPU:** 2 cores
- **RAM:** 4GB
- **Storage:** 20GB SSD
- **OS:** Ubuntu 20.04+ / Debian 11+ / CentOS 8+

### Server Requirements (Recommended)
- **CPU:** 4 cores
- **RAM:** 8GB
- **Storage:** 50GB SSD
- **OS:** Ubuntu 22.04 LTS

---

## Quick Start with Docker

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/insurance-backend.git
cd insurance-backend
```

### 2. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit with your values
nano .env
```

**Minimum required changes:**
```env
DB_URI=mongodb://admin:YOUR_PASSWORD@mongodb:27017/insurance_db?authSource=admin
TokenSignIn=YOUR_SUPER_SECRET_JWT_KEY_MIN_64_CHARS
ADMIN_EMAIL=your-admin@email.com
ADMIN_PASSWORD=YourStrongPassword123!
```

### 3. Start Services

```bash
# Build and start all services
npm run docker:up

# Or manually with docker-compose
docker-compose up -d
```

### 4. Run Migrations

```bash
# Migrations run automatically with docker-compose
# Or run manually:
npm run migrate
```

### 5. Verify Deployment

```bash
# Check service health
curl http://localhost:3002/api/v1/health

# View logs
npm run docker:logs

# Check all services are running
docker-compose ps
```

---

## Production Deployment

### Step 1: Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

### Step 2: Clone and Configure

```bash
# Clone repository
git clone https://github.com/your-org/insurance-backend.git
cd insurance-backend

# Copy production environment template
cp .env.production.example .env

# Generate strong secrets
openssl rand -base64 64  # For JWT secret
openssl rand -base64 32  # For other secrets

# Edit environment file
nano .env
```

### Step 3: SSL Certificate Setup

#### Option A: Using Let's Encrypt (Recommended)

```bash
# Install certbot
sudo apt install certbot

# Get SSL certificate
sudo certbot certonly --standalone -d api.yourdomain.com

# Copy certificates
sudo mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem nginx/ssl/certificate.crt
sudo cp /etc/letsencrypt/live/api.yourdomain.com/privkey.pem nginx/ssl/private.key
```

#### Option B: Self-Signed Certificate (Development/Testing)

```bash
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/private.key \
  -out nginx/ssl/certificate.crt
```

### Step 4: Update Nginx Configuration

```bash
# Edit nginx config
nano nginx/nginx.conf

# Update this line with your domain:
server_name api.yourdomain.com;
```

### Step 5: Deploy

```bash
# Deploy with production settings
npm run docker:prod

# Or manually
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Step 6: Verify Deployment

```bash
# Check all services
docker-compose ps

# Check application logs
docker-compose logs -f app

# Test API
curl https://api.yourdomain.com/api/v1/health

# Test admin login
curl -X POST https://api.yourdomain.com/api/v1/user/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"your-admin@email.com","password":"YourPassword"}'
```

---

## Environment Configuration

### Critical Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | Yes | Environment mode | `production` |
| `PORT` | Yes | Application port | `3002` |
| `DB_URI` | Yes | MongoDB connection string | `mongodb://...` |
| `TokenSignIn` | Yes | JWT secret (min 64 chars) | `your-secret-key` |
| `ADMIN_EMAIL` | Yes | Admin user email | `admin@domain.com` |
| `ADMIN_PASSWORD` | Yes | Admin user password | `StrongPass123!` |
| `CLOUDINARY_*` | Yes | Cloudinary credentials | Various |
| `EMAIL_*` | Yes | SMTP settings | Various |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_URL` | Redis connection | `redis://localhost:6379` |
| `saltRound` | Bcrypt rounds | `10` (prod: `12`) |
| `CORS_ORIGINS` | Allowed origins | `*` |
| `LOG_LEVEL` | Logging level | `info` |

---

## Database Migrations

### Run Migrations

```bash
# Run all pending migrations
npm run migrate

# Or inside Docker
docker-compose exec app npm run migrate
```

### Rollback Migrations

```bash
# Rollback last migration
npm run migrate:down

# Or inside Docker
docker-compose exec app npm run migrate:down
```

### List Migrations

```bash
npm run migrate:list
```

### Create New Migration

```bash
# Create new migration file
touch migrations/002_your_migration_name.js
```

Template:
```javascript
export async function up() {
  // Migration logic
}

export async function down() {
  // Rollback logic
}
```

---

## Monitoring & Logs

### View Logs

```bash
# Application logs
docker-compose logs -f app

# Database logs
docker-compose logs -f mongodb

# All services
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100 app
```

### Application Logs Location

- **Container:** `/app/logs/`
- **Host (Production):** `/var/log/insurance-app/`

### Log Files

- `combined.log` - All logs
- `error.log` - Error logs only

### Health Checks

```bash
# Application health
curl http://localhost:3002/api/v1/health

# Database health
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"

# Redis health
docker-compose exec redis redis-cli ping
```

---

## Backup & Recovery

### Database Backup

```bash
# Backup MongoDB
docker-compose exec mongodb mongodump --out=/backup --db insurance_db

# Copy backup to host
docker cp insurance-mongodb:/backup ./backups/$(date +%Y%m%d)
```

### Automated Backup Script

Create `backup.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/backups/mongodb/$(date +%Y%m%d-%H%M%S)"
docker-compose exec -T mongodb mongodump --out=/tmp/backup --db insurance_db
docker cp insurance-mongodb:/tmp/backup $BACKUP_DIR
docker-compose exec mongodb rm -rf /tmp/backup
echo "Backup completed: $BACKUP_DIR"
```

### Restore Database

```bash
# Restore from backup
docker cp ./backups/20250126 insurance-mongodb:/tmp/restore
docker-compose exec mongodb mongorestore --db insurance_db /tmp/restore/insurance_db
```

### File Uploads Backup

```bash
# Backup uploads directory
tar -czf uploads-backup-$(date +%Y%m%d).tar.gz uploads/

# Restore
tar -xzf uploads-backup-20250126.tar.gz
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs app

# Check container status
docker-compose ps

# Restart container
docker-compose restart app

# Rebuild and restart
docker-compose up -d --build
```

### Database Connection Issues

```bash
# Check MongoDB is running
docker-compose ps mongodb

# Check MongoDB logs
docker-compose logs mongodb

# Test connection
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"

# Verify credentials in .env
cat .env | grep MONGO
```

### Port Already in Use

```bash
# Find process using port 3002
sudo lsof -i :3002

# Change PORT in .env or stop conflicting service
sudo systemctl stop nginx  # Example
```

### Out of Memory

```bash
# Check memory usage
docker stats

# Increase Docker memory limit in docker-compose.prod.yml
# Or upgrade server RAM
```

### Permission Denied

```bash
# Fix ownership
sudo chown -R $USER:$USER .

# Fix Docker socket permission
sudo chmod 666 /var/run/docker.sock
```

### SSL Certificate Issues

```bash
# Check certificate
openssl x509 -in nginx/ssl/certificate.crt -text -noout

# Renew Let's Encrypt
sudo certbot renew

# Copy renewed certificates
sudo cp /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem nginx/ssl/certificate.crt
sudo cp /etc/letsencrypt/live/api.yourdomain.com/privkey.pem nginx/ssl/private.key

# Restart nginx
docker-compose restart nginx
```

---

## Useful Commands

### Docker Management

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart specific service
docker-compose restart app

# View logs
docker-compose logs -f app

# Execute command in container
docker-compose exec app sh

# Update images
docker-compose pull
docker-compose up -d
```

### Database Management

```bash
# Connect to MongoDB
docker-compose exec mongodb mongosh -u admin -p

# Backup database
docker-compose exec mongodb mongodump --db insurance_db

# Restore database
docker-compose exec mongodb mongorestore --db insurance_db /path/to/backup
```

### Maintenance

```bash
# Clean up Docker
docker system prune -a

# Remove unused volumes
docker volume prune

# Update application
git pull
docker-compose down
docker-compose up -d --build
```

---

## Security Checklist

- [ ] Changed all default passwords
- [ ] Generated strong JWT secret (64+ characters)
- [ ] Configured SSL/TLS certificates
- [ ] Set up firewall (allow only 80, 443, 22)
- [ ] Enabled automatic security updates
- [ ] Configured backup strategy
- [ ] Set up monitoring and alerts
- [ ] Reviewed and restricted CORS origins
- [ ] Enabled rate limiting
- [ ] Configured fail2ban or similar
- [ ] Set up log rotation
- [ ] Disabled root SSH login

---

## Support

For issues and questions:
- **Documentation:** `/docs` directory
- **GitHub Issues:** [Your repo issues]
- **Email:** support@yourdomain.com

---

**Last Updated:** January 2025
