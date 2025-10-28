# Nginx Configuration

This directory contains the Nginx reverse proxy configuration for production deployment.

## Files

- `nginx.conf` - Main Nginx configuration file
- `ssl/` - SSL certificate directory (create this)

## SSL Certificate Setup

### Option 1: Let's Encrypt (Recommended for Production)

```bash
# Install certbot
sudo apt install certbot

# Get certificate for your domain
sudo certbot certonly --standalone -d api.yourdomain.com

# Create ssl directory
mkdir -p ssl

# Copy certificates
sudo cp /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem ssl/certificate.crt
sudo cp /etc/letsencrypt/live/api.yourdomain.com/privkey.pem ssl/private.key

# Set permissions
chmod 600 ssl/private.key
```

### Option 2: Self-Signed Certificate (Development/Testing Only)

```bash
# Create ssl directory
mkdir -p ssl

# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/private.key \
  -out ssl/certificate.crt \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
```

## Configuration

### Update Domain Name

Edit `nginx.conf` and change this line:
```nginx
server_name your-domain.com;  # Change this
```

To your actual domain:
```nginx
server_name api.yourdomain.com;
```

### SSL Configuration Location

The SSL certificates should be placed in:
- Certificate: `ssl/certificate.crt`
- Private Key: `ssl/private.key`

## Certificate Renewal (Let's Encrypt)

Set up automatic renewal:

```bash
# Add to crontab
sudo crontab -e

# Add this line (runs twice daily)
0 0,12 * * * certbot renew --quiet && cp /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem /path/to/nginx/ssl/certificate.crt && cp /etc/letsencrypt/live/api.yourdomain.com/privkey.pem /path/to/nginx/ssl/private.key && docker-compose restart nginx
```

## Testing Configuration

```bash
# Test nginx configuration
docker-compose run --rm nginx nginx -t

# If valid, reload nginx
docker-compose restart nginx
```

## Security Headers

The configuration includes these security headers:
- `Strict-Transport-Security` - Forces HTTPS
- `X-Frame-Options` - Prevents clickjacking
- `X-Content-Type-Options` - Prevents MIME sniffing
- `X-XSS-Protection` - XSS protection
- `Referrer-Policy` - Controls referrer information

## Rate Limiting

Two rate limit zones are configured:
- `api_limit` - 100 requests per minute for general API
- `login_limit` - 5 requests per minute for authentication endpoints

## WebSocket Support

WebSocket connections are supported for Socket.io at `/socket.io/` path.

## Troubleshooting

### Certificate Errors

```bash
# Check certificate validity
openssl x509 -in ssl/certificate.crt -text -noout

# Check certificate expiry
openssl x509 -in ssl/certificate.crt -noout -dates
```

### Connection Refused

```bash
# Check if nginx is running
docker-compose ps nginx

# Check nginx logs
docker-compose logs nginx

# Verify ports are not in use
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :443
```

### 502 Bad Gateway

- Check if the `app` service is running
- Verify the backend is accessible on port 3002
- Check application logs: `docker-compose logs app`
