import React, { useState } from 'react';
import { Resource } from '@/lib/types';
import { storage } from '@/lib/storage';
import { FileUpload } from '../FileUpload';
import { PDFViewer } from '../PDFViewer';
import { Book, Plus, Eye, Download, Trash2 } from 'lucide-react';

interface BooksTabProps {
  resources: Resource[];
  topicId: string;
  subjectId: string;
  onResourceAdded: () => void;
}

export const BooksTab: React.FC<BooksTabProps> = ({
  resources,
  topicId,
  subjectId,
  onResourceAdded,
}) => {
  const [showUpload, setShowUpload] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Resource | null>(null);
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({});

  const handleDelete = async (resource: Resource) => {
    if (!confirm('Are you sure you want to delete this book?')) return;

    try {
      await storage.deleteResource(resource.id);
      
      // Revoke blob URL if it exists
      if (fileUrls[resource.id]) {
        URL.revokeObjectURL(fileUrls[resource.id]);
        const newUrls = { ...fileUrls };
        delete newUrls[resource.id];
        setFileUrls(newUrls);
      }
      
      onResourceAdded();
    } catch (error) {
      console.error('Error deleting book:', error);
      alert('Failed to delete book');
    }
  };

  const handleViewBook = async (resource: Resource) => {
    try {
      // If we don't have a blob URL yet, get it
      if (!fileUrls[resource.id]) {
        const url = await storage.getFileUrl(resource.id);
        setFileUrls(prev => ({ ...prev, [resource.id]: url }));
        setSelectedBook({ ...resource, file_url: url });
      } else {
        setSelectedBook({ ...resource, file_url: fileUrls[resource.id] });
      }
    } catch (error) {
      console.error('Error loading book:', error);
      alert('Failed to load book');
    }
  };

  if (selectedBook) {
    return (
      <div className="h-full flex flex-col">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">{selectedBook.title}</h3>
          <button
            onClick={() => setSelectedBook(null)}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
          >
            Back to List
          </button>
        </div>
        <div className="flex-1 bg-gray-100 dark:bg-gray-900">
          {selectedBook.file_url && (
            <PDFViewer fileUrl={selectedBook.file_url} title={selectedBook.title} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Books</h2>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Book
          </button>
        </div>

        {showUpload && (
          <FileUpload
            topicId={topicId}
            subjectId={subjectId}
            resourceType="book"
            acceptedTypes=".pdf"
            onSuccess={() => {
              setShowUpload(false);
              onResourceAdded();
            }}
          />
        )}

        {resources.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
            <Book className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No books yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Upload your first book to get started</p>
            <button
              onClick={() => setShowUpload(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition font-medium"
            >
              <Plus className="w-4 h-4" />
              Upload Book
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resources.map((resource) => (
              <div
                key={resource.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition group"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Book className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {resource.title}
                    </h3>
                    {resource.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
                        {resource.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleViewBook(resource)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition text-sm font-medium"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  {resource.file_url && (
                    <a
                      href={resource.file_url}
                      download={resource.title}
                      className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                      title="Download"
                    >
                      <Download className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(resource)}
                    className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
