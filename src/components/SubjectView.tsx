import React, { useState, useEffect } from 'react';
import { Subject, Topic } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { TopicView } from './TopicView';
import { ArrowLeft, Folder, FileText, Plus } from 'lucide-react';

interface SubjectViewProps {
  subject: Subject;
  onBack: () => void;
}

export const SubjectView: React.FC<SubjectViewProps> = ({ subject, onBack }) => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTopics();
  }, [subject.id]);

  const fetchTopics = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .eq('subject_id', subject.id)
        .order('name');

      if (error) throw error;
      setTopics(data || []);
    } catch (error) {
      console.error('Error fetching topics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (selectedTopic) {
    return <TopicView topic={selectedTopic} subject={subject} />;
  }

  return (
    <div className="flex h-full bg-gray-50">
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Dashboard</span>
          </button>

          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
              style={{ backgroundColor: subject.color + '20', color: subject.color }}
            >
              📚
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{subject.name}</h2>
              <p className="text-sm text-gray-600">{topics.length} topics</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">Loading topics...</div>
            </div>
          ) : (
            <>
              {topics.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => setSelectedTopic(topic)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-gray-50 transition text-left group"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: subject.color + '10' }}
                  >
                    <FileText className="w-5 h-5" style={{ color: subject.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{topic.name}</h3>
                    {topic.description && (
                      <p className="text-xs text-gray-600 truncate">{topic.description}</p>
                    )}
                  </div>
                </button>
              ))}

              {topics.length === 0 && (
                <div className="text-center py-8 px-4">
                  <Folder className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 mb-3">No topics yet</p>
                  <button className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition">
                    <Plus className="w-4 h-4" />
                    Add Topic
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div
            className="w-24 h-24 rounded-2xl flex items-center justify-center text-5xl mx-auto mb-6"
            style={{ backgroundColor: subject.color + '20' }}
          >
            📚
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Select a Topic</h3>
          <p className="text-gray-600">
            Choose a topic from the sidebar to view its resources, notes, and study materials
          </p>
        </div>
      </div>
    </div>
  );
};
