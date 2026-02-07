import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, ChevronDown, ChevronRight, Folder, FileText, Book, Presentation, HelpCircle, Plus, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubject } from '@/contexts/SubjectContext';
import { useResourceType } from '@/contexts/ResourceTypeContext';
import { demoStorage } from '@/lib/demoMode';
import { storage } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { Subject, Topic, Resource } from '@/lib/types';

interface SidebarProps {
  collapsed?: boolean;
  onTopicSelect?: (topic: Topic) => void;
  selectedTopicId?: string;
  onActiveResourceTypeChange?: (resourceType: ResourceType) => void;
  onResourceOpen?: (resource: Resource) => void;
}

type ResourceType = 'books' | 'slides' | 'notes' | 'pyqs';

export type { ResourceType };

const RESOURCE_TYPE_MAP: Record<Resource['type'], ResourceType> = {
  book: 'books',
  slides: 'slides',
  notes: 'notes',
  pyqs: 'pyqs',
};

interface CustomFolder {
  id: string;
  name: string;
  icon: string;
  subfolders: CustomFolder[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed = false,
  onTopicSelect,
  selectedTopicId,
  onActiveResourceTypeChange,
  onResourceOpen,
}) => {
  const { isDemo } = useAuth();
  const { currentSubjectId, setCurrentSubjectId } = useSubject();
  const { activeResourceType, setActiveResourceType } = useResourceType();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // VSCode-style sidebar state
  const [customFolders, setCustomFolders] = useState<CustomFolder[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [showAddFolderModal, setShowAddFolderModal] = useState(false);
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [addingTopic, setAddingTopic] = useState(false);
  const [topicError, setTopicError] = useState('');

  const folderStorageKey = currentSubjectId
    ? `studcom:custom_sections:${currentSubjectId}:${activeResourceType}`
    : null;

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
     FETCH RESOURCES FOR TOPICS IN ACTIVE SUBJECT
  ------------------------------*/
  const fetchResources = useCallback(async () => {
    if (!currentSubjectId || topics.length === 0) {
      setResources([]);
      return;
    }

    try {
      const resourceLists = await Promise.all(
        topics.map((topic) => storage.getResources(topic.id))
      );
      setResources(resourceLists.flat());
    } catch (error) {
      console.error('Error fetching resources:', error);
      setResources([]);
    }
  }, [currentSubjectId, topics]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  useEffect(() => {
    if (!currentSubjectId) return;

    const handleResourcesUpdated = () => {
      fetchResources();
    };

    window.addEventListener('studcom:resources-updated', handleResourcesUpdated);
    return () => {
      window.removeEventListener('studcom:resources-updated', handleResourcesUpdated);
    };
  }, [currentSubjectId, fetchResources]);

  /* -----------------------------
     LOAD CUSTOM FOLDERS FROM LOCALSTORAGE
  ------------------------------*/
  useEffect(() => {
    if (!folderStorageKey) {
      setCustomFolders([]);
      setExpandedFolders(new Set());
      return;
    }

    const stored = localStorage.getItem(folderStorageKey);
    if (stored) {
      try {
        setCustomFolders(JSON.parse(stored));
      } catch {
        setCustomFolders([]);
      }
    } else {
      setCustomFolders([]);
    }
    setExpandedFolders(new Set());
  }, [folderStorageKey]);

  /* -----------------------------
     SAVE CUSTOM FOLDERS TO LOCALSTORAGE
  ------------------------------*/
  const saveCustomFolders = (folders: CustomFolder[]) => {
    if (!folderStorageKey) return;
    localStorage.setItem(folderStorageKey, JSON.stringify(folders));
    setCustomFolders(folders);
  };

  const addCustomFolder = (name: string, icon: string, parentId?: string) => {
    const newFolder: CustomFolder = {
      id: `folder-${Date.now()}`,
      name,
      icon,
      subfolders: [],
    };

    if (parentId) {
      // Add as subfolder
      const addToParent = (folders: CustomFolder[]): CustomFolder[] => {
        return folders.map(folder => {
          if (folder.id === parentId) {
            return { ...folder, subfolders: [...folder.subfolders, newFolder] };
          }
          return { ...folder, subfolders: addToParent(folder.subfolders) };
        });
      };
      saveCustomFolders(addToParent(customFolders));
    } else {
      // Add as top-level folder
      saveCustomFolders([...customFolders, newFolder]);
    }
  };

  const deleteCustomFolder = (folderId: string) => {
    const removeFolder = (folders: CustomFolder[]): CustomFolder[] => {
      return folders
        .filter(f => f.id !== folderId)
        .map(f => ({ ...f, subfolders: removeFolder(f.subfolders) }));
    };
    saveCustomFolders(removeFolder(customFolders));
  };

  const toggleFolderExpanded = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const folderOptions = useMemo(() => {
    const flattenFoldersWithPaths = (
      folders: CustomFolder[],
      prefix = ''
    ): Array<{ id: string; label: string }> => {
      return folders.flatMap((folder) => {
        const label = prefix ? `${prefix} / ${folder.name}` : folder.name;
        return [
          { id: folder.id, label },
          ...flattenFoldersWithPaths(folder.subfolders, label),
        ];
      });
    };

    return flattenFoldersWithPaths(customFolders);
  }, [customFolders]);

  const resourcesByType = useMemo(() => {
    const buckets: Record<ResourceType, Resource[]> = {
      books: [],
      slides: [],
      notes: [],
      pyqs: [],
    };

    resources.forEach((resource) => {
      const typeKey = RESOURCE_TYPE_MAP[resource.type];
      buckets[typeKey].push(resource);
    });

    return buckets;
  }, [resources]);

  const activeResources = useMemo(
    () => resourcesByType[activeResourceType] ?? [],
    [resourcesByType, activeResourceType]
  );

  const resourcesByTopic = useMemo(() => {
    const map: Record<string, Resource[]> = {};
    activeResources.forEach((resource) => {
      if (resource.section_id) return;
      if (!map[resource.topic_id]) {
        map[resource.topic_id] = [];
      }
      map[resource.topic_id].push(resource);
    });
    return map;
  }, [activeResources]);

  const resourcesByFolder = useMemo(() => {
    const map: Record<string, Resource[]> = {};
    activeResources.forEach((resource) => {
      if (!resource.section_id) return;
      if (!map[resource.section_id]) {
        map[resource.section_id] = [];
      }
      map[resource.section_id].push(resource);
    });
    return map;
  }, [activeResources]);

  const handleAddTopic = async () => {
    if (!newTopicName.trim() || !currentSubjectId) return;

    setAddingTopic(true);
    setTopicError('');

    try {
      if (isDemo) {
        const newTopic: Topic = {
          id: crypto.randomUUID(),
          subject_id: currentSubjectId,
          name: newTopicName.trim(),
          description: null,
          created_at: new Date().toISOString(),
        };

        const allTopics = demoStorage.getTopics();
        demoStorage.setTopics([...allTopics, newTopic]);
        setTopics((prev) => [...prev, newTopic]);
        onTopicSelect?.(newTopic);
      } else {
        const { data, error } = await supabase
          .from('topics')
          .insert({
            subject_id: currentSubjectId,
            name: newTopicName.trim(),
            description: null,
          })
          .select()
          .single();

        if (error) throw error;

        if (data) {
          setTopics((prev) => [...prev, data]);
          onTopicSelect?.(data);
        }
      }

      setNewTopicName('');
      setShowAddTopic(false);
    } catch (error) {
      setTopicError(error instanceof Error ? error.message : 'Failed to add topic');
    } finally {
      setAddingTopic(false);
    }
  };

  const handleResourceOpen = (resource: Resource) => {
    const topic = topics.find((item) => item.id === resource.topic_id);
    if (topic) {
      onTopicSelect?.(topic);
    }
    onResourceOpen?.(resource);
  };

  const handleAssignFolder = async (resource: Resource, folderId: string | null) => {
    try {
      await storage.updateResource(resource.id, { section_id: folderId });
      setResources((prev) =>
        prev.map((item) => (item.id === resource.id ? { ...item, section_id: folderId } : item))
      );
    } catch (error) {
      console.error('Error updating resource folder:', error);
      const message = error instanceof Error ? error.message : 'Failed to update folder';
      alert(message);
    }
  };

  /* -----------------------------
     FILTERED SUBJECTS
  ------------------------------*/
  const filteredSubjects = subjects.filter(subject =>
    subject.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (collapsed) return null;

  // VSCode-style view when a subject is active
  if (currentSubjectId) {
    const resourceTabs = [
      { id: 'books' as ResourceType, label: 'Books', icon: Book, color: 'text-blue-600 dark:text-blue-400' },
      { id: 'slides' as ResourceType, label: 'Slides', icon: Presentation, color: 'text-green-600 dark:text-green-400' },
      { id: 'notes' as ResourceType, label: 'Notes', icon: FileText, color: 'text-orange-600 dark:text-orange-400' },
      { id: 'pyqs' as ResourceType, label: 'PYQs', icon: HelpCircle, color: 'text-purple-600 dark:text-purple-400' },
    ];

    const renderResourceRow = (resource: Resource, level = 0) => (
      <div
        key={resource.id}
        style={{ marginLeft: `${level * 12}px` }}
        className="group flex items-center gap-2 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded cursor-pointer"
        role="button"
        tabIndex={0}
        onClick={() => handleResourceOpen(resource)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleResourceOpen(resource);
          }
        }}
      >
        <FileText className="w-3 h-3" />
        <span className="truncate flex-1">{resource.title}</span>
        {folderOptions.length > 0 && (
          <select
            value={resource.section_id || ''}
            onChange={(event) => handleAssignFolder(resource, event.target.value || null)}
            onClick={(event) => event.stopPropagation()}
            className="text-[10px] bg-transparent border border-gray-200 dark:border-gray-600 rounded px-1 py-0.5 opacity-0 group-hover:opacity-100 focus:opacity-100 focus-visible:opacity-100 transition max-w-[140px]"
          >
            <option value="">Unsorted</option>
            {folderOptions.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.label}
              </option>
            ))}
          </select>
        )}
      </div>
    );

    const renderCustomFolder = (folder: CustomFolder, level = 0) => {
      const isExpanded = expandedFolders.has(folder.id);
      const folderResources = resourcesByFolder[folder.id] ?? [];
      return (
        <div key={folder.id} style={{ marginLeft: `${level * 12}px` }}>
          <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded group">
            <button
              onClick={() => toggleFolderExpanded(folder.id)}
              className="flex items-center gap-2 flex-1 text-left"
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3 text-gray-400" />
              ) : (
                <ChevronRight className="w-3 h-3 text-gray-400" />
              )}
              <span className="text-sm">{folder.icon}</span>
              <span className="text-sm text-gray-700 dark:text-gray-300">{folder.name}</span>
              </button>
              <button
                onClick={() => deleteCustomFolder(folder.id)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition"
            >
              <X className="w-3 h-3 text-red-500" />
              </button>
            </div>
          {isExpanded && (
            <>
              {folderResources.map((resource) => renderResourceRow(resource, level + 1))}
              {folder.subfolders.map(sub => renderCustomFolder(sub, level + 1))}
            </>
          )}
        </div>
      );
    };

    return (
      <aside className="h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex">
        {/* Activity Bar (VSCode-style icon rail) */}
        <div className="w-12 bg-gray-100 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col items-center py-2 gap-1">
          {resourceTabs.map(tab => {
            const Icon = tab.icon;
            const count = resourcesByType[tab.id]?.length ?? 0;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveResourceType(tab.id);
                  onActiveResourceTypeChange?.(tab.id);
                }}
                className={`w-10 h-10 flex items-center justify-center rounded-lg transition relative ${
                  activeResourceType === tab.id
                    ? 'bg-white dark:bg-gray-800 shadow-sm'
                    : 'hover:bg-gray-200 dark:hover:bg-gray-800'
                }`}
                title={tab.label}
              >
                <Icon className={`w-5 h-5 ${activeResourceType === tab.id ? tab.color : 'text-gray-600 dark:text-gray-400'}`} />
                {count > 0 && (
                  <span 
                    className="absolute top-0 right-0 w-4 h-4 bg-blue-600 text-white text-[10px] rounded-full flex items-center justify-center"
                    aria-label={`${count} ${tab.label.toLowerCase()}`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}

          {/* Add Custom Folder Button */}
          <div className="flex-1" />
          <button
            onClick={() => setShowAddFolderModal(true)}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition"
            title="Add custom folder"
          >
            <Plus className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Sidebar Panel (File tree for selected resource type) */}
        <div className="w-80 flex flex-col overflow-hidden border-r border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                {resourceTabs.find(t => t.id === activeResourceType)?.label}
              </h2>
              <button
                onClick={() => setShowAddTopic((prev) => !prev)}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                {showAddTopic ? 'Cancel' : 'Add Topic'}
              </button>
            </div>
            {showAddTopic && (
              <div className="space-y-2">
                <input
                  type="text"
                  value={newTopicName}
                  onChange={(event) => setNewTopicName(event.target.value)}
                  placeholder="New topic name"
                  className="w-full px-2 py-1.5 text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                />
                {topicError && (
                  <p className="text-[11px] text-red-500">{topicError}</p>
                )}
                <button
                  onClick={handleAddTopic}
                  disabled={addingTopic || !newTopicName.trim()}
                  className="w-full px-2 py-1.5 text-xs font-medium bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
                >
                  {addingTopic ? 'Adding...' : 'Create Topic'}
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {/* Resources grouped by topic */}
            {topics.map(topic => {
              const topicResources = resourcesByTopic[topic.id] ?? [];

              return (
                <div key={topic.id} className="mb-2">
                  <button
                    onClick={() => onTopicSelect?.(topic)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition ${
                      selectedTopicId === topic.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                    }`}
                  >
                    <Folder className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {topic.name}
                    </span>
                  </button>

                  {topicResources.length > 0 ? (
                    <div className="mt-1 space-y-0.5">
                      {topicResources.map(resource => renderResourceRow(resource, 1))}
                    </div>
                  ) : (
                    <div className="ml-6 mt-1 text-[11px] text-gray-400">
                      No files yet
                    </div>
                  )}
                </div>
              );
            })}

            {/* Custom Folders */}
            {customFolders.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 px-2">
                  Custom Folders
                </h3>
                {customFolders.map(folder => renderCustomFolder(folder))}
              </div>
            )}

            {activeResources.length === 0 && customFolders.length === 0 && (
              <div className="text-center py-8 text-sm text-gray-400">
                No {resourceTabs.find(t => t.id === activeResourceType)?.label.toLowerCase()} yet
              </div>
            )}
            {topics.length === 0 && (
              <div className="text-center py-6 text-xs text-gray-400">
                No topics yet. Add one to start organizing resources.
              </div>
            )}
          </div>
        </div>

        {/* Add Folder Modal */}
        {showAddFolderModal && (
          <AddFolderModal
            onAdd={(name, icon) => {
              addCustomFolder(name, icon);
              setShowAddFolderModal(false);
            }}
            onClose={() => setShowAddFolderModal(false)}
          />
        )}
      </aside>
    );
  }

  // Default view (all subjects)
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
                  setCurrentSubjectId(subject.id);
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

/* -----------------------------
   ADD FOLDER MODAL
------------------------------*/
interface AddFolderModalProps {
  onAdd: (name: string, icon: string) => void;
  onClose: () => void;
}

const AddFolderModal: React.FC<AddFolderModalProps> = ({ onAdd, onClose }) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📁');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAdd(name.trim(), icon);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-sm w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add Custom Folder</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Folder Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Extra Materials"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Icon (Emoji)
            </label>
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="📁"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              maxLength={2}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition font-medium"
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
