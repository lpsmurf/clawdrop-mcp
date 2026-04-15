FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --production

# Copy source code
COPY . .

# Build if needed
RUN npm run build 2>/dev/null || true

# Expose for stdio protocol
CMD ["node", "dist/index.js"]
