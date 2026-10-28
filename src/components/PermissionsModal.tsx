import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole, UserProfile } from '../types';
import { LEGACY_USER_ID_MAP } from '../lib/supabase';
import {
  X,
  Shield,
  Edit3,
  Eye,
  UserPlus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Crown,
} from 'lucide-react';

export const PermissionsModal: React.FC = () => {
  const {
    isPermissionsModalOpen,
    closePermissionsModal,
    activeCalendar,
    permissions,
    allProfiles,
    loadProfiles,
    grantPermission,
    revokePermission,
    isAdmin,
    currentUser,
  } = useApp();

  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('viewer');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Recargar perfiles frescos de Supabase y local cada vez que se abre el modal
  useEffect(() => {
    if (isPermissionsModalOpen) {
      loadProfiles();
    }
  }, [isPermissionsModalOpen, loadProfiles]);

  if (!isPermissionsModalOpen || !activeCalendar) return null;

  const ownerId = activeCalendar.owner_id;
  const normalizedOwnerId = LEGACY_USER_ID_MAP[ownerId] || ownerId;

  const isOwner = (profile: UserProfile) => {
    const profId = profile.id;
    const normalizedProfId = LEGACY_USER_ID_MAP[profId] || profId;
    return (
      profId === ownerId ||
      normalizedProfId === normalizedOwnerId ||
      profId === normalizedOwnerId ||
      normalizedProfId === ownerId
    );
  };

  const hasPermission = (profile: UserProfile) => {
    const profId = profile.id;
    const normalizedProfId = LEGACY_USER_ID_MAP[profId] || profId;
    return permissions.some((p) => {
      const pUserId = p.user_id;
      const normalizedPUserId = LEGACY_USER_ID_MAP[pUserId] || pUserId;
      return (
        pUserId === profId ||
        normalizedPUserId === normalizedProfId ||
        pUserId === normalizedProfId ||
        normalizedPUserId === profId ||
        (p.user_profile?.email && p.user_profile.email.toLowerCase() === profile.email.toLowerCase())
      );
    });
  };

  // Filtrar todos los usuarios del sistema, excluyendo al propietario del calendario
  // y a aquellos que ya tienen un permiso asignado
  const nonMemberProfiles = allProfiles.filter(
    (profile) => !isOwner(profile) && !hasPermission(profile)
  );

  const ownerProfile = allProfiles.find((p) => isOwner(p));

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    setIsSubmitting(true);
    try {
      await grantPermission(selectedUserId, selectedRole);
      setSelectedUserId('');
      setSelectedRole('viewer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    await grantPermission(userId, newRole);
  };

  const handleRevoke = async (userId: string) => {
    if (confirm('¿Seguro que deseas remover el acceso a este usuario?')) {
      await revokePermission(userId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-600" />
              <h3 className="text-base font-bold text-slate-900">
                Control de Permisos y Accesos
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Calendario: <span className="font-semibold text-slate-800">{activeCalendar.name}</span>
            </p>
          </div>
          <button
            onClick={closePermissionsModal}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Explanation Banner */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1.5">
            <p className="font-semibold text-slate-900 flex items-center gap-1.5">
              <span>Jerarquía de permisos colaborativos:</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                <span className="font-bold text-amber-700 flex items-center gap-1 text-[11px]">
                  <Crown className="w-3 h-3 text-amber-500" /> Administrador
                </span>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Edita, mueve tareas, gestiona accesos y <b>certifica el estado Completado</b>.
                </p>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                <span className="font-bold text-sky-700 flex items-center gap-1 text-[11px]">
                  <Edit3 className="w-3 h-3 text-sky-500" /> Editor
                </span>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Crea, modifica detalles y arrastra tareas entre días de la semana.
                </p>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                <span className="font-bold text-slate-700 flex items-center gap-1 text-[11px]">
                  <Eye className="w-3 h-3 text-slate-400" /> Espectador
                </span>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Solo visualiza la planificación semanal y estados de avance.
                </p>
              </div>
            </div>
          </div>

          {/* Add member form */}
          {isAdmin && (
            <form onSubmit={handleAddMember} className="p-4 bg-slate-100/70 border border-slate-200/90 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-slate-700" />
                <span>Conceder nuevo acceso al calendario</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-7">
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    required
                  >
                    <option value="">Seleccionar usuario del sistema...</option>
                    {nonMemberProfiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name} ({p.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="viewer">Espectador</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || !selectedUserId}
                    className="w-full h-full py-2 px-3 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Asignar
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Members list */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Miembros con acceso ({permissions.length + 1})
            </h4>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {/* Creator / Owner Row */}
              <div className="p-3.5 bg-amber-50/40 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-xs">
                    👑
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900">
                        {ownerProfile?.full_name || 'Propietario del calendario'}
                      </span>
                      <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded">
                        Propietario / Creador
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {ownerProfile?.email}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-amber-700">Administrador Vitalicio</span>
              </div>

              {/* Other Members */}
              {permissions
                .filter((perm) => perm.user_id !== activeCalendar.owner_id)
                .map((perm) => {
                  const profile =
                    allProfiles.find((p) => p.id === perm.user_id) || perm.user_profile;
                  const isCurrent = currentUser?.id === perm.user_id;

                  return (
                    <div key={perm.id} className="p-3.5 bg-white flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                          {profile?.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900">
                              {profile?.full_name || 'Usuario'}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] text-slate-500 italic">(Tú)</span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500">{profile?.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isAdmin ? (
                          <select
                            value={perm.role}
                            onChange={(e) => handleRoleChange(perm.user_id, e.target.value as UserRole)}
                            className="text-xs font-medium py-1 px-2.5 bg-slate-100 border border-slate-200 rounded-lg focus:outline-none"
                          >
                            <option value="viewer">Espectador</option>
                            <option value="editor">Editor</option>
                            <option value="admin">Administrador</option>
                          </select>
                        ) : (
                          <span className="text-xs font-medium capitalize text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                            {perm.role}
                          </span>
                        )}

                        {isAdmin && (
                          <button
                            onClick={() => handleRevoke(perm.user_id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Revocar acceso"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

              {permissions.filter((p) => p.user_id !== activeCalendar.owner_id).length === 0 && (
                <div className="p-4 text-center text-xs text-slate-400 bg-white">
                  No hay otros colaboradores asignados a este calendario aún.
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={closePermissionsModal}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
