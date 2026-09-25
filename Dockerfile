# Dockerfile for Suiflex Architect Cloud Bot (Auto-Role, AI Assistant, Audit Log & Diva Music Engine)
FROM node:20-bullseye-slim

# Install system dependencies: ffmpeg, python3, curl, ca-certificates
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    curl \
    ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Install latest native yt-dlp binary for Linux x86_64
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
 && chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install --production

# Bundle app source
COPY . .

ENV NODE_ENV=production

CMD ["node", "index.js"]
