FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better layer caching
COPY package.json ./
RUN npm install --omit=dev --no-package-lock

# Copy source
COPY src ./src

# Non-root user
RUN addgroup -S app && adduser -S app -G app
USER app

EXPOSE 8201

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -q -O- http://127.0.0.1:8201/health || exit 1

CMD ["node", "src/server.js"]
