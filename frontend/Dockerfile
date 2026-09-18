# ============================================
# Frontend: Build with Vite + Serve with nginx
# ============================================
FROM node:23-alpine AS builder

WORKDIR /app

COPY frontend/package*.json ./
COPY frontend/tsconfig*.json ./
COPY frontend/vite.config.ts ./
COPY frontend/index.html ./

RUN npm ci \
    && npm install terser \
    && npm install @rollup/rollup-linux-arm64-musl@4.57.1

COPY frontend/src ./src
COPY frontend/public ./public

RUN npm run build

# ============================================
# Serve with nginx
# ============================================
FROM nginx:alpine

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built frontend
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
