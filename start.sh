#!/bin/bash

# ==========================================
# SmartLining Docker Startup Script
# ==========================================

set -e

# Parámetros
INIT_DB="${1:---init}"  # Por defecto: --init (ejecuta migraciones y seed)

echo "🐳 SmartLining - Docker Startup"
echo "================================"
echo "Parámetro DB: $INIT_DB"
echo ""

# Verificar si existe .env
if [ ! -f .env ]; then
    echo "📋 .env no encontrado, copiando desde .env.docker..."
    cp .env.docker .env
    echo "✅ .env creado. Recuerda ajustar las variables según sea necesario."
fi

# Parar contenedores previos si existen
echo "🛑 Deteniendo contenedores previos (si existen)..."
docker-compose down --remove-orphans 2>/dev/null || true

# Construir imágenes
echo "🔨 Construyendo imágenes Docker..."
docker-compose build --progress=plain 2>&1

# Iniciar servicios
echo "🚀 Iniciando servicios..."
docker-compose up -d --no-build
echo "✅ Servicios iniciados"

# Esperar a que MySQL esté healthy
echo "⏳ Esperando a que MySQL esté listo..."
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
  if docker-compose exec -T db mysqladmin ping -h localhost > /dev/null 2>&1; then
    echo "✅ MySQL está listo"
    break
  fi
  attempt=$((attempt+1))
  if [ $((attempt % 5)) -eq 0 ]; then
    echo "   ⏳ Intento $attempt/$max_attempts (esperando MySQL)..."
  fi
  sleep 1
done

if [ $attempt -eq $max_attempts ]; then
  echo "❌ MySQL no se conectó después de ${max_attempts} segundos"
  echo "📋 Logs de MySQL:"
  docker-compose logs db 2>&1 | tail -20
  exit 1
fi

# Esperar a que el app container esté corriendo
echo "⏳ Esperando a que la aplicación esté lista..."
for i in {1..5}; do
  echo "   Esperando $((6-i))s..."
  sleep 1
done
echo "✅ Aplicación lista"

# Ejecutar migraciones y seed según parámetro
if [ "$INIT_DB" = "--init" ]; then
  echo "📊 Ejecutando migraciones de base de datos..."
  docker-compose exec -T app npx prisma migrate deploy 2>&1
  echo ""

  echo "🌱 Cargando datos de prueba..."
  docker-compose exec -T app npx prisma db seed 2>&1 || true
  echo ""
  
  echo "✅ Base de datos inicializada"
elif [ "$INIT_DB" = "--skip-init" ]; then
  echo "⏭️  Saltando inicialización de BD (parámetro --skip-init)"
else
  echo "⚠️  Parámetro desconocido: $INIT_DB"
  echo "   Uso: ./start.sh [--init|--skip-init]"
  echo "   Por defecto: --init (ejecuta migraciones y seed)"
  exit 1
fi

echo ""
echo "📊 Logs de la aplicación:"
echo "================================"
docker-compose logs app 2>&1 | tail -20
echo ""

echo ""
echo "================================"
echo "✅ SmartLining está listo!"
echo "================================"
echo ""
echo "📌 Acceso:"
echo "   🌐 Frontend/Backend: http://localhost:3000"
echo "   📊 MySQL: localhost:3306"
echo ""
echo "� Credenciales de prueba:"
echo "   Email: admin@smartlining.com"
echo "   Password: admin123"
echo ""
echo "💡 Próximas veces:"
echo "   - Con BD nueva (migraciones + seed): ./start.sh --init"
echo "   - Sin reinicializar BD: ./start.sh --skip-init"
echo ""
echo "📊 Ver logs en tiempo real:"
echo "   docker-compose logs -f"
echo ""
echo "📝 Otros comandos útiles:"
echo "   Ver logs de app:  docker-compose logs -f app"
echo "   Ver logs BD:      docker-compose logs -f db"
echo "   Entrar al app:    docker-compose exec app sh"
echo "   Acceder a BD:     docker-compose exec db mysql -u smartlining -ppassword smartlining"
echo "   Detener:          docker-compose down"
echo "   Detener + limpiar: docker-compose down -v"
echo ""
