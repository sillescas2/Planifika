export const APP_VERSION = 'v1.0.18';

export type DayOfWeek = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';

export type TaskStatus = 'pending' | 'partial' | 'completed' | 'none';

export type UserRole = 'admin' | 'editor' | 'viewer';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  system_role: 'admin' | 'user';
  created_at?: string;
}

export interface Calendar {
  id: string;
  name: string;
  description: string;
  color_theme: 'blue' | 'emerald' | 'indigo' | 'violet' | 'amber';
  owner_id: string;
  created_at: string;
  updated_at?: string;
  role?: UserRole; // Current active user's role on this calendar
}

export interface CalendarPermission {
  id: string;
  calendar_id: string;
  user_id: string;
  role: UserRole;
  granted_by?: string;
  created_at: string;
  user_profile?: UserProfile;
}

export interface Task {
  id: string;
  calendar_id: string;
  title: string;
  description: string;
  color: TaskColorId;
  day_of_week: DayOfWeek;
  status: TaskStatus;
  week_start_date: string; // ISO format 'YYYY-MM-DD' (Monday of the week)
  time_estimate?: string;
  position: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export type TaskColorId = 'sky' | 'emerald' | 'amber' | 'indigo' | 'violet' | 'rose' | 'slate';

export interface TaskColorConfig {
  id: TaskColorId;
  label: string;
  cardBg: string;
  cardBorder: string;
  badgeBg: string;
  badgeText: string;
  accentBar: string;
  dotColor: string;
}

export interface WeekInfo {
  startDate: Date;
  endDate: Date;
  weekNumber: number;
  year: number;
  startDateStr: string; // 'YYYY-MM-DD'
  formattedRange: string;
}
