/*
  # Add Custom Sections, AI Chat, and Enhanced Analytics

  ## New Tables
    - `custom_sections`
      - `id` (uuid, primary key)
      - `topic_id` (uuid, foreign key to topics)
      - `name` (text) - Name of the custom section
      - `icon` (text) - Icon identifier
      - `color` (text) - Color for the section
      - `order_index` (integer) - Display order
      - `created_at` (timestamptz)
    
    - `ai_chat_history`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `topic_id` (uuid, foreign key to topics, nullable)
      - `message` (text) - User message
      - `response` (text) - AI response
      - `role` (text) - 'user' or 'assistant'
      - `chat_type` (text) - 'doubt' or 'concept_explainer'
      - `created_at` (timestamptz)
    
    - `study_sessions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `topic_id` (uuid, foreign key to topics)
      - `start_time` (timestamptz)
      - `end_time` (timestamptz, nullable)
      - `duration_seconds` (integer)
      - `created_at` (timestamptz)
    
    - `study_streaks`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `current_streak` (integer, default 0)
      - `longest_streak` (integer, default 0)
      - `last_study_date` (date)
      - `updated_at` (timestamptz)

  ## Modified Tables
    - `resources` - Add section_id for custom sections
    - `user_progress` - Add more detailed tracking fields

  ## Security
    - Enable RLS on all new tables
    - Add policies for authenticated users to manage their own data
*/

-- Create custom_sections table
CREATE TABLE IF NOT EXISTS custom_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  name text NOT NULL,
  icon text DEFAULT 'folder',
  color text DEFAULT '#6B7280',
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE custom_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view custom sections for their topics"
  ON custom_sections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM topics t
      JOIN subjects s ON s.id = t.subject_id
      WHERE t.id = custom_sections.topic_id
    )
  );

CREATE POLICY "Users can create custom sections"
  ON custom_sections FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM topics t
      JOIN subjects s ON s.id = t.subject_id
      WHERE t.id = topic_id
    )
  );

CREATE POLICY "Users can update custom sections"
  ON custom_sections FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM topics t
      JOIN subjects s ON s.id = t.subject_id
      WHERE t.id = custom_sections.topic_id
    )
  );

CREATE POLICY "Users can delete custom sections"
  ON custom_sections FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM topics t
      JOIN subjects s ON s.id = t.subject_id
      WHERE t.id = custom_sections.topic_id
    )
  );

-- Create ai_chat_history table
CREATE TABLE IF NOT EXISTS ai_chat_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id uuid REFERENCES topics(id) ON DELETE CASCADE,
  message text NOT NULL,
  response text,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  chat_type text NOT NULL CHECK (chat_type IN ('doubt', 'concept_explainer')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ai_chat_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chat history"
  ON ai_chat_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create chat messages"
  ON ai_chat_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat history"
  ON ai_chat_history FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create study_sessions table
CREATE TABLE IF NOT EXISTS study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  duration_seconds integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own study sessions"
  ON study_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create study sessions"
  ON study_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own study sessions"
  ON study_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create study_streaks table
CREATE TABLE IF NOT EXISTS study_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak integer DEFAULT 0,
  longest_streak integer DEFAULT 0,
  last_study_date date,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE study_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own study streaks"
  ON study_streaks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own study streaks"
  ON study_streaks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own study streaks"
  ON study_streaks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add section_id to resources table for custom sections
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resources' AND column_name = 'section_id'
  ) THEN
    ALTER TABLE resources ADD COLUMN section_id uuid REFERENCES custom_sections(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add enhanced tracking fields to user_progress
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_progress' AND column_name = 'total_time_seconds'
  ) THEN
    ALTER TABLE user_progress ADD COLUMN total_time_seconds integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_progress' AND column_name = 'completed'
  ) THEN
    ALTER TABLE user_progress ADD COLUMN completed boolean DEFAULT false;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_custom_sections_topic_id ON custom_sections(topic_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_history_user_id ON ai_chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_history_topic_id ON ai_chat_history(topic_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_topic_id ON study_sessions(topic_id);
CREATE INDEX IF NOT EXISTS idx_study_streaks_user_id ON study_streaks(user_id);