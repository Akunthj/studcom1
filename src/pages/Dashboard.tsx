import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Subject, SubjectWithProgress } from '@/lib/types';
import { Header } from '@/components/Header';
import { AddItemModal } from '@/components/AddItemModal';
import { ExamCalendar } from '@/components/ExamCalendar';
import { HomepageTodo } from '@/components/HomepageTodo';
import { Plus, Minimize2, Maximize2, Search, BookMarked, BookOpen, X } from 'lucide-react';
import { demoStorage } from '@/lib/demoMode';

export const Dashboard: React.FC = () => {
  const { user, loading: authLoading, isDemo } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<SubjectWithProgress[]>([]);
  const [recentlyAccessedSubjects, setRecentlyAccessedSubjects] = useState<SubjectWithProgress[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [compactView, setCompactView] = useState(() => {
    const saved = localStorage.getItem('studcom:compact_view');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('studcom:compact_view', compactView.toString());
  }, [compactView]);

  useEffect(() => {
    if (user) {
      fetchSubjects();
    }
  }, [user, isDemo]);

  const fetchSubjects = async () => {
    try {
      setLoading(true);

      if (isDemo) {
        const demoSubjects = demoStorage.getSubjects();
        const demoTopics = demoStorage.getTopics();
        const demoProgress = demoStorage.getProgress();

        const subjectsWithProgress = demoSubjects.map((subject) => {
          const subjectTopics = demoTopics.filter((t) => t.subject_id === subject.id);
          const totalTopics = subjectTopics.length;

          if (totalTopics === 0) {
            return {
              ...subject,
              progress_percentage: 0,
              last_accessed: new Date().toISOString(),
            };
          }

          const completedTopics = subjectTopics.filter((topic) =>
            demoProgress.some((p) => p.topic_id === topic.id && p.completed)
          ).length;

          const progressPercentage = Math.round((completedTopics / totalTopics) * 100);

          return {
            ...subject,
            progress_percentage: progressPercentage,
            last_accessed: new Date().toISOString(),
          };
        });

        setSubjects(subjectsWithProgress);

        const recentItems = demoStorage.getRecentlyAccessed();
        const recentIds = recentItems.map((item) => item.subject_id);
        const recentSubjects = subjectsWithProgress
          .filter((s) => recentIds.includes(s.id))
          .map((s) => {
            const recentItem = recentItems.find((r) => r.subject_id === s.id);
            return {
              ...s,
              last_accessed: recentItem?.last_accessed_at || s.last_accessed,
            };
          })
          .sort((a, b) => {
            const timeA = new Date(a.last_accessed || 0).getTime();
            const timeB = new Date(b.last_accessed || 0).getTime();
            return timeB - timeA;
          })
          .slice(0, 4);

        setRecentlyAccessedSubjects(recentSubjects);
      } else {
        const { data: subjectsData, error: subjectsError } = await supabase
          .from('subjects')
          .select('*')
          .order('name');

        if (subjectsError) throw subjectsError;

        const { data: topicsData, error: topicsError } = await supabase
          .from('topics')
          .select('*');

        if (topicsError) throw topicsError;

        const { data: progressData, error: progressError } = await supabase
          .from('user_progress')
          .select('topic_id, completed')
          .eq('user_id', user!.id);

        if (progressError && progressError.code !== 'PGRST116') throw progressError;

        const subjectsWithProgress = (subjectsData || []).map((subject: Subject) => {
          const subjectTopics = (topicsData || []).filter((t) => t.subject_id === subject.id);
          const totalTopics = subjectTopics.length;

          if (totalTopics === 0) {
            return {
              ...subject,
              progress_percentage: 0,
              last_accessed: new Date().toISOString(),
            };
          }

          const completedTopics = subjectTopics.filter((topic) =>
            (progressData || []).some((p) => p.topic_id === topic.id && p.completed)
          ).length;

          const progressPercentage = Math.round((completedTopics / totalTopics) * 100);

          return {
            ...subject,
            progress_percentage: progressPercentage,
            last_accessed: new Date().toISOString(),
          };
        });

        setSubjects(subjectsWithProgress);

        const { data: recentData, error: recentError } = await supabase
          .from('user_recently_accessed')
          .select('subject_id, last_accessed_at')
          .eq('user_id', user!.id)
          .order('last_accessed_at', { ascending: false })
          .limit(4);

        if (recentError && recentError.code !== 'PGRST116') throw recentError;

        const recentIds = (recentData || []).map((item) => item.subject_id);
        const recentSubjects = subjectsWithProgress
          .filter((s) => recentIds.includes(s.id))
          .map((s) => {
            const recentItem = (recentData || []).find((r) => r.subject_id === s.id);
            return {
              ...s,
              last_accessed: recentItem?.last_accessed_at || s.last_accessed,
            };
          })
          .sort((a, b) => {
            const timeA = new Date(a.last_accessed || 0).getTime();
            const timeB = new Date(b.last_accessed || 0).getTime();
            return timeB - timeA;
          });

        setRecentlyAccessedSubjects(recentSubjects);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSubjects = subjects.filter((subject) =>
    subject.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubjectClick = (subject: Subject) => {
    if (isDemo) {
      demoStorage.updateRecentlyAccessed(subject.id);
    }
    navigate(`/study?subject=${subject.id}`);
  };

  const handleDeleteSubject = async (subject: Subject) => {
    if (!confirm(`Are you sure you want to delete "${subject.name}"? This will also delete all topics and resources associated with this subject.`)) {
      return;
    }

    try {
      if (isDemo) {
        // Delete from demo storage
        const allSubjects = demoStorage.getSubjects();
        const updatedSubjects = allSubjects.filter(s => s.id !== subject.id);
        demoStorage.setSubjects(updatedSubjects);

        // Also delete associated topics
        const allTopics = demoStorage.getTopics();
        const updatedTopics = allTopics.filter(t => t.subject_id !== subject.id);
        demoStorage.setTopics(updatedTopics);

        // Delete associated resources
        const allResources = demoStorage.getResources();
        const topicIdsToDelete = allTopics.filter(t => t.subject_id === subject.id).map(t => t.id);
        const updatedResources = allResources.filter(r => !topicIdsToDelete.includes(r.topic_id));
        demoStorage.setResources(updatedResources);

        // Refresh the subjects list
        fetchSubjects();
      } else {
        // Delete from Supabase - cascade delete should handle topics and resources
        const { error } = await supabase
          .from('subjects')
          .delete()
          .eq('id', subject.id);

        if (error) throw error;
        
        // Refresh the subjects list
        fetchSubjects();
      }
    } catch (error) {
      console.error('Error deleting subject:', error);
      alert('Failed to delete subject. Please try again.');
    }
  };

  const handleAddSubjectSuccess = () => {
    fetchSubjects();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Header />

      <div className="max-w-none mx-auto px-4 sm:px-6 lg:px-8 py-4 flex-1 w-full">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4 items-start">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-full max-w-sm flex-1">
                  <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search subjects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>

                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition font-semibold text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Subject
                </button>
              </div>

              {/* Exam Calendar */}
              <ExamCalendar onNavigateToSubject={(subjectId) => handleSubjectClick({ id: subjectId } as Subject)} />
            </div>
            <HomepageTodo subjects={subjects} />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <BookMarked className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="font-semibold text-gray-900 dark:text-white">
                Subjects: {subjects.length}
              </span>
            </div>

            <button
              onClick={() => setCompactView(!compactView)}
              className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              title={compactView ? 'Normal view' : 'Compact view'}
              aria-label={compactView ? 'Switch to normal view' : 'Switch to compact view'}
            >
              {compactView ? (
                <Maximize2 className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              ) : (
                <Minimize2 className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              )}
            </button>
          </div>

          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">All Subjects</h2>
            {filteredSubjects.length > 0 ? (
              <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 ${compactView ? 'gap-3' : 'gap-4'}`}>
                {filteredSubjects.map((subject) => (
                  <div
                    key={subject.id}
                    className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 group relative
                      ${compactView ? 'p-4' : 'p-5'}
                      transition-all duration-200 hover:shadow-lg hover:scale-[1.02] hover:-translate-y-0.5
                      motion-reduce:hover:scale-100 motion-reduce:hover:translate-y-0 motion-reduce:transition-none
                    `}
                  >
                    <div 
                      onClick={() => handleSubjectClick(subject)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div
                          className={`rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200 motion-reduce:group-hover:scale-100 motion-reduce:transition-none
                            ${compactView ? 'w-12 h-12 text-2xl' : 'w-14 h-14 text-3xl'}
                          `}
                          style={{ backgroundColor: subject.color + '20', color: subject.color }}
                        >
                          {subject.icon || '📚'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-bold text-gray-900 dark:text-white truncate ${compactView ? 'text-base mb-1' : 'text-lg mb-2'}`}>
                            {subject.name}
                          </h3>
                          {subject.description && !compactView && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                              {subject.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            Progress
                          </span>
                          <span className="text-sm font-bold text-gray-900 dark:text-white">
                            {subject.progress_percentage || 0}%
                          </span>
                        </div>

                        <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ${compactView ? 'h-1.5' : 'h-2'}`}>
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${subject.progress_percentage || 0}%`,
                              backgroundColor: subject.color,
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSubject(subject);
                      }}
                      className="absolute top-2 right-2 p-2 bg-red-50 dark:bg-red-900/30 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/50 transition-all"
                      title="Delete subject"
                    >
                      <X className="w-4 h-4 text-red-600 dark:text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                <BookOpen className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No subjects found
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {searchQuery ? 'Try adjusting your search' : 'Get started by adding your first subject'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Add Your First Subject
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddModal && (
        <AddItemModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handleAddSubjectSuccess}
        />
      )}
    </div>
  );
};
