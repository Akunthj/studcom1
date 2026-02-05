import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Subject, SubjectWithProgress, Topic } from '@/lib/types';
import { Header } from '@/components/Header';
import { RecentlyAccessed } from '@/components/RecentlyAccessed';
import { QuickActions } from '@/components/QuickActions';
import { SubjectsGrid } from '@/components/SubjectsGrid';
import { SearchBar } from '@/components/SearchBar';
import { SubjectExplorer } from '@/components/SubjectExplorer';
import { TopicView } from '@/components/TopicView';
import { Home, FolderOpen } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<SubjectWithProgress[]>([]);
  const [recentlyAccessedSubjects, setRecentlyAccessedSubjects] = useState<SubjectWithProgress[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'home' | 'explorer'>('home');
  const [selectedTopic, setSelectedTopic] = useState<{ topic: Topic; subject: Subject } | null>(null);

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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const handleTopicSelect = (topic: Topic, subject: Subject) => {
    setSelectedTopic({ topic, subject });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center gap-2 py-2">
          <button
            onClick={() => {
              setView('home');
              setSelectedTopic(null);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
              view === 'home'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Home className="w-4 h-4" />
            Home
          </button>
          <button
            onClick={() => setView('explorer')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
              view === 'explorer'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            Explorer
          </button>
        </div>
      </div>

      {view === 'home' ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
          <div className="flex flex-col gap-6">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              totalSubjects={subjects.length}
            />

            {recentlyAccessedSubjects.length > 0 && (
              <RecentlyAccessed subjects={recentlyAccessedSubjects} />
            )}

            <QuickActions />

            <SubjectsGrid subjects={filteredSubjects} />
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <SubjectExplorer
            onTopicSelect={handleTopicSelect}
            selectedTopicId={selectedTopic?.topic.id}
          />
          {selectedTopic ? (
            <TopicView topic={selectedTopic.topic} subject={selectedTopic.subject} />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <FolderOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Select a Topic
                </h3>
                <p className="text-gray-600">
                  Choose a topic from the sidebar to view its resources
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
