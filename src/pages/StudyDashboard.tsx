import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Subject, Topic } from '@/lib/types';
import { StudyLayout } from '@/layouts/StudyLayout';
import { demoStorage } from '@/lib/demoMode';

export const StudyDashboard: React.FC = () => {
  const { user, loading: authLoading, isDemo } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const subjectId = searchParams.get('subject');

  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && subjectId) {
      fetchSubjectData();
    } else {
      setLoading(false);
    }
  }, [user, subjectId, isDemo]);

  const fetchSubjectData = async () => {
    try {
      setLoading(true);

      if (isDemo) {
        const subjects = demoStorage.getSubjects();
        const subject = subjects.find((s) => s.id === subjectId);

        if (subject) {
          setSelectedSubject(subject);

          const topics = demoStorage.getTopics();
          const subjectTopics = topics.filter((t) => t.subject_id === subjectId);

          if (subjectTopics.length > 0) {
            setSelectedTopic(subjectTopics[0]);
          }
        }
      } else {
        const { data: subjectData, error: subjectError } = await supabase
          .from('subjects')
          .select('*')
          .eq('id', subjectId)
          .maybeSingle();

        if (subjectError) throw subjectError;

        if (subjectData) {
          setSelectedSubject(subjectData);

          const { data: topicsData, error: topicsError } = await supabase
            .from('topics')
            .select('*')
            .eq('subject_id', subjectId)
            .order('name')
            .limit(1);

          if (topicsError) throw topicsError;

          if (topicsData && topicsData.length > 0) {
            setSelectedTopic(topicsData[0]);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching subject data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTopicSelect = (topic: Topic, subject: Subject) => {
    setSelectedTopic(topic);
    setSelectedSubject(subject);
  };

  if (authLoading || loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <StudyLayout
      selectedTopic={selectedTopic}
      selectedSubject={selectedSubject}
      onTopicSelect={handleTopicSelect}
    />
  );
};
