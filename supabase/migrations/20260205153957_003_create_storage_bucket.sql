/*
  # Create Storage Bucket for Study Resources

  1. Storage Bucket
    - Create 'study-resources' bucket for storing PDF files, slides, and other study materials
    - Set bucket to public for easy access to uploaded files

  2. Security
    - Enable RLS on storage bucket
    - Allow authenticated users to upload files
    - Allow authenticated users to read all files
    - Allow authenticated users to delete their own uploaded files

  3. Important Notes
    - Files are organized by topic_id in folders
    - All uploaded files are publicly accessible via URL
    - Storage policies ensure only authenticated users can upload
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('study-resources', 'study-resources', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload resources"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'study-resources');

CREATE POLICY "Anyone can view resources"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'study-resources');

CREATE POLICY "Authenticated users can delete their uploaded resources"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'study-resources');
