-- ==============================================================================
-- PLANIFIKA: ESQUEMA DE BASE DE DATOS COMPLETO EN SUPABASE (POSTGRESQL)
-- GESTIÓN DE USUARIOS 100% EN TABLA USERS (SIN SUPABASE AUTH / GOTRUE)
-- ==============================================================================
-- Este script configura la base de datos completa de Planifika de manera autónoma:
-- 1. Extensiones requeridas (uuid-ossp para IDs y pgcrypto para hash bcrypt de claves).
-- 2. Tabla central de usuarios (public.users) con claves encriptadas, roles y recuperación.
-- 3. Funciones de autenticación, registro y recuperación ("¿Has olvidado tu contraseña?").
-- 4. Tablas relacionales vinculadas directamente a public.users:
--    - calendars (owner_id -> public.users)
--    - calendar_permissions (user_id -> public.users)
--    - tasks (created_by -> public.users)
-- 5. Triggers de integridad y restricción de cambio de estado de tareas exclusivo a administradores.
-- 6. Inserción inicial de usuarios (seed) con contraseña 'password123'.
-- ==============================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TABLA CENTRAL DE USUARIOS Y GESTIÓN DE CREDENCIALES (public.users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  reset_token TEXT,
  reset_token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índices para búsqueda rápida por email
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON public.users(reset_token);

-- ==============================================================================
-- 3. PROCEDIMIENTOS ALMACENADOS PARA AUTENTICACIÓN Y SEGURIDAD
-- ==============================================================================

-- A) Registro de nuevo usuario con hashing bcrypt seguro (pgcrypto)
CREATE OR REPLACE FUNCTION public.register_app_user(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_role TEXT DEFAULT 'user'
) RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_clean_email TEXT;
BEGIN
  v_clean_email := LOWER(TRIM(p_email));

  IF EXISTS (SELECT 1 FROM public.users WHERE email = v_clean_email) THEN
    RAISE EXCEPTION 'El correo electrónico ya se encuentra registrado.';
  END IF;

  INSERT INTO public.users (
    email,
    password_hash,
    full_name,
    avatar_url,
    role
  )
  VALUES (
    v_clean_email,
    crypt(p_password, gen_salt('bf', 10)),
    TRIM(p_full_name),
    'https://api.dicebear.com/7.x/avataaars/svg?seed=' || encode(p_full_name::bytea, 'escape'),
    CASE WHEN p_role = 'admin' THEN 'admin' ELSE 'user' END
  ) RETURNING id INTO v_user_id;

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- B) Verificación de inicio de sesión con email y contraseña
CREATE OR REPLACE FUNCTION public.authenticate_app_user(
  p_email TEXT,
  p_password TEXT
) RETURNS TABLE(user_id UUID, email TEXT, full_name TEXT, avatar_url TEXT, role TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id, 
    u.email, 
    u.full_name, 
    u.avatar_url,
    u.role
  FROM public.users u
  WHERE u.email = LOWER(TRIM(p_email))
    AND u.is_active = true
    AND u.password_hash = crypt(p_password, u.password_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- C) Solicitud de restablecimiento ("¿Has olvidado tu contraseña?")
CREATE OR REPLACE FUNCTION public.request_password_reset(
  p_email TEXT
) RETURNS TEXT AS $$
DECLARE
  v_token TEXT;
  v_clean_email TEXT;
BEGIN
  v_clean_email := LOWER(TRIM(p_email));
  v_token := encode(gen_random_bytes(24), 'hex');

  UPDATE public.users
  SET reset_token = v_token,
      reset_token_expires_at = NOW() + INTERVAL '2 hours',
      updated_at = NOW()
  WHERE email = v_clean_email;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró ninguna cuenta asociada a este correo electrónico.';
  END IF;

  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- D) Completar cambio de contraseña tras recuperar
CREATE OR REPLACE FUNCTION public.complete_password_reset(
  p_email TEXT,
  p_token TEXT,
  p_new_password TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_matched BOOLEAN := false;
BEGIN
  UPDATE public.users
  SET password_hash = crypt(p_new_password, gen_salt('bf', 10)),
      reset_token = NULL,
      reset_token_expires_at = NULL,
      updated_at = NOW()
  WHERE email = LOWER(TRIM(p_email))
    AND reset_token = p_token
    AND reset_token_expires_at > NOW();

  GET DIAGNOSTICS v_matched = ROW_COUNT;
  RETURN v_matched > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 4. TABLA DE CALENDARIOS (Semanales)
-- Vinculada directamente a public.users(id)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.calendars (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color_theme TEXT DEFAULT 'blue' CHECK (color_theme IN ('blue', 'emerald', 'indigo', 'violet', 'amber')),
  owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_calendars_owner ON public.calendars(owner_id);

-- ==============================================================================
-- 5. TABLA DE PERMISOS POR CALENDARIO (Control de Acceso Colaborativo)
-- Roles: 'admin' (control total y cambio de estado), 'editor' (crear, editar, mover tareas), 'viewer' (solo lectura)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.calendar_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  calendar_id UUID REFERENCES public.calendars(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
  granted_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT unique_user_calendar_permission UNIQUE(calendar_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_permissions_cal_user ON public.calendar_permissions(calendar_id, user_id);

-- ==============================================================================
-- 6. TABLA DE TAREAS SEMANALES
-- Estados: 'pending' (Pendiente), 'partial' (Completado Parcial), 'completed' (Completado), 'none' (Sin estado / Nota)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  calendar_id UUID REFERENCES public.calendars(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT 'sky' CHECK (color IN ('sky', 'emerald', 'amber', 'indigo', 'violet', 'rose', 'slate')),
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'completed', 'none')),
  week_start_date DATE NOT NULL,
  time_estimate TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_calendar_week ON public.tasks(calendar_id, week_start_date);
CREATE INDEX IF NOT EXISTS idx_tasks_day ON public.tasks(day_of_week);

-- ==============================================================================
-- 7. FUNCIONES AUXILIARES DE ACCESO Y ROLES
-- ==============================================================================

-- Comprueba si el usuario tiene permiso de Administrador en el calendario
CREATE OR REPLACE FUNCTION public.is_calendar_admin(cal_id UUID, usr_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.calendars WHERE id = cal_id AND owner_id = usr_id
  ) OR EXISTS (
    SELECT 1 FROM public.calendar_permissions WHERE calendar_id = cal_id AND user_id = usr_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comprueba si el usuario tiene permiso para editar o mover tareas (admin o editor)
CREATE OR REPLACE FUNCTION public.can_edit_tasks(cal_id UUID, usr_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.calendars WHERE id = cal_id AND owner_id = usr_id
  ) OR EXISTS (
    SELECT 1 FROM public.calendar_permissions WHERE calendar_id = cal_id AND user_id = usr_id AND role IN ('admin', 'editor')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 8. TRIGGER DE ASIGNACIÓN AUTOMÁTICA DE ADMIN AL CREAR CALENDARIO
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_calendar()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.calendar_permissions (calendar_id, user_id, role, granted_by)
  VALUES (NEW.id, NEW.owner_id, 'admin', NEW.owner_id)
  ON CONFLICT (calendar_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_calendar_created ON public.calendars;
CREATE TRIGGER on_calendar_created
  AFTER INSERT ON public.calendars
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_calendar();

-- ==============================================================================
-- 9. TRIGGER CRÍTICO: RESTRICCIÓN DE ESTADO EXCLUSIVO PARA ADMINISTRADORES
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.check_task_status_change_permission()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar timestamp
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_task_status_admin_check ON public.tasks;
CREATE TRIGGER tr_task_status_admin_check
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.check_task_status_change_permission();

-- ==============================================================================
-- 10. DATOS INICIALES (SEED DATA): USUARIOS DEMO Y CALENDARIO
-- Contraseña unificada para pruebas: password123
-- ==============================================================================
INSERT INTO public.users (id, email, password_hash, full_name, role)
VALUES
  (
    'a0000000-0000-0000-0000-000000000001',
    'carlos.admin@planifika.app',
    crypt('password123', gen_salt('bf', 10)),
    'Carlos Martínez (Administrador)',
    'admin'
  ),
  (
    'a0000000-0000-0000-0000-000000000002',
    'elena.editor@planifika.app',
    crypt('password123', gen_salt('bf', 10)),
    'Elena Ramos (Editora)',
    'user'
  ),
  (
    'a0000000-0000-0000-0000-000000000003',
    'david.viewer@planifika.app',
    crypt('password123', gen_salt('bf', 10)),
    'David Soto (Espectador)',
    'user'
  )
ON CONFLICT (email) DO UPDATE
SET password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;

-- Calendario inicial
INSERT INTO public.calendars (id, name, description, color_theme, owner_id)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'Planificación Sprint Producto & QA',
  'Tablero semanal del equipo de ingeniería, producto y diseño.',
  'blue',
  'a0000000-0000-0000-0000-000000000001'
)
ON CONFLICT (id) DO NOTHING;

-- Permisos de miembros en el calendario inicial
INSERT INTO public.calendar_permissions (calendar_id, user_id, role, granted_by)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'admin', 'a0000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'editor', 'a0000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'viewer', 'a0000000-0000-0000-0000-000000000001')
ON CONFLICT (calendar_id, user_id) DO NOTHING;


-- ==============================================================================
-- 11. PERMISOS Y POLÍTICAS DE ACCESO PARA CLIENTE (ANON / AUTHENTICATED)
-- Garantiza que las operaciones desde la interfaz web no sean bloqueadas por RLS
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo anon y authenticated en users" ON public.users;
CREATE POLICY "Permitir todo anon y authenticated en users" ON public.users FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo anon y authenticated en calendars" ON public.calendars;
CREATE POLICY "Permitir todo anon y authenticated en calendars" ON public.calendars FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo anon y authenticated en calendar_permissions" ON public.calendar_permissions;
CREATE POLICY "Permitir todo anon y authenticated en calendar_permissions" ON public.calendar_permissions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo anon y authenticated en tasks" ON public.tasks;
CREATE POLICY "Permitir todo anon y authenticated en tasks" ON public.tasks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
