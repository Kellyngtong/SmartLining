#!/bin/bash
# ==========================================
# SmartLining Docker Startup Script
# ==========================================

set -e

INIT_DB="${1:---init}"

echo "🐳 SmartLining - Docker Startup"
echo "================================"
echo "Parámetro DB: $INIT_DB"
echo ""

# Verificar si existe .env
if [ ! -f .env ]; then
    echo "📋 .env no encontrado, copiando desde .env.docker..."
    cp .env.docker .env 2>/dev/null || cat > .env << 'EOF'
DATABASE_URL="mysql://smartlining:password@db:3306/smartlining"
JWT_SECRET="your_super_secret_jwt_key_change_in_production"
JWT_EXPIRES_IN="24h"
NODE_ENV="production"
LOG_LEVEL="info"
EOF
    echo "✅ .env creado."
fi

# Parar contenedores previos
echo "🛑 Deteniendo contenedores previos..."
docker compose down --remove-orphans 2>/dev/null || true

# Construir imágenes
echo "🔨 Construyendo imágenes Docker..."
docker compose build 2>&1

# Iniciar servicios
echo "🚀 Iniciando servicios..."
docker compose up -d --no-build
echo "✅ Servicios iniciados"

# Esperar a que MySQL esté healthy
echo "⏳ Esperando a que MySQL esté listo..."
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
  if docker compose exec -T db mysqladmin ping -h localhost > /dev/null 2>&1; then
    echo "✅ MySQL está listo"
    break
  fi
  attempt=$((attempt+1))
  if [ $((attempt % 5)) -eq 0 ]; then
    echo "   ⏳ Intento $attempt/$max_attempts..."
  fi
  sleep 1
done

if [ $attempt -eq $max_attempts ]; then
  echo "❌ MySQL no se conectó después de ${max_attempts} segundos"
  docker compose logs db 2>&1 | tail -20
  exit 1
fi

# Esperar a que backend esté corriendo
echo "⏳ Esperando a que el backend esté listo..."
for i in {1..10}; do
  if docker compose exec -T backend wget -q --spider http://localhost:3000/api/health/health 2>/dev/null; then
    echo "✅ Backend listo"
    break
  fi
  echo "   Esperando... ($i/10)"
  sleep 1
done

# Ejecutar migraciones y seed
if [ "$INIT_DB" = "--init" ]; then
  echo "📊 Ejecutando migraciones de base de datos..."
  docker compose exec -T backend npx prisma migrate deploy 2>&1
  echo ""

  echo "🌱 Cargando datos de prueba..."
  docker compose exec -T backend npx prisma db seed 2>&1 || true
  echo ""
  
  echo "✅ Base de datos inicializada"
fi

echo ""
echo "================================"
echo "✅ SmartLining está listo!"
echo "================================"
echo ""
echo "📌 Acceso:"
echo "   🌐 Frontend:  http://localhost:8080"
echo "   🔧 Backend:   http://localhost:3000"
echo "   📊 MySQL:     localhost:3307"
echo ""
echo "🔑 Credenciales de prueba:"
echo "   Email: admin@smartlining.com"
echo "   Password: admin123"
echo ""
echo "💡 Comandos útiles:"
echo "   Ver logs:       docker compose logs -f"
echo "   Detener:        docker compose down"
echo "   Detener + limpiar: docker compose down -v"
echo ""
