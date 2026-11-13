FROM node:22-slim

# Install OpenSSL & CA certificates needed by Prisma
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency files and Prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies and generate Prisma client
RUN npm install
RUN npx prisma generate

# Copy application source code
COPY . .

ENV PORT=5000
ENV HOST=0.0.0.0
ENV NODE_ENV=production

EXPOSE 5000

CMD ["npm", "start"]
