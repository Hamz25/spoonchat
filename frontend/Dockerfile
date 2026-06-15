# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests first (better layer caching)
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

# Copy source and build
COPY . .
RUN npm run build

# ── Stage 2: nginx runtime ────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

# Remove default nginx page
RUN rm -rf /usr/share/nginx/html/*

# Copy built React app
COPY --from=builder /app/build /usr/share/nginx/html

# Nginx config for React SPA (handle client-side routing)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
