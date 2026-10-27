import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { WeekNavigator } from './components/WeekNavigator';
import { WeeklyBoard } from './components/WeeklyBoard';
import { HistoryView } from './components/HistoryView';
import { CalendarManagerView } from './components/CalendarManagerView';
import { SettingsView } from './components/SettingsView';
import { MobileBottomNav } from './components/MobileBottomNav';
import { TaskModal } from './components/TaskModal';
import { PermissionsModal } from './components/PermissionsModal';
import { Toast } from './components/Toast';
import { LoginScreen } from './components/LoginScreen';

const MainApp: React.FC = () => {
  const { currentUser, activeTab, isAdminUser } = useApp();
  const [showLogin, setShowLogin] = useState(false);

  // If user explicitly signed out or no user is set
  if (!currentUser || showLogin) {
    return <LoginScreen onSuccess={() => setShowLogin(false)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20 md:pb-10">
      {/* Top Bar */}
      <Navbar />

      {/* Main View Router */}
      <main className="flex-1">
        {activeTab === 'weekly' && (
          <>
            <WeekNavigator />
            <WeeklyBoard />
          </>
        )}

        {activeTab === 'history' && <HistoryView />}

        {activeTab === 'calendars' && <CalendarManagerView />}

        {activeTab === 'settings' && isAdminUser && <SettingsView />}
      </main>

      {/* Mobile Navigation Anchor */}
      <MobileBottomNav />

      {/* Global Modals */}
      <TaskModal />
      <PermissionsModal />
      <Toast />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
