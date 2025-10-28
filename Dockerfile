# Multi-stage build for production
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Development dependencies (for building if needed)
FROM base AS deps-dev
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Production image
FROM base AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3002

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodeuser

# Copy dependencies from deps stage
COPY --from=deps --chown=nodeuser:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=nodeuser:nodejs . .

# Create necessary directories with proper permissions
RUN mkdir -p logs uploads && \
    chown -R nodeuser:nodejs logs uploads

# Switch to non-root user
USER nodeuser

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "index.js"]
