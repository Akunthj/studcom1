import React, { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Upload, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Resource } from '@/lib/types';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface FileUploadProps {
  topicId: string;
  subjectId?: string; // Add subjectId for RAG
  resourceType: 'book' | 'slides' | 'notes' | 'pyqs';
  onSuccess: () => void;
  acceptedTypes?: string;
}

const DEMO_STORAGE_KEY = 'demo_resources';

const getDemoResources = (topicId: string): Resource[] => {
  const all = JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY) || '{}');
  return all[topicId] || [];
};

const setDemoResources = (topicId: string, resources: Resource[]) => {
  const all = JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY) || '{}');
  all[topicId] = resources;
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(all));
};

// Extract text from PDF file
async function extractPdfText(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      // Type assertion for PDF.js text content items
      const pageText = textContent.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ');
      fullText += pageText + '\n\n';
    }
    
    return fullText.trim();
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    throw new Error('Failed to extract text from PDF. Please ensure the file is a valid PDF.');
  }
}

export const FileUpload: React.FC<FileUploadProps> = ({
  topicId,
  subjectId,
  resourceType,
  onSuccess,
  acceptedTypes = '.pdf,.ppt,.pptx,.doc,.docx',
}) => {
  const [uploading, setUploading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.split('.')[0]);
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !title) {
      setError('Please provide a title and select a file');
      return;
    }

    setUploading(true);
    setError(null);
    setProcessingStatus('Uploading file...');

    try {
      /**
       * 🟢 DEMO MODE (no Supabase)
       */
      if (!supabase) {
        const existing = getDemoResources(topicId);

        // Create a blob URL so the file can be viewed
        const blobUrl = URL.createObjectURL(file);

        const newResource = {
          id: crypto.randomUUID(),
          topic_id: topicId,
          title,
          description: description || null,
          type: resourceType,
          file_url: blobUrl,        // blob URL for viewing
          file_path: null,
          file_name: file.name,
          file_size: file.size,
          section_id: null,
          processing_status: 'pending' as const,
          created_at: new Date().toISOString(),
        };

        const updated = [...existing, newResource];
        setDemoResources(topicId, updated);

        setSuccess(true);
        setTimeout(() => {
          onSuccess();
          resetForm();
        }, 1000);

        return;
      }

      /**
       * 🔵 REAL SUPABASE MODE WITH RAG
       */
      const fileExt = file.name.split('.').pop();
      const fileName = `${topicId}/${Date.now()}.${fileExt}`;
      const filePath = `resources/${fileName}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('study-resources')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('study-resources')
        .getPublicUrl(filePath);

      // Insert resource metadata
      const { data: insertedResource, error: dbError } = await supabase
        .from('resources')
        .insert({
          topic_id: topicId,
          title,
          description: description || null,
          type: resourceType,
          file_url: urlData.publicUrl,
          file_path: filePath,
          processing_status: 'pending',
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Process PDFs for RAG - extract text and embed
      if (fileExt?.toLowerCase() === 'pdf' && subjectId) {
        setProcessingStatus('Extracting text from PDF...');
        
        try {
          const textContent = await extractPdfText(file);
          
          if (textContent && textContent.length > 100) {
            setProcessingStatus('Creating embeddings...');
            
            // Call embed-document function
            const embedUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/embed-document`;
            const embedResponse = await fetch(embedUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                resourceId: insertedResource.id,
                topicId,
                subjectId,
                textContent,
              }),
            });

            if (!embedResponse.ok) {
              console.error('Failed to embed document:', await embedResponse.text());
              // Don't fail the upload, just log the error
              setProcessingStatus('File uploaded, but embedding failed. You can still use it.');
            } else {
              setProcessingStatus('Document processed successfully!');
            }
          } else {
            console.warn('PDF text content too short or empty, skipping embedding');
            setProcessingStatus('File uploaded (no text content detected)');
          }
        } catch (pdfError) {
          console.error('PDF processing error:', pdfError);
          // Don't fail the upload, just log the error
          setProcessingStatus('File uploaded, but text extraction failed.');
        }
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        resetForm();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setProcessingStatus('');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setFile(null);
    setSuccess(false);
    setError(null);
    setProcessingStatus('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Upload {resourceType === 'pyqs'
          ? 'PYQ'
          : resourceType.charAt(0).toUpperCase() + resourceType.slice(1)}
      </h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
          <p className="text-green-700 text-sm">Upload successful!</p>
        </div>
      )}

      {processingStatus && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
          <Loader2 className="w-5 h-5 text-blue-600 mt-0.5 animate-spin" />
          <p className="text-blue-700 text-sm">{processingStatus}</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            File <span className="text-red-500">*</span>
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedTypes}
              onChange={handleFileSelect}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-gray-900">
                  {file.name}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="ml-2 text-red-600 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div>
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  PDF, PPT, DOC files supported
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleUpload}
            disabled={uploading || !file || !title}
            className="flex-1 py-2 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
          <button
            onClick={resetForm}
            disabled={uploading}
            className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};