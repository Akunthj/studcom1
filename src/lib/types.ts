export interface Subject {
  id: string;
  name: string;
  color: string;
  icon: string;
  description: string | null;
  created_at: string;
}

export interface Topic {
  id: string;
  subject_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Resource {
  id: string;
  topic_id: string;
  title: string;
  type: 'book' | 'slides' | 'notes' | 'pyqs';
  file_url: string | null;
  file_path: string | null;
  description: string | null;
  section_id: string | null;
  created_at: string;
}

export interface UserProgress {
  id: string;
  user_id: string;
  topic_id: string;
  progress_percentage: number;
  last_accessed: string;
  total_time_seconds: number;
  completed: boolean;
  created_at: string;
}

export interface AIChatMessage {
  id: string;
  user_id: string;
  topic_id: string | null;
  message: string;
  response: string | null;
  role: 'user' | 'assistant';
  chat_type: 'doubt' | 'concept_explainer';
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
  };
}

export interface SubjectWithProgress extends Subject {
  progress_percentage?: number;
  last_accessed?: string;
}

export interface CustomSection {
  id: string;
  topic_id: string;
  name: string;
  icon: string;
  color: string;
  order_index: number;
  created_at: string;
}

export interface StudySession {
  id: string;
  user_id: string;
  topic_id: string;
  start_time: string;
  end_time: string | null;
  duration_seconds: number;
  created_at: string;
}

export interface StudyStreak {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_study_date: string;
  updated_at: string;
}
