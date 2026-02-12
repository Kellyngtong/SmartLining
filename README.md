# SmartLining

Plataforma de Gestión de Colas Virtuales y Analítica de Afluencia con Business Intelligence.

SmartLining es una solución web moderna que transforma la gestión de colas presenciales en un proceso digitalizado con capacidades analíticas avanzadas.

## 🛠️ Stack Tecnológico

**Backend:** Node.js v23+ | Express.js v5 | TypeScript v5 | Prisma v6 | MySQL 8.0.x  
**Frontend:** React v18 | Vite v7 | TypeScript v5 | React Router v6 | Zustand v4 | Axios v1.6

## 📁 Estructura

```
SmartLining/
├── backend/              # API REST (Node.js + Express)
├── frontend/             # App web (React + Vite)
├── docs/                 # Documentación completa
└── README.md
```

## 🚀 Inicio Rápido

### Con Docker (Recomendado)

```bash
./start.sh
```

Accede a **http://localhost:3000**

Para más detalles sobre Docker: [DOCKER.md](DOCKER.md)

### Sin Docker (Desarrollo Local)

**Backend:**

```bash
cd backend
npm install
npm run db:push      # Crear tablas en BD
npm run db:seed      # Cargar datos de prueba
npm run dev          # Iniciar servidor (localhost:3000)
```

**Frontend (en otra terminal):**

```bash
cd frontend
npm install
npm run dev          # Iniciar dev server (localhost:5173)
```

## 📚 Documentación

- [Plan de Implementación](docs/PLAN_IMPLEMENTACION.md) - 10 semanas
- [Checklist](docs/CHECKLIST_IMPLEMENTACION.md) - Tareas por fase
- [API Spec](docs/API_SPECIFICATION.md) - 30+ endpoints
- [Setup](docs/SETUP_CONFIGURATION.md) - Guía detallada
- [Migraciones](docs/MIGRACIONES_DATABASE.md) - BD con Prisma

## 🔐 Credenciales de Prueba

```
Admin:     admin@smartlining.com / admin123
Empleado:  empleado1@smartlining.com / empleado123
```

---

**Fase 1 ✅ Completada** | Última actualización: 5 feb 2026
