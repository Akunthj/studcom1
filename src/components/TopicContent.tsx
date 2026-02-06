import React, { useState, useEffect } from 'react';
import { Subject, Topic, Resource } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useResourceType } from '@/contexts/ResourceTypeContext';
import { demoStorage } from '@/lib/demoMode';
import { BooksTab } from './tabs/BooksTab';
import { SlidesTab } from './tabs/SlidesTab';
import { NotesTab } from './tabs/NotesTab';
import { PYQsTab } from './tabs/PYQsTab';

interface TopicContentProps {
  topic: Topic;
  subject: Subject;
}

type TabType = 'books' | 'slides' | 'notes' | 'pyqs';

export const TopicContent: React.FC<TopicContentProps> = ({ topic, subject }) => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, isDemo } = useAuth();
  const { activeResourceType } = useResourceType();

  useEffect(() => {
    fetchResources();
    updateRecentlyAccessed();
  }, [topic.id]);

  const fetchResources = async () => {
    try {
      setLoading(true);
      
      if (isDemo) {
        // Fetch from demo storage
        const allResources = demoStorage.getResources();
        const topicResources = allResources.filter(r => r.topic_id === topic.id);
        setResources(topicResources);
      } else {
        const { data, error } = await supabase
          .from('resources')
          .select('*')
          .eq('topic_id', topic.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setResources(data || []);
      }
    } catch (error) {
      console.error('Error fetching resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateRecentlyAccessed = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_recently_accessed')
        .upsert({
          user_id: user.id,
          subject_id: subject.id,
          topic_id: topic.id,
          last_accessed_at: new Date().toISOString(),
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating recently accessed:', error);
    }
  };

  const getResourcesByType = (type: string) => {
    return resources.filter((r) => r.type === type);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: subject.color }}
            ></div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {subject.name}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {topic.name}
          </h1>
          {topic.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {topic.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading resources...</p>
            </div>
          </div>
        ) : (
          <>
            {activeResourceType === 'books' && (
              <BooksTab
                resources={getResourcesByType('book')}
                topicId={topic.id}
                onResourceAdded={fetchResources}
              />
            )}
            {activeResourceType === 'slides' && (
              <SlidesTab
                resources={getResourcesByType('slides')}
                topicId={topic.id}
                onResourceAdded={fetchResources}
              />
            )}
            {activeResourceType === 'notes' && (
              <NotesTab
                resources={getResourcesByType('notes')}
                topicId={topic.id}
                onResourceAdded={fetchResources}
              />
            )}
            {activeResourceType === 'pyqs' && (
              <PYQsTab
                resources={getResourcesByType('pyqs')}
                topicId={topic.id}
                onResourceAdded={fetchResources}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};
