import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Navigation, Hand, AlertCircle, LayoutDashboard } from 'lucide-react';
import { HomePage } from './components/pages/HomePage';
import { NavigationPage } from './components/pages/NavigationPage';
import { GesturePage } from './components/pages/GesturePage';
import { EmergencyPage } from './components/pages/EmergencyPage';
import { DashboardPage } from './components/pages/DashboardPage';
import { FloatingAIAssistant } from './components/FloatingAIAssistant';

type Page = 'home' | 'navigation' | 'gesture' | 'emergency' | 'dashboard';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');

  const navigation = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'navigation', icon: Navigation, label: 'Navigate' },
    { id: 'gesture', icon: Hand, label: 'Gestures' },
    { id: 'emergency', icon: AlertCircle, label: 'Emergency' },
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  ];

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col overflow-hidden">
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {currentPage === 'home' && <HomePage />}
            {currentPage === 'navigation' && <NavigationPage />}
            {currentPage === 'gesture' && <GesturePage />}
            {currentPage === 'emergency' && <EmergencyPage />}
            {currentPage === 'dashboard' && <DashboardPage />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Floating AI Assistant */}
      <FloatingAIAssistant />

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
        <div className="max-w-md mx-auto px-4">
          <div className="flex items-center justify-around">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id as Page)}
                  className="flex-1 py-3 flex flex-col items-center gap-1 relative"
                >
                  <Icon
                    className={`w-6 h-6 transition-colors ${
                      isActive ? 'text-blue-600' : 'text-gray-400'
                    }`}
                  />
                  <span
                    className={`text-xs transition-colors ${
                      isActive ? 'text-blue-600 font-medium' : 'text-gray-500'
                    }`}
                  >
                    {item.label}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-blue-600 rounded-full"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}

export default App;
