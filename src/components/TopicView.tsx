import React, { useState, useEffect } from 'react';
import { Subject, Topic, Resource } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Book, Presentation, FileText, HelpCircle, MessageCircle, Lightbulb, TrendingUp, Clock } from 'lucide-react';
import { BooksTab } from './tabs/BooksTab';
import { SlidesTab } from './tabs/SlidesTab';
import { NotesTab } from './tabs/NotesTab';
import { PYQsTab } from './tabs/PYQsTab';
import { AIChat } from './AIChat';
import { ConceptExplainer } from './ConceptExplainer';
import { ProgressAnalytics } from './ProgressAnalytics';
import { useStudyTimer } from '@/hooks/useStudyTimer';

interface TopicViewProps {
  topic: Topic;
  subject: Subject;
}

type TabType = 'books' | 'slides' | 'notes' | 'pyqs' | 'ai_doubt' | 'concept_explainer' | 'analytics';

export const TopicView: React.FC<TopicViewProps> = ({ topic, subject }) => {
  const [activeTab, setActiveTab] = useState<TabType>('books');
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { formattedTime, isTracking } = useStudyTimer(topic.id);

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
    { id: 'books' as TabType, label: 'Books', icon: Book, color: 'text-blue-600', category: 'resources' },
    { id: 'slides' as TabType, label: 'Slides', icon: Presentation, color: 'text-green-600', category: 'resources' },
    { id: 'notes' as TabType, label: 'Notes', icon: FileText, color: 'text-orange-600', category: 'resources' },
    { id: 'pyqs' as TabType, label: 'PYQs', icon: HelpCircle, color: 'text-purple-600', category: 'resources' },
    { id: 'ai_doubt' as TabType, label: 'AI Doubt', icon: MessageCircle, color: 'text-blue-600', category: 'ai' },
    { id: 'concept_explainer' as TabType, label: 'Explainer', icon: Lightbulb, color: 'text-yellow-600', category: 'ai' },
    { id: 'analytics' as TabType, label: 'Analytics', icon: TrendingUp, color: 'text-green-600', category: 'tracking' },
  ];

  const getResourcesByType = (type: string) => {
    return resources.filter((r) => r.type === type);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: subject.color }}
              ></div>
              <span className="text-sm font-medium text-gray-600">{subject.name}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{topic.name}</h1>
            {topic.description && (
              <p className="text-sm text-gray-600 mt-1">{topic.description}</p>
            )}
          </div>
          {isTracking && (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
              <Clock className="w-5 h-5 text-green-600 animate-pulse" />
              <div className="text-right">
                <p className="text-xs text-green-600 font-medium">Study Time</p>
                <p className="text-lg font-bold text-green-700">{formattedTime}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const resourceCount = tab.category === 'resources' ? getResourcesByType(tab.id).length : 0;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === tab.id
                    ? `bg-gray-900 text-white`
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.category === 'resources' && resourceCount > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    activeTab === tab.id
                      ? 'bg-white/20'
                      : 'bg-gray-200'
                  }`}>
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
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading resources...</p>
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
            {activeTab === 'ai_doubt' && <AIChat topicId={topic.id} topicName={topic.name} />}
            {activeTab === 'concept_explainer' && (
              <ConceptExplainer topicId={topic.id} topicName={topic.name} />
            )}
            {activeTab === 'analytics' && <ProgressAnalytics topicId={topic.id} />}
          </>
        )}
      </div>
    </div>
  );
};
