# 🚀 FASE 5: REST API Implementation - Startup Guide

**Status:** Ready to Begin  
**Estimated Duration:** 15 days  
**Target Completion:** February 20, 2026

---

## 📋 What You Have (From FASE 4)

✅ **9 Domain Models** - Rich business logic classes  
✅ **9 Mappers** - API ↔ Domain transformation  
✅ **4 Repositories** - Type-safe CRUD + filtering  
✅ **DTOs** - Request/Response contracts  
✅ **Type Guards** - Runtime validation  
✅ **Repository Factory** - Dependency injection pattern

---

## 🏗️ Architecture Overview

### Request Flow

```
Client Request
    ↓
Route Handler (route file)
    ↓
Controller (business logic)
    ↓
Repository (data access)
    ↓
Database (MySQL + Prisma)
    ↓
Repository returns raw data
    ↓
Mapper converts to domain model
    ↓
Controller transforms to DTO
    ↓
Response sent to client
```

---

## 📚 File Structure to Create (FASE 5)

```
backend/src/
├── controllers/           [NEW] - Business logic per resource
│   ├── queue.controller.ts      (5 methods)
│   ├── ticket.controller.ts     (6 methods)
│   ├── user.controller.ts       (3 methods)
│   ├── schedule.controller.ts   (4 methods)
│   ├── rating.controller.ts     (2 methods)
│   ├── analytics.controller.ts  (3 methods)
│   └── event.controller.ts      (3 methods)
│
├── services/              [OPTIONAL] - Business rules
│   └── analytics.service.ts     (Dashboard metrics calculation)
│
├── routes/                [EXISTING] - Will be extended
│   ├── queue.routes.ts          [NEW]
│   ├── ticket.routes.ts         [NEW]
│   ├── user.routes.ts           [NEW]
│   ├── schedule.routes.ts       [NEW]
│   ├── rating.routes.ts         [NEW]
│   ├── analytics.routes.ts      [NEW]
│   ├── event.routes.ts          [NEW]
│   ├── auth.routes.ts           [EXISTING]
│   └── health.routes.ts         [EXISTING]
│
└── middleware/            [EXISTING] - Will add validators
    └── validators/              [NEW]
        ├── queue.validator.ts   (Input validation)
        ├── ticket.validator.ts
        └── ... (per resource)
```

---

## 🎯 Implementation Phases

### Phase 5.1: Base Setup (1 day)

- [ ] Create controller base class (optional but recommended)
- [ ] Create response helper functions
- [ ] Create error types/codes
- [ ] Organize router mounting

### Phase 5.2: Auth Endpoints (1 day)

```typescript
// Already exist from FASE 2, just need:
// - POST /api/auth/login ✅ (exists)
// - GET /api/auth/me ✅ (exists)
// - POST /api/auth/logout (new - optional)
```

### Phase 5.3: Queue Management (2 days)

```typescript
POST   /api/colas
GET    /api/colas
GET    /api/colas/:id
PUT    /api/colas/:id
DELETE /api/colas/:id
```

### Phase 5.4: Ticket Management (3 days)

```typescript
POST   /api/turnos
GET    /api/turnos
GET    /api/turnos/:id
PUT    /api/turnos/:id
GET    /api/colas/:id/turnos
DELETE /api/turnos/:id
```

### Phase 5.5: Other Resources (8 days)

- Schedule endpoints (4 endpoints)
- Rating endpoints (2 endpoints)
- User endpoints (3 endpoints)
- Analytics endpoints (3 endpoints)
- Event endpoints (3 endpoints)

---

## 💡 Implementation Pattern

### Step 1: Create Controller

```typescript
// backend/src/controllers/queue.controller.ts
import { Request, Response } from "express";
import { RepositoryFactory } from "../repositories";
import { ColaMapper } from "../models/mappers"; // When using models in backend
import { formatPaginatedResponse } from "../repositories";

export class QueueController {
  constructor(private factory: RepositoryFactory) {}

  async listQueues(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const colaRepo = this.factory.getColaRepository();

      const [colas, total] = await Promise.all([
        colaRepo.findAll({ skip, take: limit }),
        colaRepo.count(),
      ]);

      res.json({
        success: true,
        data: colas, // Already JSON-serializable from Prisma
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      // Handle error
      res.status(500).json({
        success: false,
        error: "Failed to fetch queues",
      });
    }
  }

  async getQueue(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const colaRepo = this.factory.getColaRepository();

      const cola = await colaRepo.findByIdWithDetails(id);

      if (!cola) {
        return res.status(404).json({
          success: false,
          error: "Queue not found",
        });
      }

      res.json({
        success: true,
        data: cola,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to fetch queue",
      });
    }
  }

  // ... other methods
}
```

### Step 2: Create Route Handler

```typescript
// backend/src/routes/queue.routes.ts
import { Router } from "express";
import { QueueController } from "../controllers/queue.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { prisma } from "../config/prisma";
import { RepositoryFactory } from "../repositories";

const router = Router();
const factory = new RepositoryFactory(prisma);
const controller = new QueueController(factory);

// Bind methods to controller instance
router.get("/", (req, res) => controller.listQueues(req, res));
router.get("/:id", (req, res) => controller.getQueue(req, res));
router.post("/", authMiddleware, (req, res) =>
  controller.createQueue(req, res),
);
router.put("/:id", authMiddleware, (req, res) =>
  controller.updateQueue(req, res),
);
router.delete("/:id", authMiddleware, (req, res) =>
  controller.deleteQueue(req, res),
);

export default router;
```

### Step 3: Mount Route in Main App

```typescript
// backend/src/index.ts
import queueRoutes from "./routes/queue.routes";

app.use("/api/colas", queueRoutes);
app.use("/api/turnos", ticketRoutes);
// ... etc
```

---

## 🛠️ Tips & Best Practices

### 1. Error Handling

```typescript
// Create centralized error handler
class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
  ) {
    super(message);
  }
}

// In controller:
if (!cola) {
  throw new AppError(404, "Queue not found");
}
```

### 2. Input Validation

```typescript
// Quick validation before repository call
if (!nombre || nombre.trim().length === 0) {
  return res.status(400).json({
    success: false,
    error: "Queue name is required",
  });
}
```

### 3. Repository Usage Pattern

```typescript
// Good: Use repository methods
const colas = await colaRepo.findActive({ skip, take });

// Avoid: Raw Prisma in controller
// const colas = await prisma.cola.findMany(...);
```

### 4. Response Format

```typescript
// Consistent response format
{
  success: boolean,
  data?: any,
  error?: string,
  statusCode?: number,
  total?: number,        // For list responses
  page?: number,         // For paginated responses
  limit?: number,
  totalPages?: number,
}
```

---

## 📝 Checklist by Endpoint Group

### Auth Endpoints (Already exist, verify)

- [ ] POST /api/auth/login - Works? ✅
- [ ] GET /api/auth/me - Works? ✅
- [ ] POST /api/auth/logout - Create (optional)

### Queue Endpoints

- [ ] Create QueueController (5 methods)
- [ ] Create queue.routes.ts
- [ ] GET /api/colas - List all
- [ ] GET /api/colas/:id - Get one with details
- [ ] POST /api/colas - Create (admin only)
- [ ] PUT /api/colas/:id - Update (admin only)
- [ ] DELETE /api/colas/:id - Delete (admin only)

### Ticket Endpoints

- [ ] Create TicketController (6 methods)
- [ ] Create ticket.routes.ts
- [ ] GET /api/turnos - List all
- [ ] GET /api/turnos/:id - Get one with details
- [ ] POST /api/turnos - Create
- [ ] PUT /api/turnos/:id - Update state
- [ ] GET /api/colas/:id/turnos - Filtered by queue
- [ ] DELETE /api/turnos/:id - Delete

### User Endpoints

- [ ] Create UserController (3 methods)
- [ ] Create user.routes.ts
- [ ] GET /api/usuarios - List (admin only)
- [ ] GET /api/usuarios/:id - Get (admin only)
- [ ] PUT /api/usuarios/:id - Update (admin only)

### Schedule Endpoints

- [ ] Create ScheduleController (4 methods)
- [ ] Create schedule.routes.ts
- [ ] GET /api/colas/:id/horarios
- [ ] POST /api/colas/:id/horarios
- [ ] PUT /api/horarios/:id
- [ ] DELETE /api/horarios/:id

### Rating Endpoints

- [ ] Create RatingController (2 methods)
- [ ] Create rating.routes.ts
- [ ] POST /api/turnos/:id/valoracion
- [ ] GET /api/turnos/:id/valoracion

### Analytics Endpoints

- [ ] Create AnalyticsController (3 methods)
- [ ] Create analytics.routes.ts
- [ ] GET /api/analytics/dashboard
- [ ] GET /api/analytics/colas/:id
- [ ] GET /api/analytics/trending

### Event Endpoints

- [ ] Create EventController (3 methods)
- [ ] Create event.routes.ts
- [ ] POST /api/eventos
- [ ] GET /api/eventos
- [ ] POST /api/colas/:id/eventos/:eid

---

## 🔐 Security Reminders

✅ **Auth Middleware:**

```typescript
// Public: POST /api/auth/login, GET /api/health
// Protected: All other endpoints need authMiddleware
// Admin-only: POST/PUT/DELETE on /api/colas, /api/usuarios, etc.
```

✅ **Role Checking:**

```typescript
// In controller or middleware:
if (req.user.rol !== "ADMINISTRADOR") {
  return res.status(403).json({
    success: false,
    error: "Admin access required",
  });
}
```

✅ **Input Sanitization:**

- Validate lengths
- Check enum values
- Sanitize strings (trim, no special chars if needed)
- Validate IDs are numbers

---

## 📊 Testing Strategy (Optional - User Preference)

Since user chose no tests, here's manual testing:

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Test endpoints
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@smartlining.com","password":"admin123"}'

# Use response token for authenticated endpoints
curl -X GET http://localhost:3000/api/colas \
  -H "Authorization: Bearer <token>"
```

---

## 🎨 Frontend Integration (Preview)

FASE 6 will use these endpoints:

```typescript
// In frontend API client (already has most methods)
apiClient.login(email, password);
apiClient.getMe();
apiClient.getQueues();
apiClient.getQueueById(id);
apiClient.createTicket(colaId);
apiClient.getTickets();
// ... etc (add new methods as endpoints complete)
```

---

## 📚 Reference Documentation

### Prisma Query Examples

```typescript
// For repository implementation reference:
const cola = await prisma.cola.findUnique({
  where: { id_cola: 1 },
  include: { horarios: true, eventos: true },
});

const turnos = await prisma.turno.findMany({
  where: { id_cola: 1, estado: "EN_ESPERA" },
  orderBy: { numero_turno: "asc" },
  skip: 0,
  take: 10,
});
```

### Express Best Practices

```typescript
// Always use try-catch
// Always set status code
// Always return JSON with consistent structure
// Validate req.params.id with parseInt
// Use req.query for filters/pagination
// Use req.body for POST/PUT payloads
```

---

## 🚀 Ready to Start?

1. Create `/backend/src/controllers/queue.controller.ts` (start simple)
2. Create `/backend/src/routes/queue.routes.ts`
3. Mount in `/backend/src/index.ts`
4. Test with curl or Postman
5. Repeat for remaining resources

**Estimated time per resource:** 1-2 hours  
**Total for all 30+ endpoints:** 15 days

---

## 📞 Quick Reference

**Repositories Available:**

- `factory.getUsuarioRepository()` - CRUD user
- `factory.getColaRepository()` - CRUD queue
- `factory.getTurnoRepository()` - CRUD ticket

**Repository Methods:**

- `.findById(id)` - Get one
- `.findAll({ skip, take })` - Get many (paginated)
- `.create(data)` - Insert
- `.update(id, data)` - Modify
- `.delete(id)` - Remove
- `.count()` - Total count
- `.findX()` - Specialized queries

---

**Next Steps:** Begin with QueueController (simplest CRUD)  
**Timeline:** 15 days to complete all endpoints  
**Status:** ✅ Ready to Begin

_Created: Feb 5, 2026_
