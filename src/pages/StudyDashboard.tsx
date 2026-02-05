import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Subject, Topic } from '@/lib/types';
import { StudyLayout } from '@/layouts/StudyLayout';

export const StudyDashboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  const handleTopicSelect = (topic: Topic, subject: Subject) => {
    setSelectedTopic(topic);
    setSelectedSubject(subject);
  };

  if (authLoading) {
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
