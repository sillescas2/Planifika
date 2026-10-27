import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DEMO_PROFILES, planifikaService } from '../lib/supabase';
import {
  Lock,
  Mail,
  User,
  ArrowRight,
  Shield,
  Edit3,
  Eye,
  EyeOff,
  CheckCircle,
  KeyRound,
  ArrowLeft,
  HelpCircle,
} from 'lucide-react';

interface LoginScreenProps {
  onSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onSuccess }) => {
  const { setCurrentUser, switchDemoUser, showToast, isLiveConnected } = useApp();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [requestedRole, setRequestedRole] = useState<'user' | 'admin'>('user');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // 1. Password Recovery Flow ("¿Has olvidado tu contraseña?")
    if (mode === 'forgot') {
      if (!email.trim()) {
        setErrorMsg('Por favor introduce tu correo electrónico.');
        return;
      }
      setLoading(true);
      try {
        const res = await planifikaService.requestPasswordReset(email.trim());
        if (res.success) {
          setSuccessMsg(res.message);
        } else {
          setErrorMsg(res.error || 'No se pudo generar la solicitud de recuperación.');
        }
      } catch (err: any) {
        setErrorMsg(err?.message || 'Error al solicitar recuperación de contraseña.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // 2. Sign In or Sign Up
    if (!email.trim() || !password) {
      setErrorMsg('Por favor introduce tu email y contraseña.');
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden. Por favor verifícalas.');
      return;
    }

    if (mode === 'signup' && password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signup') {
        const res = await planifikaService.registerUser(
          email.trim(),
          password,
          fullName.trim(),
          requestedRole
        );

        if (res.success && res.user) {
          setCurrentUser(res.user);
          if (rememberMe) {
            localStorage.setItem('planifika_active_user_id', res.user.id);
          }
          showToast(`¡Cuenta registrada en la tabla users! Bienvenido, ${res.user.full_name}`, 'success');
          onSuccess();
        } else {
          setErrorMsg(res.error || 'Error al crear la cuenta en la tabla users.');
        }
      } else {
        // Sign in via custom users table
        const res = await planifikaService.authenticateUser(email.trim(), password);

        if (res.success && res.user) {
          setCurrentUser(res.user);
          if (rememberMe) {
            localStorage.setItem('planifika_active_user_id', res.user.id);
          }
          showToast(`Bienvenido de nuevo, ${res.user.full_name}`, 'success');
          onSuccess();
        } else {
          setErrorMsg(res.error || 'Credenciales no válidas.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error en el proceso de autenticación.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (userId: string) => {
    switchDemoUser(userId);
    onSuccess();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 sm:px-6 lg:px-8">
      {/* Brand & Wordmark */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-extrabold text-xl mx-auto shadow-md">
          P
        </div>
        <h2 className="mt-4 text-2xl font-black text-slate-900 tracking-tight">
          Planifika
        </h2>
        <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
          Planificador horario semanal colaborativo con control de permisos y gestión de tareas
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-slate-200 sm:px-8 space-y-6">
          
          {/* Quick Demo Switcher Card for instant evaluation */}
          <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-slate-700" />
                <span>Acceso rápido por perfiles:</span>
              </span>
              <span className="text-[10px] bg-slate-200/70 text-slate-700 font-semibold px-1.5 py-0.2 rounded">
                1 Clic
              </span>
            </div>
            
            <p className="text-[11px] text-slate-500 leading-tight">
              Entra directamente para comprobar los permisos de visualización, edición y restricciones de administración:
            </p>

            <div className="space-y-1.5 pt-1">
              <button
                type="button"
                onClick={() => handleQuickLogin('usr-admin-carlos')}
                className="w-full flex items-center justify-between p-2 rounded-lg bg-white border border-amber-200 hover:border-amber-400 hover:bg-amber-50/50 transition-all text-left text-xs cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-[10px]">
                    <Shield className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900">Carlos Martínez</span>
                    <span className="text-[10px] text-slate-500 block">Administrador (Configuración y Completar)</span>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                  Admin
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('usr-editor-elena')}
                className="w-full flex items-center justify-between p-2 rounded-lg bg-white border border-sky-200 hover:border-sky-400 hover:bg-sky-50/50 transition-all text-left text-xs cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-sky-100 text-sky-800 flex items-center justify-center font-bold text-[10px]">
                    <Edit3 className="w-3.5 h-3.5 text-sky-600" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900">Elena Ramos</span>
                    <span className="text-[10px] text-slate-500 block">Editora (Sin acceso a configuración)</span>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-sky-800 bg-sky-100 px-1.5 py-0.5 rounded">
                  Editor
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('usr-viewer-david')}
                className="w-full flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all text-left text-xs cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900">David Soto</span>
                    <span className="text-[10px] text-slate-500 block">Espectador (Solo lectura de tareas)</span>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                  Lectura
                </span>
              </button>
            </div>

            <div className="p-2 bg-slate-100/80 rounded-lg text-[10px] text-slate-600 flex items-center justify-between">
              <span>Gestión 100% en tabla <strong className="text-slate-900">users</strong> (sin Supabase Auth)</span>
              <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[9px] text-slate-700">Clave: password123</span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-white text-slate-400 font-medium">
                {mode === 'forgot'
                  ? 'Recuperación de contraseña'
                  : 'O ingresa con usuario y contraseña'}
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2 animate-in fade-in">
                <HelpCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-start gap-2 animate-in fade-in">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* FORGOT PASSWORD VIEW */}
            {mode === 'forgot' ? (
              <div className="space-y-4">
                <div className="text-left">
                  <h3 className="text-sm font-bold text-slate-900">¿Has olvidado tu contraseña?</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Indica tu correo electrónico y recibirás las instrucciones con un enlace para crear una nueva contraseña.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="ejemplo@planifika.app"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{loading ? 'Enviando enlace...' : 'Enviar enlace de recuperación'}</span>
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Volver a iniciar sesión</span>
                  </button>
                </div>
              </div>
            ) : (
              /* SIGN IN / SIGN UP VIEW */
              <>
                {mode === 'signup' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nombre completo
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          placeholder="Tu nombre y apellido"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                        />
                        <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Rol inicial solicitado
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setRequestedRole('user')}
                          className={`p-2 rounded-xl border text-xs text-center transition-all cursor-pointer ${
                            requestedRole === 'user'
                              ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          Colaborador
                        </button>
                        <button
                          type="button"
                          onClick={() => setRequestedRole('admin')}
                          className={`p-2 rounded-xl border text-xs text-center transition-all cursor-pointer ${
                            requestedRole === 'admin'
                              ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          Administrador
                        </button>
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Correo Electrónico o Usuario
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="usuario@planifika.app"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Contraseña
                    </label>
                    {mode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot');
                          setErrorMsg('');
                          setSuccessMsg('');
                        }}
                        className="text-[11px] text-slate-500 hover:text-slate-900 font-medium transition-colors cursor-pointer"
                      >
                        ¿Has olvidado tu contraseña?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                      title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {mode === 'signup' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Confirmar Contraseña
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    </div>
                  </div>
                )}

                {mode === 'signin' && (
                  <div className="flex items-center justify-between text-xs pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                      />
                      <span>Recordar mis datos</span>
                    </label>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <span>
                    {loading
                      ? 'Procesando...'
                      : mode === 'signin'
                      ? 'Iniciar Sesión'
                      : 'Registrar Cuenta'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </form>

          {/* Toggle mode between Sign In and Sign Up */}
          {mode !== 'forgot' && (
            <div className="text-center pt-2 text-xs border-t border-slate-100">
              {mode === 'signin' ? (
                <p className="text-slate-600">
                  ¿No tienes cuenta?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="font-bold text-slate-900 hover:underline cursor-pointer"
                  >
                    Regístrate aquí
                  </button>
                </p>
              ) : (
                <p className="text-slate-600">
                  ¿Ya tienes cuenta?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="font-bold text-slate-900 hover:underline cursor-pointer"
                  >
                    Inicia sesión
                  </button>
                </p>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
