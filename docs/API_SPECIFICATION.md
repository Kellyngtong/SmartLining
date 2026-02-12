# Especificación de API REST - SmartLining

**Versión API:** v1  
**Base URL:** `http://localhost:3000/api/v1` (desarrollo)  
**Autenticación:** JWT Bearer Token  
**Formato de Respuesta:** JSON

---

## Tabla de Contenidos

1. [Autenticación](#autenticación)
2. [Manejo de Errores](#manejo-de-errores)
3. [Módulo de Autenticación](#módulo-de-autenticación)
4. [Módulo de Colas](#módulo-de-colas)
5. [Módulo de Turnos](#módulo-de-turnos)
6. [Módulo de Horarios](#módulo-de-horarios)
7. [Módulo de Promociones](#módulo-de-promociones)
8. [Módulo de Festivos](#módulo-de-festivos)
9. [Módulo de Usuarios](#módulo-de-usuarios)
10. [Módulo de Analítica](#módulo-de-analítica)
11. [WebSocket Events](#websocket-events)

---

## Autenticación

### Esquema Bearer Token (JWT)

Todos los endpoints protegidos requieren un header de autorización:

```http
Authorization: Bearer <token_jwt>
```

### Estructura del JWT Payload

```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "role": "ADMIN|EMPLOYEE|CUSTOMER",
  "iat": 1234567890,
  "exp": 1234571490
}
```

### Roles y Permisos

| Rol          | Descripción               | Permisos                                                       |
| ------------ | ------------------------- | -------------------------------------------------------------- |
| **ADMIN**    | Administrador del sistema | Configuración, analítica, gestión de usuarios, todas las colas |
| **EMPLOYEE** | Operador de cola          | Gestión de turnos activos, ver cola                            |
| **CUSTOMER** | Cliente                   | Obtener turno, ver estado de cola, valorar                     |

---

## Manejo de Errores

### Estructura de Respuesta de Error

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Las credenciales proporcionadas son inválidas",
    "statusCode": 401
  }
}
```

### Códigos de Error Comunes

| Código                | Status | Descripción                     |
| --------------------- | ------ | ------------------------------- |
| `INVALID_CREDENTIALS` | 401    | Credenciales inválidas          |
| `UNAUTHORIZED`        | 401    | Usuario no autenticado          |
| `FORBIDDEN`           | 403    | Usuario sin permisos            |
| `NOT_FOUND`           | 404    | Recurso no encontrado           |
| `VALIDATION_ERROR`    | 400    | Error de validación             |
| `CONFLICT`            | 409    | Conflicto (ej: email duplicado) |
| `INTERNAL_ERROR`      | 500    | Error interno del servidor      |

---

## Módulo de Autenticación

### POST /auth/login

Autentica un usuario empleado o administrador.

**Autenticación:** No requerida

**Request Body:**

```json
{
  "email": "empleado@example.com",
  "password": "password123"
}
```

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_uuid",
      "email": "empleado@example.com",
      "firstName": "Juan",
      "lastName": "Pérez",
      "role": "EMPLOYEE"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh_token_uuid",
    "expiresIn": 3600
  }
}
```

**Response 401 Unauthorized:**

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Email o contraseña inválidos"
  }
}
```

---

### POST /auth/refresh

Refresca el JWT usando un refresh token.

**Autenticación:** No requerida (pero usa refresh token en body)

**Request Body:**

```json
{
  "refreshToken": "refresh_token_uuid"
}
```

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "token": "nuevo_jwt_token",
    "expiresIn": 3600
  }
}
```

---

### POST /auth/logout

Invalida los tokens del usuario.

**Autenticación:** ✅ Requerida

**Request Body:**

```json
{
  "refreshToken": "refresh_token_uuid"
}
```

**Response 200 OK:**

```json
{
  "success": true,
  "message": "Sesión cerrada correctamente"
}
```

---

### POST /auth/verify

Verifica si un token es válido.

**Autenticación:** ✅ Requerida (Bearer Token)

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "valid": true,
    "user": {
      "id": "user_uuid",
      "email": "empleado@example.com",
      "role": "EMPLOYEE"
    }
  }
}
```

---

## Módulo de Colas

### GET /queues

Lista todas las colas (o filtradas según rol).

**Autenticación:** ✅ Requerida

**Query Parameters:**

- `status` (opcional): `OPEN|CLOSED|PAUSED`
- `page` (opcional): número de página (default: 1)
- `limit` (opcional): items por página (default: 20)

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "queues": [
      {
        "id": "queue_uuid",
        "name": "Atención al Cliente",
        "description": "Cola principal de caja",
        "location": "Planta Baja",
        "status": "OPEN",
        "maxTicketsPerHour": 120,
        "averageWaitTime": 45,
        "createdAt": "2024-02-05T10:30:00Z",
        "updatedAt": "2024-02-05T14:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5
    }
  }
}
```

---

### GET /queues/:id

Obtiene detalles de una cola específica.

**Autenticación:** ✅ Requerida

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "id": "queue_uuid",
    "name": "Atención al Cliente",
    "description": "Cola principal de caja",
    "location": "Planta Baja",
    "status": "OPEN",
    "maxTicketsPerHour": 120,
    "averageWaitTime": 45,
    "currentTickets": 8,
    "waitingTickets": 5,
    "createdAt": "2024-02-05T10:30:00Z",
    "updatedAt": "2024-02-05T14:30:00Z"
  }
}
```

---

### POST /queues

Crea una nueva cola.

**Autenticación:** ✅ Requerida  
**Rol Requerido:** ADMIN

**Request Body:**

```json
{
  "name": "Atención al Cliente",
  "description": "Cola principal de caja",
  "location": "Planta Baja",
  "maxTicketsPerHour": 120
}
```

**Response 201 Created:**

```json
{
  "success": true,
  "data": {
    "id": "queue_uuid",
    "name": "Atención al Cliente",
    "description": "Cola principal de caja",
    "location": "Planta Baja",
    "status": "OPEN",
    "maxTicketsPerHour": 120,
    "createdAt": "2024-02-05T10:30:00Z"
  }
}
```

---

### PUT /queues/:id

Actualiza una cola existente.

**Autenticación:** ✅ Requerida  
**Rol Requerido:** ADMIN

**Request Body:**

```json
{
  "name": "Atención al Cliente - Actualizado",
  "location": "Planta Baja",
  "maxTicketsPerHour": 150
}
```

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "id": "queue_uuid",
    "name": "Atención al Cliente - Actualizado",
    "location": "Planta Baja",
    "maxTicketsPerHour": 150,
    "updatedAt": "2024-02-05T15:00:00Z"
  }
}
```

---

### DELETE /queues/:id

Elimina una cola.

**Autenticación:** ✅ Requerida  
**Rol Requerido:** ADMIN

**Response 200 OK:**

```json
{
  "success": true,
  "message": "Cola eliminada correctamente"
}
```

---

### PATCH /queues/:id/status

Cambia el estado de una cola (OPEN, CLOSED, PAUSED).

**Autenticación:** ✅ Requerida  
**Rol Requerido:** ADMIN, EMPLOYEE

**Request Body:**

```json
{
  "status": "PAUSED"
}
```

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "id": "queue_uuid",
    "status": "PAUSED",
    "updatedAt": "2024-02-05T15:30:00Z"
  }
}
```

---

## Módulo de Turnos

### GET /queues/:queueId/tickets

Lista los turnos de una cola.

**Autenticación:** ✅ Requerida

**Query Parameters:**

- `status` (opcional): `WAITING|CALLED|ATTENDING|COMPLETED|CANCELLED`
- `page` (opcional): número de página

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "tickets": [
      {
        "id": "ticket_uuid",
        "ticketNumber": 45,
        "queueId": "queue_uuid",
        "status": "WAITING",
        "createdAt": "2024-02-05T10:30:00Z",
        "calledAt": null,
        "startedAt": null,
        "completedAt": null,
        "customerRating": null
      }
    ],
    "pagination": {
      "total": 12,
      "waiting": 8,
      "called": 1,
      "attending": 1
    }
  }
}
```

---

### POST /queues/:queueId/tickets

Crea un nuevo turno para un cliente.

**Autenticación:** ❌ No requerida (acceso público)

**Request Body:**

```json
{}
```

**Response 201 Created:**

```json
{
  "success": true,
  "data": {
    "id": "ticket_uuid",
    "ticketNumber": 46,
    "queueId": "queue_uuid",
    "status": "WAITING",
    "position": 9,
    "estimatedWaitTime": 45,
    "createdAt": "2024-02-05T10:35:00Z"
  }
}
```

---

### GET /tickets/:id

Obtiene detalles de un turno específico.

**Autenticación:** ❌ No requerida (pero puede usarse para acceso verificado)

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "id": "ticket_uuid",
    "ticketNumber": 46,
    "queueId": "queue_uuid",
    "queueName": "Atención al Cliente",
    "status": "WAITING",
    "position": 3,
    "estimatedWaitTime": 20,
    "createdAt": "2024-02-05T10:35:00Z",
    "calledAt": null,
    "startedAt": null,
    "completedAt": null,
    "customerRating": null
  }
}
```

---

### PATCH /tickets/:id/status

Cambia el estado de un turno.

**Autenticación:** ✅ Requerida  
**Rol Requerido:** EMPLOYEE, ADMIN

**Request Body:**

```json
{
  "status": "CALLED"
}
```

**Estados permitidos:**

- `WAITING` → `CALLED` (llamar turno)
- `CALLED` → `ATTENDING` (iniciar atención)
- `ATTENDING` → `COMPLETED` (finalizar)
- `WAITING|CALLED|ATTENDING` → `CANCELLED` (cancelar)

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "id": "ticket_uuid",
    "status": "CALLED",
    "calledAt": "2024-02-05T10:50:00Z",
    "updatedAt": "2024-02-05T10:50:00Z"
  }
}
```

---

### POST /tickets/:id/rating

Envía una valoración para un turno completado.

**Autenticación:** ❌ No requerida

**Request Body:**

```json
{
  "rating": 5,
  "comment": "Excelente servicio"
}
```

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "id": "ticket_uuid",
    "customerRating": 5,
    "updatedAt": "2024-02-05T11:00:00Z"
  }
}
```

---

### PATCH /tickets/:id/cancel

Cancela un turno.

**Autenticación:** ✅ Requerida  
**Rol Requerido:** EMPLOYEE, ADMIN

**Request Body:**

```json
{
  "reason": "Cliente no se presentó"
}
```

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "id": "ticket_uuid",
    "status": "CANCELLED",
    "notes": "Cliente no se presentó",
    "updatedAt": "2024-02-05T11:05:00Z"
  }
}
```

---

## Módulo de Horarios

### GET /schedules

Lista los horarios de funcionamiento.

**Autenticación:** ✅ Requerida (ADMIN)

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "schedules": [
      {
        "id": "schedule_uuid",
        "queueId": "queue_uuid",
        "dayOfWeek": 1,
        "dayName": "Lunes",
        "openTime": "09:00",
        "closeTime": "20:00"
      }
    ]
  }
}
```

---

### POST /schedules

Crea un nuevo horario.

**Autenticación:** ✅ Requerida  
**Rol Requerido:** ADMIN

**Request Body:**

```json
{
  "queueId": "queue_uuid",
  "dayOfWeek": 1,
  "openTime": "09:00",
  "closeTime": "20:00"
}
```

**Response 201 Created:** Similar a GET /schedules

---

### PUT /schedules/:id

Actualiza un horario.

**Autenticación:** ✅ Requerida  
**Rol Requerido:** ADMIN

**Request Body:**

```json
{
  "openTime": "08:30",
  "closeTime": "20:30"
}
```

**Response 200 OK:** Similar a GET /schedules

---

### DELETE /schedules/:id

Elimina un horario.

**Autenticación:** ✅ Requerida  
**Rol Requerido:** ADMIN

**Response 200 OK:**

```json
{
  "success": true,
  "message": "Horario eliminado"
}
```

---

## Módulo de Promociones

### GET /promotions

Lista las promociones.

**Autenticación:** ✅ Requerida (ADMIN)

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "promotions": [
      {
        "id": "promotion_uuid",
        "name": "Día de descuento",
        "description": "Promoción especial de viernes",
        "startDate": "2024-02-09T00:00:00Z",
        "endDate": "2024-02-09T23:59:59Z",
        "status": "ACTIVE"
      }
    ]
  }
}
```

---

### POST /promotions

Crea una nueva promoción.

**Autenticación:** ✅ Requerida  
**Rol Requerido:** ADMIN

**Request Body:**

```json
{
  "name": "Black Friday",
  "description": "Gran venta anual",
  "startDate": "2024-11-24T00:00:00Z",
  "endDate": "2024-11-25T23:59:59Z"
}
```

**Response 201 Created:** Similar a GET /promotions

---

### PUT /promotions/:id

Actualiza una promoción.

**Autenticación:** ✅ Requerida  
**Rol Requerido:** ADMIN

**Response 200 OK:** Similar a GET /promotions

---

### DELETE /promotions/:id

Elimina una promoción.

**Autenticación:** ✅ Requerida  
**Rol Requerido:** ADMIN

**Response 200 OK:**

```json
{
  "success": true,
  "message": "Promoción eliminada"
}
```

---

## Módulo de Festivos

### GET /holidays

Lista los festivos.

**Autenticación:** ✅ Requerida (ADMIN)

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "holidays": [
      {
        "id": "holiday_uuid",
        "date": "2024-12-25",
        "name": "Navidad"
      }
    ]
  }
}
```

---

### POST /holidays

Crea un nuevo festivo.

**Autenticación:** ✅ Requerida  
**Rol Requerido:** ADMIN

**Request Body:**

```json
{
  "date": "2024-12-25",
  "name": "Navidad"
}
```

**Response 201 Created:** Similar a GET /holidays

---

### DELETE /holidays/:id

Elimina un festivo.

**Autenticación:** ✅ Requerida  
**Rol Requerido:** ADMIN

**Response 200 OK:**

```json
{
  "success": true,
  "message": "Festivo eliminado"
}
```

---

## Módulo de Usuarios

### GET /users

Lista los usuarios del sistema.

**Autenticación:** ✅ Requerida  
**Rol Requerido:** ADMIN

**Query Parameters:**

- `role` (opcional): `ADMIN|EMPLOYEE|CUSTOMER`
- `status` (opcional): `ACTIVE|INACTIVE`

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user_uuid",
        "email": "empleado@example.com",
        "firstName": "Juan",
        "lastName": "Pérez",
        "role": "EMPLOYEE",
        "status": "ACTIVE",
        "createdAt": "2024-02-05T10:30:00Z"
      }
    ]
  }
}
```

---

### GET /users/:id

Obtiene detalles de un usuario.

**Autenticación:** ✅ Requerida (ADMIN o self)

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "id": "user_uuid",
    "email": "empleado@example.com",
    "firstName": "Juan",
    "lastName": "Pérez",
    "role": "EMPLOYEE",
    "status": "ACTIVE",
    "createdAt": "2024-02-05T10:30:00Z"
  }
}
```

---

### POST /users

Crea un nuevo usuario.

**Autenticación:** ✅ Requerida  
**Rol Requerido:** ADMIN

**Request Body:**

```json
{
  "email": "nuevo.empleado@example.com",
  "password": "SecurePassword123!",
  "firstName": "Carlos",
  "lastName": "García",
  "role": "EMPLOYEE"
}
```

**Response 201 Created:** Similar a GET /users/:id

---

### PUT /users/:id

Actualiza un usuario.

**Autenticación:** ✅ Requerida (ADMIN o self)

**Request Body:**

```json
{
  "firstName": "Carlos",
  "lastName": "García López"
}
```

**Response 200 OK:** Similar a GET /users/:id

---

### DELETE /users/:id

Elimina un usuario.

**Autenticación:** ✅ Requerida  
**Rol Requerido:** ADMIN

**Response 200 OK:**

```json
{
  "success": true,
  "message": "Usuario eliminado"
}
```

---

### PATCH /users/:id/role

Cambia el rol de un usuario.

**Autenticación:** ✅ Requerida  
**Rol Requerido:** ADMIN

**Request Body:**

```json
{
  "role": "ADMIN"
}
```

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "id": "user_uuid",
    "role": "ADMIN",
    "updatedAt": "2024-02-05T16:00:00Z"
  }
}
```

---

### PATCH /users/:id/status

Cambia el estado de un usuario.

**Autenticación:** ✅ Requerida  
**Rol Requerido:** ADMIN

**Request Body:**

```json
{
  "status": "INACTIVE"
}
```

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "id": "user_uuid",
    "status": "INACTIVE",
    "updatedAt": "2024-02-05T16:05:00Z"
  }
}
```

---

## Módulo de Analítica

### GET /analytics/overview

Resumen general de analítica del día.

**Autenticación:** ✅ Requerida  
**Rol Requerido:** ADMIN

**Query Parameters:**

- `date` (opcional): fecha en formato YYYY-MM-DD (default: hoy)
- `queueId` (opcional): filtrar por cola específica

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalTickets": 245,
      "completedTickets": 240,
      "cancelledTickets": 5,
      "averageWaitTime": 12.5,
      "averageServiceTime": 8.3,
      "satisfactionRating": 4.2,
      "peakHour": 13,
      "peakHourTickets": 35
    },
    "date": "2024-02-05"
  }
}
```

---

### GET /analytics/queue/:queueId

Analítica específica de una cola.

**Autenticación:** ✅ Requerida  
**Rol Requerido:** ADMIN

**Query Parameters:**

- `startDate` (opcional): fecha inicio YYYY-MM-DD
- `endDate` (opcional): fecha fin YYYY-MM-DD

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "queueId": "queue_uuid",
    "queueName": "Atención al Cliente",
    "period": {
      "startDate": "2024-02-01",
      "endDate": "2024-02-05"
    },
    "metrics": {
      "totalTickets": 1245,
      "completedTickets": 1220,
      "cancelledTickets": 25,
      "averageWaitTime": 14.5,
      "averageServiceTime": 9.2,
      "averageRating": 4.3,
      "maxWaitTime": 65,
      "minWaitTime": 1
    }
  }
}
```

---

### GET /analytics/tickets/by-date

Tickets agrupados por fecha.

**Autenticación:** ✅ Requerida  
**Rol Requerido:** ADMIN

**Query Parameters:**

- `startDate`: fecha inicio YYYY-MM-DD
- `endDate`: fecha fin YYYY-MM-DD
- `queueId` (opcional): filtrar por cola

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "date": "2024-02-01",
        "total": 234,
        "completed": 230,
        "cancelled": 4
      },
      {
        "date": "2024-02-02",
        "total": 245,
        "completed": 240,
        "cancelled": 5
      }
    ]
  }
}
```

---

### GET /analytics/tickets/by-hour

Tickets agrupados por hora.

**Autenticación:** ✅ Requerida  
**Rol Requerido:** ADMIN

**Query Parameters:**

- `date`: fecha en formato YYYY-MM-DD
- `queueId` (opcional): filtrar por cola

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "date": "2024-02-05",
    "data": [
      {
        "hour": 9,
        "total": 18,
        "completed": 18,
        "cancelled": 0
      },
      {
        "hour": 10,
        "total": 25,
        "completed": 25,
        "cancelled": 0
      },
      {
        "hour": 11,
        "total": 32,
        "completed": 30,
        "cancelled": 2
      }
    ]
  }
}
```

---

### GET /analytics/wait-times

Análisis de tiempos de espera.

**Autenticación:** ✅ Requerida  
**Rol Requerido:** ADMIN

**Query Parameters:**

- `startDate`: fecha inicio YYYY-MM-DD
- `endDate`: fecha fin YYYY-MM-DD
- `queueId` (opcional): filtrar por cola

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "period": {
      "startDate": "2024-02-01",
      "endDate": "2024-02-05"
    },
    "statistics": {
      "average": 14.2,
      "median": 12,
      "min": 1,
      "max": 68,
      "stdDev": 11.5,
      "p95": 35,
      "p99": 55
    },
    "trend": [
      {
        "date": "2024-02-01",
        "average": 13.5
      },
      {
        "date": "2024-02-02",
        "average": 14.8
      }
    ]
  }
}
```

---

### GET /analytics/service-times

Análisis de tiempos de servicio.

**Autenticación:** ✅ Requerida  
**Rol Requerido:** ADMIN

Similar a `/analytics/wait-times` pero para tiempos de atención.

---

### GET /analytics/satisfaction

Análisis de satisfacción del cliente.

**Autenticación:** ✅ Requerida  
**Rol Requerido:** ADMIN

**Query Parameters:**

- `startDate`: fecha inicio YYYY-MM-DD
- `endDate`: fecha fin YYYY-MM-DD
- `queueId` (opcional): filtrar por cola

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "period": {
      "startDate": "2024-02-01",
      "endDate": "2024-02-05"
    },
    "statistics": {
      "average": 4.2,
      "totalRatings": 1100,
      "distribution": {
        "5": 600,
        "4": 300,
        "3": 150,
        "2": 40,
        "1": 10
      }
    },
    "trend": [
      {
        "date": "2024-02-01",
        "average": 4.1
      },
      {
        "date": "2024-02-02",
        "average": 4.3
      }
    ]
  }
}
```

---

### GET /analytics/peak-hours

Identifica horas punta.

**Autenticación:** ✅ Requerida  
**Rol Requerido:** ADMIN

**Query Parameters:**

- `startDate`: fecha inicio YYYY-MM-DD
- `endDate`: fecha fin YYYY-MM-DD
- `queueId` (opcional): filtrar por cola

**Response 200 OK:**

```json
{
  "success": true,
  "data": {
    "period": {
      "startDate": "2024-02-01",
      "endDate": "2024-02-05"
    },
    "peakHours": [
      {
        "hour": 13,
        "averageTickets": 32,
        "averageWaitTime": 22.5
      },
      {
        "hour": 12,
        "averageTickets": 29,
        "averageWaitTime": 18.3
      },
      {
        "hour": 14,
        "averageTickets": 27,
        "averageWaitTime": 16.1
      }
    ]
  }
}
```

---

## WebSocket Events

La aplicación usa WebSocket para actualizaciones en tiempo real. La conexión se establece a `ws://localhost:3000/ws`.

### Cliente (Consumidor de eventos)

**Autenticación:** Token JWT en el header de conexión

```javascript
const ws = new WebSocket("ws://localhost:3000/ws", {
  headers: {
    Authorization: `Bearer ${jwtToken}`,
  },
});
```

### Eventos Disponibles

#### ticket:called

Se dispara cuando se llama un turno.

```json
{
  "event": "ticket:called",
  "data": {
    "queueId": "queue_uuid",
    "ticketId": "ticket_uuid",
    "ticketNumber": 45
  }
}
```

#### ticket:status_changed

Se dispara cuando cambia el estado de un turno.

```json
{
  "event": "ticket:status_changed",
  "data": {
    "queueId": "queue_uuid",
    "ticketId": "ticket_uuid",
    "status": "ATTENDING",
    "timestamp": "2024-02-05T11:30:00Z"
  }
}
```

#### queue:status_changed

Se dispara cuando cambia el estado de una cola.

```json
{
  "event": "queue:status_changed",
  "data": {
    "queueId": "queue_uuid",
    "status": "PAUSED",
    "timestamp": "2024-02-05T11:35:00Z"
  }
}
```

#### queue:stats_updated

Se dispara periódicamente con estadísticas actualizadas de la cola.

```json
{
  "event": "queue:stats_updated",
  "data": {
    "queueId": "queue_uuid",
    "waitingCount": 8,
    "calledCount": 1,
    "attendingCount": 1,
    "averageWaitTime": 15,
    "timestamp": "2024-02-05T11:40:00Z"
  }
}
```

---

## Rate Limiting

Se implementa limitación de tasa para prevenir abuso:

- **Endpoints públicos:** 100 requests por minuto por IP
- **Endpoints autenticados:** 1000 requests por minuto por usuario
- **Endpoints analíticos:** 50 requests por minuto por usuario

---

## Versionado de API

La versión actual es **v1**. Futuras versiones serán accesibles en `/api/v2`, `/api/v3`, etc.

Cambios incompatibles serán introducidos en nuevas versiones manteniendo compatibilidad con versiones anteriores durante un período de deprecación.

---

**Última actualización:** 5 de febrero de 2026
