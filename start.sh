#!/bin/bash

# ==========================================
# SmartLining Docker Startup Script
# ==========================================

set -e

echo "🐳 SmartLining - Docker Startup"
echo "================================"

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
docker-compose build

# Iniciar servicios
echo "🚀 Iniciando servicios..."
docker-compose up -d

# Esperar a que MySQL esté listo
echo "⏳ Esperando a que MySQL esté listo..."
sleep 10

# Ejecutar migraciones de Prisma
echo "📊 Ejecutando migraciones de base de datos..."
docker-compose exec -T app npx prisma migrate deploy

# Ejecutar seed (opcional)
echo "🌱 Cargando datos de prueba..."
docker-compose exec -T app npx prisma db seed || true

echo ""
echo "================================"
echo "✅ SmartLining está listo!"
echo "================================"
echo ""
echo "📌 Acceso:"
echo "   🌐 Frontend/Backend: http://localhost:3000"
echo "   📊 MySQL: localhost:3306"
echo ""
echo "📝 Comandos útiles:"
echo "   Ver logs:        docker-compose logs -f"
echo "   Entrar al app:   docker-compose exec app sh"
echo "   Ver BD:          docker-compose exec db mysql -u smartlining -ppassword smartlining"
echo "   Detener:         docker-compose down"
echo ""
