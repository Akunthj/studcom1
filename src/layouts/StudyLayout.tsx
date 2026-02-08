import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Subject, Topic } from '@/lib/types';
import { Sidebar, ResourceType } from '@/components/Sidebar';
import { AIAssistantPanel } from '@/components/AIAssistantPanel';
import { TopicContent } from '@/components/TopicContent';
import { BookOpen, Bot, Sun, Moon, User, Settings, LogOut, Menu, X, ListTodo, Home, ChevronRight, FileText } from 'lucide-react';
import { TodoPanel } from '@/components/TodoPanel';

interface StudyLayoutProps {
  children?: React.ReactNode;
  selectedTopic?: Topic | null;
  selectedSubject?: Subject | null;
  onTopicSelect?: (topic: Topic, subject: Subject) => void;
}

export const StudyLayout: React.FC<StudyLayoutProps> = ({
  children,
  selectedTopic,
  selectedSubject,
  onTopicSelect,
}) => {
  const { user, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Load sidebar state from localStorage
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('studcom:sidebar_collapsed');
    return saved ? saved !== 'true' : true;
  });

  const [rightPanel, setRightPanel] = useState<'ai' | 'todo' | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [activeResourceType, setActiveResourceType] = useState<ResourceType>('books');

  // Persist sidebar state
  useEffect(() => {
    localStorage.setItem('studcom:sidebar_collapsed', (!sidebarOpen).toString());
  }, [sidebarOpen]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const userInitial = user?.email?.[0].toUpperCase() || 'U';

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? (
              <X className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            ) : (
              <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            )}
          </button>

          {/* Home Button */}
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition font-medium"
            aria-label="Go to home"
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </button>

          {/* Breadcrumb */}
          {selectedSubject && (
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Home
              </button>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <span className="text-gray-900 dark:text-white font-medium">
                {selectedSubject.name}
              </span>
            </div>
          )}

          {/* Logo (secondary way to go home) */}
          {!selectedSubject && (
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 hover:opacity-80 transition"
            >
              <div className="bg-blue-600 dark:bg-blue-500 rounded-lg p-2">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                Student Companion
              </span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setRightPanel(rightPanel === 'ai' ? null : 'ai')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition font-medium ${
              rightPanel === 'ai'
                ? 'bg-blue-700 dark:bg-blue-600 text-white'
                : 'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
            }`}
          >
            <Bot className="w-5 h-5" />
            <span>AI Assistant</span>
          </button>

          {selectedSubject && (
            <button
              onClick={() => navigate('/notes')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition font-medium bg-orange-600 dark:bg-orange-500 text-white hover:bg-orange-700 dark:hover:bg-orange-600"
            >
              <FileText className="w-5 h-5" />
              <span>Make Notes</span>
            </button>
          )}

          <button
            onClick={() => setRightPanel(rightPanel === 'todo' ? null : 'todo')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition font-medium ${
              rightPanel === 'todo'
                ? 'bg-green-700 dark:bg-green-600 text-white'
                : 'bg-green-600 dark:bg-green-500 text-white hover:bg-green-700 dark:hover:bg-green-600'
            }`}
          >
            <ListTodo className="w-5 h-5" />
            <span>To-Do</span>
          </button>

          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            aria-label="Toggle theme"
          >
            {isDark ? (
              <Sun className="w-5 h-5 text-gray-300" />
            ) : (
              <Moon className="w-5 h-5 text-gray-700" />
            )}
          </button>

          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-9 h-9 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center hover:bg-blue-700 dark:hover:bg-blue-600 transition"
              aria-label="User menu"
              aria-expanded={userMenuOpen}
            >
              <span className="text-sm font-bold text-white">{userInitial}</span>
            </button>

            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Signed in as</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {user?.email}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      navigate('/profile');
                      setUserMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left flex items-center gap-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    <User className="w-4 h-4" />
                    <span className="text-sm">Profile</span>
                  </button>

                  <button
                    onClick={() => {
                      navigate('/settings');
                      setUserMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left flex items-center gap-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    <Settings className="w-4 h-4" />
                    <span className="text-sm">Settings</span>
                  </button>

                  <div className="border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={handleSignOut}
                      className="w-full px-4 py-2 text-left flex items-center gap-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="text-sm">Logout</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          onTopicSelect={(topic) => {
            if (onTopicSelect && selectedSubject) {
              onTopicSelect(topic, selectedSubject);
            }
          }}
          selectedTopicId={selectedTopic?.id}
          collapsed={!sidebarOpen}
          onActiveResourceTypeChange={setActiveResourceType}
        />

        <main className="flex-1 overflow-hidden">
          {children || (
            selectedTopic && selectedSubject ? (
              <TopicContent topic={selectedTopic} subject={selectedSubject} activeTab={activeResourceType} />
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <BookOpen className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    No Topic Selected
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Select a topic from the sidebar to view learning materials
                  </p>
                </div>
              </div>
            )
          )}
        </main>

        {rightPanel === 'ai' && selectedTopic && (
          <AIAssistantPanel
            topic={selectedTopic}
            onClose={() => setRightPanel(null)}
          />
        )}

        {rightPanel === 'todo' && (
          <TodoPanel onClose={() => setRightPanel(null)} />
        )}
      </div>
    </div>
  );
};
