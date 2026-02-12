# ============================================
# Stage 1: Build Backend (Node.js + TypeScript)
# ============================================
FROM node:23-alpine AS backend-builder

WORKDIR /app/backend

# Copiar package.json del backend
COPY backend/package*.json ./
COPY backend/tsconfig.json ./
COPY backend/prisma ./prisma/

# Instalar todas las dependencias (necesarias para compilar)
RUN npm ci

# Descargar binarios de Prisma para Linux
ENV PRISMA_ENGINES_MIRROR=https://binaries.prisma.sh

# Generar cliente Prisma (esto descargará los binarios correctos para Linux)
RUN npx prisma generate

# Copiar código fuente del backend
COPY backend/src ./src

# Compilar TypeScript
RUN npm run build

# Limpiar dev dependencies para imagen final
RUN npm prune --omit=dev

# ============================================
# Stage 2: Build Frontend (Node.js + React)
# ============================================
FROM node:23-alpine AS frontend-builder

WORKDIR /app/frontend

# Copiar package.json del frontend
COPY frontend/package*.json ./
COPY frontend/tsconfig*.json ./
COPY frontend/vite.config.ts ./
COPY frontend/index.html ./

# Instalar dependencias (incluyendo dev para compilar)
RUN npm ci && npm install terser

# Copiar código fuente del frontend
COPY frontend/src ./src

# Compilar React con Vite
RUN npm run build

# ============================================
# Stage 3: Runtime (Backend + Frontend estático)
# ============================================
FROM node:23-alpine

WORKDIR /app

# Instalar dumb-init para manejar signals correctamente
RUN apk add --no-cache dumb-init

# Copiar node_modules y archivos compilados del backend
COPY backend/node_modules ./backend/node_modules
COPY backend/package*.json ./backend/
COPY backend/prisma ./backend/prisma/
COPY --from=backend-builder /app/backend/dist ./backend/dist

# Copiar frontend compilado a carpeta pública del backend
COPY --from=frontend-builder /app/frontend/dist ./backend/public

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=3000

# Exponemos puerto
EXPOSE 3000

# Directorio de trabajo
WORKDIR /app/backend

# Usar dumb-init para manejar señales
ENTRYPOINT ["dumb-init", "--"]

# Comando de inicio
CMD ["node", "dist/src/index.js"]
