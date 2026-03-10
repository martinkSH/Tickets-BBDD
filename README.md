# 🎫 Tickets BBDD & Tarifas

Sistema de gestión de tickets con auth, roles y tablero kanban.

---

## Stack
- **Next.js 14** (App Router) + TypeScript
- **Supabase** (PostgreSQL + Auth)
- **Tailwind CSS**
- **Vercel** (deploy)

---

## Setup paso a paso

### 1. Supabase — crear proyecto

1. [supabase.com](https://supabase.com) → New project → región **South America (São Paulo)**
2. SQL Editor → pegar y ejecutar `supabase/schema.sql`

### 2. Supabase — crear usuarios

Ir a **Authentication → Users → Add User** y crear uno por uno:

| Nombre | Mail | Contraseña |
|--------|------|-----------|
| Lupe | lupe@sayhueque.com | (elegir) |
| Paula | paulam@sayhueque.com | (elegir) |
| Sebastian | sebastianf@sayhueque.com | (elegir) |
| Carolina | carolinad@sayhueque.com | (elegir) |
| Melisa | melisa.b@sayhueque.com | (elegir) |
| Jennifer | jennifer.g@sayhueque.com | (elegir) |
| Camila | camilat@sayhueque.com | (elegir) |

### 3. Supabase — asignar rol admin a Lupe

Después de crear todos los usuarios, ir a **SQL Editor** y ejecutar:

```sql
UPDATE perfiles SET rol = 'admin' WHERE mail = 'lupe@sayhueque.com';
```

### 4. Variables de entorno

En Vercel → Settings → Environment Variables agregar:

```
NEXT_PUBLIC_SUPABASE_URL = https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGci...
```

### 5. Vercel — configuración del build

- **Framework Preset:** Next.js
- **Root Directory:** `./` (si los archivos están en la raíz del repo)

---

## URLs de la app

| URL | Quién la usa |
|-----|-------------|
| `/nuevo` | Cualquier persona de la empresa — carga tickets (sin login) |
| `/login` | Equipo interno — ingresa con mail + contraseña |
| `/admin` | Lupe (admin) — ve todos los tickets y asigna |
| `/tablero` | Cada responsable — ve solo sus tickets asignados |

---

## Flujo de un ticket

```
Solicitante llena /nuevo
        ↓
Ticket se crea en estado "Recibido"
        ↓
Lupe entra a /admin → ve todos los Recibidos → presiona "Asignar" → elige responsable
        ↓
Ticket pasa a "Asignado" → aparece en el tablero del responsable
        ↓
Responsable resuelve → agrega comentario → confirma
        ↓
Ticket pasa a "Resuelto"
```

---

## Cómo agregar un nuevo responsable

1. Supabase → Authentication → Add User (con su mail @sayhueque.com)
2. El perfil se crea automáticamente con rol = `responsable`
3. Listo — ya puede loguearse y aparece en la lista del admin para asignar tickets
