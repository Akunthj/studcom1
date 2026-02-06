import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Subject, SubjectWithProgress } from '@/lib/types';
import { Header } from '@/components/Header';
import { RecentlyAccessed } from '@/components/RecentlyAccessed';
import { QuickActions } from '@/components/QuickActions';
import { SubjectsGrid } from '@/components/SubjectsGrid';
import { SearchBar } from '@/components/SearchBar';
import { AddItemModal } from '@/components/AddItemModal';
import { Plus, Minimize2, Maximize2 } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<SubjectWithProgress[]>([]);
  const [recentlyAccessedSubjects, setRecentlyAccessedSubjects] = useState<SubjectWithProgress[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Load compact view preference from localStorage
  const [compactView, setCompactView] = useState(() => {
    const saved = localStorage.getItem('studcom:compact_view');
    return saved === 'true';
  });

  // Persist compact view preference
  useEffect(() => {
    localStorage.setItem('studcom:compact_view', compactView.toString());
  }, [compactView]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchSubjects();
    }
  }, [user]);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .order('name');

      if (subjectsError) throw subjectsError;

      // Fetch topics for progress calculation
      const { data: topicsData, error: topicsError } = await supabase
        .from('topics')
        .select('*');

      if (topicsError) throw topicsError;

      // Fetch user progress to calculate completed topics
      const { data: progressData, error: progressError } = await supabase
        .from('user_progress')
        .select('topic_id, completed')
        .eq('user_id', user!.id);

      if (progressError && progressError.code !== 'PGRST116') throw progressError;

      // Calculate progress for each subject
      const subjectsWithProgress = (subjectsData || []).map((subject: Subject) => {
        const subjectTopics = (topicsData || []).filter((t) => t.subject_id === subject.id);
        const totalTopics = subjectTopics.length;

        if (totalTopics === 0) {
          return {
            ...subject,
            progress_percentage: 0,
            last_accessed: new Date().toISOString(),
          };
        }

        // Count completed topics for this subject
        const completedTopics = subjectTopics.filter((topic) =>
          (progressData || []).some((p) => p.topic_id === topic.id && p.completed)
        ).length;

        const progressPercentage = Math.round((completedTopics / totalTopics) * 100);

        return {
          ...subject,
          progress_percentage: progressPercentage,
          last_accessed: new Date().toISOString(),
        };
      });

      setSubjects(subjectsWithProgress);

      // Fetch recently accessed subjects
      const { data: recentData, error: recentError } = await supabase
        .from('user_recently_accessed')
        .select('subject_id, last_accessed_at')
        .eq('user_id', user!.id)
        .order('last_accessed_at', { ascending: false })
        .limit(4);

      if (recentError && recentError.code !== 'PGRST116') throw recentError;

      const recentIds = (recentData || []).map((item) => item.subject_id);
      const recentSubjects = subjectsWithProgress
        .filter((s) => recentIds.includes(s.id))
        .map((s) => {
          const recentItem = (recentData || []).find((r) => r.subject_id === s.id);
          return {
            ...s,
            last_accessed: recentItem?.last_accessed_at || s.last_accessed,
          };
        })
        .sort((a, b) => {
          const timeA = new Date(a.last_accessed || 0).getTime();
          const timeB = new Date(b.last_accessed || 0).getTime();
          return timeB - timeA;
        });

      setRecentlyAccessedSubjects(recentSubjects);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSubjects = subjects.filter((subject) =>
    subject.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubjectClick = (subject: Subject) => {
    navigate('/study');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              totalSubjects={subjects.length}
            />

            <button
              onClick={() => setCompactView(!compactView)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              title={compactView ? 'Normal view' : 'Compact view'}
              aria-label={compactView ? 'Switch to normal view' : 'Switch to compact view'}
            >
              {compactView ? (
                <Maximize2 className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              ) : (
                <Minimize2 className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              )}
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition font-medium"
              aria-label="Add new item"
            >
              <Plus className="w-5 h-5" />
              <span>Add</span>
            </button>
          </div>

          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Quick Access</h2>
            <button
              onClick={() => navigate('/study')}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition font-medium text-sm"
            >
              Browse All Topics
            </button>
          </div>

          {recentlyAccessedSubjects.length > 0 && (
            <RecentlyAccessed
              subjects={recentlyAccessedSubjects}
              onSubjectClick={handleSubjectClick}
              compact={compactView}
            />
          )}

          <QuickActions />

          <SubjectsGrid
            subjects={filteredSubjects}
            onSubjectClick={handleSubjectClick}
            compact={compactView}
          />
        </div>
      </div>

      {showAddModal && (
        <AddItemModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            fetchSubjects();
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
};
