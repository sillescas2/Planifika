import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
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

-- 8. SEED DE DATOS: USUARIOS DEMO (password: password123)
INSERT INTO public.users (email, password_hash, full_name, role)
VALUES
  ('carlos.admin@planifika.app', crypt('password123', gen_salt('bf', 10)), 'Carlos Martínez', 'admin'),
  ('elena.editor@planifika.app', crypt('password123', gen_salt('bf', 10)), 'Elena Ramos', 'user'),
  ('david.viewer@planifika.app', crypt('password123', gen_salt('bf', 10)), 'David Soto', 'user')
ON CONFLICT (email) DO NOTHING;`;

export const SettingsView: React.FC = () => {
  const {
    supabaseCredentials,
    saveSupabaseCredentials,
    isLiveConnected,
    resetDemoData,
    allProfiles,
    addNewProfile,
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

  // New user state
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);

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
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    await addNewProfile({
      id: `usr-${Date.now()}`,
      email: newUserEmail.trim(),
      full_name: newUserName.trim(),
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(newUserName.trim())}`,
      system_role: 'user',
    });

    setNewUserName('');
    setNewUserEmail('');
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
              Planifika funciona con tu proyecto de Supabase en vivo (PostgreSQL + Auth + RLS) o en modo demostración local reactivo con control de permisos y almacenamiento persistente.
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
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-xs disabled:opacity-50"
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
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-slate-800" />
              <span>Registrar nuevo usuario en el sistema</span>
            </h3>

            <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-5">
                <input
                  type="text"
                  required
                  placeholder="Nombre y Apellidos"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <div className="sm:col-span-5">
                <input
                  type="email"
                  required
                  placeholder="correo@empresa.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="w-full h-full py-2 px-3 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>

          {/* Users list */}
          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">
              Usuarios registrados ({allProfiles.length})
            </h3>

            <div className="divide-y divide-slate-100">
              {allProfiles.map((p) => (
                <div key={p.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center font-bold text-xs">
                      {p.full_name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{p.full_name}</p>
                      <p className="text-[11px] text-slate-500 font-mono">{p.email}</p>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                    ID: {p.id.slice(0, 16)}...
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: SQL Script & RLS */}
      {activeTab === 'sql' && (
        <div className="mt-6 space-y-6 max-w-4xl">
          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Script de Inicialización y Políticas RLS en Supabase</span>
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
