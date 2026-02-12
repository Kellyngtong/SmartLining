# Guía de Setup y Configuración - SmartLining

**Versión:** 1.0  
**Última actualización:** 5 de febrero de 2026

---

## Índice

1. [Requisitos Previos](#requisitos-previos)
2. [Setup del Backend](#setup-del-backend)
3. [Setup del Frontend](#setup-del-frontend)
4. [Configuración de Base de Datos](#configuración-de-base-de-datos)
5. [Variables de Entorno](#variables-de-entorno)
6. [Ejecución Local](#ejecución-local)
7. [Testing](#testing)
8. [Build para Producción](#build-para-producción)
9. [Docker (Opcional)](#docker-opcional)
10. [Troubleshooting](#troubleshooting)

---

## Requisitos Previos

Asegúrate de tener instalados:

- **Node.js:** v25.x o superior
- **npm:** v11.x o superior
- **MySQL:** 8.0.x
- **Git:** versión reciente
- **Visual Studio Code:** v1.85+ (recomendado)

### Verificar Instalación

```bash
# Node.js y npm
node --version
npm --version

# MySQL
mysql --version

# Git
git --version
```

---

## Setup del Backend

### 1. Clonar el Repositorio

```bash
cd /ruta/del/proyecto
git clone <repository-url>
cd SmartLining/backend
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Configurar Entorno

```bash
# Copiar archivo de ejemplo
cp .env.example .env
```

Editar `.env` con la configuración local (ver sección [Variables de Entorno](#variables-de-entorno)):

```env
# Database
DATABASE_URL="mysql://smartlining:password@localhost:3306/smartlining"

# Server
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=your_secret_key_here
JWT_REFRESH_SECRET=your_refresh_secret_key_here
JWT_EXPIRES_IN=3600
JWT_REFRESH_EXPIRES_IN=604800

# CORS
CORS_ORIGIN=http://localhost:5173

# Logging
LOG_LEVEL=debug
```

### 4. Configurar TypeScript y Linting

```bash
# Crear tsconfig.json si no existe
npx tsc --init

# Configurar ESLint
npm init @eslint/config@latest

# Verificar que compila
npm run build
```

### 5. Crear la Base de Datos

```bash
# Crear base de datos MySQL
mysql -u root -p

# En el prompt de MySQL:
CREATE DATABASE smartlining CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'smartlining'@'localhost' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON smartlining.* TO 'smartlining'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 6. Ejecutar Migraciones de Prisma

```bash
# Verificar conexión y crear tablas
npx prisma migrate dev --name initial

# Generar cliente Prisma
npx prisma generate

# (Opcional) Abrir Prisma Studio para visualizar datos
npx prisma studio
```

### 7. Scripts Disponibles

Agregar al `package.json` en la sección `"scripts"`:

```json
{
  "scripts": {
    "dev": "ts-node --esm src/index.ts",
    "build": "tsc",
    "start": "node dist/src/index.js",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "format": "prettier --write src",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:reset": "prisma migrate reset",
    "db:seed": "ts-node --esm prisma/seed.ts",
    "type-check": "tsc --noEmit"
  }
}
```

---

## Setup del Frontend

### 1. Navegar al Directorio Frontend

```bash
cd ../frontend
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Configurar Entorno

```bash
# Copiar archivo de ejemplo
cp .env.example .env
```

Editar `.env`:

```env
# API
VITE_API_URL=http://localhost:3000/api/v1

# App
VITE_APP_NAME=SmartLining
VITE_APP_VERSION=1.0.0

# Environment
VITE_NODE_ENV=development
```

### 4. Configurar Vite

El archivo `vite.config.ts` debe incluir:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
```

### 5. Scripts Disponibles

Agregar al `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "format": "prettier --write src",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest --coverage"
  }
}
```

---

## Configuración de Base de Datos

### Crear Usuario MySQL Específico

```bash
mysql -u root -p

CREATE USER 'smartlining'@'localhost' IDENTIFIED BY 'secure_password_here';
GRANT ALL PRIVILEGES ON smartlining.* TO 'smartlining'@'localhost';
FLUSH PRIVILEGES;
```

### Configurar Prisma Schema

Editar `backend/prisma/schema.prisma`:

```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model User {
  id        String     @id @default(cuid())
  email     String     @unique
  password  String
  firstName String
  lastName  String
  role      UserRole   @default(EMPLOYEE)
  status    Status     @default(ACTIVE)
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  @@map("users")
}

enum UserRole {
  ADMIN
  EMPLOYEE
  CUSTOMER
}

enum Status {
  ACTIVE
  INACTIVE
}

// ... resto del schema
```

---

## Variables de Entorno

### Backend `.env`

```env
# ========================
# Database Configuration
# ========================
DATABASE_URL="mysql://smartlining:password@localhost:3306/smartlining"
DB_HOST=localhost
DB_PORT=3306
DB_USER=smartlining
DB_PASSWORD=password
DB_NAME=smartlining

# ========================
# Server Configuration
# ========================
PORT=3000
NODE_ENV=development
API_BASE_URL=http://localhost:3000

# ========================
# JWT Configuration
# ========================
JWT_SECRET=super_secret_jwt_key_change_in_production
JWT_REFRESH_SECRET=super_secret_refresh_key_change_in_production
JWT_EXPIRES_IN=3600           # 1 hora en segundos
JWT_REFRESH_EXPIRES_IN=604800 # 7 días en segundos

# ========================
# CORS Configuration
# ========================
CORS_ORIGIN=http://localhost:5173
CORS_CREDENTIALS=true

# ========================
# Logging
# ========================
LOG_LEVEL=debug
LOG_FORMAT=dev

# ========================
# Email Configuration (Opcional)
# ========================
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@smartlining.com

# ========================
# Rate Limiting
# ========================
RATE_LIMIT_WINDOW=900000  # 15 minutos en ms
RATE_LIMIT_MAX_REQUESTS=100

# ========================
# Features
# ========================
ENABLE_SWAGGER_UI=true
ENABLE_METRICS=true
```

### Frontend `.env`

```env
# ========================
# API Configuration
# ========================
VITE_API_URL=http://localhost:3000/api/v1
VITE_WS_URL=ws://localhost:3000/ws

# ========================
# App Configuration
# ========================
VITE_APP_NAME=SmartLining
VITE_APP_VERSION=1.0.0
VITE_APP_DESCRIPTION=Virtual Queue Management Platform

# ========================
# Environment
# ========================
VITE_NODE_ENV=development
VITE_DEBUG=true

# ========================
# Features
# ========================
VITE_ENABLE_QR_SCANNER=true
VITE_ENABLE_NOTIFICATIONS=true
VITE_ENABLE_SOUND_ALERTS=true
```

---

## Ejecución Local

### Terminal 1: Iniciar Backend

```bash
cd backend
npm run dev
```

Expected output:

```
Server running on port 3000
Database connected successfully
```

### Terminal 2: Iniciar Frontend

```bash
cd frontend
npm run dev
```

Expected output:

```
VITE v7.0.0  ready in XXX ms

➜  Local:   http://localhost:5173/
➜  press h to show help
```

### Acceder a la Aplicación

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000/api/v1
- **Swagger UI:** http://localhost:3000/api/v1/docs (si está habilitado)
- **Prisma Studio:** http://localhost:5555 (ejecutar `npx prisma studio`)

---

## Testing

### Backend - Unit Tests

```bash
cd backend

# Ejecutar todos los tests
npm test

# Ejecutar tests en watch mode
npm run test:watch

# Ejecutar con coverage
npm run test:coverage
```

### Backend - Integration Tests

```bash
# Con servidor de test
npm run test:integration
```

### Frontend - Unit Tests

```bash
cd frontend

# Ejecutar todos los tests
npm test

# Ejecutar en watch mode
npm run test:watch

# Con coverage
npm run test:coverage
```

### E2E Tests

```bash
# Requiere ambos servidores corriendo

cd frontend

# Instalar Playwright
npm install -D @playwright/test

# Ejecutar E2E tests
npx playwright test

# Ver reporte
npx playwright show-report
```

---

## Build para Producción

### Backend

```bash
cd backend

# Build
npm run build

# Verificar que se creó dist/
ls -la dist/

# Ejecutar desde build
npm start
```

### Frontend

```bash
cd frontend

# Build
npm run build

# Verificar que se creó dist/
ls -la dist/

# Hacer preview
npm run preview
```

---

## Docker (Opcional)

### Dockerfile para Backend

Crear `backend/Dockerfile`:

```dockerfile
FROM node:25-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist
COPY prisma ./prisma

EXPOSE 3000

CMD ["node", "dist/src/index.js"]
```

### Dockerfile para Frontend

Crear `frontend/Dockerfile`:

```dockerfile
FROM node:25-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### Docker Compose

Crear `docker-compose.yml` en la raíz:

```yaml
version: "3.8"

services:
  mysql:
    image: mysql:8.0
    container_name: smartlining-db
    environment:
      MYSQL_DATABASE: smartlining
      MYSQL_USER: smartlining
      MYSQL_PASSWORD: password
      MYSQL_ROOT_PASSWORD: root_password
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    networks:
      - smartlining-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: smartlining-backend
    environment:
      DATABASE_URL: "mysql://smartlining:password@mysql:3306/smartlining"
      PORT: 3000
      JWT_SECRET: your-secret-key
    ports:
      - "3000:3000"
    depends_on:
      - mysql
    networks:
      - smartlining-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: smartlining-frontend
    ports:
      - "80:80"
    environment:
      VITE_API_URL: http://localhost:3000/api/v1
    depends_on:
      - backend
    networks:
      - smartlining-network

volumes:
  mysql_data:

networks:
  smartlining-network:
    driver: bridge
```

### Ejecutar con Docker Compose

```bash
# Iniciar servicios
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener servicios
docker-compose down

# Reconstruir imágenes
docker-compose up -d --build
```

---

## Troubleshooting

### Problema: "Cannot find module 'ts-node'"

**Solución:**

```bash
npm install -g ts-node
npm install -D ts-node @types/node
```

### Problema: "ECONNREFUSED" - No se puede conectar a MySQL

**Verificar:**

```bash
# Verificar que MySQL está corriendo
mysql -u smartlining -p -h localhost

# Verificar puerto
netstat -an | grep 3306
```

### Problema: "Invalid `prisma.user.create()`" - Error en Prisma

**Solución:**

```bash
# Resetear prisma
npx prisma migrate reset

# O empezar de nuevo
npx prisma db push
npx prisma generate
```

### Problema: "CORS error" entre frontend y backend

**Verificar:**

- Frontend `.env` tiene `VITE_API_URL` correcto
- Backend `.env` tiene `CORS_ORIGIN` que coincide con frontend URL
- Ambos servidores están corriendo

### Problema: "Port already in use"

**Para Backend (Puerto 3000):**

```bash
# macOS/Linux
lsof -i :3000
kill -9 <PID>

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Para Frontend (Puerto 5173):**

```bash
# Cambiar puerto en vite.config.ts:
server: {
  port: 5174  // cambiar puerto
}
```

### Problema: "TypeError: Cannot read property 'split' of undefined"

**Usualmente en DATABASE_URL:**

- Verificar `.env` está en la raíz de `backend/`
- Verificar DATABASE_URL tiene formato correcto

### Problema: Tipos de TypeScript no funcionan

```bash
# Limpiar node_modules y reinstalar
rm -rf node_modules package-lock.json
npm install

# Verificar tipos
npm run type-check
```

### Problema: Hot reload no funciona en desarrollo

**Frontend:**

```bash
# Reiniciar servidor Vite
npm run dev
```

**Backend:**

```bash
# Instalar nodemon para auto-reload
npm install -D nodemon

# Agregar script en package.json
"dev": "nodemon --exec ts-node src/index.ts"
```

---

## Verificación Final

Ejecutar checklist después del setup:

- [ ] `npm --version` muestra v11.x o superior
- [ ] `node --version` muestra v25.x o superior
- [ ] Base de datos `smartlining` existe y es accesible
- [ ] Backend compila sin errores (`npm run build`)
- [ ] Backend inicia correctamente en puerto 3000
- [ ] Frontend compila sin errores (`npm run build`)
- [ ] Frontend inicia en puerto 5173
- [ ] Puedo acceder a http://localhost:5173 en el navegador
- [ ] API responde en http://localhost:3000/api/v1/health (o endpoint similar)
- [ ] Tests pasan (`npm test` en backend y frontend)
- [ ] Linting pasa (`npm run lint`)
- [ ] No hay errores en la consola

---

**Soporte:** Para problemas adicionales, consultar la documentación oficial:

- [Node.js Documentation](https://nodejs.org/docs/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Express.js Documentation](https://expressjs.com/)
