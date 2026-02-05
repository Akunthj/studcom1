import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { StudyStreak, StudySession, UserProgress } from '@/lib/types';
import { TrendingUp, Clock, Target, Flame, Award, Calendar, BookOpen } from 'lucide-react';

interface ProgressAnalyticsProps {
  topicId?: string;
  subjectId?: string;
}

interface TopicStats {
  topicName: string;
  totalTime: number;
  progressPercentage: number;
  sessionsCount: number;
}

export const ProgressAnalytics: React.FC<ProgressAnalyticsProps> = ({ topicId, subjectId }) => {
  const { user } = useAuth();
  const [streak, setStreak] = useState<StudyStreak | null>(null);
  const [recentSessions, setRecentSessions] = useState<StudySession[]>([]);
  const [topicStats, setTopicStats] = useState<TopicStats[]>([]);
  const [totalStudyTime, setTotalStudyTime] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user, topicId, subjectId]);

  const fetchAnalytics = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data: streakData } = await supabase
        .from('study_streaks')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      setStreak(streakData);

      let sessionsQuery = supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('start_time', { ascending: false })
        .limit(10);

      if (topicId) {
        sessionsQuery = sessionsQuery.eq('topic_id', topicId);
      }

      const { data: sessionsData } = await sessionsQuery;
      setRecentSessions(sessionsData || []);

      const totalTime = (sessionsData || []).reduce(
        (sum, session) => sum + (session.duration_seconds || 0),
        0
      );
      setTotalStudyTime(totalTime);

      let progressQuery = supabase
        .from('user_progress')
        .select('*, topics(name)')
        .eq('user_id', user.id);

      if (topicId) {
        progressQuery = progressQuery.eq('topic_id', topicId);
      }

      const { data: progressData } = await progressQuery;

      const statsMap = new Map<string, TopicStats>();

      (progressData || []).forEach((progress: any) => {
        const topicName = progress.topics?.name || 'Unknown';
        const existing = statsMap.get(progress.topic_id);

        if (existing) {
          statsMap.set(progress.topic_id, {
            ...existing,
            totalTime: existing.totalTime + (progress.total_time_seconds || 0),
          });
        } else {
          statsMap.set(progress.topic_id, {
            topicName,
            totalTime: progress.total_time_seconds || 0,
            progressPercentage: progress.progress_percentage || 0,
            sessionsCount: 0,
          });
        }
      });

      (sessionsData || []).forEach((session) => {
        const stats = statsMap.get(session.topic_id);
        if (stats) {
          statsMap.set(session.topic_id, {
            ...stats,
            sessionsCount: stats.sessionsCount + 1,
          });
        }
      });

      const statsArray = Array.from(statsMap.values())
        .sort((a, b) => b.totalTime - a.totalTime)
        .slice(0, 5);

      setTopicStats(statsArray);
    } catch (error) {
      console.error('Error fetching analytics:', error);
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

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6 bg-gray-50">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Progress Analytics</h2>
            <p className="text-gray-600">Track your study habits and progress</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Flame className="w-5 h-5 text-orange-600" />
              </div>
              <span className="text-3xl">🔥</span>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">Current Streak</h3>
            <p className="text-3xl font-bold text-gray-900">
              {streak?.current_streak || 0}
              <span className="text-lg font-normal text-gray-600 ml-1">days</span>
            </p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Award className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-3xl">🏆</span>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">Longest Streak</h3>
            <p className="text-3xl font-bold text-gray-900">
              {streak?.longest_streak || 0}
              <span className="text-lg font-normal text-gray-600 ml-1">days</span>
            </p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-3xl">⏱️</span>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">Total Study Time</h3>
            <p className="text-3xl font-bold text-gray-900">{formatDuration(totalStudyTime)}</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-3xl">📚</span>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">Study Sessions</h3>
            <p className="text-3xl font-bold text-gray-900">{recentSessions.length}</p>
          </div>
        </div>

        {topicStats.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Top Topics</h3>
            </div>
            <div className="space-y-4">
              {topicStats.map((stat, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900 truncate">
                        {stat.topicName}
                      </span>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <span>{formatDuration(stat.totalTime)}</span>
                        <span>{stat.sessionsCount} sessions</span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all"
                        style={{ width: `${stat.progressPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {recentSessions.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">Recent Study Sessions</h3>
            </div>
            <div className="space-y-3">
              {recentSessions.slice(0, 5).map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(session.start_time).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                      <p className="text-xs text-gray-600">
                        {new Date(session.start_time).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-900">
                      {formatDuration(session.duration_seconds)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {recentSessions.length === 0 && (
          <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
            <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Study Sessions Yet
            </h3>
            <p className="text-gray-600">
              Start studying to see your progress and analytics here
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
