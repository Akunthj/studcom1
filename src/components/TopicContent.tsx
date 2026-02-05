import React, { useState, useEffect } from 'react';
import { Subject, Topic, Resource } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Book, Presentation, FileText, HelpCircle } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<TabType>('books');
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchResources();
    updateRecentlyAccessed();
  }, [topic.id]);

  const fetchResources = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .eq('topic_id', topic.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResources(data || []);
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

  const tabs = [
    { id: 'books' as TabType, label: 'Books', icon: Book, color: 'text-blue-600 dark:text-blue-400' },
    { id: 'slides' as TabType, label: 'Slides', icon: Presentation, color: 'text-green-600 dark:text-green-400' },
    { id: 'notes' as TabType, label: 'Notes', icon: FileText, color: 'text-orange-600 dark:text-orange-400' },
    { id: 'pyqs' as TabType, label: 'PYQs', icon: HelpCircle, color: 'text-purple-600 dark:text-purple-400' },
  ];

  const getResourcesByType = (type: string) => {
    return resources.filter((r) => r.type === type);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="mb-4">
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

        <div className="flex items-center gap-2 flex-wrap">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const resourceCount = getResourcesByType(tab.id).length;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === tab.id
                    ? 'bg-gray-900 dark:bg-gray-700 text-white'
                    : 'bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {resourceCount > 0 && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      activeTab === tab.id
                        ? 'bg-white/20'
                        : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                  >
                    {resourceCount}
                  </span>
                )}
              </button>
            );
          })}
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
            {activeTab === 'books' && (
              <BooksTab
                resources={getResourcesByType('book')}
                topicId={topic.id}
                onResourceAdded={fetchResources}
              />
            )}
            {activeTab === 'slides' && (
              <SlidesTab
                resources={getResourcesByType('slides')}
                topicId={topic.id}
                onResourceAdded={fetchResources}
              />
            )}
            {activeTab === 'notes' && (
              <NotesTab
                resources={getResourcesByType('notes')}
                topicId={topic.id}
                onResourceAdded={fetchResources}
              />
            )}
            {activeTab === 'pyqs' && (
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
