import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { StudyStreak } from '@/lib/types';
import { ArrowLeft, User, TrendingUp, Flame, Award, Clock, Calendar } from 'lucide-react';
import { ProgressAnalytics } from '@/components/ProgressAnalytics';

export const Profile: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [streak, setStreak] = useState<StudyStreak | null>(null);
  const [totalStudyTime, setTotalStudyTime] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserStats();
    }
  }, [user]);

  const fetchUserStats = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data: streakData } = await supabase
        .from('study_streaks')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      setStreak(streakData);

      const { data: sessionsData } = await supabase
        .from('study_sessions')
        .select('duration_seconds')
        .eq('user_id', user.id);

      const total = (sessionsData || []).reduce(
        (sum, session) => sum + (session.duration_seconds || 0),
        0
      );
      setTotalStudyTime(total);
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const userInitial = user?.email?.[0].toUpperCase() || 'U';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Dashboard</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl font-bold text-white">{userInitial}</span>
                </div>

                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {user?.email?.split('@')[0] || 'Student'}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">{user?.email}</p>

                <div className="space-y-3">
                  <button
                    onClick={() => navigate('/settings')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition font-medium"
                  >
                    <User className="w-4 h-4" />
                    Edit Profile
                  </button>
                </div>
              </div>

              {!loading && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Flame className="w-5 h-5 text-orange-500" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Current Streak
                      </span>
                    </div>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      {streak?.current_streak || 0} days
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-blue-500" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Longest Streak
                      </span>
                    </div>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      {streak?.longest_streak || 0} days
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-purple-500" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Total Study Time
                      </span>
                    </div>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatDuration(totalStudyTime)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-green-500" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Member Since
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {new Date(user?.created_at || '').toLocaleDateString('en-US', {
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      Study Analytics
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Track your learning progress and achievements
                    </p>
                  </div>
                </div>
              </div>

              <div className="h-[600px] overflow-auto">
                <ProgressAnalytics />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
