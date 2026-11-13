FROM node:22-slim

WORKDIR /app

# Copy package files for dependency caching
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy application code
COPY . .

ENV PORT=3001
ENV NODE_ENV=production

EXPOSE 3001

CMD ["npm", "start"]
