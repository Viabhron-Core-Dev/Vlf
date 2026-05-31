import React from 'react';
import { AppProvider, useApp } from './AppContext';
import { AppLayout } from './components/layout/AppLayout';
import { OverlayManager } from './components/overlays/OverlayManager';
import NotesGrid from './components/NotesGrid';
import HabitsTab from './components/HabitsTab';
import ExpensesTab from './components/ExpensesTab';
import CalendarTab from './components/CalendarTab';

const AppContent: React.FC = () => {
  const { activeTab } = useApp();

  const renderContent = () => {
    switch (activeTab) {
      case 'notes': return <NotesGrid />;
      case 'habits': return <HabitsTab />;
      case 'expenses': return <ExpensesTab />;
      case 'calendar': return <CalendarTab />;
      default: return <NotesGrid />;
    }
  };

  return (
    <>
      <AppLayout>
        {renderContent()}
      </AppLayout>
      <OverlayManager />
    </>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;
