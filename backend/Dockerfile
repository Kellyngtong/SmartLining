# ============================================
# Backend: TypeScript → Node.js
# ============================================
FROM node:23-alpine AS builder

WORKDIR /app/backend

COPY backend/package*.json ./
COPY backend/tsconfig.json ./
COPY backend/prisma ./prisma/

RUN npm ci

ENV PRISMA_ENGINES_MIRROR=https://binaries.prisma.sh
RUN npx prisma generate

COPY backend/src ./src
RUN npm run build

# ============================================
# Production image
# ============================================
FROM node:23-alpine

WORKDIR /app/backend

RUN apk add --no-cache dumb-init

COPY --from=builder /app/backend/node_modules ./node_modules
COPY backend/package*.json ./
COPY backend/prisma ./prisma/
COPY --from=builder /app/backend/dist ./dist

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/src/index.js"]
