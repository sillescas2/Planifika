# 📅 Planifika - Planificador Semanal Colaborativo

Aplicación web responsiva de alto rendimiento optimizada para dispositivos móviles y ordenadores de escritorio, diseñada como un **planificador horario semanal colaborativo con control de permisos y gestión de tareas**, integrada con Supabase (Auth + PostgreSQL RLS) y lista para despliegue estático en Netlify.

---

## 🛠️ Tecnologías Utilizadas

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4.
- **Drag and Drop**: `@hello-pangea/dnd` para reordenar y mover tarjetas entre días con soporte táctil y de ratón.
- **Iconografía**: `lucide-react`.
- **Backend / Base de Datos**: Supabase (Supabase Auth + PostgreSQL con políticas RLS y Triggers de seguridad).
- **Despliegue**: Configuración para Netlify (`netlify.toml` con redirección SPA).

---

## 🚀 Despliegue en Netlify

1. **Subir el código a GitHub / GitLab / Bitbucket**.
2. **Conectar el repositorio a Netlify**:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
3. **Configurar las Variables de Entorno en Netlify**:
   En el panel de control de Netlify, ve a **Site configuration** > **Environment variables** y añade:
   - `VITE_SUPABASE_URL`: La URL de tu proyecto en Supabase (ej: `https://xyzproject.supabase.co`)
   - `VITE_SUPABASE_ANON_KEY`: La clave pública anónima de tu proyecto Supabase.
4. **Archivo `netlify.toml`**:
   El proyecto ya incluye el archivo `netlify.toml` en la raíz con el siguiente enrutamiento para evitar errores 404 al recargar rutas:
   ```toml
   [build]
     publish = "dist"
     command = "npm run build"

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

---

## 🗄️ Configuración de la Base de Datos en Supabase (PostgreSQL)

El archivo SQL completo con las tablas, relaciones, disparadores y políticas RLS se encuentra en:
`/supabase/schema.sql` (y también se puede consultar, copiar y descargar directamente desde la pestaña **Configuración > Script SQL & RLS** en la propia aplicación).

### Pasos para ejecutar en Supabase:
1. Entra a tu consola de [Supabase](https://supabase.com).
2. Ve a la sección **SQL Editor**.
3. Pega el contenido de `supabase/schema.sql` y pulsa **Run**.

### Tablas creadas:
- `profiles`: Datos de usuario sincronizados con `auth.users`.
- `calendars`: Calendarios semanales con referencia al creador (`owner_id`).
- `calendar_permissions`: Relación de usuarios y roles (`admin`, `editor`, `viewer`).
- `tasks`: Tarjetas de tareas con `calendar_id`, `title`, `description`, `color`, `day_of_week`, `status`, `week_start_date`, etc.

### 🛡️ Reglas de Seguridad (RLS) y Trigger de Administrador:
- **Solo Lectura (`viewer`)**: Puede visualizar todas las tareas y semanas del calendario.
- **Edición (`editor`)**: Puede crear nuevas tarjetas, modificar títulos, descripciones, horarios y arrastrar tareas entre días.
- **Administrador (`admin`)**:
  - Control total sobre el calendario.
  - Concesión y revocación de permisos a otros miembros.
  - **Exclusividad en el cambio de estado**: Tanto a nivel de interfaz como a nivel de base de datos (mediante el trigger `tr_task_status_admin_check`), **únicamente los administradores pueden marcar tareas como Completadas o cambiar su estado de completitud**.
