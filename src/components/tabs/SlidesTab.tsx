import React, { useState } from 'react';
import { Resource } from '@/lib/types';
import { storage } from '@/lib/storage';
import { FileUpload } from '../FileUpload';
import { PDFViewer } from '../PDFViewer';
import { Presentation, Plus, Eye, Download, Trash2 } from 'lucide-react';

interface SlidesTabProps {
  resources: Resource[];
  topicId: string;
  subjectId: string;
  onResourceAdded: () => void;
}

export const SlidesTab: React.FC<SlidesTabProps> = ({
  resources,
  topicId,
  subjectId,
  onResourceAdded,
}) => {
  const [showUpload, setShowUpload] = useState(false);
  const [selectedSlide, setSelectedSlide] = useState<Resource | null>(null);
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({});

  const handleDelete = async (resource: Resource) => {
    if (!confirm('Are you sure you want to delete this slide deck?')) return;

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
      console.error('Error deleting slide:', error);
      alert('Failed to delete slide');
    }
  };

  const handleView = async (resource: Resource) => {
    try {
      // If we don't have a blob URL yet, get it
      if (!fileUrls[resource.id]) {
        const url = await storage.getFileUrl(resource.id);
        setFileUrls(prev => ({ ...prev, [resource.id]: url }));
        setSelectedSlide({ ...resource, file_url: url });
      } else {
        setSelectedSlide({ ...resource, file_url: fileUrls[resource.id] });
      }
    } catch (error) {
      console.error('Error loading slide:', error);
      alert('Failed to load slide');
    }
  };

  if (selectedSlide) {
    return (
      <div className="h-full flex flex-col">
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">{selectedSlide.title}</h3>
          <button
            onClick={() => setSelectedSlide(null)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
          >
            Back to List
          </button>
        </div>
        <div className="flex-1">
          {selectedSlide.file_url && (
            <PDFViewer fileUrl={selectedSlide.file_url} title={selectedSlide.title} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Slides</h2>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Slides
          </button>
        </div>

        {showUpload && (
          <FileUpload
            topicId={topicId}
            subjectId={subjectId}
            resourceType="slides"
            acceptedTypes=".pdf,.ppt,.pptx"
            onSuccess={() => {
              setShowUpload(false);
              onResourceAdded();
            }}
          />
        )}

        {resources.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <Presentation className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No slides yet</h3>
            <p className="text-gray-600 mb-4">Upload your first slide deck to get started</p>
            <button
              onClick={() => setShowUpload(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
            >
              <Plus className="w-4 h-4" />
              Upload Slides
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resources.map((resource) => (
              <div
                key={resource.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition group"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Presentation className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {resource.title}
                    </h3>
                    {resource.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                        {resource.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleView(resource)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  {resource.file_url && (
                    <a
                      href={resource.file_url}
                      download={resource.title}
                      className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                      title="Download"
                    >
                      <Download className="w-4 h-4 text-gray-700" />
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(resource)}
                    className="p-2 bg-red-50 rounded-lg hover:bg-red-100 transition"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
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
