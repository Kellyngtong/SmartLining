# Checklist de Implementación - SmartLining

Este documento proporciona un checklist detallado para cada fase del desarrollo.

## Fase 1: Configuración Inicial

### 1.1 Backend - Setup Inicial

- [ ] Crear estructura de directorios:
  ```
  backend/
  ├── src/
  │   ├── config/
  │   ├── controllers/
  │   ├── services/
  │   ├── repositories/
  │   ├── routes/
  │   ├── middleware/
  │   ├── models/
  │   └── index.ts
  ├── prisma/
  ├── tests/
  ├── .env
  ├── .env.example
  ├── package.json
  ├── tsconfig.json
  └── README.md
  ```
- [ ] Ejecutar `npm init -y`
- [ ] Instalar dependencias base
- [ ] Configurar `tsconfig.json`
- [ ] Configurar ESLint (`.eslintrc.json`)
- [ ] Configurar Prettier (`.prettierrc`)
- [ ] Crear `.env.example` con variables necesarias
- [ ] Crear script `src/index.ts` básico

### 1.2 Frontend - Setup Inicial

- [ ] Crear estructura de directorios:
  ```
  frontend/
  ├── src/
  │   ├── components/
  │   ├── pages/
  │   ├── hooks/
  │   ├── services/
  │   ├── types/
  │   ├── styles/
  │   ├── utils/
  │   ├── App.tsx
  │   └── main.tsx
  ├── public/
  ├── .env
  ├── .env.example
  ├── package.json
  ├── tsconfig.json
  ├── vite.config.ts
  └── README.md
  ```
- [ ] Ejecutar `npm create vite@latest . -- --template react-ts`
- [ ] Instalar dependencias adicionales
- [ ] Configurar `tsconfig.json`
- [ ] Configurar ESLint
- [ ] Configurar Prettier
- [ ] Configurar Tailwind CSS (si aplica)
- [ ] Crear `.env.example`

### 1.3 Base de Datos

- [ ] Verificar MySQL 8.0.x instalado
- [ ] Crear base de datos `smartlining`
- [ ] Crear usuario `smartlining` con permisos
- [ ] Ejecutar `npx prisma init` en backend
- [ ] Configurar `.env` con `DATABASE_URL`
- [ ] Crear estructura inicial `prisma/schema.prisma`

---

## Fase 2: Infraestructura Backend

### 2.1 Autenticación y Middlewares

- [ ] Crear `src/middleware/errorHandler.ts`
- [ ] Crear `src/middleware/cors.ts`
- [ ] Crear `src/middleware/validation.ts`
- [ ] Crear `src/middleware/auth.ts`
  - [ ] Verificar JWT
  - [ ] Verificar rol
- [ ] Crear `src/services/AuthService.ts`
  - [ ] Método de login
  - [ ] Método de generación de JWT
  - [ ] Método de refresh token
  - [ ] Método de validación de token
- [ ] Crear tipos para JWT payload
- [ ] Tests de autenticación

### 2.2 Patrón MVC y DI

- [ ] Crear clase base `BaseController`
- [ ] Crear clase base `BaseService`
- [ ] Crear interfaz `IRepository`
- [ ] Crear helpers para respuestas HTTP
- [ ] Crear tipos comunes en `src/models/`
- [ ] Documentar patrón de inyección de dependencias

### 2.3 Rutas y Versionado

- [ ] Crear `src/routes/index.ts` (enrutador principal)
- [ ] Crear estructura `/api/v1/`:
  - [ ] `src/routes/v1/auth.routes.ts`
  - [ ] `src/routes/v1/queues.routes.ts`
  - [ ] `src/routes/v1/tickets.routes.ts`
  - [ ] `src/routes/v1/analytics.routes.ts`
  - [ ] `src/routes/v1/users.routes.ts`
  - [ ] `src/routes/v1/admin.routes.ts`
- [ ] Documentación inicial de API

---

## Fase 3: Infraestructura Frontend

### 3.1 Routing y Layout

- [ ] Instalar `react-router-dom`
- [ ] Crear `src/App.tsx` con Router
- [ ] Crear rutas:
  - [ ] `/login`
  - [ ] `/queue/:queueId`
  - [ ] `/ticket/:ticketId`
  - `/employee/*`
  - [ ] `/admin/*`
- [ ] Crear componente `PrivateRoute`
- [ ] Crear layout components:
  - [ ] `Header.tsx`
  - [ ] `Sidebar.tsx`
  - [ ] `Footer.tsx`
  - [ ] `Layout.tsx`

### 3.2 Estado Global (Zustand)

- [ ] Instalar `zustand`
- [ ] Crear `src/store/authStore.ts`
  - [ ] User state
  - [ ] Token state
  - [ ] Role state
  - [ ] Login action
  - [ ] Logout action
  - [ ] Refresh token action
- [ ] Crear `src/store/notificationStore.ts`
  - [ ] Toast messages
  - [ ] Add/remove notification
- [ ] Crear `src/store/queueStore.ts`
  - [ ] Active queues
  - [ ] Current queue state
  - [ ] Tickets state
- [ ] Crear hooks personalizados (`useAuth`, `useNotification`, etc.)
- [ ] Implementar persistencia en localStorage

### 3.3 Cliente HTTP y Servicios API

- [ ] Instalar `axios`
- [ ] Crear `src/services/api/client.ts`
  - [ ] Configurar base URL
  - [ ] Interceptor de request (agregar JWT)
  - [ ] Interceptor de response (manejo de errores)
  - [ ] Retry logic
  - [ ] Timeout
- [ ] Crear servicios:
  - [ ] `src/services/api/authService.ts`
  - [ ] `src/services/api/queueService.ts`
  - [ ] `src/services/api/ticketService.ts`
  - [ ] `src/services/api/analyticsService.ts`
  - [ ] `src/services/api/userService.ts`
  - [ ] `src/services/api/adminService.ts`
- [ ] Crear tipos en `src/types/api.ts`

### 3.4 Estilos y Componentes Base

- [ ] Configurar Tailwind CSS (si aplica)
- [ ] Crear `src/styles/variables.css`
- [ ] Crear componentes base:
  - [ ] `src/components/Button.tsx`
  - [ ] `src/components/Input.tsx`
  - [ ] `src/components/Select.tsx`
  - [ ] `src/components/Modal.tsx`
  - [ ] `src/components/Card.tsx`
  - [ ] `src/components/Toast.tsx`
  - [ ] `src/components/LoadingSpinner.tsx`
  - [ ] `src/components/Alert.tsx`
- [ ] Crear sistema de tema
- [ ] Documentar componentes base

---

## Fase 4: Modelos de Datos

### 4.1 Schema Prisma

- [ ] Crear modelos:
  - [ ] `User`
  - [ ] `Queue`
  - [ ] `Ticket`
  - [ ] `Schedule`
  - [ ] `Promotion`
  - [ ] `Holiday`
- [ ] Crear enums:
  - [ ] `UserRole`
  - [ ] `Status`
  - [ ] `QueueStatus`
  - [ ] `TicketStatus`
- [ ] Configurar relaciones
- [ ] Crear índices (performance)
- [ ] Crear migraciones

### 4.2 Migraciones y Setup DB

- [ ] Ejecutar `npx prisma migrate dev --name initial`
- [ ] Verificar schema en DB
- [ ] Ejecutar `npx prisma generate`
- [ ] Crear seeders (opcional)
  - [ ] Usuario admin inicial
  - [ ] Datos de prueba

### 4.3 Repositorios

- [ ] Crear `src/repositories/UserRepository.ts`
  - [ ] CRUD completo
  - [ ] Búsquedas avanzadas
- [ ] Crear `src/repositories/QueueRepository.ts`
  - [ ] CRUD
  - [ ] Búsquedas con estadísticas
- [ ] Crear `src/repositories/TicketRepository.ts`
  - [ ] CRUD
  - [ ] Búsquedas complejas
- [ ] Crear `src/repositories/ScheduleRepository.ts`
- [ ] Crear `src/repositories/PromotionRepository.ts`
- [ ] Crear `src/repositories/HolidayRepository.ts`
- [ ] Tests unitarios para repositorios

---

## Fase 5: APIs Backend

### 5.1 Módulo de Autenticación

- [ ] `POST /api/v1/auth/login`
- [ ] `POST /api/v1/auth/refresh`
- [ ] `POST /api/v1/auth/logout`
- [ ] `POST /api/v1/auth/verify`
- [ ] Tests de endpoints
- [ ] Documentación de API

### 5.2 Módulo de Colas

- [ ] `GET /api/v1/queues`
- [ ] `GET /api/v1/queues/:id`
- [ ] `POST /api/v1/queues` (ADMIN)
- [ ] `PUT /api/v1/queues/:id` (ADMIN)
- [ ] `DELETE /api/v1/queues/:id` (ADMIN)
- [ ] `PATCH /api/v1/queues/:id/status` (ADMIN/EMPLOYEE)
- [ ] Tests de endpoints
- [ ] Documentación de API

### 5.3 Módulo de Turnos

- [ ] `GET /api/v1/queues/:queueId/tickets`
- [ ] `POST /api/v1/queues/:queueId/tickets` (público)
- [ ] `GET /api/v1/tickets/:id`
- [ ] `PATCH /api/v1/tickets/:id/status` (EMPLOYEE)
- [ ] `POST /api/v1/tickets/:id/rating` (CUSTOMER)
- [ ] `PATCH /api/v1/tickets/:id/cancel` (EMPLOYEE)
- [ ] Tests de endpoints
- [ ] Documentación de API

### 5.4 Módulo de Horarios y Configuración

- [ ] CRUD de horarios
- [ ] CRUD de promociones
- [ ] CRUD de festivos
- [ ] Tests de endpoints
- [ ] Documentación de API

### 5.5 Módulo de Analítica

- [ ] `GET /api/v1/analytics/overview`
- [ ] `GET /api/v1/analytics/queue/:queueId`
- [ ] `GET /api/v1/analytics/tickets/by-date`
- [ ] `GET /api/v1/analytics/tickets/by-hour`
- [ ] `GET /api/v1/analytics/wait-times`
- [ ] `GET /api/v1/analytics/service-times`
- [ ] `GET /api/v1/analytics/satisfaction`
- [ ] `GET /api/v1/analytics/peak-hours`
- [ ] Tests de endpoints
- [ ] Documentación de API

### 5.6 Módulo de Usuarios

- [ ] `GET /api/v1/users` (ADMIN)
- [ ] `GET /api/v1/users/:id` (ADMIN/self)
- [ ] `POST /api/v1/users` (ADMIN)
- [ ] `PUT /api/v1/users/:id` (ADMIN/self)
- [ ] `DELETE /api/v1/users/:id` (ADMIN)
- [ ] `PATCH /api/v1/users/:id/role` (ADMIN)
- [ ] `PATCH /api/v1/users/:id/status` (ADMIN)
- [ ] Tests de endpoints
- [ ] Documentación de API

---

## Fase 6: Interfaces Frontend

### 6.1 Interfaz de Cliente

- [ ] Componente de QR scanning
  - [ ] Instalar `qr-scanner`
  - [ ] Crear `QRScanner.tsx`
  - [ ] Validar formato de QR
- [ ] Página de turno
  - [ ] `pages/TicketPage.tsx`
  - [ ] Mostrar número de turno
  - [ ] Mostrar posición en cola
- [ ] Visualización de cola en tiempo real
  - [ ] `components/QueueVisualization.tsx`
  - [ ] WebSocket para actualizaciones
- [ ] Formulario de valoración
  - [ ] `components/RatingForm.tsx`
  - [ ] Validación de entrada
  - [ ] Envío de valoración
- [ ] Tests de componentes

### 6.2 Interfaz de Empleado

- [ ] Layout de empleado
  - [ ] `pages/EmployeePage.tsx`
  - [ ] Sidebar con opciones
- [ ] Dashboard de cola
  - [ ] `components/EmployeeQueueDashboard.tsx`
  - [ ] Mostrar cola activa
  - [ ] Mostrar turno actual
  - [ ] Mostrar siguiente turno
- [ ] Controles de operación
  - [ ] Llamar siguiente turno
  - [ ] Marcar como atendido
  - [ ] Marcar como cancelado
  - [ ] Pausar/reanudar cola
- [ ] Historial de turnos atendidos
  - [ ] `components/TicketHistory.tsx`
- [ ] Notificaciones sonoras (opcional)
- [ ] Tests de componentes

### 6.3 Interfaz de Admin - Configuración

- [ ] Layout de administrador
  - [ ] `pages/AdminPage.tsx`
  - [ ] Menú lateral con módulos
- [ ] Gestor de colas
  - [ ] `components/QueueManager.tsx`
  - [ ] Tabla de colas
  - [ ] Formulario de creación/edición
  - [ ] Eliminación con confirmación
- [ ] Gestor de horarios
  - [ ] `components/ScheduleManager.tsx`
  - [ ] CRUD de horarios
- [ ] Gestor de promociones
  - [ ] `components/PromotionManager.tsx`
  - [ ] CRUD de promociones
- [ ] Gestor de festivos
  - [ ] `components/HolidayManager.tsx`
  - [ ] CRUD de festivos
- [ ] Gestor de usuarios
  - [ ] `components/UserManager.tsx`
  - [ ] Tabla de usuarios
  - [ ] Formulario de creación/edición
  - [ ] Cambio de rol y estado
- [ ] Tests de componentes

### 6.4 Interfaz de Admin - Analítica

- [ ] Dashboard de analítica
  - [ ] `pages/AnalyticsDashboard.tsx`
- [ ] KPIs principales
  - [ ] `components/KPICard.tsx`
  - [ ] Total de turnos hoy
  - [ ] Tiempo promedio de espera
  - [ ] Tiempo promedio de servicio
  - [ ] Satisfacción promedio
- [ ] Gráficos
  - [ ] Instalar librería de gráficos
  - [ ] Gráfico de turnos por hora
  - [ ] Gráfico de tiempos de espera
  - [ ] Gráfico de tiempos de servicio
  - [ ] Gráfico de satisfacción
- [ ] Filtros
  - [ ] Por fecha
  - [ ] Por cola
  - [ ] Por promoción/festivo
- [ ] Exportación de reportes
  - [ ] CSV
  - [ ] PDF (opcional)
- [ ] Tests de componentes

### 6.5 Autenticación y Seguridad

- [ ] Página de login
  - [ ] `pages/LoginPage.tsx`
  - [ ] Formulario de login
  - [ ] Validación de campos
  - [ ] Manejo de errores
- [ ] Componente PrivateRoute
- [ ] Hook useAuth
- [ ] Persistencia de sesión
- [ ] Refresh automático de token
- [ ] Página de acceso denegado
- [ ] Tests

### 6.6 Notificaciones y UX

- [ ] Sistema de notificaciones
  - [ ] Toast component
  - [ ] Success, error, info, warning
- [ ] Loading states
  - [ ] Spinners
  - [ ] Skeletons
- [ ] Modales de confirmación
- [ ] Manejo visual de errores
- [ ] Animaciones suaves (opcional)

---

## Fase 7: Integración y Testing

### 7.1 Testing Backend

- [ ] Instalar Jest, `@types/jest`
- [ ] Crear `jest.config.js`
- [ ] Tests unitarios para servicios
  - [ ] AuthService
  - [ ] QueueService
  - [ ] TicketService
  - [ ] AnalyticsService
- [ ] Tests de integración para endpoints
  - [ ] Auth endpoints
  - [ ] Queue endpoints
  - [ ] Ticket endpoints
  - [ ] Admin endpoints
- [ ] Fixtures de datos
- [ ] Tests de autenticación y autorización
- [ ] Coverage report (target: >70%)

### 7.2 Testing Frontend

- [ ] Instalar Vitest, `@testing-library/react`
- [ ] Crear `vitest.config.ts`
- [ ] Tests unitarios para componentes
  - [ ] Componentes base
  - [ ] Pages principales
  - [ ] Hooks personalizados
- [ ] Tests de integración
  - [ ] Flujos de usuario
  - [ ] Interacción con API
- [ ] Fixtures de datos
- [ ] Mocking de API
- [ ] Coverage report (target: >70%)

### 7.3 Testing E2E

- [ ] Instalar Playwright o Cypress
- [ ] Test de flujo cliente
  - [ ] Escanear QR
  - [ ] Ver turno
  - [ ] Ver cola en tiempo real
  - [ ] Enviar valoración
- [ ] Test de flujo empleado
  - [ ] Ver cola
  - [ ] Llamar siguiente turno
  - [ ] Marcar como atendido
- [ ] Test de flujo admin
  - [ ] Login
  - [ ] Crear cola
  - [ ] Ver analítica
- [ ] Test de autenticación
  - [ ] Login exitoso
  - [ ] Login fallido
  - [ ] Logout
  - [ ] Token expirado

### 7.4 Testing de Performance

- [ ] Tests de carga en backend
- [ ] Optimizar queries lentas
- [ ] Medir tiempos de respuesta API
- [ ] Lighthouse score del frontend
- [ ] Bundle size analysis
- [ ] Memory leaks testing

### 7.5 Testing de Seguridad

- [ ] Validar autenticación JWT
- [ ] Validar autorización por rol
- [ ] Validar CORS
- [ ] Revisar variables de entorno
- [ ] Tests de inyección SQL
- [ ] Tests de XSS
- [ ] OWASP Top 10 checklist

---

## Fase 8: Deployment y Cierre

### 8.1 Preparación Producción

- [ ] Crear archivo `.env.production`
- [ ] Build optimizado del backend
- [ ] Build optimizado del frontend
- [ ] Crear scripts de deployment
- [ ] Documentación de deployment
- [ ] Setup de CI/CD (GitHub Actions)
- [ ] Configurar logging
- [ ] Configurar monitoreo

### 8.2 Staging Deployment

- [ ] Crear servidor staging
- [ ] Desplegar backend a staging
- [ ] Desplegar frontend a staging
- [ ] Ejecutar smoke tests
- [ ] Validar todas las funcionalidades
- [ ] Obtener aprobación de stakeholders

### 8.3 Production Deployment

- [ ] Backup de base de datos
- [ ] Ejecutar migraciones DB
- [ ] Desplegar backend a producción
- [ ] Desplegar frontend a producción
- [ ] Validar funcionalidades críticas
- [ ] Monitorear logs
- [ ] Documentar deployment

### 8.4 Documentación Final

- [ ] Manual de usuario (cliente)
- [ ] Manual de usuario (empleado)
- [ ] Manual de administración (admin)
- [ ] Documentación técnica (arquitectura)
- [ ] Documentación de API (Swagger)
- [ ] Documentación de deployment
- [ ] Guía de troubleshooting
- [ ] Plan de mantenimiento y soporte

---

## Notas Generales

- Marcar cada item ✅ conforme se completa
- Documentar blockers o problemas encontrados
- Actualizar estimaciones según avance real
- Realizar daily standups para seguimiento
- Crear issues en GitHub para cada tarea si es necesario
