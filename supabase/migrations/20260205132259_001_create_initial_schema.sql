/*
  # Student Companion App - Initial Schema Setup

  1. New Tables
    - `subjects`: Store subject information with icons and colors
    - `topics`: Store topics within each subject
    - `resources`: Store learning materials (books, slides, notes, PYQs)
    - `user_progress`: Track student progress per topic
    - `ai_chat_messages`: Store AI conversation history

  2. Security
    - Enable RLS on all tables
    - Users can only access their own data
    - Public access for subject/topic data (read-only)

  3. Important Notes
    - Subject and topic data is shared across users
    - Each user has their own progress tracking
    - Resources are stored with metadata pointing to Supabase Storage files
*/

CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3B82F6',
  icon text NOT NULL DEFAULT 'BookOpen',
  description text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(name)
);

CREATE TABLE IF NOT EXISTS topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('book', 'slides', 'notes', 'pyqs')),
  file_url text,
  file_path text,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  last_accessed timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, topic_id)
);

CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id uuid REFERENCES topics(id) ON DELETE SET NULL,
  message text NOT NULL,
  response text,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_recently_accessed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  topic_id uuid REFERENCES topics(id) ON DELETE SET NULL,
  last_accessed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, subject_id)
);

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_recently_accessed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subjects are readable by all authenticated users"
  ON subjects FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Topics are readable by all authenticated users"
  ON topics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Resources are readable by all authenticated users"
  ON resources FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can read their own progress"
  ON user_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
  ON user_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
  ON user_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own chat messages"
  ON ai_chat_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat messages"
  ON ai_chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their recently accessed"
  ON user_recently_accessed FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert recently accessed"
  ON user_recently_accessed FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update recently accessed"
  ON user_recently_accessed FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX idx_user_progress_topic_id ON user_progress(topic_id);
CREATE INDEX idx_topics_subject_id ON topics(subject_id);
CREATE INDEX idx_resources_topic_id ON resources(topic_id);
CREATE INDEX idx_ai_messages_user_id ON ai_chat_messages(user_id);
CREATE INDEX idx_recently_accessed_user_id ON user_recently_accessed(user_id);
