import { supabase } from './supabase';
import { Subject, Topic, Resource, UserProgress, StudySession, StudyStreak } from './types';

export const isDemoMode = (): boolean => {
  try {
    return !supabase || !import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL.includes('placeholder');
  } catch {
    return true;
  }
};

export const getDemoUser = () => ({
  id: 'demo-user-001',
  email: 'demo@student.com',
  created_at: new Date().toISOString(),
});

const DEMO_SUBJECTS_KEY = 'demo:subjects';
const DEMO_TOPICS_KEY = 'demo:topics';
const DEMO_RESOURCES_KEY = 'demo:resources';
const DEMO_PROGRESS_KEY = 'demo:progress';
const DEMO_SESSIONS_KEY = 'demo:sessions';
const DEMO_STREAK_KEY = 'demo:streak';
const DEMO_RECENTLY_ACCESSED_KEY = 'demo:recently_accessed';

export const demoStorage = {
  getSubjects: (): Subject[] => {
    const data = localStorage.getItem(DEMO_SUBJECTS_KEY);
    if (!data) {
      const defaultSubjects: Subject[] = [
        {
          id: 'subj-1',
          name: 'Data Structures & Algorithms',
          color: '#3B82F6',
          icon: '📚',
          description: 'Learn fundamental data structures and algorithms',
          created_at: new Date().toISOString(),
        },
        {
          id: 'subj-2',
          name: 'Web Development',
          color: '#10B981',
          icon: '🌐',
          description: 'Master modern web development',
          created_at: new Date().toISOString(),
        },
        {
          id: 'subj-3',
          name: 'Machine Learning',
          color: '#F59E0B',
          icon: '🤖',
          description: 'Introduction to ML and AI',
          created_at: new Date().toISOString(),
        },
      ];
      localStorage.setItem(DEMO_SUBJECTS_KEY, JSON.stringify(defaultSubjects));
      return defaultSubjects;
    }
    return JSON.parse(data);
  },

  setSubjects: (subjects: Subject[]) => {
    localStorage.setItem(DEMO_SUBJECTS_KEY, JSON.stringify(subjects));
  },

  addSubject: (subject: Omit<Subject, 'id' | 'created_at'>) => {
    const subjects = demoStorage.getSubjects();
    const newSubject: Subject = {
      ...subject,
      id: `subj-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    subjects.push(newSubject);
    demoStorage.setSubjects(subjects);
    return newSubject;
  },

  getTopics: (): Topic[] => {
    const data = localStorage.getItem(DEMO_TOPICS_KEY);
    if (!data) {
      const defaultTopics: Topic[] = [
        {
          id: 'topic-1',
          subject_id: 'subj-1',
          name: 'Arrays and Strings',
          description: 'Basic array operations',
          created_at: new Date().toISOString(),
        },
        {
          id: 'topic-2',
          subject_id: 'subj-1',
          name: 'Linked Lists',
          description: 'Singly and doubly linked lists',
          created_at: new Date().toISOString(),
        },
        {
          id: 'topic-3',
          subject_id: 'subj-2',
          name: 'HTML & CSS',
          description: 'Web fundamentals',
          created_at: new Date().toISOString(),
        },
      ];
      localStorage.setItem(DEMO_TOPICS_KEY, JSON.stringify(defaultTopics));
      return defaultTopics;
    }
    return JSON.parse(data);
  },

  setTopics: (topics: Topic[]) => {
    localStorage.setItem(DEMO_TOPICS_KEY, JSON.stringify(topics));
  },

  getResources: (): Resource[] => {
    const data = localStorage.getItem(DEMO_RESOURCES_KEY);
    return data ? JSON.parse(data) : [];
  },

  setResources: (resources: Resource[]) => {
    localStorage.setItem(DEMO_RESOURCES_KEY, JSON.stringify(resources));
  },

  addResource: (resource: Omit<Resource, 'id' | 'created_at'>) => {
    const resources = demoStorage.getResources();
    const newResource: Resource = {
      ...resource,
      id: `res-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    resources.push(newResource);
    demoStorage.setResources(resources);
    return newResource;
  },

  getProgress: (): UserProgress[] => {
    const data = localStorage.getItem(DEMO_PROGRESS_KEY);
    return data ? JSON.parse(data) : [];
  },

  setProgress: (progress: UserProgress[]) => {
    localStorage.setItem(DEMO_PROGRESS_KEY, JSON.stringify(progress));
  },

  updateProgress: (topicId: string, updates: Partial<UserProgress>) => {
    const progress = demoStorage.getProgress();
    const existing = progress.find((p) => p.topic_id === topicId);

    if (existing) {
      Object.assign(existing, updates);
    } else {
      progress.push({
        id: `prog-${Date.now()}`,
        user_id: 'demo-user-001',
        topic_id: topicId,
        progress_percentage: 0,
        last_accessed: new Date().toISOString(),
        total_time_seconds: 0,
        completed: false,
        created_at: new Date().toISOString(),
        ...updates,
      } as UserProgress);
    }
    demoStorage.setProgress(progress);
  },

  getSessions: (): StudySession[] => {
    const data = localStorage.getItem(DEMO_SESSIONS_KEY);
    return data ? JSON.parse(data) : [];
  },

  setSessions: (sessions: StudySession[]) => {
    localStorage.setItem(DEMO_SESSIONS_KEY, JSON.stringify(sessions));
  },

  addSession: (session: Omit<StudySession, 'id' | 'created_at'>) => {
    const sessions = demoStorage.getSessions();
    const newSession: StudySession = {
      ...session,
      id: `sess-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    sessions.push(newSession);
    demoStorage.setSessions(sessions);
    return newSession;
  },

  getStreak: (): StudyStreak | null => {
    const data = localStorage.getItem(DEMO_STREAK_KEY);
    if (!data) {
      const defaultStreak: StudyStreak = {
        id: 'streak-1',
        user_id: 'demo-user-001',
        current_streak: 3,
        longest_streak: 7,
        last_study_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      };
      localStorage.setItem(DEMO_STREAK_KEY, JSON.stringify(defaultStreak));
      return defaultStreak;
    }
    return JSON.parse(data);
  },

  setStreak: (streak: StudyStreak) => {
    localStorage.setItem(DEMO_STREAK_KEY, JSON.stringify(streak));
  },

  getRecentlyAccessed: (): Array<{ subject_id: string; last_accessed_at: string }> => {
    const data = localStorage.getItem(DEMO_RECENTLY_ACCESSED_KEY);
    return data ? JSON.parse(data) : [];
  },

  setRecentlyAccessed: (items: Array<{ subject_id: string; last_accessed_at: string }>) => {
    localStorage.setItem(DEMO_RECENTLY_ACCESSED_KEY, JSON.stringify(items));
  },

  updateRecentlyAccessed: (subjectId: string) => {
    const items = demoStorage.getRecentlyAccessed();
    const existing = items.find((item) => item.subject_id === subjectId);

    if (existing) {
      existing.last_accessed_at = new Date().toISOString();
    } else {
      items.push({
        subject_id: subjectId,
        last_accessed_at: new Date().toISOString(),
      });
    }

    items.sort((a, b) =>
      new Date(b.last_accessed_at).getTime() - new Date(a.last_accessed_at).getTime()
    );

    demoStorage.setRecentlyAccessed(items.slice(0, 10));
  },
};
