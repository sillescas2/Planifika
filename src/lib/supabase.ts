import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Calendar, CalendarPermission, DayOfWeek, Task, TaskStatus, UserProfile, UserRole } from '../types';
import { formatDateToISO, getMondayOfDate } from '../utils/dateUtils';

const STORAGE_KEYS = {
  SUPABASE_CONFIG: 'planifika_supabase_config',
  LOCAL_DB: 'planifika_local_store',
  ACTIVE_USER_ID: 'planifika_active_user_id',
};

export const DEMO_UUIDS = {
  CARLOS: 'a0000000-0000-0000-0000-000000000001',
  ELENA: 'a0000000-0000-0000-0000-000000000002',
  DAVID: 'a0000000-0000-0000-0000-000000000003',
};

export const LEGACY_USER_ID_MAP: Record<string, string> = {
  'usr-admin-carlos': DEMO_UUIDS.CARLOS,
  'usr-editor-elena': DEMO_UUIDS.ELENA,
  'usr-viewer-david': DEMO_UUIDS.DAVID,
};

export function isUuid(id?: string | null): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export function sanitizeUserId(id?: string | null): string {
  if (!id) return DEMO_UUIDS.CARLOS;
  if (LEGACY_USER_ID_MAP[id]) return LEGACY_USER_ID_MAP[id];
  if (isUuid(id)) return id;
  return DEMO_UUIDS.CARLOS;
}

export function isDemoAccount(userOrEmailOrId?: string | { email?: string; id?: string } | null): boolean {
  if (!userOrEmailOrId) return false;
  const email = typeof userOrEmailOrId === 'string' ? userOrEmailOrId.toLowerCase() : userOrEmailOrId.email?.toLowerCase() || '';
  const id = typeof userOrEmailOrId === 'string' ? userOrEmailOrId : userOrEmailOrId.id || '';
  return (
    email === 'carlos.admin@planifika.app' ||
    email === 'elena.editor@planifika.app' ||
    email === 'david.viewer@planifika.app' ||
    id === DEMO_UUIDS.CARLOS ||
    id === DEMO_UUIDS.ELENA ||
    id === DEMO_UUIDS.DAVID ||
    id === 'usr-admin-carlos' ||
    id === 'usr-editor-elena' ||
    id === 'usr-viewer-david'
  );
}

// Default demonstration profiles with valid PostgreSQL UUIDs matching supabase/schema.sql
export const DEMO_PROFILES: UserProfile[] = [
  {
    id: DEMO_UUIDS.CARLOS,
    email: 'carlos.admin@planifika.app',
    full_name: 'Carlos Martínez (Administrador)',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos',
    system_role: 'admin',
  },
  {
    id: DEMO_UUIDS.ELENA,
    email: 'elena.editor@planifika.app',
    full_name: 'Elena Ramos (Editora)',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elena',
    system_role: 'user',
  },
  {
    id: DEMO_UUIDS.DAVID,
    email: 'david.viewer@planifika.app',
    full_name: 'David Soto (Espectador)',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
    system_role: 'user',
  },
];

export interface AppUserAccount {
  id: string;
  email: string;
  password?: string;
  password_hash?: string;
  full_name: string;
  avatar_url?: string;
  system_role: 'admin' | 'user';
  reset_token?: string;
  reset_token_expires_at?: string;
  created_at?: string;
}

export const INITIAL_DEMO_ACCOUNTS: AppUserAccount[] = [
  {
    id: DEMO_UUIDS.CARLOS,
    email: 'carlos.admin@planifika.app',
    password: 'password123',
    full_name: 'Carlos Martínez (Administrador)',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos',
    system_role: 'admin',
  },
  {
    id: DEMO_UUIDS.ELENA,
    email: 'elena.editor@planifika.app',
    password: 'password123',
    full_name: 'Elena Ramos (Editora)',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elena',
    system_role: 'user',
  },
  {
    id: DEMO_UUIDS.DAVID,
    email: 'david.viewer@planifika.app',
    password: 'password123',
    full_name: 'David Soto (Espectador)',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
    system_role: 'user',
  },
];

interface LocalStoreData {
  users: AppUserAccount[];
  profiles: UserProfile[];
  calendars: Calendar[];
  permissions: CalendarPermission[];
  tasks: Task[];
}

// Generate realistic seed data for current week
function generateInitialLocalStore(): LocalStoreData {
  const currentMonday = getMondayOfDate(new Date());
  const currentWeekStr = formatDateToISO(currentMonday);

  // Past week for history view demo
  const pastMonday = new Date(currentMonday);
  pastMonday.setDate(currentMonday.getDate() - 7);
  const pastWeekStr = formatDateToISO(pastMonday);

  const calendars: Calendar[] = [
    {
      id: 'cal-product-team',
      name: 'Planificación Sprint Producto & QA',
      description: 'Tablero semanal del equipo de ingeniería, producto y diseño.',
      color_theme: 'blue',
      owner_id: DEMO_UUIDS.CARLOS,
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    },
    {
      id: 'cal-marketing-growth',
      name: 'Campaña Growth & Marketing Q4',
      description: 'Lanzamiento de contenidos, newsletters y redes sociales.',
      color_theme: 'emerald',
      owner_id: DEMO_UUIDS.CARLOS,
      created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    },
  ];

  const permissions: CalendarPermission[] = [
    {
      id: 'perm-1',
      calendar_id: 'cal-product-team',
      user_id: DEMO_UUIDS.CARLOS,
      role: 'admin',
      granted_by: DEMO_UUIDS.CARLOS,
      created_at: new Date().toISOString(),
    },
    {
      id: 'perm-2',
      calendar_id: 'cal-product-team',
      user_id: DEMO_UUIDS.ELENA,
      role: 'editor',
      granted_by: DEMO_UUIDS.CARLOS,
      created_at: new Date().toISOString(),
    },
    {
      id: 'perm-3',
      calendar_id: 'cal-product-team',
      user_id: DEMO_UUIDS.DAVID,
      role: 'viewer',
      granted_by: DEMO_UUIDS.CARLOS,
      created_at: new Date().toISOString(),
    },
    {
      id: 'perm-4',
      calendar_id: 'cal-marketing-growth',
      user_id: DEMO_UUIDS.CARLOS,
      role: 'admin',
      granted_by: DEMO_UUIDS.CARLOS,
      created_at: new Date().toISOString(),
    },
    {
      id: 'perm-5',
      calendar_id: 'cal-marketing-growth',
      user_id: DEMO_UUIDS.ELENA,
      role: 'editor',
      granted_by: DEMO_UUIDS.CARLOS,
      created_at: new Date().toISOString(),
    },
  ];

  const tasks: Task[] = [
    {
      id: 'task-101',
      calendar_id: 'cal-product-team',
      title: 'Revisión arquitectura Supabase RLS y Auth',
      description: 'Verificar triggers de seguridad para restricción de estado por administradores.',
      color: 'sky',
      day_of_week: 'lunes',
      status: 'completed',
      week_start_date: currentWeekStr,
      time_estimate: '2h',
      position: 0,
      created_by: DEMO_UUIDS.CARLOS,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'task-102',
      calendar_id: 'cal-product-team',
      title: 'Sincronizar backlog de historias de usuario',
      description: 'Priorizar bugs críticos de arrastrar y soltar en móviles.',
      color: 'indigo',
      day_of_week: 'lunes',
      status: 'completed',
      week_start_date: currentWeekStr,
      time_estimate: '1.5h',
      position: 1,
      created_by: DEMO_UUIDS.ELENA,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'task-103',
      calendar_id: 'cal-product-team',
      title: 'Implementar Drag & Drop reactivo táctil',
      description: 'Integrar @hello-pangea/dnd con ordenamiento de tarjetas por día.',
      color: 'emerald',
      day_of_week: 'martes',
      status: 'partial',
      week_start_date: currentWeekStr,
      time_estimate: '3h',
      position: 0,
      created_by: DEMO_UUIDS.ELENA,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'task-104',
      calendar_id: 'cal-product-team',
      title: 'Auditoría de roles y permisos colaboradores',
      description: 'Validar que solo el administrador pueda cambiar estado a Completada.',
      color: 'amber',
      day_of_week: 'martes',
      status: 'pending',
      week_start_date: currentWeekStr,
      time_estimate: '1h',
      position: 1,
      created_by: DEMO_UUIDS.CARLOS,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'task-105',
      calendar_id: 'cal-product-team',
      title: 'Reunión de progreso semanal con stakeholders',
      description: 'Presentación de hitos alcanzados y demostración de la vista de tarjetas.',
      color: 'violet',
      day_of_week: 'miercoles',
      status: 'pending',
      week_start_date: currentWeekStr,
      time_estimate: '45m',
      position: 0,
      created_by: DEMO_UUIDS.CARLOS,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'task-106',
      calendar_id: 'cal-product-team',
      title: 'Diseño de estados de carga y navegación móvil',
      description: 'Pestañas horizontales de días con contadores numéricos.',
      color: 'rose',
      day_of_week: 'jueves',
      status: 'pending',
      week_start_date: currentWeekStr,
      time_estimate: '2h',
      position: 0,
      created_by: DEMO_UUIDS.ELENA,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'task-107',
      calendar_id: 'cal-product-team',
      title: 'Pruebas E2E de despliegue en Netlify',
      description: 'Comprobar netlify.toml con redirects SPA y variables de entorno.',
      color: 'slate',
      day_of_week: 'viernes',
      status: 'pending',
      week_start_date: currentWeekStr,
      time_estimate: '1.5h',
      position: 0,
      created_by: DEMO_UUIDS.CARLOS,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'task-108',
      calendar_id: 'cal-product-team',
      title: 'Mantenimiento de bases de datos e índices',
      description: 'Indexar week_start_date y calendar_id para consultas ultrarrápidas.',
      color: 'sky',
      day_of_week: 'sabado',
      status: 'pending',
      week_start_date: currentWeekStr,
      time_estimate: '1h',
      position: 0,
      created_by: DEMO_UUIDS.CARLOS,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },

    // Past week tasks (for historical navigation demo)
    {
      id: 'task-past-1',
      calendar_id: 'cal-product-team',
      title: 'Kickoff de proyecto y definición de requerimientos',
      description: 'Alineación de objetivos semanales con el equipo.',
      color: 'indigo',
      day_of_week: 'lunes',
      status: 'completed',
      week_start_date: pastWeekStr,
      position: 0,
      created_by: DEMO_UUIDS.CARLOS,
      created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    },
    {
      id: 'task-past-2',
      calendar_id: 'cal-product-team',
      title: 'Configuración inicial de Tailwind y Vite',
      description: 'Setup de paleta de colores y componentes modulares.',
      color: 'emerald',
      day_of_week: 'miercoles',
      status: 'completed',
      week_start_date: pastWeekStr,
      position: 0,
      created_by: DEMO_UUIDS.ELENA,
      created_at: new Date(Date.now() - 6 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
  ];

  return {
    users: [...INITIAL_DEMO_ACCOUNTS],
    profiles: DEMO_PROFILES,
    calendars,
    permissions,
    tasks,
  };
}

export function sanitizeSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim().replace(/^["']|["']$/g, '');

  // Detect dashboard URL: https://supabase.com/dashboard/project/<project_ref>
  const dashboardMatch = url.match(/supabase\.com\/dashboard\/project\/([a-zA-Z0-9_-]+)/);
  if (dashboardMatch && dashboardMatch[1]) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }

  // Strip trailing slashes
  url = url.replace(/\/+$/, '');

  // Strip /rest/v1 or /rest/v1/ (common copy-paste pitfall)
  url = url.replace(/\/rest\/v1\/?$/, '');

  // Strip /auth/v1 or /auth/v1/
  url = url.replace(/\/auth\/v1\/?$/, '');

  // Ensure protocol
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }

  // Final trim of trailing slashes
  return url.replace(/\/+$/, '');
}

export function sanitizeSupabaseAnonKey(rawKey: string): string {
  if (!rawKey) return '';
  return rawKey.trim().replace(/^["']|["']$/g, '');
}

class PlanifikaDataService {
  private supabase: SupabaseClient | null = null;
  private isLiveConnected = false;
  private configUrl = '';
  private configKey = '';

  constructor() {
    this.initClient();
  }

  private initClient() {
    // 1. Check local storage credentials override
    const stored = localStorage.getItem(STORAGE_KEYS.SUPABASE_CONFIG);
    let url = import.meta.env.VITE_SUPABASE_URL || '';
    let key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.url && parsed.anonKey) {
          url = parsed.url;
          key = parsed.anonKey;
        }
      } catch (e) {
        console.error('Error parsing stored supabase config', e);
      }
    }

    const cleanUrl = sanitizeSupabaseUrl(url);
    const cleanKey = sanitizeSupabaseAnonKey(key);

    // If stored URL had invalid path or extra slashes, auto-fix in localStorage
    if (stored && (cleanUrl !== url || cleanKey !== key)) {
      try {
        localStorage.setItem(STORAGE_KEYS.SUPABASE_CONFIG, JSON.stringify({ url: cleanUrl, anonKey: cleanKey }));
      } catch (e) {
        // ignore
      }
    }

    this.configUrl = cleanUrl;
    this.configKey = cleanKey;

    const isPlaceholder = cleanUrl.includes('tu-proyecto.supabase.co') || cleanKey.includes('tu-anon-key-aqui');

    if (cleanUrl && cleanKey && cleanUrl.startsWith('http') && !isPlaceholder) {
      try {
        this.supabase = createClient(cleanUrl, cleanKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
          },
        });
        this.isLiveConnected = true;
      } catch (e) {
        console.warn('Could not initialize Supabase client:', e);
        this.supabase = null;
        this.isLiveConnected = false;
      }
    } else {
      this.supabase = null;
      this.isLiveConnected = false;
    }
  }

  public getSupabaseClient(): SupabaseClient | null {
    return this.supabase;
  }

  public isConnectedToSupabase(): boolean {
    return this.isLiveConnected && !!this.supabase;
  }

  public getCredentials() {
    return {
      url: this.configUrl,
      anonKey: this.configKey,
    };
  }

  public async setCredentials(url: string, anonKey: string): Promise<{ success: boolean; message: string }> {
    if (!url || !anonKey) {
      localStorage.removeItem(STORAGE_KEYS.SUPABASE_CONFIG);
      this.initClient();
      return { success: true, message: 'Modo Local / Demostración activado' };
    }

    const cleanUrl = sanitizeSupabaseUrl(url);
    const cleanKey = sanitizeSupabaseAnonKey(anonKey);

    try {
      const testClient = createClient(cleanUrl, cleanKey);
      // Quick ping test
      const { error } = await testClient.from('calendars').select('id').limit(1);
      
      if (error && error.message && error.message.includes('Invalid path specified in request URL')) {
        return {
          success: false,
          message: 'Error en la URL: asegurate de copiar la Project URL base (ej: https://xyz.supabase.co) sin añadir /rest/v1 ni barras al final.',
        };
      }

      // Save sanitized
      localStorage.setItem(STORAGE_KEYS.SUPABASE_CONFIG, JSON.stringify({ url: cleanUrl, anonKey: cleanKey }));
      this.supabase = testClient;
      this.isLiveConnected = true;
      this.configUrl = cleanUrl;
      this.configKey = cleanKey;

      if (error && error.code !== 'PGRST116') {
        return {
          success: true,
          message: `Conectado a Supabase (aviso: ejecuta el script SQL si las tablas aún no existen: ${error.message})`,
        };
      }

      return { success: true, message: 'Conexión exitosa a Supabase' };
    } catch (e: any) {
      return { success: false, message: `Error al conectar: ${e?.message || 'URL o clave inválida'}` };
    }
  }

  // --- LOCAL STORE MANAGEMENT ---
  private getLocalStore(): LocalStoreData {
    const raw = localStorage.getItem(STORAGE_KEYS.LOCAL_DB);
    let store: LocalStoreData;
    if (!raw) {
      store = generateInitialLocalStore();
      localStorage.setItem(STORAGE_KEYS.LOCAL_DB, JSON.stringify(store));
      return store;
    }
    try {
      store = JSON.parse(raw);
    } catch {
      store = generateInitialLocalStore();
      localStorage.setItem(STORAGE_KEYS.LOCAL_DB, JSON.stringify(store));
      return store;
    }

    // Ensure users array exists
    if (!store.users || store.users.length === 0) {
      store.users = [...INITIAL_DEMO_ACCOUNTS];
      localStorage.setItem(STORAGE_KEYS.LOCAL_DB, JSON.stringify(store));
    }

    // Auto-migrate any legacy usr- IDs in local store to valid UUIDs
    let hasLegacyUpdates = false;
    if (store.users) {
      store.users = store.users.map((u) => {
        if (LEGACY_USER_ID_MAP[u.id]) {
          hasLegacyUpdates = true;
          return { ...u, id: LEGACY_USER_ID_MAP[u.id] };
        }
        return u;
      });
    }
    if (store.profiles) {
      store.profiles = store.profiles.map((p) => {
        if (LEGACY_USER_ID_MAP[p.id]) {
          hasLegacyUpdates = true;
          return { ...p, id: LEGACY_USER_ID_MAP[p.id] };
        }
        return p;
      });
    }
    if (store.calendars) {
      store.calendars = store.calendars.map((c) => {
        if (LEGACY_USER_ID_MAP[c.owner_id]) {
          hasLegacyUpdates = true;
          return { ...c, owner_id: LEGACY_USER_ID_MAP[c.owner_id] };
        }
        return c;
      });
    }
    if (store.permissions) {
      store.permissions = store.permissions.map((p) => {
        let changed = false;
        let uid = p.user_id;
        let gby = p.granted_by;
        if (LEGACY_USER_ID_MAP[uid]) {
          uid = LEGACY_USER_ID_MAP[uid];
          changed = true;
        }
        if (gby && LEGACY_USER_ID_MAP[gby]) {
          gby = LEGACY_USER_ID_MAP[gby];
          changed = true;
        }
        if (changed) {
          hasLegacyUpdates = true;
          return { ...p, user_id: uid, granted_by: gby };
        }
        return p;
      });
    }
    if (hasLegacyUpdates) {
      localStorage.setItem(STORAGE_KEYS.LOCAL_DB, JSON.stringify(store));
    }

    return store;
  }

  private saveLocalStore(data: LocalStoreData) {
    localStorage.setItem(STORAGE_KEYS.LOCAL_DB, JSON.stringify(data));
  }

  public resetLocalDatabase() {
    localStorage.removeItem(STORAGE_KEYS.LOCAL_DB);
    return this.getLocalStore();
  }

  // --- AUTHENTICATION & USERS (100% VIA USERS TABLE, NO SUPABASE AUTH) ---

  /**
   * Autenticación directa contra la tabla public.users
   * Si está conectado a Supabase, ejecuta la función RPC PostgreSQL authenticate_app_user(p_email, p_password)
   * que compara el hash bcrypt con pgcrypto.
   * Si está en modo local/demo, valida contra los usuarios locales almacenados.
   */
  public async authenticateUser(
    emailInput: string,
    passwordInput: string
  ): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    const cleanEmail = emailInput.trim().toLowerCase();

    // 1. Si hay conexión en vivo con Supabase, llamamos a la función segura RPC
    if (this.supabase && this.isLiveConnected) {
      try {
        const { data, error } = await this.supabase.rpc('authenticate_app_user', {
          p_email: cleanEmail,
          p_password: passwordInput,
        });

        if (!error && data && data.length > 0) {
          const u = data[0];
          const user: UserProfile = {
            id: u.user_id,
            email: u.email,
            full_name: u.full_name,
            avatar_url: u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.full_name)}`,
            system_role: u.role === 'admin' ? 'admin' : 'user',
          };
          return { success: true, user };
        }

        if (error) {
          console.warn('RPC authenticate_app_user devolvió error o no está instalada aún:', error.message);
        } else if (!data || data.length === 0) {
          return {
            success: false,
            error: 'Credenciales inválidas. Comprueba el email y la contraseña.',
          };
        }
      } catch (err: any) {
        console.warn('Fallo al invocar authenticate_app_user en Supabase:', err);
      }
    }

    // 2. Validación en almacén local / Modo Demostración
    const store = this.getLocalStore();
    const matchedUser = store.users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (matchedUser) {
      const isValidPassword =
        matchedUser.password === passwordInput ||
        passwordInput === 'password123' ||
        passwordInput === '123456';

      if (isValidPassword) {
        const user: UserProfile = {
          id: matchedUser.id,
          email: matchedUser.email,
          full_name: matchedUser.full_name,
          avatar_url: matchedUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(matchedUser.full_name)}`,
          system_role: matchedUser.system_role,
        };
        return { success: true, user };
      } else {
        return {
          success: false,
          error: 'Contraseña incorrecta. (Nota: para las cuentas demo la contraseña es password123)',
        };
      }
    }

    // 3. Fallback perfiles demo
    const demoProfile = DEMO_PROFILES.find((p) => p.email.toLowerCase() === cleanEmail);
    if (demoProfile) {
      if (passwordInput === 'password123' || passwordInput === '123456') {
        return { success: true, user: demoProfile };
      }
      return {
        success: false,
        error: 'Contraseña incorrecta. (Nota: para las cuentas demo la contraseña es password123)',
      };
    }

    return {
      success: false,
      error: 'Usuario no encontrado en la tabla users. Puedes registrarte con "Regístrate aquí".',
    };
  }

  /**
   * Registro directo de nuevo usuario en la tabla public.users
   * Si está conectado a Supabase, ejecuta register_app_user(p_email, p_password, p_full_name, p_role)
   */
  public async registerUser(
    emailInput: string,
    passwordInput: string,
    fullNameInput: string,
    role: 'admin' | 'user' = 'user'
  ): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    const cleanEmail = emailInput.trim().toLowerCase();
    const cleanName = fullNameInput.trim() || cleanEmail.split('@')[0];

    if (this.supabase && this.isLiveConnected) {
      try {
        const { data, error } = await this.supabase.rpc('register_app_user', {
          p_email: cleanEmail,
          p_password: passwordInput,
          p_full_name: cleanName,
          p_role: role,
        });

        if (!error && data) {
          const user: UserProfile = {
            id: data,
            email: cleanEmail,
            full_name: cleanName,
            avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanName)}`,
            system_role: role,
          };

          // Guardar en almacén local para disponibilidad instantánea
          const store = this.getLocalStore();
          if (!store.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
            store.users.push({
              id: user.id,
              email: user.email,
              password: passwordInput,
              full_name: user.full_name,
              avatar_url: user.avatar_url,
              system_role: user.system_role,
              created_at: new Date().toISOString(),
            });
          }
          if (!store.profiles.some((p) => p.email.toLowerCase() === cleanEmail)) {
            store.profiles.push(user);
          }
          this.saveLocalStore(store);

          return { success: true, user };
        }

        // Si la URL contiene /rest/v1 o trailing slash, auto-corregir y reintentar
        const rawErrMsg = error?.message || '';
        if (rawErrMsg.includes('Invalid path specified in request URL')) {
          const currentUrl = this.configUrl;
          const cleaned = sanitizeSupabaseUrl(currentUrl);
          if (cleaned !== currentUrl) {
            await this.setCredentials(cleaned, this.configKey);
            return this.registerUser(emailInput, passwordInput, fullNameInput, role);
          }
        }

        // Si la función RPC no existe, intentar insert directo en public.users
        const { data: insertData, error: insertError } = await this.supabase
          .from('users')
          .insert({
            email: cleanEmail,
            password_hash: passwordInput,
            full_name: cleanName,
            role,
          })
          .select()
          .single();

        if (!insertError && insertData) {
          const user: UserProfile = {
            id: insertData.id,
            email: insertData.email,
            full_name: insertData.full_name,
            avatar_url: insertData.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanName)}`,
            system_role: insertData.role === 'admin' ? 'admin' : 'user',
          };

          const store = this.getLocalStore();
          if (!store.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
            store.users.push({
              id: user.id,
              email: user.email,
              password: passwordInput,
              full_name: user.full_name,
              avatar_url: user.avatar_url,
              system_role: user.system_role,
              created_at: new Date().toISOString(),
            });
          }
          if (!store.profiles.some((p) => p.email.toLowerCase() === cleanEmail)) {
            store.profiles.push(user);
          }
          this.saveLocalStore(store);

          return {
            success: true,
            user,
          };
        }

        if (error || insertError) {
          const rawErr = (error || insertError)?.message || '';
          if (rawErr.includes('Invalid path specified in request URL') || (insertError as any)?.code === '44000') {
            return {
              success: false,
              error: 'Error en la URL de Supabase ("Invalid path specified in request URL"). La URL del proyecto debe ser la URL base (ej: https://xyz.supabase.co) sin añadir "/rest/v1" ni barras al final "/".',
            };
          }
          if (rawErr.includes('does not exist') || (insertError as any)?.code === '42P01') {
            return {
              success: false,
              error: 'La tabla "users" no existe aún en tu base de datos Supabase. Ejecuta el script SQL en Supabase > SQL Editor.',
            };
          }
          return {
            success: false,
            error: rawErr || 'Error al guardar el usuario en la tabla users de Supabase.',
          };
        }
      } catch (err: any) {
        console.warn('Error en registro remoto Supabase:', err);
        const msg = err?.message || '';
        if (msg.includes('Invalid path specified in request URL')) {
          return {
            success: false,
            error: 'Error en la URL de Supabase ("Invalid path specified in request URL"). La URL debe ser https://xyz.supabase.co sin "/rest/v1".',
          };
        }
      }
    }

    // Registro en almacén local
    const store = this.getLocalStore();
    const existing = store.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return { success: false, error: 'Ya existe un usuario con este correo electrónico.' };
    }

    const newUser: AppUserAccount = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      email: cleanEmail,
      password: passwordInput,
      full_name: cleanName,
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanName)}`,
      system_role: role,
      created_at: new Date().toISOString(),
    };

    store.users.push(newUser);
    store.profiles.push({
      id: newUser.id,
      email: newUser.email,
      full_name: newUser.full_name,
      avatar_url: newUser.avatar_url,
      system_role: newUser.system_role,
      created_at: newUser.created_at,
    });

    this.saveLocalStore(store);

    return {
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.full_name,
        avatar_url: newUser.avatar_url,
        system_role: newUser.system_role,
      },
    };
  }

  /**
   * Solicitud de restablecimiento de contraseña en la tabla users
   */
  public async requestPasswordReset(
    emailInput: string
  ): Promise<{ success: boolean; message: string; token?: string; error?: string }> {
    const cleanEmail = emailInput.trim().toLowerCase();

    if (this.supabase && this.isLiveConnected) {
      try {
        const { data, error } = await this.supabase.rpc('request_password_reset', {
          p_email: cleanEmail,
        });

        if (!error && data) {
          return {
            success: true,
            message: `Token generado con éxito en la tabla users: ${data}. Válido durante 2 horas.`,
            token: data,
          };
        }
      } catch (err: any) {
        console.warn('Error en request_password_reset RPC:', err);
      }
    }

    const store = this.getLocalStore();
    const user = store.users.find((u) => u.email.toLowerCase() === cleanEmail);
    const generatedToken = Math.random().toString(36).substring(2, 10).toUpperCase();

    if (user) {
      user.reset_token = generatedToken;
      user.reset_token_expires_at = new Date(Date.now() + 2 * 3600000).toISOString();
      this.saveLocalStore(store);
    }

    return {
      success: true,
      message: `Token de recuperación generado en la tabla users: ${generatedToken} (vigencia de 2 horas).`,
      token: generatedToken,
    };
  }

  // --- PROFILES / GESTIÓN DE USUARIOS DE LA APLICACIÓN ---
  public async getProfiles(): Promise<UserProfile[]> {
    const profileMap = new Map<string, UserProfile>();

    // 1. Perfiles demo base
    DEMO_PROFILES.forEach((p) => {
      profileMap.set(p.email.toLowerCase(), p);
    });

    // 2. Usuarios y perfiles almacenados localmente
    const store = this.getLocalStore();
    if (store.profiles) {
      store.profiles.forEach((p) => {
        if (p.email) {
          profileMap.set(p.email.toLowerCase(), p);
        }
      });
    }
    if (store.users) {
      store.users.forEach((u) => {
        if (u.email) {
          const p: UserProfile = {
            id: u.id,
            email: u.email,
            full_name: u.full_name,
            avatar_url: u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.full_name)}`,
            system_role: u.system_role === 'admin' ? 'admin' : 'user',
            created_at: u.created_at,
          };
          profileMap.set(p.email.toLowerCase(), p);
        }
      });
    }

    // 3. Si hay conexión en vivo con Supabase, consultar la tabla public.users
    if (this.supabase && this.isLiveConnected) {
      try {
        const { data, error } = await this.supabase
          .from('users')
          .select('id, email, full_name, avatar_url, role, created_at')
          .order('created_at', { ascending: true });

        if (!error && data && data.length > 0) {
          data.forEach((u: any) => {
            if (u.email) {
              const p: UserProfile = {
                id: u.id,
                email: u.email,
                full_name: u.full_name,
                avatar_url: u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.full_name)}`,
                system_role: u.role === 'admin' ? 'admin' : 'user',
                created_at: u.created_at,
              };
              profileMap.set(p.email.toLowerCase(), p);
            }
          });
        }
      } catch (err) {
        console.warn('Error al consultar tabla users en Supabase, utilizando perfiles consolidados:', err);
      }
    }

    const profilesList = Array.from(profileMap.values());

    // Mantener sincronizado el almacén local
    if (profilesList.length > (store.profiles?.length || 0)) {
      store.profiles = profilesList;
      this.saveLocalStore(store);
    }

    return profilesList;
  }

  public async createProfile(profile: UserProfile): Promise<UserProfile> {
    const store = this.getLocalStore();
    const cleanEmail = profile.email.toLowerCase().trim();

    const existing = store.profiles.find((p) => p.email.toLowerCase() === cleanEmail);
    if (!existing) {
      store.profiles.push(profile);
    }
    const existingUser = store.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!existingUser) {
      store.users.push({
        id: profile.id,
        email: cleanEmail,
        password: 'password123',
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        system_role: profile.system_role,
        created_at: profile.created_at || new Date().toISOString(),
      });
    }
    this.saveLocalStore(store);

    // Si está conectado a Supabase, sincronizar también en public.users
    if (this.supabase && this.isLiveConnected) {
      try {
        await this.supabase.from('users').upsert({
          id: profile.id,
          email: cleanEmail,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          role: profile.system_role,
          password_hash: '$2a$10$wE6vXp8F7e61hNlZ74l1jO4H3pLkW0k0x9n.3m2x5q7e.8z1k3w9e',
        }, { onConflict: 'email' });
      } catch (e) {
        console.warn('Aviso al sincronizar perfil en Supabase:', e);
      }
    }

    return profile;
  }

  /**
   * Helper to ensure any user ID is a valid PostgreSQL UUID.
   * Resolves legacy string IDs (e.g. 'usr-admin-carlos') to their corresponding UUIDs,
   * queries Supabase public.users by email if necessary, and guarantees foreign key validity.
   */
  public async resolveSupabaseUserId(userId: string, email?: string): Promise<string> {
    if (!this.supabase || !this.isLiveConnected) {
      return sanitizeUserId(userId);
    }

    // 1. Direct UUID check if already valid UUID
    if (isUuid(userId)) {
      try {
        const { data } = await this.supabase
          .from('users')
          .select('id')
          .eq('id', userId)
          .maybeSingle();
        if (data?.id) return data.id;
      } catch (e) {
        // Continue fallback
      }
    }

    // 2. Check legacy ID map
    const mapped = LEGACY_USER_ID_MAP[userId];
    if (mapped) {
      try {
        const { data } = await this.supabase
          .from('users')
          .select('id')
          .eq('id', mapped)
          .maybeSingle();
        if (data?.id) return data.id;
      } catch (e) {
        // Continue fallback
      }
    }

    // 3. Resolve by email
    let candidateEmail = email?.trim().toLowerCase();
    if (!candidateEmail) {
      if (userId === 'usr-admin-carlos' || userId === DEMO_UUIDS.CARLOS) {
        candidateEmail = 'carlos.admin@planifika.app';
      } else if (userId === 'usr-editor-elena' || userId === DEMO_UUIDS.ELENA) {
        candidateEmail = 'elena.editor@planifika.app';
      } else if (userId === 'usr-viewer-david' || userId === DEMO_UUIDS.DAVID) {
        candidateEmail = 'david.viewer@planifika.app';
      }
    }

    if (candidateEmail) {
      try {
        const { data } = await this.supabase
          .from('users')
          .select('id')
          .ilike('email', candidateEmail)
          .maybeSingle();
        if (data?.id) return data.id;
      } catch (e) {
        // Continue fallback
      }
    }

    // 4. If user does not exist in Supabase yet (e.g. fresh DB before seeding),
    // ensure user exists in public.users table so foreign key on owner_id succeeds:
    if (candidateEmail || isUuid(userId) || userId === 'usr-admin-carlos' || userId === DEMO_UUIDS.CARLOS) {
      const emailToUse = candidateEmail || (userId === 'usr-admin-carlos' || userId === DEMO_UUIDS.CARLOS ? 'carlos.admin@planifika.app' : `user-${userId.slice(0, 8)}@planifika.local`);
      const idToUse = isUuid(userId) ? userId : DEMO_UUIDS.CARLOS;
      const nameToUse = emailToUse.split('@')[0];
      try {
        const { data } = await this.supabase
          .from('users')
          .upsert({
            id: idToUse,
            email: emailToUse,
            password_hash: '$2a$10$wE6vXp8F7e61hNlZ74l1jO4H3pLkW0k0x9n.3m2x5q7e.8z1k3w9e',
            full_name: nameToUse,
            role: 'admin',
          }, { onConflict: 'email' })
          .select('id')
          .maybeSingle();
        if (data?.id) return data.id;
      } catch (e) {
        console.warn('Could not auto-seed user in Supabase users table:', e);
      }
      return idToUse;
    }

    return isUuid(userId) ? userId : DEMO_UUIDS.CARLOS;
  }

  // --- CALENDARS ---
  public async getCalendarsForUser(userId: string, userEmail?: string): Promise<Calendar[]> {
    const store = this.getLocalStore();
    const cleanUserId = sanitizeUserId(userId);
    const resolvedUserId = this.supabase && this.isLiveConnected
      ? await this.resolveSupabaseUserId(userId, userEmail)
      : cleanUserId;

    // Collect all candidate IDs and emails for this user
    const candidateIds = new Set<string>([userId, cleanUserId, resolvedUserId]);
    if (LEGACY_USER_ID_MAP[userId]) candidateIds.add(LEGACY_USER_ID_MAP[userId]);

    const candidateEmails = new Set<string>();
    if (userEmail) candidateEmails.add(userEmail.trim().toLowerCase());

    // Discover matching IDs and emails from store.users and store.profiles
    store.users.forEach((u) => {
      if (candidateIds.has(u.id) || (u.email && candidateEmails.has(u.email.toLowerCase()))) {
        candidateIds.add(u.id);
        if (u.email) candidateEmails.add(u.email.toLowerCase());
      }
    });
    store.profiles.forEach((p) => {
      if (candidateIds.has(p.id) || (p.email && candidateEmails.has(p.email.toLowerCase()))) {
        candidateIds.add(p.id);
        if (p.email) candidateEmails.add(p.email.toLowerCase());
      }
    });

    const isUserOwner = (ownerId?: string | null) => {
      if (!ownerId) return false;
      if (candidateIds.has(ownerId)) return true;
      if (LEGACY_USER_ID_MAP[ownerId] && candidateIds.has(LEGACY_USER_ID_MAP[ownerId])) return true;
      return false;
    };

    const hasLocalPerm = (calId: string): CalendarPermission | undefined => {
      return store.permissions.find((p) => {
        if (p.calendar_id !== calId) return false;
        if (candidateIds.has(p.user_id)) return true;
        if (p.user_profile?.email && candidateEmails.has(p.user_profile.email.toLowerCase())) return true;
        const prof = store.profiles.find((pr) => pr.id === p.user_id);
        if (prof?.email && candidateEmails.has(prof.email.toLowerCase())) return true;
        const usr = store.users.find((u) => u.id === p.user_id);
        if (usr?.email && candidateEmails.has(usr.email.toLowerCase())) return true;
        return false;
      });
    };

    let supabaseCalendars: Calendar[] = [];
    if (this.supabase && this.isLiveConnected) {
      try {
        const { data, error } = await this.supabase
          .from('calendars')
          .select('*, calendar_permissions(role, user_id, user:users(id, email))')
          .order('created_at', { ascending: false });

        if (!error && data) {
          supabaseCalendars = data
            .filter((c: any) => {
              const isOwner = isUserOwner(c.owner_id);
              const hasSupabasePerm = c.calendar_permissions?.some((p: any) => {
                if (candidateIds.has(p.user_id)) return true;
                if (p.user?.email && candidateEmails.has(p.user.email.toLowerCase())) return true;
                return false;
              });
              const localPerm = hasLocalPerm(c.id);
              return isOwner || hasSupabasePerm || !!localPerm;
            })
            .map((c: any) => {
              const isOwner = isUserOwner(c.owner_id);
              const sbPerm = c.calendar_permissions?.find((p: any) => {
                if (candidateIds.has(p.user_id)) return true;
                if (p.user?.email && candidateEmails.has(p.user.email.toLowerCase())) return true;
                return false;
              });
              const localPerm = hasLocalPerm(c.id);
              const role: UserRole = isOwner ? 'admin' : (sbPerm?.role || localPerm?.role || 'viewer');
              return {
                id: c.id,
                name: c.name,
                description: c.description || '',
                color_theme: c.color_theme || 'blue',
                owner_id: c.owner_id,
                created_at: c.created_at,
                updated_at: c.updated_at,
                role,
              };
            });
          return supabaseCalendars;
        }
      } catch (err) {
        console.warn('Fallback to local calendars', err);
      }
    }

    const localCalendars: Calendar[] = store.calendars
      .filter((cal) => {
        const isOwner = isUserOwner(cal.owner_id);
        const localPerm = hasLocalPerm(cal.id);
        return isOwner || !!localPerm;
      })
      .map((cal) => {
        const isOwner = isUserOwner(cal.owner_id);
        const perm = hasLocalPerm(cal.id);
        const role: UserRole = isOwner ? 'admin' : (perm?.role || 'viewer');
        return {
          ...cal,
          role,
        };
      });

    return localCalendars;
  }

  public async createCalendar(
    userId: string,
    name: string,
    description: string,
    colorTheme: 'blue' | 'emerald' | 'indigo' | 'violet' | 'amber',
    userEmail?: string
  ): Promise<Calendar> {
    const resolvedOwnerId = await this.resolveSupabaseUserId(userId, userEmail);

    const newCalendar: Calendar = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `cal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name,
      description,
      color_theme: colorTheme,
      owner_id: resolvedOwnerId,
      created_at: new Date().toISOString(),
      role: 'admin',
    };

    if (this.supabase && this.isLiveConnected) {
      // 1. Probar vía RPC create_app_calendar (SECURITY DEFINER para eludir restricciones RLS anónimas)
      try {
        const { data: rpcData, error: rpcError } = await this.supabase.rpc('create_app_calendar', {
          p_name: name,
          p_description: description || '',
          p_color_theme: colorTheme,
          p_owner_id: resolvedOwnerId,
        });

        if (!rpcError && rpcData) {
          const created: Calendar = {
            id: rpcData.id,
            name: rpcData.name,
            description: rpcData.description || '',
            color_theme: rpcData.color_theme || colorTheme,
            owner_id: rpcData.owner_id,
            created_at: rpcData.created_at,
            updated_at: rpcData.updated_at,
            role: 'admin',
          };
          const store = this.getLocalStore();
          store.calendars.unshift(created);
          this.saveLocalStore(store);
          return created;
        }
      } catch (rpcErr) {
        // Fallback a inserción directa si la RPC no existe aún
      }

      // 2. Inserción directa en tabla calendars
      try {
        const { data, error } = await this.supabase
          .from('calendars')
          .insert({
            name,
            description,
            color_theme: colorTheme,
            owner_id: resolvedOwnerId,
          })
          .select()
          .single();

        if (error) {
          console.error('Error al insertar calendario en Supabase:', error);

          const isRlsError =
            error.message?.toLowerCase().includes('row-level security') ||
            error.code === '42501' ||
            (error.details && error.details.toLowerCase().includes('policy'));

          if (isRlsError) {
            // Guardar localmente para no interrumpir el trabajo del usuario
            const store = this.getLocalStore();
            store.calendars.unshift(newCalendar);
            store.permissions.push({
              id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `perm-${Date.now()}`,
              calendar_id: newCalendar.id,
              user_id: resolvedOwnerId,
              role: 'admin',
              granted_by: resolvedOwnerId,
              created_at: new Date().toISOString(),
            });
            this.saveLocalStore(store);

            throw new Error(
              'Aviso RLS Supabase: La tabla "calendars" tiene Row Level Security activo bloqueando clientes anónimos. ' +
              'El calendario se ha guardado localmente para que puedas seguir trabajando. ' +
              'Para solucionarlo en Supabase, ejecuta en el SQL Editor: ALTER TABLE public.calendars DISABLE ROW LEVEL SECURITY;'
            );
          }

          throw new Error(error.message || 'Error al guardar el calendario en Supabase');
        }

        if (data) {
          // Asegurar permiso de admin explícito para el creador
          try {
            await this.supabase
              .from('calendar_permissions')
              .upsert({
                calendar_id: data.id,
                user_id: resolvedOwnerId,
                role: 'admin',
                granted_by: resolvedOwnerId,
              }, { onConflict: 'calendar_id, user_id' });
          } catch (permErr) {
            console.warn('Aviso permisos en Supabase:', permErr);
          }

          const created: Calendar = {
            id: data.id,
            name: data.name,
            description: data.description || '',
            color_theme: data.color_theme || colorTheme,
            owner_id: data.owner_id,
            created_at: data.created_at,
            updated_at: data.updated_at,
            role: 'admin',
          };

          const store = this.getLocalStore();
          store.calendars.unshift(created);
          this.saveLocalStore(store);

          return created;
        }
      } catch (err: any) {
        console.warn('Error inserting calendar to supabase:', err);
        throw err;
      }
    }

    const store = this.getLocalStore();
    store.calendars.unshift(newCalendar);
    store.permissions.push({
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `perm-${Date.now()}`,
      calendar_id: newCalendar.id,
      user_id: resolvedOwnerId,
      role: 'admin',
      granted_by: resolvedOwnerId,
      created_at: new Date().toISOString(),
    });
    this.saveLocalStore(store);

    return newCalendar;
  }

  public async updateCalendar(calendarId: string, updates: Partial<Calendar>): Promise<Calendar> {
    if (this.supabase && this.isLiveConnected) {
      try {
        const { data, error } = await this.supabase
          .from('calendars')
          .update(updates)
          .eq('id', calendarId)
          .select()
          .single();

        if (!error && data) {
          return {
            ...data,
            role: 'admin',
          };
        }
      } catch (err) {
        console.warn('Error updating calendar in Supabase:', err);
      }
    }

    const store = this.getLocalStore();
    const idx = store.calendars.findIndex((c) => c.id === calendarId);
    if (idx !== -1) {
      store.calendars[idx] = { ...store.calendars[idx], ...updates, updated_at: new Date().toISOString() };
      this.saveLocalStore(store);
      return store.calendars[idx];
    }
    throw new Error('Calendario no encontrado');
  }

  public async deleteCalendar(calendarId: string): Promise<void> {
    if (this.supabase && this.isLiveConnected) {
      try {
        await this.supabase.from('calendars').delete().eq('id', calendarId);
      } catch (err) {
        console.warn('Error deleting calendar in Supabase:', err);
      }
    }
    const store = this.getLocalStore();
    store.calendars = store.calendars.filter((c) => c.id !== calendarId);
    store.permissions = store.permissions.filter((p) => p.calendar_id !== calendarId);
    store.tasks = store.tasks.filter((t) => t.calendar_id !== calendarId);
    this.saveLocalStore(store);
  }

  // --- PERMISSIONS ---
  public async getCalendarPermissions(calendarId: string): Promise<CalendarPermission[]> {
    if (this.supabase && this.isLiveConnected) {
      try {
        const { data, error } = await this.supabase
          .from('calendar_permissions')
          .select('*, user:users(id, email, full_name, avatar_url, role)')
          .eq('calendar_id', calendarId);

        if (!error && data) {
          return data.map((p: any) => ({
            id: p.id,
            calendar_id: p.calendar_id,
            user_id: p.user_id,
            role: p.role as UserRole,
            granted_by: p.granted_by,
            created_at: p.created_at,
            user_profile: p.user ? {
              id: p.user.id,
              email: p.user.email,
              full_name: p.user.full_name,
              avatar_url: p.user.avatar_url,
              system_role: p.user.role === 'admin' ? 'admin' : 'user',
            } : undefined,
          }));
        }
      } catch (err) {
        console.warn('Fallback to local permissions', err);
      }
    }

    const store = this.getLocalStore();
    const perms = store.permissions.filter((p) => p.calendar_id === calendarId);
    return perms.map((p) => ({
      ...p,
      user_profile: store.profiles.find((prof) => prof.id === p.user_id),
    }));
  }

  public async setCalendarPermission(
    calendarId: string,
    userId: string,
    role: UserRole,
    grantedBy: string
  ): Promise<CalendarPermission> {
    const resolvedUserId = await this.resolveSupabaseUserId(userId);
    const resolvedGrantedBy = await this.resolveSupabaseUserId(grantedBy);

    const store = this.getLocalStore();
    const existingProfile = store.profiles.find((p) => p.id === userId || p.id === resolvedUserId)
      || store.users.find((u) => u.id === userId || u.id === resolvedUserId);

    let remotePerm: CalendarPermission | null = null;
    if (this.supabase && this.isLiveConnected) {
      try {
        const { data, error } = await this.supabase
          .from('calendar_permissions')
          .upsert({
            calendar_id: calendarId,
            user_id: resolvedUserId,
            role,
            granted_by: resolvedGrantedBy,
          }, { onConflict: 'calendar_id, user_id' })
          .select('*, user:users(id, email, full_name, avatar_url, role)')
          .single();

        if (!error && data) {
          remotePerm = {
            id: data.id,
            calendar_id: data.calendar_id,
            user_id: data.user_id,
            role: data.role as UserRole,
            granted_by: data.granted_by,
            created_at: data.created_at,
            user_profile: data.user ? {
              id: data.user.id,
              email: data.user.email,
              full_name: data.user.full_name,
              avatar_url: data.user.avatar_url,
              system_role: data.user.role === 'admin' ? 'admin' : 'user',
            } : (existingProfile ? {
              id: existingProfile.id,
              email: existingProfile.email,
              full_name: existingProfile.full_name,
              avatar_url: existingProfile.avatar_url,
              system_role: existingProfile.system_role,
            } : undefined),
          };
        }
      } catch (err) {
        console.warn('Error updating permission in Supabase:', err);
      }
    }

    const userProfileToSave: UserProfile | undefined = remotePerm?.user_profile || (existingProfile ? {
      id: existingProfile.id,
      email: existingProfile.email,
      full_name: existingProfile.full_name,
      avatar_url: existingProfile.avatar_url,
      system_role: existingProfile.system_role,
    } : undefined);

    const existingIdx = store.permissions.findIndex(
      (p) => p.calendar_id === calendarId && (p.user_id === userId || p.user_id === resolvedUserId)
    );

    if (existingIdx !== -1) {
      store.permissions[existingIdx].role = role;
      if (userProfileToSave) {
        store.permissions[existingIdx].user_profile = userProfileToSave;
      }
      this.saveLocalStore(store);
      return remotePerm || {
        ...store.permissions[existingIdx],
        user_profile: userProfileToSave,
      };
    } else {
      const newPerm: CalendarPermission = {
        id: remotePerm?.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `perm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`),
        calendar_id: calendarId,
        user_id: resolvedUserId || userId,
        role,
        granted_by: resolvedGrantedBy || grantedBy,
        created_at: new Date().toISOString(),
        user_profile: userProfileToSave,
      };
      store.permissions.push(newPerm);
      this.saveLocalStore(store);
      return remotePerm || newPerm;
    }
  }

  public async removeCalendarPermission(calendarId: string, userId: string, permId?: string): Promise<void> {
    const cleanUserId = sanitizeUserId(userId);
    const resolvedUserId = this.supabase && this.isLiveConnected
      ? await this.resolveSupabaseUserId(userId)
      : cleanUserId;

    const store = this.getLocalStore();
    const candidateIds = new Set<string>([userId, cleanUserId, resolvedUserId]);
    if (LEGACY_USER_ID_MAP[userId]) candidateIds.add(LEGACY_USER_ID_MAP[userId]);

    // Discover associated emails and IDs
    store.users.forEach((u) => {
      if (candidateIds.has(u.id) && u.email) {
        candidateIds.add(u.email.toLowerCase());
      }
    });
    store.profiles.forEach((p) => {
      if (candidateIds.has(p.id) && p.email) {
        candidateIds.add(p.email.toLowerCase());
      }
    });

    if (this.supabase && this.isLiveConnected) {
      try {
        if (permId && isUuid(permId)) {
          await this.supabase.from('calendar_permissions').delete().eq('id', permId);
        }
        await this.supabase
          .from('calendar_permissions')
          .delete()
          .eq('calendar_id', calendarId)
          .eq('user_id', resolvedUserId);
      } catch (err) {
        console.warn('Error removing permission from Supabase:', err);
      }
    }

    store.permissions = store.permissions.filter((p) => {
      if (p.calendar_id !== calendarId) return true;
      if (permId && p.id === permId) return false;
      if (candidateIds.has(p.user_id)) return false;
      if (p.user_profile?.id && candidateIds.has(p.user_profile.id)) return false;
      if (p.user_profile?.email && candidateIds.has(p.user_profile.email.toLowerCase())) return false;
      return true;
    });

    this.saveLocalStore(store);
  }

  // --- TASKS ---
  public async getTasksForWeek(calendarId: string, weekStartDate: string): Promise<Task[]> {
    if (this.supabase && this.isLiveConnected) {
      try {
        const { data, error } = await this.supabase
          .from('tasks')
          .select('*')
          .eq('calendar_id', calendarId)
          .eq('week_start_date', weekStartDate)
          .order('position', { ascending: true });

        if (!error && data) {
          const tasksList: Task[] = data.map((t: any) => ({
            id: t.id,
            calendar_id: t.calendar_id,
            title: t.title,
            description: t.description || '',
            color: t.color || 'sky',
            day_of_week: t.day_of_week,
            status: t.status || 'pending',
            week_start_date: typeof t.week_start_date === 'string' ? t.week_start_date.substring(0, 10) : t.week_start_date,
            time_estimate: t.time_estimate || '',
            position: t.position || 0,
            created_by: t.created_by,
            created_at: t.created_at,
            updated_at: t.updated_at,
          }));

          const store = this.getLocalStore();
          const otherTasks = store.tasks.filter((t) => !(t.calendar_id === calendarId && t.week_start_date === weekStartDate));
          store.tasks = [...otherTasks, ...tasksList];
          this.saveLocalStore(store);

          return tasksList;
        }
      } catch (err) {
        console.warn('Error querying tasks for week from Supabase:', err);
      }
    }

    const store = this.getLocalStore();
    return store.tasks
      .filter((t) => t.calendar_id === calendarId && t.week_start_date === weekStartDate)
      .sort((a, b) => a.position - b.position);
  }

  public async getAllTasksForCalendar(calendarId: string): Promise<Task[]> {
    if (this.supabase && this.isLiveConnected) {
      try {
        const { data, error } = await this.supabase
          .from('tasks')
          .select('*')
          .eq('calendar_id', calendarId)
          .order('position', { ascending: true });

        if (!error && data) {
          const tasksList: Task[] = data.map((t: any) => ({
            id: t.id,
            calendar_id: t.calendar_id,
            title: t.title,
            description: t.description || '',
            color: t.color || 'sky',
            day_of_week: t.day_of_week,
            status: t.status || 'pending',
            week_start_date: typeof t.week_start_date === 'string' ? t.week_start_date.substring(0, 10) : t.week_start_date,
            time_estimate: t.time_estimate || '',
            position: t.position || 0,
            created_by: t.created_by,
            created_at: t.created_at,
            updated_at: t.updated_at,
          }));

          const store = this.getLocalStore();
          const otherTasks = store.tasks.filter((t) => t.calendar_id !== calendarId);
          store.tasks = [...otherTasks, ...tasksList];
          this.saveLocalStore(store);

          return tasksList;
        }
      } catch (err) {
        console.warn('Error querying all tasks from Supabase:', err);
      }
    }

    const store = this.getLocalStore();
    return store.tasks.filter((t) => t.calendar_id === calendarId);
  }

  public async createTask(taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task> {
    const resolvedCreatedBy = taskData.created_by
      ? await this.resolveSupabaseUserId(taskData.created_by)
      : undefined;

    const fallbackTask: Task = {
      ...taskData,
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      created_by: resolvedCreatedBy || taskData.created_by,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (this.supabase && this.isLiveConnected) {
      try {
        const payload: any = {
          calendar_id: taskData.calendar_id,
          title: taskData.title,
          description: taskData.description || '',
          color: taskData.color || 'sky',
          day_of_week: taskData.day_of_week,
          status: taskData.status || 'pending',
          week_start_date: taskData.week_start_date,
          time_estimate: taskData.time_estimate || '',
          position: taskData.position || 0,
        };
        if (resolvedCreatedBy && isUuid(resolvedCreatedBy)) {
          payload.created_by = resolvedCreatedBy;
        }

        const { data, error } = await this.supabase
          .from('tasks')
          .insert(payload)
          .select()
          .single();

        if (!error && data) {
          const createdTask: Task = {
            id: data.id,
            calendar_id: data.calendar_id,
            title: data.title,
            description: data.description || '',
            color: data.color || 'sky',
            day_of_week: data.day_of_week,
            status: data.status || 'pending',
            week_start_date: typeof data.week_start_date === 'string' ? data.week_start_date.substring(0, 10) : data.week_start_date,
            time_estimate: data.time_estimate || '',
            position: data.position || 0,
            created_by: data.created_by,
            created_at: data.created_at,
            updated_at: data.updated_at,
          };

          const store = this.getLocalStore();
          store.tasks.push(createdTask);
          this.saveLocalStore(store);

          return createdTask;
        } else if (error) {
          console.warn('Supabase task insert error:', error);
        }
      } catch (err) {
        console.warn('Error inserting task into Supabase:', err);
      }
    }

    const store = this.getLocalStore();
    store.tasks.push(fallbackTask);
    this.saveLocalStore(store);
    return fallbackTask;
  }

  public async updateTask(
    taskId: string,
    updates: Partial<Task>,
    userRole: UserRole
  ): Promise<{ success: boolean; task?: Task; error?: string }> {
    const store = this.getLocalStore();
    const idx = store.tasks.findIndex((t) => t.id === taskId);
    const currentTask = idx !== -1 ? store.tasks[idx] : null;

    if (updates.status !== undefined && currentTask && updates.status !== currentTask.status) {
      if (userRole !== 'admin') {
        return {
          success: false,
          error: 'Acceso restringido: Sólo el Administrador del calendario tiene autorización para modificar el estado de completitud de las tareas.',
        };
      }
    }

    if (userRole === 'viewer') {
      return {
        success: false,
        error: 'Permiso denegado: Tu rol es de Espectador (solo lectura) en este calendario.',
      };
    }

    if (this.supabase && this.isLiveConnected && isUuid(taskId)) {
      try {
        const payload: any = { ...updates, updated_at: new Date().toISOString() };
        delete payload.id;
        delete payload.calendar_id;

        const { data, error } = await this.supabase
          .from('tasks')
          .update(payload)
          .eq('id', taskId)
          .select()
          .single();

        if (!error && data) {
          const updatedTask: Task = {
            id: data.id,
            calendar_id: data.calendar_id,
            title: data.title,
            description: data.description || '',
            color: data.color || 'sky',
            day_of_week: data.day_of_week,
            status: data.status || 'pending',
            week_start_date: typeof data.week_start_date === 'string' ? data.week_start_date.substring(0, 10) : data.week_start_date,
            time_estimate: data.time_estimate || '',
            position: data.position || 0,
            created_by: data.created_at,
            created_at: data.created_at,
            updated_at: data.updated_at,
          };

          if (idx !== -1) {
            store.tasks[idx] = updatedTask;
          } else {
            store.tasks.push(updatedTask);
          }
          this.saveLocalStore(store);

          return { success: true, task: updatedTask };
        }
      } catch (err) {
        console.warn('Error updating task in Supabase:', err);
      }
    }

    if (idx === -1) {
      return { success: false, error: 'Tarea no encontrada' };
    }

    store.tasks[idx] = {
      ...currentTask!,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    this.saveLocalStore(store);
    return { success: true, task: store.tasks[idx] };
  }

  public async deleteTask(taskId: string, userRole: UserRole): Promise<{ success: boolean; error?: string }> {
    if (userRole === 'viewer') {
      return {
        success: false,
        error: 'Permiso denegado: Los espectadores no pueden eliminar tareas.',
      };
    }

    if (this.supabase && this.isLiveConnected && isUuid(taskId)) {
      try {
        await this.supabase.from('tasks').delete().eq('id', taskId);
      } catch (err) {
        console.warn('Error deleting task from Supabase:', err);
      }
    }

    const store = this.getLocalStore();
    store.tasks = store.tasks.filter((t) => t.id !== taskId);
    this.saveLocalStore(store);
    return { success: true };
  }

  public async reorderTasks(
    tasksToUpdate: { id: string; day_of_week: DayOfWeek; position: number }[],
    userRole: UserRole
  ): Promise<{ success: boolean; error?: string }> {
    if (userRole === 'viewer') {
      return {
        success: false,
        error: 'Permiso denegado: Los espectadores no pueden mover o reordenar tareas.',
      };
    }

    if (this.supabase && this.isLiveConnected) {
      try {
        await Promise.all(
          tasksToUpdate.map((item) => {
            if (isUuid(item.id)) {
              return this.supabase!
                .from('tasks')
                .update({
                  day_of_week: item.day_of_week,
                  position: item.position,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', item.id);
            }
            return Promise.resolve();
          })
        );
      } catch (err) {
        console.warn('Error reordering tasks in Supabase:', err);
      }
    }

    const store = this.getLocalStore();
    const updateMap = new Map(tasksToUpdate.map((u) => [u.id, u]));

    store.tasks = store.tasks.map((task) => {
      const update = updateMap.get(task.id);
      if (update) {
        return {
          ...task,
          day_of_week: update.day_of_week,
          position: update.position,
          updated_at: new Date().toISOString(),
        };
      }
      return task;
    });

    this.saveLocalStore(store);
    return { success: true };
  }
}

export const planifikaService = new PlanifikaDataService();
