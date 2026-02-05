import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { BookOpen, User, Settings, LogOut, ChevronDown } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const userInitial = user?.email?.[0].toUpperCase() || 'U';

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-2">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">StudyCompanion</h1>
        </div>

        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transition"
          >
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <span className="text-sm font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {userInitial}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-white" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm text-gray-600">Signed in as</p>
                <p className="text-sm font-semibold text-gray-900 truncate">{user?.email}</p>
              </div>

              <button className="w-full px-4 py-2 text-left flex items-center gap-3 text-gray-700 hover:bg-gray-50 transition">
                <User className="w-4 h-4" />
                <span className="text-sm">Profile</span>
              </button>

              <button className="w-full px-4 py-2 text-left flex items-center gap-3 text-gray-700 hover:bg-gray-50 transition">
                <Settings className="w-4 h-4" />
                <span className="text-sm">Settings</span>
              </button>

              <div className="border-t border-gray-100">
                <button
                  onClick={handleSignOut}
                  className="w-full px-4 py-2 text-left flex items-center gap-3 text-red-600 hover:bg-red-50 transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm">Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
