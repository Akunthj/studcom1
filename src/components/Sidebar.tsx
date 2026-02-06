import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Subject, Topic, Resource } from '@/lib/types';
import { ChevronRight, ChevronDown, Search, Folder, FileText, Book, Presentation, FileText as NotesIcon, HelpCircle } from 'lucide-react';

interface SidebarProps {
  onTopicSelect?: (topic: Topic, subject: Subject) => void;
  selectedTopicId?: string;
  collapsed?: boolean;
}

interface SubjectWithTopicsAndResources extends Subject {
  topics: Topic[];
  resources: Resource[];
  expanded: boolean;
  resourcesExpanded: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onTopicSelect,
  selectedTopicId,
  collapsed = false,
}) => {
  const [subjects, setSubjects] = useState<SubjectWithTopicsAndResources[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubjectsAndTopics();
  }, []);

  // Load expanded state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('studcom:sidebar_expanded_subjects');
    if (savedState) {
      try {
        const expandedSubjects = JSON.parse(savedState);
        setSubjects((prev) =>
          prev.map((subject) => ({
            ...subject,
            expanded: expandedSubjects[subject.id]?.expanded || false,
            resourcesExpanded: expandedSubjects[subject.id]?.resourcesExpanded || false,
          }))
        );
      } catch (e) {
        console.error('Failed to parse sidebar state', e);
      }
    }
  }, [subjects.length]);

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

      const { data: resourcesData, error: resourcesError } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false });

      if (resourcesError && resourcesError.code !== 'PGRST116') throw resourcesError;

      const subjectsWithTopics = (subjectsData || []).map((subject) => ({
        ...subject,
        topics: (topicsData || []).filter((topic) => topic.subject_id === subject.id),
        resources: [] as Resource[],
        expanded: false,
        resourcesExpanded: false,
      }));

      // Group resources by subject (via topic)
      const topicToSubject = new Map<string, string>();
      (topicsData || []).forEach((topic) => {
        topicToSubject.set(topic.id, topic.subject_id);
      });

      const subjectResources = new Map<string, Resource[]>();
      (resourcesData || []).forEach((resource) => {
        const subjectId = topicToSubject.get(resource.topic_id);
        if (subjectId) {
          if (!subjectResources.has(subjectId)) {
            subjectResources.set(subjectId, []);
          }
          subjectResources.get(subjectId)!.push(resource);
        }
      });

      const finalSubjects = subjectsWithTopics.map((subject) => ({
        ...subject,
        resources: subjectResources.get(subject.id) || [],
      }));

      setSubjects(finalSubjects);
    } catch (error) {
      console.error('Error fetching subjects and topics:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSubject = (subjectId: string) => {
    setSubjects((prev) => {
      const updated = prev.map((subject) =>
        subject.id === subjectId
          ? { ...subject, expanded: !subject.expanded }
          : subject
      );
      saveExpandedState(updated);
      return updated;
    });
  };

  const toggleResources = (subjectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSubjects((prev) => {
      const updated = prev.map((subject) =>
        subject.id === subjectId
          ? { ...subject, resourcesExpanded: !subject.resourcesExpanded }
          : subject
      );
      saveExpandedState(updated);
      return updated;
    });
  };

  const saveExpandedState = (subjects: SubjectWithTopicsAndResources[]) => {
    const state: Record<string, { expanded: boolean; resourcesExpanded: boolean }> = {};
    subjects.forEach((subject) => {
      state[subject.id] = {
        expanded: subject.expanded,
        resourcesExpanded: subject.resourcesExpanded,
      };
    });
    localStorage.setItem('studcom:sidebar_expanded_subjects', JSON.stringify(state));
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'book':
        return Book;
      case 'slides':
        return Presentation;
      case 'notes':
        return NotesIcon;
      case 'pyqs':
        return HelpCircle;
      default:
        return FileText;
    }
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
      <div
        className={`bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 flex items-center justify-center transition-all duration-300 ${
          collapsed ? 'w-0 overflow-hidden' : 'w-64'
        }`}
      >
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (collapsed) {
    return null;
  }

  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full transition-all duration-300">
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

                {subject.resources.length > 0 && (
                  <div className="mt-2">
                    <button
                      onClick={(e) => toggleResources(subject.id, e)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition text-left"
                    >
                      {subject.resourcesExpanded ? (
                        <ChevronDown className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                      ) : (
                        <ChevronRight className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                      )}
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Resources ({subject.resources.length})
                      </span>
                    </button>

                    {subject.resourcesExpanded && (
                      <div className="ml-5 mt-1 space-y-0.5">
                        {subject.resources.slice(0, 5).map((resource) => {
                          const Icon = getResourceIcon(resource.type);
                          return (
                            <button
                              key={resource.id}
                              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition text-left"
                              title={resource.title}
                            >
                              <Icon className="w-3 h-3 flex-shrink-0 text-gray-500 dark:text-gray-400" />
                              <span className="text-xs text-gray-700 dark:text-gray-300 truncate">
                                {resource.title}
                              </span>
                            </button>
                          );
                        })}
                        {subject.resources.length > 5 && (
                          <div className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 italic">
                            +{subject.resources.length - 5} more
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

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
