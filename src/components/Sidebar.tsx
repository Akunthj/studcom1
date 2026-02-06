import React, { useEffect, useState } from 'react';
import { Search, ChevronDown, ChevronRight, Folder, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubject } from '@/contexts/SubjectContext';
import { demoStorage } from '@/lib/demoMode';
import { supabase } from '@/lib/supabase';
import { Subject, Topic } from '@/lib/types';

interface SidebarProps {
  collapsed?: boolean;
  onTopicSelect?: (topic: Topic) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed = false,
  onTopicSelect,
}) => {
  const { isDemo } = useAuth();
  const { currentSubjectId, setCurrentSubjectId } = useSubject();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  /* -----------------------------
     FETCH SUBJECTS
  ------------------------------*/
  useEffect(() => {
    const fetchSubjects = async () => {
      if (isDemo) {
        setSubjects(demoStorage.getSubjects());
        return;
      }

      const { data, error } = await supabase.from('subjects').select('*').order('name');
      if (!error) setSubjects(data || []);
    };

    fetchSubjects();
  }, [isDemo]);

  /* -----------------------------
     FETCH TOPICS FOR ACTIVE SUBJECT
  ------------------------------*/
  useEffect(() => {
    if (!currentSubjectId) {
      setTopics([]);
      return;
    }

    const fetchTopics = async () => {
      if (isDemo) {
        const allTopics = demoStorage.getTopics();
        setTopics(allTopics.filter(t => t.subject_id === currentSubjectId));
        return;
      }

      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .eq('subject_id', currentSubjectId)
        .order('name');

      if (!error) setTopics(data || []);
    };

    fetchTopics();
  }, [currentSubjectId, isDemo]);

  /* -----------------------------
     FILTERED SUBJECTS
  ------------------------------*/
  const filteredSubjects = subjects.filter(subject =>
    subject.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (collapsed) return null;

  return (
    <aside className="w-64 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
          Explorer
        </h2>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search subjects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Subjects */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredSubjects.map((subject) => {
          const isExpanded = expandedSubjectId === subject.id;
          const isActive = currentSubjectId === subject.id;

          return (
            <div key={subject.id} className="mb-1">
              {/* SUBJECT ROW */}
              <button
                onClick={() => {
                  setCurrentSubjectId(subject.id);     // 🔑 CORE FIX
                  setExpandedSubjectId(isExpanded ? null : subject.id);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition
                  ${isActive ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}
                `}
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
                <Folder className="w-4 h-4" style={{ color: subject.color }} />
                <span className="flex-1 text-sm font-medium truncate text-left">
                  {subject.name}
                </span>
              </button>

              {/* TOPICS (ONLY FOR ACTIVE SUBJECT) */}
              {isExpanded && isActive && (
                <div className="ml-6 mt-1 space-y-0.5">
                  {topics.length === 0 && (
                    <div className="px-3 py-2 text-xs text-gray-400 italic">
                      No topics yet
                    </div>
                  )}

                  {topics.map((topic) => (
                    <button
                      key={topic.id}
                      onClick={() => onTopicSelect?.(topic)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm
                                 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="truncate">{topic.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {filteredSubjects.length === 0 && (
          <div className="text-center py-8 text-sm text-gray-400">
            No subjects found
          </div>
        )}
      </div>
    </aside>
  );
};