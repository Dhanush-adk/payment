# Indian Payment API - Docker image for AWS (ECS/EC2) or any cloud
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy application source
COPY src ./src
COPY init-mysql.js ./

# Optional: create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000

# Use node directly (PM2 can be added in a separate stage if needed)
CMD ["node", "src/server.js"]
