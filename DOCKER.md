# 🐳 SmartLining - Docker Setup

## Inicio Rápido

```bash
# Hacer ejecutable el script
chmod +x start.sh

# Iniciar todo con Docker
./start.sh
```

Accede a **http://localhost:3000** en tu navegador.

## Estructura Docker

El proyecto utiliza un **Dockerfile multi-stage** que:

1. **Stage 1**: Compila el backend (TypeScript → JavaScript)
2. **Stage 2**: Compila el frontend (React/Vite → HTML/JS/CSS)
3. **Stage 3**: Runtime final con backend + frontend estático en una imagen única

```
┌─────────────────────────────────────────┐
│         Docker Container                │
├─────────────────────────────────────────┤
│  Node.js 23 (Alpine)                    │
│  ├─ Backend (Express + Prisma)          │
│  ├─ Frontend (Vite compilado - estático)│
│  └─ Puerto 3000                         │
└─────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────┐
│      MySQL 8.0 Database                 │
│      Puerto 3306                        │
└─────────────────────────────────────────┘
```

## Comandos Útiles

```bash
# Ver logs en tiempo real
docker-compose logs -f

# Entrar al contenedor
docker-compose exec app sh

# Acceder a MySQL
docker-compose exec db mysql -u smartlining -ppassword smartlining

# Ejecutar migraciones
docker-compose exec app npx prisma migrate deploy

# Cargar datos de prueba
docker-compose exec app npx prisma db seed

# Detener servicios
docker-compose down

# Detener y limpiar todo (including volumes)
docker-compose down -v

# Reconstruir imagen
docker-compose build --no-cache
```

## Variables de Entorno

Copia `.env.docker` a `.env` y ajusta:

```bash
cp .env.docker .env
```

Variables principales:

- `NODE_ENV`: production/development
- `JWT_SECRET`: Clave para JWT (cambiar en producción!)
- `DB_USER`, `DB_PASSWORD`: Credenciales MySQL
- `CORS_ORIGIN`: Origen permitido para CORS

## Desarrollo vs Producción

### Producción (Default)

```bash
docker-compose up
```

- Frontend compilado y servido como estático
- Backend optimizado
- Imagen única y eficiente

### Desarrollo (Con hot-reload)

Descomenta los volúmenes en `docker-compose.yml`:

```yaml
volumes:
  - ./backend/src:/app/backend/src
  - ./frontend/src:/app/frontend/src
```

## Troubleshooting

### Error de conexión a MySQL

```
Error: connect ECONNREFUSED 127.0.0.1:3306
```

**Solución**: Esperar a que MySQL esté listo (3-5 segundos)

### Puerto 3000 ya en uso

```bash
lsof -i :3000
kill -9 <PID>
# O cambiar puerto en .env:
PORT=3001
```

### Reconstruir sin caché

```bash
docker-compose build --no-cache --pull
```

### Ver detalles de la imagen

```bash
docker images
docker inspect smartlining_app
```

## Estadísticas de Imagen

La imagen final es relativamente pequeña:

- **Base**: Node.js 23 Alpine (~165MB)
- **Backend compilado**: ~10-15MB
- **Frontend compilado**: ~5-10MB
- **Total aproximado**: ~200-300MB

## Deployment a Producción

Para producción, considera:

1. **Build externo**:

```bash
docker build -t smartlining:1.0.0 .
docker push your-registry/smartlining:1.0.0
```

2. **Usar imagen en docker-compose**:

```yaml
app:
  image: your-registry/smartlining:1.0.0
  # ... resto de config
```

3. **Variables de entorno seguras**:

```bash
# Usar archivo .env.production (no en git)
docker-compose --env-file .env.production up
```

4. **Reverse proxy** (Nginx/Traefik):

```nginx
upstream smartlining {
  server app:3000;
}

server {
  listen 80;
  server_name yourdomain.com;

  location / {
    proxy_pass http://smartlining;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

## Health Check

El contenedor incluye healthcheck:

```bash
docker-compose ps
# Estado: healthy/unhealthy
```

Endpoint de salud:

```bash
curl http://localhost:3000/api/health
```

---

**Última actualización**: 5 de febrero 2026
