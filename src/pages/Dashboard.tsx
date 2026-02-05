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
import { SubjectView } from '@/components/SubjectView';

export const Dashboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<SubjectWithProgress[]>([]);
  const [recentlyAccessedSubjects, setRecentlyAccessedSubjects] = useState<SubjectWithProgress[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

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
        .select('*');

      if (subjectsError) throw subjectsError;

      const { data: progressData, error: progressError } = await supabase
        .from('user_progress')
        .select('topic_id')
        .eq('user_id', user!.id);

      if (progressError && progressError.code !== 'PGRST116') throw progressError;

      const { data: recentData, error: recentError } = await supabase
        .from('user_recently_accessed')
        .select('subject_id, last_accessed_at')
        .eq('user_id', user!.id)
        .order('last_accessed_at', { ascending: false })
        .limit(4);

      if (recentError && recentError.code !== 'PGRST116') throw recentError;

      const subjectsWithProgress = (subjectsData || []).map((subject: Subject) => ({
        ...subject,
        progress_percentage: Math.floor(Math.random() * 100),
        last_accessed: new Date().toISOString(),
      }));

      setSubjects(subjectsWithProgress);

      const recentIds = (recentData || []).map((item) => item.subject_id);
      const recentSubjects = subjectsWithProgress.filter((s) => recentIds.includes(s.id));
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
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            totalSubjects={subjects.length}
          />

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
            <RecentlyAccessed subjects={recentlyAccessedSubjects} onSubjectClick={handleSubjectClick} />
          )}

          <QuickActions />

          <SubjectsGrid subjects={filteredSubjects} onSubjectClick={handleSubjectClick} />
        </div>
      </div>
    </div>
  );
};
