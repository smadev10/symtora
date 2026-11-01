# Build context: ./frontend
#
# Runs the Expo dev server (Metro) so nobody needs Node on their machine. One container serves both
# the web app (http://localhost:8081) and Expo Go on a phone (exp://<LAN_IP>:8081).
FROM node:22-slim
WORKDIR /app

# Install first, on just the manifests, so this layer caches across code-only changes.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# Non-interactive: there is no terminal to press keys in. The start script prints the QR code itself
# (scripts/print-qr.js), since Expo only prints it in interactive mode.
ENV CI=1 \
    EXPO_NO_TELEMETRY=1 \
    NODE_OPTIONS=--max-old-space-size=2048

EXPOSE 8081
CMD ["npx", "expo", "start", "--go", "--port", "8081"]
