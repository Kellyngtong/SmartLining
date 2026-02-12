# 📋 TODO List - SmartLining Project

## FASE 4: Models & Data Types ✅ COMPLETE

- [x] Create 9 domain model classes (Usuario, Cola, Turno, etc.)
- [x] Create 9 mapper classes for API transformation
- [x] Create DTOs for all endpoints (request/response)
- [x] Create type guards for runtime validation
- [x] Create base repository class (abstract)
- [x] Create UsuarioRepository (CRUD + filtering)
- [x] Create ColaRepository (CRUD + relationships)
- [x] Create TurnoRepository (CRUD + state filtering)
- [x] Create RepositoryFactory for dependency injection
- [x] Update Zustand stores to use mappers
- [x] Validate TypeScript compilation (0 errors)
- [x] Create FASE4_RESUMEN.md documentation

---

## FASE 5: REST API Implementation ⏳ NEXT

### 5.1: Auth Endpoints (3 endpoints)

- [ ] POST /api/auth/login - User authentication
  - Input: { email, password }
  - Output: { usuario, token, expiresIn }
  - Uses AuthService.login()
- [ ] GET /api/auth/me - Get current user
  - Middleware: authMiddleware required
  - Output: { id_usuario, nombre, email, rol, activo }
  - Uses UsuarioRepository.findById()
- [ ] POST /api/auth/logout - Logout (optional, frontend-only)
  - Just returns success (JWT not revoked server-side)

### 5.2: Queue Management Endpoints (5 endpoints)

- [ ] GET /api/colas - List all queues
  - Query params: page=1, limit=10
  - Uses ColaRepository.findAll() + pagination
  - Returns: PaginatedResponse<Cola>
- [ ] GET /api/colas/:id - Get queue details with schedules/events
  - Uses ColaRepository.findByIdWithDetails()
  - Returns: { id_cola, nombre, descripcion, horarios[], eventos[] }
- [ ] POST /api/colas - Create new queue (admin only)
  - Middleware: authMiddleware + role check
  - Input: { nombre, descripcion?, activa? }
  - Uses ColaRepository.create()
- [ ] PUT /api/colas/:id - Update queue (admin only)
  - Middleware: authMiddleware + role check
  - Input: { nombre?, descripcion?, activa? }
  - Uses ColaRepository.update()
- [ ] DELETE /api/colas/:id - Delete queue (admin only)
  - Middleware: authMiddleware + role check
  - Uses ColaRepository.delete()

### 5.3: Ticket Management Endpoints (6 endpoints)

- [ ] GET /api/turnos - List all tickets
  - Query params: page=1, limit=10, estado?, colaId?
  - Uses TurnoRepository.findAll() or filtered
  - Returns: PaginatedResponse<Turno>
- [ ] GET /api/turnos/:id - Get ticket details with atencion/valoracion
  - Uses TurnoRepository.findByIdWithDetails()
  - Returns: { id_turno, numero_turno, estado, atencion?, valoracion? }
- [ ] POST /api/turnos - Create new ticket
  - Input: { id_cola, id_cliente? }
  - Auto-increment numero_turno
  - Uses TurnoRepository.create()
- [ ] PUT /api/turnos/:id - Update ticket state
  - Input: { estado?, fecha_hora_llamada?, fecha_hora_inicio_atencion?, fecha_hora_fin_atencion? }
  - Uses TurnoRepository.update()
- [ ] GET /api/colas/:id/turnos - Get tickets for specific queue
  - Query params: estado?, page=1, limit=20
  - Uses TurnoRepository.findByColaId()
- [ ] DELETE /api/turnos/:id - Delete ticket (admin only)
  - Uses TurnoRepository.delete()

### 5.4: User Management Endpoints (3 endpoints)

- [ ] GET /api/usuarios - List all users (admin only)
  - Query params: page=1, limit=10, rol?, activo?
  - Uses UsuarioRepository.findAll()
- [ ] GET /api/usuarios/:id - Get user details (admin only)
  - Uses UsuarioRepository.findById()
- [ ] PUT /api/usuarios/:id - Update user (admin only)
  - Input: { nombre?, email?, rol?, activo? }
  - Uses UsuarioRepository.update()

### 5.5: Schedule Endpoints (4 endpoints)

- [ ] GET /api/colas/:id/horarios - Get queue schedules
  - Returns: HorarioCola[]
- [ ] POST /api/colas/:id/horarios - Create schedule
  - Input: { dia_semana, hora_inicio, hora_fin }
- [ ] PUT /api/horarios/:id - Update schedule
  - Input: { dia_semana?, hora_inicio?, hora_fin? }
- [ ] DELETE /api/horarios/:id - Delete schedule

### 5.6: Rating Endpoints (2 endpoints)

- [ ] POST /api/turnos/:id/valoracion - Create rating
  - Input: { puntuacion, comentario? }
- [ ] GET /api/turnos/:id/valoracion - Get rating
  - Returns: { puntuacion, comentario, fecha_valoracion }

### 5.7: Analytics Endpoints (3 endpoints)

- [ ] GET /api/analytics/dashboard - Dashboard metrics
  - Returns: { totalTurnos, turnosAtendidos, tiempoPromedio, satisfaccion }
- [ ] GET /api/analytics/colas/:id - Queue-specific analytics
  - Returns: { turnos, atendidos, cancelados, tiempoPromedio }
- [ ] GET /api/analytics/trending - Trending data (7 days)
  - Returns: { date, turnos, atendidos }[]

### 5.8: Event/Promotion Endpoints (3 endpoints)

- [ ] POST /api/eventos - Create event
  - Input: { tipo, nombre, descripcion?, fecha_inicio, fecha_fin }
- [ ] GET /api/eventos - List events
  - Returns: Evento[]
- [ ] POST /api/colas/:id/eventos/:eid - Assign event to queue
  - Input: { id_evento }

### 5.9: Create Controllers & Services

- [ ] QueueController (5 methods)
- [ ] TicketController (6 methods)
- [ ] UserController (3 methods)
- [ ] ScheduleController (4 methods)
- [ ] RatingController (2 methods)
- [ ] AnalyticsController (3 methods)
- [ ] EventController (3 methods)
- [ ] Create Route files (queue.routes, ticket.routes, etc.)

### 5.10: Error Handling & Validation

- [ ] Create validation middleware for DTOs
- [ ] Global error handler for all endpoints
- [ ] 404 handler for undefined routes
- [ ] Input sanitization

### 5.11: Documentation

- [ ] Update API_SPECIFICATION.md with actual code
- [ ] Create FASE5_RESUMEN.md
- [ ] Update README.md with API examples

---

## FASE 6: Frontend Pages ⏳ FUTURE

### 6.1: Queue Management Pages

- [ ] QueuesPage - List/manage queues
- [ ] QueueDetailPage - View queue schedules/events
- [ ] QueueFormPage - Create/edit queue
- [ ] ScheduleFormPage - Manage queue schedules

### 6.2: Ticket Management Pages

- [ ] TicketsPage - List tickets with filters
- [ ] TicketDetailPage - View ticket status + atencion/rating
- [ ] TicketCreatePage - Create new ticket
- [ ] TicketViewerPage - Large display for current ticket

### 6.3: Admin Pages

- [ ] AdminPage - Admin dashboard
- [ ] UsersPage - Manage system users
- [ ] EventsPage - Create/manage promotions/events
- [ ] AnalyticsPage - Dashboard metrics + charts
- [ ] SettingsPage - System settings

### 6.4: Components

- [ ] QueueCard - Display queue info
- [ ] TicketCard - Display ticket status
- [ ] ScheduleGrid - Show queue hours
- [ ] EventBadge - Show active events
- [ ] RatingStars - Display ratings
- [ ] AnalyticsChart - Chart component
- [ ] DataTable - Reusable table component
- [ ] FormInput - Reusable form components

### 6.5: Styling & UX

- [ ] Responsive design (mobile/tablet/desktop)
- [ ] Dark mode support
- [ ] Loading states + animations
- [ ] Error notifications + alerts
- [ ] Empty state messages

---

## FASE 7: WebSocket Real-time ⏳ FUTURE

### 7.1: Backend WebSocket Setup

- [ ] Install socket.io (backend)
- [ ] Create WebSocket gateway
- [ ] Setup room management (per queue)
- [ ] Create event emitters

### 7.2: Real-time Events

- [ ] Emit: ticket:created - New ticket created
- [ ] Emit: ticket:called - Ticket called to counter
- [ ] Emit: ticket:serving - Ticket being served
- [ ] Emit: ticket:finished - Ticket completed
- [ ] Emit: queue:status_changed - Queue status changed
- [ ] Emit: queue:update - Queue info updated

### 7.3: Frontend WebSocket Client

- [ ] Install socket.io-client
- [ ] Create WebSocket service
- [ ] Connect to server on app load
- [ ] Subscribe to queue room

### 7.4: Real-time Updates UI

- [ ] Queue status updates (live)
- [ ] Ticket notifications (visual + sound)
- [ ] Active ticket display (big screen)
- [ ] User count display (per queue)
- [ ] Live metrics dashboard

---

## 🔧 Dev Operations

### Testing Setup

- [ ] Jest configuration (backend)
- [ ] Vitest configuration (frontend)
- [ ] Unit tests (repositories)
- [ ] Integration tests (endpoints)

### CI/CD Pipeline

- [ ] GitHub Actions workflow
- [ ] Auto-build on push
- [ ] Auto-test on PR
- [ ] Auto-deploy on main branch

### Performance Optimization

- [ ] Implement caching (Redis?)
- [ ] Optimize database queries
- [ ] Implement query pagination
- [ ] Add monitoring/logging

---

## 📦 Production Checklist

- [ ] Environment variables secured
- [ ] Database backups configured
- [ ] Error logging setup
- [ ] Performance monitoring
- [ ] Security headers
- [ ] HTTPS enforced
- [ ] CORS properly configured
- [ ] Rate limiting tuned
- [ ] Database migrations tested

---

## 📅 Timeline

| FASE  | Status | Start   | Duration    | End        |
| ----- | ------ | ------- | ----------- | ---------- |
| 1     | ✅     | Week 1  | 2 days      | Feb 2      |
| 2     | ✅     | Week 1  | 2 days      | Feb 3      |
| 3     | ✅     | Week 2  | 3 days      | Feb 4      |
| 4     | ✅     | Week 3  | 2 days      | Feb 5      |
| **5** | 🔄     | Week 4  | **15 days** | **Feb 20** |
| 6     | ⏳     | Week 7  | 15 days     | Mar 6      |
| 7     | ⏳     | Week 10 | 29 days     | Apr 10     |
| 8     | ✅     | Week 3  | 1 day       | Feb 4      |

---

**Updated:** 2026-02-05  
**Next Review:** After FASE 5 completion
