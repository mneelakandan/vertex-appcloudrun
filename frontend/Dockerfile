# ── Stage 1: Build React app ──────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app/frontend

# Install deps
COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline

# Build (REACT_APP_BACKEND_URL injected at build time via Cloud Build substitution)
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL
COPY frontend ./
COPY public/ ./public/
COPY src/     ./src/
RUN npm run build

# ── Stage 2: Serve with nginx ─────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# Custom nginx config for React SPA (handles client-side routing)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
