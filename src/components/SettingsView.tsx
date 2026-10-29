import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { UserProfile } from '../types';
import {
  Settings,
  Database,
  Code2,
  Copy,
  Check,
  Download,
  Users,
  UserPlus,
  Globe,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  Edit3,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  Shield,
  X,
  Mail,
  User,
} from 'lucide-react';

const SUPABASE_SQL_SCRIPT = `-- ==============================================================================
-- PLANIFIKA: ESQUEMA DE BASE DE DATOS COMPLETO EN SUPABASE (POSTGRESQL)
-- GESTIÓN DE USUARIOS 100% EN TABLA USERS (SIN SUPABASE AUTH / GOTRUE)
-- ==============================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABLA CENTRAL DE USUARIOS Y GESTIÓN DE CREDENCIALES (public.users)
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

-- 3. PROCEDIMIENTOS ALMACENADOS PARA AUTENTICACIÓN DIRECTA
-- Registro seguro con hash bcrypt
CREATE OR REPLACE FUNCTION public.register_app_user(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_role TEXT DEFAULT 'user'
) RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  INSERT INTO public.users (email, password_hash, full_name, role)
  VALUES (
    LOWER(TRIM(p_email)),
    crypt(p_password, gen_salt('bf', 10)),
    TRIM(p_full_name),
    CASE WHEN p_role = 'admin' THEN 'admin' ELSE 'user' END
  ) RETURNING id INTO v_user_id;
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Actualización completa de usuario (nombre, email, rol y opcionalmente password)
CREATE OR REPLACE FUNCTION public.update_app_user(
  p_id UUID,
  p_full_name TEXT,
  p_email TEXT,
  p_role TEXT,
  p_password TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  UPDATE public.users
  SET
    full_name = TRIM(p_full_name),
    email = LOWER(TRIM(p_email)),
    role = CASE WHEN p_role = 'admin' THEN 'admin' ELSE 'user' END,
    password_hash = CASE WHEN p_password IS NOT NULL AND TRIM(p_password) <> '' THEN crypt(p_password, gen_salt('bf', 10)) ELSE password_hash END,
    updated_at = NOW()
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Login con email y contraseña
CREATE OR REPLACE FUNCTION public.authenticate_app_user(
  p_email TEXT,
  p_password TEXT
) RETURNS TABLE(user_id UUID, email TEXT, full_name TEXT, avatar_url TEXT, role TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email, u.full_name, u.avatar_url, u.role
  FROM public.users u
  WHERE u.email = LOWER(TRIM(p_email))
    AND u.is_active = true
    AND u.password_hash = crypt(p_password, u.password_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recuperación de contraseña ("¿Has olvidado tu contraseña?")
CREATE OR REPLACE FUNCTION public.request_password_reset(p_email TEXT) RETURNS TEXT AS $$
DECLARE
  v_token TEXT;
BEGIN
  v_token := encode(gen_random_bytes(24), 'hex');
  UPDATE public.users
  SET reset_token = v_token,
      reset_token_expires_at = NOW() + INTERVAL '2 hours',
      updated_at = NOW()
  WHERE email = LOWER(TRIM(p_email));
  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. TABLA DE CALENDARIOS (Vinculada a public.users)
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

-- 5. TABLA DE PERMISOS (Vinculada a public.users)
CREATE TABLE IF NOT EXISTS public.calendar_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  calendar_id UUID REFERENCES public.calendars(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
  granted_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT unique_user_calendar_permission UNIQUE(calendar_id, user_id)
);

-- 6. TABLA DE TAREAS SEMANALES (Vinculada a public.users)
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

-- 7. TRIGGER DE ASIGNACIÓN AUTOMÁTICA DE ADMIN AL CREAR CALENDARIO
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

-- 8. CREADOR DE CALENDARIOS SEGURO (Bypasses RLS)
CREATE OR REPLACE FUNCTION public.create_app_calendar(
  p_name TEXT,
  p_description TEXT DEFAULT '',
  p_color_theme TEXT DEFAULT 'blue',
  p_owner_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_cal RECORD;
BEGIN
  IF p_owner_id IS NULL THEN
    RAISE EXCEPTION 'El owner_id es obligatorio para crear un calendario';
  END IF;

  INSERT INTO public.calendars (name, description, color_theme, owner_id)
  VALUES (p_name, COALESCE(p_description, ''), COALESCE(p_color_theme, 'blue'), p_owner_id)
  RETURNING * INTO v_cal;

  INSERT INTO public.calendar_permissions (calendar_id, user_id, role, granted_by)
  VALUES (v_cal.id, p_owner_id, 'admin', p_owner_id)
  ON CONFLICT (calendar_id, user_id) DO UPDATE SET role = 'admin';

  RETURN to_jsonb(v_cal);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. SEED DE DATOS: USUARIOS DEMO (password: password123)
INSERT INTO public.users (id, email, password_hash, full_name, role)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'carlos.admin@planifika.app', crypt('password123', gen_salt('bf', 10)), 'Carlos Martínez (Administrador)', 'admin'),
  ('a0000000-0000-0000-0000-000000000002', 'elena.editor@planifika.app', crypt('password123', gen_salt('bf', 10)), 'Elena Ramos (Editora)', 'user'),
  ('a0000000-0000-0000-0000-000000000003', 'david.viewer@planifika.app', crypt('password123', gen_salt('bf', 10)), 'David Soto (Espectador)', 'user')
ON CONFLICT (email) DO UPDATE
SET id = EXCLUDED.id, role = EXCLUDED.role;

-- 10. PERMISOS Y CONTROL DE ACCESO (ANON / AUTHENTICATED / PUBLIC)
-- En Planifika la autenticación se gestiona íntegramente en la tabla public.users (sin GoTrue).
-- Por tanto, la conexión frontend opera con la clave pública 'anon'. Para evitar errores RLS
-- se desactiva RLS en las tablas y se asignan permisos completos:
GRANT USAGE ON SCHEMA public TO anon, authenticated, public;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, public;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, public;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, public;

ALTER TABLE public.calendars DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acceso universal public users" ON public.users;
CREATE POLICY "Acceso universal public users" ON public.users FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso universal public calendars" ON public.calendars;
CREATE POLICY "Acceso universal public calendars" ON public.calendars FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso universal public calendar_permissions" ON public.calendar_permissions;
CREATE POLICY "Acceso universal public calendar_permissions" ON public.calendar_permissions FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso universal public tasks" ON public.tasks;
CREATE POLICY "Acceso universal public tasks" ON public.tasks FOR ALL TO public USING (true) WITH CHECK (true);`;

export const SettingsView: React.FC = () => {
  const {
    supabaseCredentials,
    saveSupabaseCredentials,
    isLiveConnected,
    resetDemoData,
    allProfiles,
    addNewProfile,
    createUserWithPassword,
    updateUserAccount,
    deleteUserAccount,
    currentUser,
    isAdminUser,
    setActiveTab: setGlobalActiveTab,
    showToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'supabase' | 'users' | 'sql' | 'netlify'>('supabase');

  // Access barrier: only administrators can view configuration
  if (!isAdminUser) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white border border-slate-200 rounded-2xl text-center shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Acceso restringido a Administradores</h3>
        <p className="text-xs text-slate-500 mt-2 mb-6 max-w-sm mx-auto leading-relaxed">
          La configuración del sistema, gestión de credenciales de base de datos y administración global de usuarios está reservada exclusivamente a usuarios con rol de Administrador.
        </p>
        <button
          onClick={() => setGlobalActiveTab('weekly')}
          className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
        >
          Ir al Calendario Semanal
        </button>
      </div>
    );
  }

  // Supabase input state
  const [url, setUrl] = useState(supabaseCredentials.url);
  const [anonKey, setAnonKey] = useState(supabaseCredentials.anonKey);
  const [testing, setTesting] = useState(false);

  // New user state (Admin creation with password & role)
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user'>('user');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Edit user state
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'user'>('user');
  const [editPassword, setEditPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  // Delete user state
  const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedRlsFix, setCopiedRlsFix] = useState(false);
  const [copiedShareUrl, setCopiedShareUrl] = useState(false);

  const handleCopyShareUrl = () => {
    if (!url || !anonKey) return;
    const origin = window.location.origin + window.location.pathname;
    const shareUrl = `${origin}?sb_url=${encodeURIComponent(url.trim())}&sb_key=${encodeURIComponent(anonKey.trim())}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedShareUrl(true);
    showToast('Enlace de conexión automática a Supabase copiado al portapapeles', 'success');
    setTimeout(() => setCopiedShareUrl(false), 3000);
  };

  const RLS_FIX_SQL = `-- 1. Desactivar RLS en las 4 tablas (Soluciona "new row violates row-level security policy"):
ALTER TABLE public.calendars DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 2. Asegurar función segura para crear calendarios (bypasses RLS):
CREATE OR REPLACE FUNCTION public.create_app_calendar(
  p_name TEXT,
  p_description TEXT DEFAULT '',
  p_color_theme TEXT DEFAULT 'blue',
  p_owner_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_cal RECORD;
BEGIN
  IF p_owner_id IS NULL THEN
    RAISE EXCEPTION 'El owner_id es obligatorio para crear un calendario';
  END IF;

  INSERT INTO public.calendars (name, description, color_theme, owner_id)
  VALUES (p_name, COALESCE(p_description, ''), COALESCE(p_color_theme, 'blue'), p_owner_id)
  RETURNING * INTO v_cal;

  INSERT INTO public.calendar_permissions (calendar_id, user_id, role, granted_by)
  VALUES (v_cal.id, p_owner_id, 'admin', p_owner_id)
  ON CONFLICT (calendar_id, user_id) DO UPDATE SET role = 'admin';

  RETURN to_jsonb(v_cal);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`;

  const copyRlsFix = () => {
    navigator.clipboard.writeText(RLS_FIX_SQL);
    setCopiedRlsFix(true);
    showToast('Comando de solución RLS copiado al portapapeles', 'success');
    setTimeout(() => setCopiedRlsFix(false), 2000);
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setTesting(true);
    try {
      await saveSupabaseCredentials(url.trim(), anonKey.trim());
    } finally {
      setTesting(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      showToast('Por favor completa todos los campos (nombre, correo y contraseña)', 'error');
      return;
    }
    if (newUserPassword.length < 6) {
      showToast('La contraseña debe tener al menos 6 caracteres', 'error');
      return;
    }
    setIsCreatingUser(true);
    try {
      const res = await createUserWithPassword(
        newUserEmail.trim(),
        newUserPassword.trim(),
        newUserName.trim(),
        newUserRole
      );
      if (res.success) {
        setNewUserName('');
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserRole('user');
      } else {
        showToast(res.error || 'Error al crear usuario', 'error');
      }
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleOpenEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setEditFullName(user.full_name);
    setEditEmail(user.email);
    setEditRole(user.system_role);
    setEditPassword('');
    setShowEditPassword(false);
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editFullName.trim() || !editEmail.trim()) {
      showToast('El nombre y el correo no pueden estar vacíos', 'error');
      return;
    }
    if (editPassword && editPassword.length < 6) {
      showToast('La nueva contraseña debe tener al menos 6 caracteres', 'error');
      return;
    }
    setIsUpdatingUser(true);
    try {
      const res = await updateUserAccount(editingUser.id, {
        full_name: editFullName.trim(),
        email: editEmail.trim(),
        role: editRole,
        password: editPassword.trim() || undefined,
      });
      if (res.success) {
        setEditingUser(null);
        setEditPassword('');
      } else {
        showToast(res.error || 'Error al actualizar usuario', 'error');
      }
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    setIsDeletingUser(true);
    try {
      const res = await deleteUserAccount(deletingUser.id);
      if (res.success) {
        setDeletingUser(null);
      } else {
        showToast(res.error || 'Error al eliminar usuario', 'error');
      }
    } finally {
      setIsDeletingUser(false);
    }
  };

  const copySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCRIPT);
    setCopiedSql(true);
    showToast('Script SQL copiado al portapapeles', 'success');
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const downloadSql = () => {
    const element = document.createElement('a');
    const file = new Blob([SUPABASE_SQL_SCRIPT], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'planifika_supabase_schema.sql';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="pb-6 border-b border-slate-200">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-slate-800" />
          <span>Panel de Configuración y Administración</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Gestiona la conexión con Supabase Auth & PostgreSQL, usuarios del sistema, scripts SQL de seguridad y despliegue en Netlify.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mt-6 p-1 bg-slate-200/60 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('supabase')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'supabase' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Conexión Supabase</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'users' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Gestión de Usuarios</span>
        </button>

        <button
          onClick={() => setActiveTab('sql')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'sql' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Script SQL & RLS</span>
        </button>

        <button
          onClick={() => setActiveTab('netlify')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'netlify' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Despliegue Netlify</span>
        </button>
      </div>

      {/* Tab 1: Supabase Configuration */}
      {activeTab === 'supabase' && (
        <div className="mt-6 space-y-6 max-w-3xl">
          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-slate-800" />
                <h3 className="text-sm font-bold text-slate-900">
                  Credenciales de Supabase
                </h3>
              </div>
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-md flex items-center gap-1.5 ${
                  isLiveConnected
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isLiveConnected ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                {isLiveConnected ? 'Conectado en Vivo' : 'Modo Demostración / Offline'}
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Planifika se conecta automáticamente a tu proyecto de Supabase en vivo (PostgreSQL + Auth + RLS) mediante las variables de entorno de Netlify (<code className="bg-slate-100 px-1 py-0.5 rounded font-mono">VITE_SUPABASE_URL</code> y <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">VITE_SUPABASE_ANON_KEY</code>). Todos los usuarios y dispositivos comparten la misma base de datos automáticamente sin necesidad de realizar ninguna operación manual.
            </p>

            <form onSubmit={handleSaveCredentials} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Project URL (VITE_SUPABASE_URL)
                </label>
                <input
                  type="text"
                  placeholder="https://xxxxxxxxxxxx.supabase.co"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  ⚠️ <strong>Importante:</strong> Debe ser la <em>Project URL</em> base (ej: <code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded">https://xyzcompany.supabase.co</code>). <strong>NO</strong> añadas <code className="text-rose-600 bg-rose-50 px-1 py-0.5 rounded">/rest/v1</code> ni barras al final <code className="text-rose-600 bg-rose-50 px-1 py-0.5 rounded">/</code>, ya que causará el error <em>&quot;Invalid path specified in request URL&quot;</em>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  API Anon Key (VITE_SUPABASE_ANON_KEY)
                </label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetDemoData}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Restablecer datos demo</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={testing}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {testing ? 'Comprobando...' : 'Guardar y Conectar'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab 2: Users Management */}
      {activeTab === 'users' && (
        <div className="mt-6 space-y-6 max-w-4xl">
          {/* Create user */}
          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-slate-800" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Dar de alta nuevo usuario en el sistema
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Crea credenciales completas con contraseña y rol de acceso en la base de datos Supabase
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre y Apellidos <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="Ej: Laura Gómez"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                    />
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Correo Electrónico <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="laura@planifika.app"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contraseña <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      placeholder="Mínimo 6 caracteres..."
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      className="w-full pl-9 pr-9 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                      title={showNewPassword ? 'Ocultar' : 'Ver'}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Rol en el sistema
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewUserRole('user')}
                      className={`p-2 rounded-xl border text-xs text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        newUserRole === 'user'
                          ? 'bg-slate-900 text-white border-slate-900 font-semibold shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Colaborador</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewUserRole('admin')}
                      className={`p-2 rounded-xl border text-xs text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        newUserRole === 'admin'
                          ? 'bg-amber-600 text-white border-amber-600 font-semibold shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>Administrador</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{isCreatingUser ? 'Guardando en Supabase...' : 'Dar de alta usuario'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Users list */}
          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-800" />
                <span>Usuarios registrados ({allProfiles.length})</span>
              </h3>
              <span className="text-[11px] text-slate-500">
                Control de altas, modificaciones y bajas
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {allProfiles.map((p) => {
                const isAdmin = p.system_role === 'admin';
                const isCurrent = currentUser?.id === p.id;
                const isPrimaryAdmin = p.id === 'a0000000-0000-0000-0000-000000000001' || p.id === 'usr-admin-carlos';
                const isProtectedFromDelete = isCurrent || isPrimaryAdmin;

                return (
                  <div key={p.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 px-2 rounded-xl transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                        isAdmin ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {p.avatar_url ? (
                          <img
                            src={p.avatar_url}
                            alt={p.full_name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          p.full_name.charAt(0)
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900 truncate">{p.full_name}</p>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            isAdmin
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {isAdmin ? <Shield className="w-2.5 h-2.5 text-amber-600" /> : <User className="w-2.5 h-2.5 text-slate-500" />}
                            <span>{isAdmin ? 'Administrador' : 'Colaborador'}</span>
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] bg-slate-900 text-white font-semibold px-1.5 py-0.2 rounded">
                              Tú
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono truncate">{p.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditUser(p)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                        title="Modificar datos del usuario"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                        <span>Modificar</span>
                      </button>

                      <button
                        type="button"
                        disabled={isProtectedFromDelete}
                        onClick={() => setDeletingUser(p)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                          isProtectedFromDelete
                            ? 'text-slate-400 bg-slate-50 border-slate-200 cursor-not-allowed opacity-60'
                            : 'text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200 cursor-pointer'
                        }`}
                        title={
                          isCurrent
                            ? 'No puedes eliminar la cuenta actualmente en uso'
                            : isPrimaryAdmin
                            ? 'No se puede eliminar la cuenta principal de administración'
                            : 'Eliminar usuario de la base de datos'
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: SQL Script & RLS */}
      {activeTab === 'sql' && (
        <div className="mt-6 space-y-6 max-w-4xl">
          {/* Card Solución RLS */}
          <div className="p-5 bg-amber-50/80 border border-amber-200 rounded-2xl shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-200/70 text-amber-900 uppercase tracking-wide">
                  Solución para error: &quot;new row violates row-level security policy&quot;
                </span>
                <h4 className="text-sm font-bold text-slate-900 mt-2">
                  ¿Error RLS al crear un calendario o tareas?
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                  Al gestionar los usuarios directamente en la tabla <code className="bg-amber-100 text-amber-900 px-1 py-0.5 rounded">public.users</code> (sin Supabase Auth / GoTrue), las solicitudes cliente usan la anon key. Para que Supabase permita crear calendarios y tareas sin bloqueo de RLS, ejecuta esta solución en el SQL Editor de tu proyecto Supabase:
                </p>
              </div>

              <button
                onClick={copyRlsFix}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl transition-colors shrink-0 shadow-xs cursor-pointer"
              >
                {copiedRlsFix ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedRlsFix ? '¡Copiado!' : 'Copiar Solución RLS'}</span>
              </button>
            </div>

            <div className="mt-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
              <pre className="text-[11px] font-mono text-amber-300 overflow-x-auto leading-relaxed">
                <code>{RLS_FIX_SQL}</code>
              </pre>
            </div>
          </div>

          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Script de Inicialización y Esquema Completo en Supabase</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ejecuta este script en el SQL Editor de tu consola de Supabase para generar tablas, llaves foráneas y el trigger de seguridad.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={copySql}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? '¡Copiado!' : 'Copiar SQL'}</span>
                </button>

                <button
                  onClick={downloadSql}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar .sql</span>
                </button>
              </div>
            </div>

            <div className="relative rounded-xl overflow-hidden bg-slate-950 p-4">
              <pre className="text-[11px] font-mono text-slate-300 leading-relaxed overflow-x-auto max-h-96">
                <code>{SUPABASE_SQL_SCRIPT}</code>
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Netlify Deployment */}
      {activeTab === 'netlify' && (
        <div className="mt-6 space-y-6 max-w-3xl">
          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-600" />
              <span>Instrucciones de Despliegue en Netlify</span>
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed">
              Planifika está completamente configurada para despliegue estático en <b>Netlify</b> como Single Page Application (SPA).
            </p>

            <div className="space-y-3 pt-2">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-900">1. Archivo `netlify.toml`</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Ya está creado en la raíz del repositorio con la regla de redirección `/*` a `/index.html` con status 200 para evitar errores 404 en rutas SPA.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-900">2. Variables de Entorno en Netlify</h4>
                <p className="text-xs text-slate-600 mt-1">
                  En el panel de Netlify (<b>Site configuration → Environment variables</b>), añade:
                </p>
                <div className="mt-2 space-y-1 font-mono text-xs">
                  <div className="p-1.5 bg-white rounded border border-slate-200 flex justify-between">
                    <span className="text-slate-800 font-bold">VITE_SUPABASE_URL</span>
                    <span className="text-slate-500">Tu URL del proyecto Supabase</span>
                  </div>
                  <div className="p-1.5 bg-white rounded border border-slate-200 flex justify-between">
                    <span className="text-slate-800 font-bold">VITE_SUPABASE_ANON_KEY</span>
                    <span className="text-slate-500">Tu clave pública anónima</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-900">3. Comando de Construcción</h4>
                <p className="text-xs text-slate-600 mt-1 font-mono">
                  Build command: <span className="font-bold text-slate-900">npm run build</span> | Publish directory: <span className="font-bold text-slate-900">dist</span>
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>4. Cómo quitar el botón &quot;Powered by Netlify&quot;</span>
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Para eliminar el botón o badge flotante de Netlify en tu aplicación:
                </p>
                <ul className="text-xs text-slate-600 mt-1.5 list-disc list-inside space-y-1">
                  <li>En tu panel de Netlify: accede a <b>Site configuration</b> → <b>General</b> → <b>Site details</b> y desmarca la opción del <i>Netlify badge</i> si está activa.</li>
                  <li>Revisa <b>Build & deploy</b> → <b>Snippet injection</b> y elimina cualquier snippet HTML inyectado que cargue el badge.</li>
                  <li>En el código fuente de Planifika ya hemos añadido reglas automáticas en CSS para ocultar selectores de badges inyectados por Netlify.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Modificar Usuario */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Modificar Usuario</h3>
                  <p className="text-[10px] text-slate-500">Actualizar datos, rol y contraseña</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre y Apellidos <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Correo Electrónico <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rol en el sistema
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditRole('user')}
                    className={`p-2 rounded-xl border text-xs text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      editRole === 'user'
                        ? 'bg-slate-900 text-white border-slate-900 font-semibold shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Colaborador</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditRole('admin')}
                    className={`p-2 rounded-xl border text-xs text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      editRole === 'admin'
                        ? 'bg-amber-600 text-white border-amber-600 font-semibold shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Administrador</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nueva Contraseña (Opcional)
                </label>
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    placeholder="Dejar en blanco para conservar la actual"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full pl-9 pr-9 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                    title={showEditPassword ? 'Ocultar' : 'Ver'}
                  >
                    {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Introduce una contraseña solo si deseas cambiarla (mínimo 6 caracteres).
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="w-1/2 py-2 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer text-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingUser}
                  className="w-1/2 py-2 px-3 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all cursor-pointer text-center disabled:opacity-50"
                >
                  {isUpdatingUser ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmación Eliminar Usuario */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 p-5 space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
              <Trash2 className="w-5 h-5" />
            </div>

            <div className="text-center">
              <h3 className="text-sm font-bold text-slate-900">¿Eliminar este usuario?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Estás a punto de eliminar la cuenta de <b>{deletingUser.full_name}</b> ({deletingUser.email}).
                Esta acción revocará sus accesos y permisos en la base de datos Supabase.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="w-1/2 py-2 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer text-center"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingUser}
                onClick={handleConfirmDelete}
                className="w-1/2 py-2 px-3 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all cursor-pointer text-center disabled:opacity-50 shadow-xs"
              >
                {isDeletingUser ? 'Eliminando...' : 'Eliminar Usuario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
