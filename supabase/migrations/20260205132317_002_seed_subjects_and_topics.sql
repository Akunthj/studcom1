/*
  # Seed Initial Subjects and Topics

  1. Subjects
    - Mathematics with subtopics (Calculus, Algebra, etc.)
    - Physics with subtopics (Mechanics, Electromagnetism, etc.)
    - Computer Science with subtopics
    - Chemistry and other subjects

  2. Topics
    - Calculus, Linear Algebra, Differential Calculus under Mathematics
    - Classical Mechanics, Electromagnetism, Thermodynamics under Physics
    - Data Structures, Algorithms, Web Development under Computer Science

  3. Note
    - Colors and icons are pre-assigned
    - Topics are empty and ready for resources
*/

INSERT INTO subjects (id, name, color, icon, description) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'Data Structures & Algorithms', '#3B82F6', 'Code', 'Master data structures and algorithms'),
  ('550e8400-e29b-41d4-a716-446655440001', 'Calculus II', '#10B981', 'Calculator', 'Advanced calculus concepts'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Machine Learning', '#F59E0B', 'Brain', 'AI and ML fundamentals'),
  ('550e8400-e29b-41d4-a716-446655440003', 'World History', '#EC4899', 'Globe', 'Historical events and analysis'),
  ('550e8400-e29b-41d4-a716-446655440004', 'Organic Chemistry', '#EF4444', 'Beaker', 'Organic chemistry principles'),
  ('550e8400-e29b-41d4-a716-446655440005', 'Business Management', '#06B6D4', 'Briefcase', 'Business and management concepts')
ON CONFLICT DO NOTHING;

INSERT INTO topics (id, subject_id, name, description) VALUES
  ('650e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', 'Arrays and Lists', 'Understanding arrays, linked lists, and dynamic arrays'),
  ('650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Trees and Graphs', 'Binary trees, BST, graphs, and traversal algorithms'),
  ('650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'Sorting and Searching', 'Quick sort, merge sort, binary search algorithms'),
  
  ('650e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'Differential Calculus', 'Limits, derivatives, and applications'),
  ('650e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', 'Integral Calculus', 'Integrals, area under curves, and applications'),
  ('650e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440001', 'Multivariable Calculus', 'Partial derivatives and multiple integrals'),
  
  ('650e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440002', 'Supervised Learning', 'Regression, classification, and training models'),
  ('650e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440002', 'Neural Networks', 'Deep learning, CNNs, and RNNs'),
  ('650e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440002', 'Feature Engineering', 'Data preprocessing and feature selection')
ON CONFLICT DO NOTHING;
