import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Subject, Topic } from '@/lib/types';
import { ChevronRight, ChevronDown, Search, Folder, FileText } from 'lucide-react';

interface SidebarProps {
  onTopicSelect?: (topic: Topic, subject: Subject) => void;
  selectedTopicId?: string;
}

interface SubjectWithTopics extends Subject {
  topics: Topic[];
  expanded: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onTopicSelect,
  selectedTopicId,
}) => {
  const [subjects, setSubjects] = useState<SubjectWithTopics[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubjectsAndTopics();
  }, []);

  const fetchSubjectsAndTopics = async () => {
    try {
      setLoading(true);
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .order('name');

      if (subjectsError) throw subjectsError;

      const { data: topicsData, error: topicsError } = await supabase
        .from('topics')
        .select('*')
        .order('name');

      if (topicsError) throw topicsError;

      const subjectsWithTopics = (subjectsData || []).map((subject) => ({
        ...subject,
        topics: (topicsData || []).filter((topic) => topic.subject_id === subject.id),
        expanded: false,
      }));

      setSubjects(subjectsWithTopics);
    } catch (error) {
      console.error('Error fetching subjects and topics:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSubject = (subjectId: string) => {
    setSubjects((prev) =>
      prev.map((subject) =>
        subject.id === subjectId
          ? { ...subject, expanded: !subject.expanded }
          : subject
      )
    );
  };

  const filteredSubjects = subjects
    .map((subject) => ({
      ...subject,
      topics: subject.topics.filter((topic) =>
        topic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        subject.name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter(
      (subject) =>
        subject.topics.length > 0 ||
        subject.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

  if (loading) {
    return (
      <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          Explorer
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search subjects & topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {filteredSubjects.map((subject) => (
          <div key={subject.id} className="mb-1">
            <button
              onClick={() => toggleSubject(subject.id)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition text-left group"
            >
              {subject.expanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              )}
              <Folder
                className="w-4 h-4 flex-shrink-0"
                style={{ color: subject.color }}
              />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate flex-1">
                {subject.name}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                {subject.topics.length}
              </span>
            </button>

            {subject.expanded && (
              <div className="ml-6 mt-1 space-y-0.5">
                {subject.topics.map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => onTopicSelect?.(topic, subject)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition text-left ${
                      selectedTopicId === topic.id
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm truncate">{topic.name}</span>
                  </button>
                ))}
                {subject.topics.length === 0 && (
                  <div className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500 italic">
                    No topics yet
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {filteredSubjects.length === 0 && (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500">
            <p className="text-sm">No subjects found</p>
          </div>
        )}
      </div>
    </div>
  );
};
