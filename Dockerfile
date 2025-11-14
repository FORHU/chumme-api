# Use the official Node.js 22 image as base (Latest LTS)
FROM node:22-alpine

# Install required packages for native dependencies
RUN apk add --no-cache python3 make g++ git

# Set working directory in the container
WORKDIR /app

# Set npm configuration for better compatibility
RUN npm config set fetch-retry-maxtimeout 600000
RUN npm config set fetch-retry-mintimeout 10000
RUN npm config set fetch-timeout 600000

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Clean npm cache and install dependencies
RUN npm ci --only=production=false --no-optional

# Copy the rest of the application code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the TypeScript application
RUN npm run build

# Clean up - remove dev dependencies and clear npm cache
RUN npm prune --production && npm cache clean --force

# Create a non-root user to run the application
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of the app directory to the nodejs user
RUN chown -R nodejs:nodejs /app

# Switch to the non-root user
USER nodejs

# Expose the port the app runs on
EXPOSE 3000

# Define the command to run the application
CMD ["npm", "start"]