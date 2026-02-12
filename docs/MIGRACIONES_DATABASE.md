# Guía de Migraciones de Base de Datos - SmartLining

## Sistema de Migraciones con Prisma

SmartLining utiliza **Prisma ORM** para gestionar las migraciones de la base de datos de forma controlada y versionada. Esto permite:

- ✅ Cambios de esquema reproducibles
- ✅ Historial completo de cambios
- ✅ Fácil rollback si es necesario
- ✅ Colaboración en equipo segura
- ✅ Automatización en CI/CD

---

## Estructura de Migraciones

```
backend/prisma/
├── schema.prisma          # Esquema actual (source of truth)
├── migrations/
│   ├── 0_initial/         # Migración inicial
│   │   ├── migration.sql  # SQL de la migración
│   │   └── .prismarc      # Metadata de Prisma
│   ├── 1_add_indexes/     # Migraciones posteriores
│   └── ...
└── seed.ts               # Seeders (datos iniciales)
```

---

## Comandos Principales

### 1. Crear una Nueva Migración

**Cuando haces cambios en `schema.prisma`:**

```bash
cd backend

# Opción A: Crear migración desde cambios en schema (RECOMENDADO)
npx prisma migrate dev --name <nombre_descriptivo>

# Ejemplo:
npx prisma migrate dev --name add_user_table
```

Este comando:

- Valida los cambios en `schema.prisma`
- Genera SQL automáticamente
- Ejecuta la migración en tu DB local
- Regenera el cliente Prisma

---

### 2. Sincronizar Base de Datos Actual

Si tienes cambios en `schema.prisma` pero NO quieres registrar un historial de migración:

```bash
npx prisma db push
```

⚠️ **Nota:** Usar solo en desarrollo. En producción, siempre usar migraciones.

---

### 3. Resetear la Base de Datos

Elimina todas las tablas y aplica las migraciones desde cero:

```bash
# Peligro: Borra todos los datos
npx prisma migrate reset

# Se te preguntará si estás seguro
# Luego ejecuta seeders (si existen)
npx prisma db seed
```

---

### 4. Ver Estado de Migraciones

```bash
# Ver migraciones aplicadas vs pendientes
npx prisma migrate status

# Ejemplo de output:
# Migrations present in the filesystem:
#   0_initial
#   1_add_indexes
#
# Migrations applied to the database:
#   0_initial
#
# Pending migrations:
#   1_add_indexes
```

---

### 5. Generar Cliente Prisma

Después de cualquier cambio en `schema.prisma`:

```bash
npx prisma generate
```

Esto regenera los tipos TypeScript y el cliente.

---

### 6. Abrir Prisma Studio

Visualizar y editar datos en la BD mediante interfaz:

```bash
npx prisma studio
# Se abre en http://localhost:5555
```

---

## Flujo de Trabajo Típico

### Desarrollo Local

```bash
# 1. Modifica schema.prisma
# Por ejemplo, agregar un campo:

model Usuario {
  id_usuario    Int       @id @default(autoincrement())
  nombre        String    @db.VarChar(100)
  email         String    @unique @db.VarChar(150)
  password_hash String    @db.VarChar(255)
  rol           UserRole
  activo        Boolean   @default(true)
  fecha_ultima_login DateTime? # ← Nuevo campo
  fecha_creacion DateTime  @default(now())
  // ...
}

# 2. Crear la migración
npx prisma migrate dev --name add_fecha_ultima_login

# Output:
# Environment variables loaded from .env
# Prisma schema loaded from prisma/schema.prisma
#
# ✔ Successfully created migrations/2_add_fecha_ultima_login in 15ms
#
# Now applying migrations:
# Applying m20240205143522_add_fecha_ultima_login
# ✔ Database synced, 1 migration executed
#
# ✔ Generated Prisma Client (v7.2.0) in 245ms

# 3. Verificar cambios
npx prisma studio

# 4. Hacer commit
git add backend/prisma/migrations/
git add backend/prisma/schema.prisma
git commit -m "chore: add fecha_ultima_login to usuario"
```

### Deploy a Producción

```bash
# 1. En el servidor de producción:
cd /ruta/del/backend

# 2. Actualizar código (git pull)
git pull origin main

# 3. Aplicar migraciones pendientes
npx prisma migrate deploy

# 4. No usa seeders en producción automáticamente
# Si necesitas datos iniciales, hacerlo manualmente o con script específico
```

---

## Mejores Prácticas

### ✅ DO's

- **Siempre modificar `schema.prisma` primero**, no directamente la BD
- **Usar nombres descriptivos** en las migraciones: `add_email_verification`, `fix_user_timestamps`
- **Hacer commit de las migraciones** junto con el código
- **Ejecutar `npx prisma migrate status`** antes de deployar
- **Usar `prisma migrate deploy`** en producción
- **Crear seeders** para datos iniciales necesarios
- **Documentar cambios significativos** en changelog

### ❌ DON'Ts

- ❌ No editar SQL de migraciones directamente (riesgo de inconsistencia)
- ❌ No usar `db push` en producción
- ❌ No borrar carpetas de migraciones
- ❌ No renombrar campos sin migración
- ❌ No hacer cambios incompatibles sin plan de rollback

---

## Ejemplo: Agregar Nueva Tabla

### 1. Modificar schema.prisma

```prisma
model LogActividad {
  id_log        Int       @id @default(autoincrement())
  id_usuario    Int
  accion        String    @db.VarChar(200)
  detalles      String?   @db.Json
  fecha_creacion DateTime  @default(now())

  usuario       Usuario   @relation(fields: [id_usuario], references: [id_usuario])

  @@map("log_actividad")
}
```

También agregar la relación inversa en Usuario:

```prisma
model Usuario {
  // ... campos existentes ...
  logs          LogActividad[]
}
```

### 2. Crear migración

```bash
npx prisma migrate dev --name add_log_actividad_table
```

### 3. Verificar resultado

```bash
npx prisma studio
# Verificar que la tabla aparece
```

### 4. Hacer commit

```bash
git add backend/prisma/
git commit -m "feat: add LogActividad table for audit trails"
```

---

## Ejemplo: Agregar Índice

### 1. Modificar schema.prisma

```prisma
model Turno {
  id_turno                    Int       @id @default(autoincrement())
  id_cola                     Int
  id_cliente                  Int
  numero_turno                Int
  estado                      EstadoTurno @default(EN_ESPERA)
  fecha_hora_creacion         DateTime  @default(now())
  // ... otros campos ...

  @@index([id_cola])  // ← Agregar índice
  @@index([id_cliente])
  @@index([fecha_hora_creacion])

  @@map("turno")
}
```

### 2. Crear migración

```bash
npx prisma migrate dev --name add_turno_indexes
```

---

## Rollback de Migraciones

### Resolver Migraciones Fallidas

Si una migración falla, Prisma marca el estado como "failed". Para resolver:

```bash
# Ver estado actual
npx prisma migrate status

# Opción 1: Si puedes resolver el problema
# Editar la migración, luego:
npx prisma migrate resolve --rolled-back <nombre_migracion>

# Opción 2: Si quieres deshacer completamente
npx prisma migrate reset
# Luego reaplica migraciones correctas
```

---

## Seeders (Datos Iniciales)

### Crear archivo de seeder

Crear `backend/prisma/seed.ts`:

```typescript
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Crear usuario admin
  const adminPassword = await bcrypt.hash("admin123", 10);

  const admin = await prisma.usuario.upsert({
    where: { email: "admin@smartlining.com" },
    update: {},
    create: {
      nombre: "Administrador",
      email: "admin@smartlining.com",
      password_hash: adminPassword,
      rol: "ADMINISTRADOR",
      activo: true,
    },
  });

  console.log("Admin user created:", admin);

  // Crear cola de ejemplo
  const cola = await prisma.cola.upsert({
    where: { id_cola: 1 },
    update: {},
    create: {
      nombre: "Atención al Cliente",
      descripcion: "Cola principal de caja",
      activa: true,
    },
  });

  console.log("Queue created:", cola);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
```

### Configurar en package.json

```json
{
  "prisma": {
    "seed": "ts-node --esm prisma/seed.ts"
  }
}
```

### Ejecutar seeder

```bash
npx prisma db seed
```

---

## Migraciones en CI/CD

### GitHub Actions Example

```yaml
name: Database Migration

on:
  push:
    branches: [main, develop]

jobs:
  migrate:
    runs-on: ubuntu-latest

    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_DATABASE: smartlining_test
          MYSQL_ROOT_PASSWORD: root
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3

    steps:
      - uses: actions/checkout@v2

      - uses: actions/setup-node@v2
        with:
          node-version: 25.x

      - name: Install dependencies
        run: cd backend && npm ci

      - name: Check migrations
        run: cd backend && npx prisma migrate status

      - name: Validate schema
        run: cd backend && npx prisma validate
```

---

## Troubleshooting

### Problema: "Migration history is out of sync"

```bash
# Solución: Marcar como aplicada
npx prisma migrate resolve --rolled-back <nombre_migracion>

# O resetear (en desarrollo)
npx prisma migrate reset
```

### Problema: "Cannot find module @prisma/client"

```bash
npx prisma generate
npm install
```

### Problema: Schema mismatch

```bash
# Ver diferencias
npx prisma migrate status

# Sincronizar
npx prisma db push --force-reset
```

---

## Documentación Completa

- [Prisma Migrations](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [Deploying Migrations](https://www.prisma.io/docs/guides/deployment/deploy-database-changes-with-prisma-migrate)

---

**Última actualización:** 5 de febrero de 2026
