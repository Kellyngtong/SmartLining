# Plan de Implementación - SmartLining

## Plataforma de Gestión de Colas Virtuales y Analítica de Afluencia

**Fecha de creación:** 5 de febrero de 2026  
**Estado:** Documento de Planificación  
**Versión:** 1.0

---

## 📋 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Estructura del Proyecto](#estructura-del-proyecto)
3. [Fases de Implementación](#fases-de-implementación)
4. [Fase 1: Configuración Inicial (Semana 1)](#fase-1-configuración-inicial-semana-1)
5. [Fase 2: Infraestructura Backend (Semanas 2-3)](#fase-2-infraestructura-backend-semanas-2-3)
6. [Fase 3: Infraestructura Frontend (Semanas 2-3)](#fase-3-infraestructura-frontend-semanas-2-3)
7. [Fase 4: Modelos de Datos (Semana 4)](#fase-4-modelos-de-datos-semana-4)
8. [Fase 5: APIs Backend (Semanas 5-7)](#fase-5-apis-backend-semanas-5-7)
9. [Fase 6: Interfaces Frontend (Semanas 5-7)](#fase-6-interfaces-frontend-semanas-5-7)
10. [Fase 7: Integración y Testing (Semanas 8-9)](#fase-7-integración-y-testing-semanas-8-9)
11. [Fase 8: Deployment y Cierre (Semana 10)](#fase-8-deployment-y-cierre-semana-10)
12. [Criterios de Aceptación Globales](#criterios-de-aceptación-globales)

---

## 🎯 Visión General

SmartLining es una plataforma web que transforma la gestión de colas presenciales en un proceso digitalizado con capacidades analíticas. El sistema está compuesto por:

- **Backend:** API REST en Node.js + Express + TypeScript
- **Frontend:** Aplicación web en React + TypeScript con Vite
- **Base de Datos:** MySQL 8.0.x
- **Duración estimada:** 10 semanas
- **Equipos:** 1 desarrollador full-stack (adaptable a múltiples personas)

---

## 📁 Estructura del Proyecto

```
SmartLining/
├── backend/                    # API REST
│   ├── src/
│   │   ├── config/            # Configuración
│   │   ├── controllers/       # Controladores HTTP
│   │   ├── services/          # Lógica de negocio
│   │   ├── repositories/      # Acceso a datos
│   │   ├── routes/            # Definición de endpoints
│   │   ├── middleware/        # Middlewares (auth, cors, etc)
│   │   ├── models/            # Tipos e interfaces
│   │   └── index.ts           # Punto de entrada
│   ├── prisma/
│   │   ├── schema.prisma      # Modelo de datos
│   │   └── migrations/        # Migraciones DB
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env
│   └── .env.example
│
├── frontend/                   # Aplicación React
│   ├── src/
│   │   ├── components/        # Componentes React
│   │   ├── pages/             # Páginas (views)
│   │   ├── hooks/             # Custom hooks
│   │   ├── services/          # Servicios API
│   │   ├── types/             # Tipos TypeScript
│   │   ├── styles/            # Estilos globales
│   │   ├── utils/             # Utilidades
│   │   └── App.tsx            # Componente raíz
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── .env
│   └── .env.example
│
├── docs/                       # Documentación
│   ├── PLAN_IMPLEMENTACION.md (este archivo)
│   ├── REQUISITOS_FUNCIONALES.md
│   ├── DISEÑO_TECNICO.md
│   ├── MODELO_DATOS.md
│   └── API_SPECIFICATION.md
│
└── README.md

```

---

## 📅 Fases de Implementación

| Fase | Descripción                        | Duración | Semana |
| ---- | ---------------------------------- | -------- | ------ |
| 1    | Configuración Inicial              | 5 días   | 1      |
| 2    | Infraestructura Backend y Frontend | 10 días  | 2-3    |
| 3    | Modelos de Datos                   | 5 días   | 4      |
| 4    | APIs Backend                       | 15 días  | 5-7    |
| 5    | Interfaces Frontend                | 15 días  | 5-7    |
| 6    | Integración y Testing              | 10 días  | 8-9    |
| 7    | Deployment y Cierre                | 5 días   | 10     |

---

## Fase 1: Configuración Inicial (Semana 1)

### 1.1 Preparación del Repositorio Git

**Objetivo:** Establecer estructura de control de versiones y ramas

**Tareas:**

- [ ] Crear ramas principales: `main`, `develop`, `staging`
- [ ] Configurar `.gitignore` (node_modules, .env, dist, build)
- [ ] Establecer política de commits (convención Conventional Commits)
- [ ] Crear plantillas de pull requests

**Criterios de Aceptación:**

- Repository tiene estructura de ramas clara
- `.gitignore` está configurado correctamente
- Documentación de política de commits existe

**Responsable:** Equipo DevOps/Líder Técnico  
**Estimado:** 1 día

---

### 1.2 Configuración del Backend

**Objetivo:** Inicializar proyecto Node.js con TypeScript

**Tareas:**

- [ ] Crear estructura de directorios en `/backend`
- [ ] Ejecutar `npm init` y configurar `package.json`
- [ ] Instalar dependencias principales:
  ```bash
  npm install express typescript ts-node dotenv cors jsonwebtoken bcrypt prisma @prisma/client mysql2
  npm install -D @types/express @types/node eslint prettier
  ```
- [ ] Configurar `tsconfig.json`
- [ ] Configurar ESLint y Prettier
- [ ] Crear `.env` y `.env.example` para configuración
- [ ] Crear servidor básico Express (`src/index.ts`)

**Criterios de Aceptación:**

- Backend compila sin errores (`npm run build`)
- Servidor inicia correctamente (`npm start`)
- Variables de entorno están configuradas
- Linting pasa (`npm run lint`)

**Responsable:** Desarrollador Backend  
**Estimado:** 2 días

---

### 1.3 Configuración del Frontend

**Objetivo:** Inicializar proyecto React + Vite + TypeScript

**Tareas:**

- [ ] Crear estructura de directorios en `/frontend`
- [ ] Ejecutar `npm create vite@latest . -- --template react-ts`
- [ ] Instalar dependencias:
  ```bash
  npm install axios react-router-dom zustand
  npm install -D tailwindcss postcss autoprefixer
  ```
- [ ] Configurar Vite (`vite.config.ts`)
- [ ] Configurar Tailwind CSS (opcional, usar para estilos)
- [ ] Configurar ESLint y Prettier
- [ ] Crear `.env` y `.env.example`
- [ ] Crear estructura base de componentes

**Criterios de Aceptación:**

- Frontend compila sin errores (`npm run build`)
- Dev server inicia correctamente (`npm run dev`)
- Variables de entorno están configuradas
- Linting pasa (`npm run lint`)

**Responsable:** Desarrollador Frontend  
**Estimado:** 2 días

---

### 1.4 Configuración de Base de Datos

**Objetivo:** Establecer conexión a MySQL y herramientas ORM

**Tareas:**

- [ ] Verificar MySQL 8.0.x instalado localmente
- [ ] Crear base de datos `smartlining`
- [ ] Configurar Prisma en backend:
  ```bash
  npx prisma init
  ```
- [ ] Configurar `.env` con URL de conexión MySQL
- [ ] Crear `prisma/schema.prisma` (estructura inicial)

**Criterios de Aceptación:**

- Conexión a MySQL verificada
- Prisma está inicializado
- `.env` con credenciales de DB configurado

**Responsable:** Desarrollador Backend  
**Estimado:** 1 día

---

## Fase 2: Infraestructura Backend (Semanas 2-3)

### 2.1 Configuración de Middlewares y Autenticación

**Objetivo:** Establecer capas de seguridad y validación

**Tareas:**

- [ ] Implementar middleware de CORS
- [ ] Implementar middleware de manejo de errores global
- [ ] Implementar middleware de validación de entradas
- [ ] Configurar JWT:
  - Servicio de generación de tokens
  - Middleware de verificación de tokens
  - Servicio de refresh tokens
- [ ] Implementar bcrypt para hash de contraseñas
- [ ] Crear tipos TypeScript para JWT payload

**Criterios de Aceptación:**

- CORS funciona correctamente
- JWT se genera y valida correctamente
- Contraseñas se hashean y verifican
- Errores se manejan de forma centralizada

**Responsable:** Desarrollador Backend  
**Estimado:** 2-3 días

---

### 2.2 Estructura de Controladores, Servicios y Repositorios

**Objetivo:** Implementar patrón MVC adaptado a Express

**Tareas:**

- [ ] Crear base de controladores (clase abstracta)
- [ ] Crear base de servicios (clase abstracta)
- [ ] Crear base de repositorios (interfaz)
- [ ] Configurar inyección de dependencias (manual o librería)
- [ ] Crear helpers para respuestas HTTP
- [ ] Crear tipos e interfaces comunes

**Criterios de Aceptación:**

- Estructura de directorios está clara
- Separación de responsabilidades es evidente
- Código es reutilizable y escalable

**Responsable:** Desarrollador Backend  
**Estimado:** 2 días

---

### 2.3 Configuración de Rutas y Versionado de API

**Objetivo:** Establecer estructura de endpoints RESTful

**Tareas:**

- [ ] Crear estructura de routers por módulos:
  - `/api/v1/auth`
  - `/api/v1/queues`
  - `/api/v1/tickets`
  - `/api/v1/analytics`
  - `/api/v1/users`
  - `/api/v1/admin`
- [ ] Implementar versionado de API (v1)
- [ ] Crear documentación inicial de endpoints (Swagger/OpenAPI)

**Criterios de Aceptación:**

- Rutas están organizadas por versión y módulo
- Endpoints están documentados
- Estructura permite fácil expansión

**Responsable:** Desarrollador Backend  
**Estimado:** 1-2 días

---

## Fase 3: Infraestructura Frontend (Semanas 2-3)

### 3.1 Configuración de Routing y Layout

**Objetivo:** Establecer navegación y estructura de la aplicación

**Tareas:**

- [ ] Configurar React Router v6+
- [ ] Crear estructura de rutas:
  - Ruta pública: `/login`
  - Rutas cliente: `/queue/:queueId`, `/ticket/:ticketId`
  - Rutas empleado: `/employee`, `/queue-management`
  - Rutas admin: `/admin`, `/dashboard`, `/analytics`
- [ ] Crear componentes de layout (header, sidebar, footer)
- [ ] Implementar protección de rutas (PrivateRoute)
- [ ] Crear componente raíz (App.tsx)

**Criterios de Aceptación:**

- Navegación funciona correctamente
- Rutas están protegidas según rol
- Layout es consistente

**Responsable:** Desarrollador Frontend  
**Estimado:** 2 días

---

### 3.2 Configuración de Estado Global (Zustand)

**Objetivo:** Centralizar manejo de estado

**Tareas:**

- [ ] Crear store de autenticación:
  - Usuario actual
  - Token JWT
  - Rol del usuario
- [ ] Crear store de notificaciones/toasts
- [ ] Crear store de colas activas
- [ ] Implementar persistencia de estado en localStorage
- [ ] Crear hooks personalizados para acceso a stores

**Criterios de Aceptación:**

- Estado se persiste correctamente
- Hooks están tipados correctamente
- Estado es accesible desde cualquier componente

**Responsable:** Desarrollador Frontend  
**Estimado:** 2 días

---

### 3.3 Configuración de Cliente HTTP y Servicios API

**Objetivo:** Establecer capa de comunicación con backend

**Tareas:**

- [ ] Configurar cliente axios con:
  - URL base del API
  - Interceptores de request (agregar JWT)
  - Interceptores de response (manejo de errores)
  - Timeout y reintentos
- [ ] Crear servicios API por módulo:
  - `authService`
  - `queueService`
  - `ticketService`
  - `analyticsService`
  - `userService`
  - `adminService`
- [ ] Crear tipos TypeScript para respuestas del API

**Criterios de Aceptación:**

- Cliente HTTP está configurado
- Servicios son reutilizables
- Tipos están sincronizados con backend

**Responsable:** Desarrollador Frontend  
**Estimado:** 2 días

---

### 3.4 Configuración de Estilos y Componentes Base

**Objetivo:** Establecer sistema de diseño

**Tareas:**

- [ ] Configurar Tailwind CSS (o CSS Modules)
- [ ] Crear variables de tema (colores, tipografía)
- [ ] Crear componentes base reutilizables:
  - Button
  - Input
  - Select
  - Modal
  - Card
  - Alert/Toast
  - Loading spinner
- [ ] Establecer guía de estilos

**Criterios de Aceptación:**

- Estilos están centralizados
- Componentes base son consistentes
- Aplicación tiene identidad visual clara

**Responsable:** Desarrollador Frontend  
**Estimado:** 2-3 días

---

## Fase 4: Modelos de Datos (Semana 4)

### 4.1 Diseño y Creación de Esquema Prisma

**Objetivo:** Definir estructura de datos en MySQL mediante Prisma

**Tareas:**

- [ ] Crear modelos en `prisma/schema.prisma`:

**Usuarios:**

```prisma
model User {
  id                String    @id @default(cuid())
  email             String    @unique
  password          String
  firstName         String
  lastName          String
  role              UserRole  // ADMIN, EMPLOYEE, CUSTOMER
  status            Status    // ACTIVE, INACTIVE
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
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
```

**Colas:**

```prisma
model Queue {
  id                String    @id @default(cuid())
  name              String
  description       String?
  location          String
  status            QueueStatus // OPEN, CLOSED, PAUSED
  maxTicketsPerHour Int?
  averageWaitTime   Int?       // en segundos
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  tickets           Ticket[]
  schedules         Schedule[]
}

enum QueueStatus {
  OPEN
  CLOSED
  PAUSED
}
```

**Turnos:**

```prisma
model Ticket {
  id                String    @id @default(cuid())
  ticketNumber      Int
  queueId           String
  queue             Queue     @relation(fields: [queueId], references: [id])
  status            TicketStatus // WAITING, CALLED, ATTENDING, COMPLETED, CANCELLED
  createdAt         DateTime  @default(now())
  calledAt          DateTime?
  startedAt         DateTime?
  completedAt       DateTime?
  customerRating    Int?       // 1-5
  notes             String?
}

enum TicketStatus {
  WAITING
  CALLED
  ATTENDING
  COMPLETED
  CANCELLED
}
```

**Horarios y Promociones:**

```prisma
model Schedule {
  id                String    @id @default(cuid())
  queueId           String
  queue             Queue     @relation(fields: [queueId], references: [id])
  dayOfWeek         Int       // 0-6 (domingo-sábado)
  openTime          String    // HH:mm
  closeTime         String    // HH:mm
}

model Promotion {
  id                String    @id @default(cuid())
  name              String
  description       String?
  startDate         DateTime
  endDate           DateTime
  status            Status
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

model Holiday {
  id                String    @id @default(cuid())
  date              DateTime
  name              String
  createdAt         DateTime  @default(now())
}
```

- [ ] Ejecutar migraciones Prisma:
  ```bash
  npx prisma migrate dev --name initial
  ```
- [ ] Generar cliente Prisma:
  ```bash
  npx prisma generate
  ```
- [ ] Crear seeders para datos iniciales (opcional)

**Criterios de Aceptación:**

- Esquema está diseñado correctamente
- Todas las relaciones están definidas
- Migraciones se ejecutan sin errores
- Base de datos está sincronizada

**Responsable:** Desarrollador Backend  
**Estimado:** 2 días

---

### 4.2 Repositorios para Acceso a Datos

**Objetivo:** Crear capa de acceso a datos con Prisma

**Tareas:**

- [ ] Crear repositorios para cada modelo:
  - UserRepository
  - QueueRepository
  - TicketRepository
  - ScheduleRepository
  - PromotionRepository
  - HolidayRepository
- [ ] Implementar métodos CRUD base
- [ ] Implementar métodos de consulta complejos
- [ ] Crear tipos de retorno tipados

**Criterios de Aceptación:**

- Repositorios están completos
- Métodos están tipados correctamente
- Código es reutilizable

**Responsable:** Desarrollador Backend  
**Estimado:** 2 días

---

## Fase 5: APIs Backend (Semanas 5-7)

### 5.1 Módulo de Autenticación

**Objetivo:** Implementar login y gestión de tokens

**Endpoints:**

- `POST /api/v1/auth/login` - Login de empleados y admins
- `POST /api/v1/auth/refresh` - Refrescar token
- `POST /api/v1/auth/logout` - Logout
- `POST /api/v1/auth/verify` - Verificar token

**Tareas:**

- [ ] Crear AuthController
- [ ] Crear AuthService con lógica de autenticación
- [ ] Implementar validación de credenciales
- [ ] Generar y validar JWT
- [ ] Crear rutas de autenticación
- [ ] Crear tests unitarios

**Criterios de Aceptación:**

- Login funciona correctamente
- JWT se genera y valida
- Refresh token funciona
- Contraseñas se validan

**Responsable:** Desarrollador Backend  
**Estimado:** 2 días

---

### 5.2 Módulo de Gestión de Colas

**Objetivo:** Implementar operaciones CRUD de colas

**Endpoints:**

- `GET /api/v1/queues` - Listar colas
- `GET /api/v1/queues/:id` - Obtener detalles de cola
- `POST /api/v1/queues` - Crear cola (ADMIN)
- `PUT /api/v1/queues/:id` - Actualizar cola (ADMIN)
- `DELETE /api/v1/queues/:id` - Eliminar cola (ADMIN)
- `PATCH /api/v1/queues/:id/status` - Cambiar estado (ADMIN/EMPLOYEE)

**Tareas:**

- [ ] Crear QueueController
- [ ] Crear QueueService
- [ ] Crear QueueRepository con consultas complejas
- [ ] Validar datos de entrada
- [ ] Implementar control de acceso por rol
- [ ] Crear tests unitarios

**Criterios de Aceptación:**

- CRUD completo funciona
- Control de acceso por rol funciona
- Validaciones están en lugar

**Responsable:** Desarrollador Backend  
**Estimado:** 2 días

---

### 5.3 Módulo de Gestión de Turnos

**Objetivo:** Implementar sistema de turnos virtuales

**Endpoints:**

- `GET /api/v1/queues/:queueId/tickets` - Listar turnos de una cola
- `POST /api/v1/queues/:queueId/tickets` - Crear nuevo turno (sin autenticación)
- `GET /api/v1/tickets/:id` - Obtener detalles de turno
- `PATCH /api/v1/tickets/:id/status` - Cambiar estado de turno (EMPLOYEE)
- `POST /api/v1/tickets/:id/rating` - Enviar valoración (CUSTOMER)
- `PATCH /api/v1/tickets/:id/cancel` - Cancelar turno (EMPLOYEE)

**Tareas:**

- [ ] Crear TicketController
- [ ] Crear TicketService con lógica de generación de números
- [ ] Crear TicketRepository
- [ ] Validar transiciones de estado permitidas
- [ ] Registrar tiempos automáticamente
- [ ] Crear tests unitarios

**Criterios de Aceptación:**

- Creación de turnos funciona
- Cambios de estado se validan
- Tiempos se registran automáticamente
- Valoraciones se guardan

**Responsable:** Desarrollador Backend  
**Estimado:** 3 días

---

### 5.4 Módulo de Horarios y Configuración Especial

**Objetivo:** Gestionar horarios, promociones y festivos

**Endpoints:**

- `GET /api/v1/schedules` - Listar horarios
- `POST /api/v1/schedules` - Crear horario (ADMIN)
- `PUT /api/v1/schedules/:id` - Actualizar horario (ADMIN)
- `DELETE /api/v1/schedules/:id` - Eliminar horario (ADMIN)
- `GET /api/v1/promotions` - Listar promociones
- `POST /api/v1/promotions` - Crear promoción (ADMIN)
- `PUT /api/v1/promotions/:id` - Actualizar promoción (ADMIN)
- `GET /api/v1/holidays` - Listar festivos
- `POST /api/v1/holidays` - Crear festivo (ADMIN)

**Tareas:**

- [ ] Crear ScheduleController, Service, Repository
- [ ] Crear PromotionController, Service, Repository
- [ ] Crear HolidayController, Service, Repository
- [ ] Validar datos y fechas
- [ ] Crear tests unitarios

**Criterios de Aceptación:**

- CRUD completo para horarios, promociones y festivos
- Validaciones de fechas funciona
- Control de acceso por rol funciona

**Responsable:** Desarrollador Backend  
**Estimado:** 2-3 días

---

### 5.5 Módulo de Analítica

**Objetivo:** Implementar endpoints para métricas y datos analíticos

**Endpoints:**

- `GET /api/v1/analytics/overview` - Resumen general
- `GET /api/v1/analytics/queue/:queueId` - Analítica de una cola
- `GET /api/v1/analytics/tickets/by-date` - Turnos por fecha
- `GET /api/v1/analytics/tickets/by-hour` - Turnos por hora
- `GET /api/v1/analytics/wait-times` - Tiempos de espera
- `GET /api/v1/analytics/service-times` - Tiempos de servicio
- `GET /api/v1/analytics/satisfaction` - Satisfacción del cliente
- `GET /api/v1/analytics/peak-hours` - Horas punta

**Tareas:**

- [ ] Crear AnalyticsController
- [ ] Crear AnalyticsService con lógica de agregación
- [ ] Crear consultas complejas en AnalyticsRepository
- [ ] Implementar filtros por fecha, cola, etc.
- [ ] Optimizar consultas (indexación, aggregation)
- [ ] Crear tests unitarios

**Criterios de Aceptación:**

- Endpoints retornan datos correctos
- Filtros funcionan
- Datos están agregados correctamente
- Rendimiento es aceptable

**Responsable:** Desarrollador Backend  
**Estimado:** 3-4 días

---

### 5.6 Módulo de Gestión de Usuarios

**Objetivo:** Gestionar usuarios del sistema

**Endpoints:**

- `GET /api/v1/users` - Listar usuarios (ADMIN)
- `GET /api/v1/users/:id` - Obtener usuario (ADMIN o self)
- `POST /api/v1/users` - Crear usuario (ADMIN)
- `PUT /api/v1/users/:id` - Actualizar usuario (ADMIN o self)
- `DELETE /api/v1/users/:id` - Eliminar usuario (ADMIN)
- `PATCH /api/v1/users/:id/role` - Cambiar rol (ADMIN)
- `PATCH /api/v1/users/:id/status` - Cambiar estado (ADMIN)

**Tareas:**

- [ ] Crear UserController
- [ ] Crear UserService
- [ ] Crear UserRepository
- [ ] Validar datos de usuario
- [ ] Implementar control de acceso
- [ ] Hash de contraseñas en actualización
- [ ] Crear tests unitarios

**Criterios de Aceptación:**

- CRUD completo funciona
- Contraseñas se hashean
- Control de acceso funciona

**Responsable:** Desarrollador Backend  
**Estimado:** 2 días

---

## Fase 6: Interfaces Frontend (Semanas 5-7)

### 6.1 Interfaz de Cliente (QR Scanning)

**Objetivo:** Crear página para cliente acceder mediante QR

**Componentes:**

- Página de inicio con QR scanner
- Mostrar turno asignado
- Cola en tiempo real
- Formulario de valoración

**Tareas:**

- [ ] Instalar librería de QR scanning (qr-scanner o similar)
- [ ] Crear componente QRScanner
- [ ] Crear página de turno (TicketPage)
- [ ] Crear servicio para obtener estado de cola en tiempo real
- [ ] Crear componente de queue visualization
- [ ] Crear formulario de valoración
- [ ] Implementar WebSocket para actualizaciones en tiempo real

**Criterios de Aceptación:**

- QR se puede escanear correctamente
- Turno se asigna y muestra
- Cola se actualiza en tiempo real
- Valoración se envía correctamente

**Responsable:** Desarrollador Frontend  
**Estimado:** 3-4 días

---

### 6.2 Interfaz de Empleado

**Objetivo:** Crear panel de operación de colas

**Componentes:**

- Dashboard de cola activa
- Lista de turnos en espera
- Controles para llamar siguiente turno
- Cambio de estado de turno
- Historial de atendidos

**Tareas:**

- [ ] Crear layout de empleado
- [ ] Crear componente EmployeeQueueDashboard
- [ ] Crear componente TicketList
- [ ] Crear componentes de controles (Call Next, Mark as Served, etc.)
- [ ] Implementar WebSocket para actualizaciones en tiempo real
- [ ] Agregar notificaciones sonoras (opcional)
- [ ] Crear tests de componentes

**Criterios de Aceptación:**

- Dashboard muestra cola correctamente
- Controles funcionan correctamente
- Actualizaciones en tiempo real funcionan
- Interfaz es intuitiva

**Responsable:** Desarrollador Frontend  
**Estimado:** 3-4 días

---

### 6.3 Interfaz de Administrador - Configuración

**Objetivo:** Panel de configuración del sistema

**Componentes:**

- Gestión de colas (CRUD)
- Gestión de horarios
- Gestión de promociones
- Gestión de festivos
- Gestión de usuarios

**Tareas:**

- [ ] Crear layout de administrador
- [ ] Crear componentes CRUD para cada entidad:
  - QueueManager
  - ScheduleManager
  - PromotionManager
  - HolidayManager
  - UserManager
- [ ] Crear formularios con validación
- [ ] Crear tablas con paginación y filtros
- [ ] Crear modales para edición
- [ ] Implementar confirmación de eliminación
- [ ] Crear tests de componentes

**Criterios de Aceptación:**

- CRUD completo funciona
- Validaciones funcionan
- Interfaz es responsive
- Datos se guardan correctamente

**Responsable:** Desarrollador Frontend  
**Estimado:** 5-6 días

---

### 6.4 Interfaz de Administrador - Analítica

**Objetivo:** Panel de Business Intelligence

**Componentes:**

- Dashboard con KPIs principales
- Gráficos de afluencia
- Análisis de tiempos
- Comparación con promociones/festivos
- Exportación de reportes

**Tareas:**

- [ ] Instalar librería de gráficos (Chart.js, Recharts, o similar)
- [ ] Crear componente AnalyticsDashboard
- [ ] Crear componentes de gráficos:
  - ThroughputChart (turnos por hora)
  - WaitTimeChart (tiempos de espera)
  - ServiceTimeChart (tiempos de servicio)
  - SatisfactionChart (satisfacción)
- [ ] Crear componente de KPIs
- [ ] Crear filtros por fecha, cola, etc.
- [ ] Crear funcionalidad de exportación (PDF, CSV)
- [ ] Crear tests de componentes

**Criterios de Aceptación:**

- Gráficos se renderizan correctamente
- Datos se cargan desde API
- Filtros funcionan
- Exportación funciona

**Responsable:** Desarrollador Frontend  
**Estimado:** 4-5 días

---

### 6.5 Autenticación y Protección de Rutas

**Objetivo:** Implementar login y control de acceso

**Componentes:**

- Página de login
- Protección de rutas privadas
- Manejo de expiración de sesión

**Tareas:**

- [ ] Crear página de LoginPage
- [ ] Crear componente PrivateRoute
- [ ] Crear hook useAuth
- [ ] Implementar persistencia de sesión
- [ ] Implementar refresh automático de token
- [ ] Crear página de acceso denegado
- [ ] Crear tests

**Criterios de Aceptación:**

- Login funciona correctamente
- Rutas están protegidas
- Sesión se persiste
- Token se refresca automáticamente

**Responsable:** Desarrollador Frontend  
**Estimado:** 2-3 días

---

### 6.6 Notificaciones y Experiencia de Usuario

**Objetivo:** Mejorar feedback al usuario

**Tareas:**

- [ ] Crear sistema de toast notifications
- [ ] Crear estados de loading
- [ ] Crear manejo de errores visual
- [ ] Crear componente de confirmación
- [ ] Agregar animaciones suaves
- [ ] Implementar feedback visual de acciones

**Criterios de Aceptación:**

- Notificaciones funcionan
- Errores se muestran claramente
- Interfaz es responsiva

**Responsable:** Desarrollador Frontend  
**Estimado:** 2 días

---

## Fase 7: Integración y Testing (Semanas 8-9)

### 7.1 Testing de Backend

**Objetivo:** Garantizar calidad del código servidor

**Tareas:**

- [ ] Instalar Jest y librerías de testing
- [ ] Crear tests unitarios para servicios
- [ ] Crear tests de integración para endpoints
- [ ] Crear tests de autenticación
- [ ] Crear fixtures y mocks de datos
- [ ] Ejecutar coverage de código (target: >70%)
- [ ] Documentar casos de prueba

**Criterios de Aceptación:**

- Cobertura de tests >70%
- Todos los tests pasan
- Documentación de tests existe
- CI/CD corre tests automáticamente

**Responsable:** Desarrollador Backend  
**Estimado:** 3-4 días

---

### 7.2 Testing de Frontend

**Objetivo:** Garantizar calidad de la interfaz

**Tareas:**

- [ ] Instalar Vitest y React Testing Library
- [ ] Crear tests unitarios para componentes
- [ ] Crear tests de integración
- [ ] Crear tests de flujos de usuario
- [ ] Crear fixtures de datos
- [ ] Ejecutar coverage de código (target: >70%)
- [ ] Documentar casos de prueba

**Criterios de Aceptación:**

- Cobertura de tests >70%
- Todos los tests pasan
- Documentación de tests existe
- CI/CD corre tests automáticamente

**Responsable:** Desarrollador Frontend  
**Estimado:** 3-4 días

---

### 7.3 Testing de Integración End-to-End

**Objetivo:** Validar flujos completos entre frontend y backend

**Tareas:**

- [ ] Instalar Playwright o Cypress
- [ ] Crear test de flujo de cliente (escanear QR -> esperar -> valorar)
- [ ] Crear test de flujo de empleado (llamar turno -> marcar atendido)
- [ ] Crear test de flujo de administrador (crear cola -> configurar -> ver analítica)
- [ ] Crear test de flujo de autenticación
- [ ] Ejecutar tests contra ambiente de staging
- [ ] Documentar casos de prueba

**Criterios de Aceptación:**

- Flujos principales funciona correctamente
- Todos los tests pasan
- No hay inconsistencias entre frontend y backend

**Responsable:** Desarrollador Backend/Frontend  
**Estimado:** 3-4 días

---

### 7.4 Testing de Performance

**Objetivo:** Validar rendimiento y escalabilidad

**Tareas:**

- [ ] Ejecutar tests de carga en backend (stress testing)
- [ ] Optimizar queries lentas
- [ ] Implementar caching si es necesario
- [ ] Validar tiempos de respuesta (<200ms para API)
- [ ] Medir performance del frontend (Lighthouse)
- [ ] Optimizar bundle size
- [ ] Crear reporte de performance

**Criterios de Aceptación:**

- API responde en <200ms
- Frontend tiene Lighthouse score >80
- Sistema soporta al menos 100 usuarios concurrentes
- No hay memory leaks

**Responsable:** Desarrollador Backend/Frontend  
**Estimado:** 2-3 días

---

### 7.5 Testing de Seguridad

**Objetivo:** Validar medidas de seguridad

**Tareas:**

- [ ] Validar autenticación JWT
- [ ] Validar autorización por rol
- [ ] Probar inyección SQL (validar que Prisma previene)
- [ ] Probar XSS (validar que React previene)
- [ ] Validar CORS
- [ ] Revisar variables de entorno
- [ ] Crear reporte de seguridad

**Criterios de Aceptación:**

- No hay vulnerabilidades críticas
- OWASP Top 10 está considerado
- Datos sensibles están encriptados
- Secretos no están en el código

**Responsable:** Desarrollador Backend/Frontend o especialista  
**Estimado:** 2 días

---

## Fase 8: Deployment y Cierre (Semana 10)

### 8.1 Preparación para Producción

**Objetivo:** Preparar aplicación para despliegue

**Tareas:**

- [ ] Configurar variables de entorno para producción
- [ ] Optimizar build (minificación, tree-shaking)
- [ ] Crear scripts de deployment
- [ ] Configurar CI/CD (GitHub Actions)
- [ ] Crear documentación de deployment
- [ ] Configurar logging y monitoreo
- [ ] Crear plan de rollback

**Criterios de Aceptación:**

- Build de producción es optimizado
- CI/CD está funcional
- Documentación existe
- Monitoreo está configurado

**Responsable:** Equipo DevOps/Desarrollador  
**Estimado:** 2 días

---

### 8.2 Deployment a Staging

**Objetivo:** Validar en ambiente de preproducción

**Tareas:**

- [ ] Desplegar backend a servidor staging
- [ ] Desplegar frontend a hosting staging
- [ ] Validar todas las funcionalidades en staging
- [ ] Ejecutar smoke tests en staging
- [ ] Obtener aprobación de stakeholders
- [ ] Documentar proceso de deployment

**Criterios de Aceptación:**

- Aplicación funciona correctamente en staging
- Todos los tests pasan
- Stakeholders aprueban

**Responsable:** Equipo DevOps  
**Estimado:** 1-2 días

---

### 8.3 Deployment a Producción

**Objetivo:** Publicar aplicación al público

**Tareas:**

- [ ] Crear backup de base de datos
- [ ] Ejecutar migraciones en producción
- [ ] Desplegar backend a producción
- [ ] Desplegar frontend a producción
- [ ] Validar funcionalidades críticas
- [ ] Monitorear logs
- [ ] Comunicar al cliente

**Criterios de Aceptación:**

- Aplicación está en vivo y funcional
- Monitoreo está activo
- No hay errores críticos
- Cliente está informado

**Responsable:** Equipo DevOps  
**Estimado:** 1 día

---

### 8.4 Documentación Final y Entrega

**Objetivo:** Completar entregables del proyecto

**Tareas:**

- [ ] Crear manual de usuario (cliente, empleado, admin)
- [ ] Crear guía de administración del sistema
- [ ] Crear documentación de API (Swagger/OpenAPI)
- [ ] Crear documentación técnica (arquitectura, deployment)
- [ ] Crear video tutorial (opcional)
- [ ] Capacitar al cliente/equipo
- [ ] Crear plan de mantenimiento y soporte

**Criterios de Aceptación:**

- Documentación es completa y clara
- Cliente ha sido capacitado
- Plan de soporte está definido
- Proyecto se considera cerrado

**Responsable:** Toda el equipo  
**Estimado:** 2 días

---

## 🎯 Criterios de Aceptación Globales

El proyecto se considera **COMPLETADO Y ACEPTADO** cuando se cumplen los siguientes criterios:

### Funcionalidad

- ✅ Cliente puede obtener turno mediante QR sin registro
- ✅ Cliente puede ver estado de la cola en tiempo real
- ✅ Cliente puede valorar la atención recibida
- ✅ Empleado puede gestionar la cola correctamente
- ✅ Admin puede configurar colas, horarios, promociones y festivos
- ✅ Admin puede ver analítica y métricas de negocio
- ✅ Sistema registra tiempos automáticamente
- ✅ WebSocket funciona para actualizaciones en tiempo real

### Calidad

- ✅ Cobertura de tests >70% (backend y frontend)
- ✅ Todos los tests pasan
- ✅ No hay vulnerabilidades de seguridad críticas
- ✅ Performance aceptable (<200ms en API, >80 Lighthouse)
- ✅ Código sigue estándares (ESLint, Prettier)

### Seguridad

- ✅ Autenticación JWT funciona
- ✅ Autorización por roles funciona
- ✅ Contraseñas están hasheadas
- ✅ Secretos no están en el código
- ✅ CORS está configurado

### Documentación

- ✅ README con instrucciones de setup
- ✅ Documentación de API (Swagger)
- ✅ Manual de usuario
- ✅ Guía de administración
- ✅ Documentación técnica

### Deployment

- ✅ CI/CD está funcional
- ✅ Aplicación está en producción
- ✅ Monitoreo está configurado
- ✅ Plan de mantenimiento existe

---

## 📊 Resumen de Estimación

| Fase      | Descripción              | Días                      | Semana |
| --------- | ------------------------ | ------------------------- | ------ |
| 1         | Configuración Inicial    | 5                         | 1      |
| 2         | Infraestructura Backend  | 10                        | 2-3    |
| 3         | Infraestructura Frontend | 10                        | 2-3    |
| 4         | Modelos de Datos         | 4                         | 4      |
| 5         | APIs Backend             | 15                        | 5-7    |
| 6         | Interfaces Frontend      | 17                        | 5-7    |
| 7         | Integración y Testing    | 10                        | 8-9    |
| 8         | Deployment y Cierre      | 5                         | 10     |
| **TOTAL** |                          | **76 días / ~15 semanas** |        |

**Nota:** Esta estimación asume desarrollo a tiempo completo con 1 desarrollador full-stack. Puede ajustarse según:

- Disponibilidad del equipo
- Complejidad real encontrada
- Cambios de requisitos
- Disponibilidad de stakeholders para validación

---

## 🔄 Dependencias y Secuencia

```
Fase 1 (Config)
    ↓
Fase 2 (Backend Infra) + Fase 3 (Frontend Infra) ← Pueden parallelizarse
    ↓
Fase 4 (Modelos Datos)
    ↓
Fase 5 (APIs Backend) + Fase 6 (Interfaces Frontend) ← Pueden parallelizarse
    ↓
Fase 7 (Testing e Integración)
    ↓
Fase 8 (Deployment)
```

---

## 📝 Notas Importantes

1. **Paralelización:** Las fases 2 y 3 pueden ejecutarse simultáneamente, así como 5 y 6. Esto reduce el tiempo total.

2. **Buffer de Tiempo:** Se recomienda mantener un 20% de buffer para imprevistos, cambios de requisitos o problemas encontrados.

3. **Comunicación:** Reuniones semanales con stakeholders para validación de avance.

4. **Iteración:** El enfoque es iterativo. Las fases finales pueden revelar cambios necesarios.

5. **Escalabilidad:** El plan está diseñado para ser escalable. Si se agregan miembros al equipo, las tareas pueden paralelizarse más.

6. **Tecnologías:** Todas las versiones están especificadas. Mantener consistencia entre backend y frontend.

---

## 📞 Puntos de Contacto y Escalación

- **Product Owner:** Validación de requisitos
- **Equipo QA:** Validación de funcionalidad
- **DevOps:** Infraestructura y deployment
- **Cliente:** Aprobación de cambios importantes

---

**Documento creado:** 5 de febrero de 2026  
**Versión:** 1.0  
**Estado:** Aprobado para inicio de desarrollo
