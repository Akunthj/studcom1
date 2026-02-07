import React, { useState, useEffect, useRef } from 'react';
import { Resource } from '@/lib/types';
import { storage } from '@/lib/storage';
import { FileUpload } from '../FileUpload';
import { PDFViewer } from '../PDFViewer';
import { HelpCircle, Plus, Eye, Download, Trash2, Filter } from 'lucide-react';

interface PYQsTabProps {
  resources: Resource[];
  topicId: string;
  subjectId: string;
  onResourceAdded: () => void;
  openResourceId?: string;
  openResourceToken?: number;
}

export const PYQsTab: React.FC<PYQsTabProps> = ({
  resources,
  topicId,
  subjectId,
  onResourceAdded,
  openResourceId,
  openResourceToken,
}) => {
  const [showUpload, setShowUpload] = useState(false);
  const [selectedPYQ, setSelectedPYQ] = useState<Resource | null>(null);
  const [filterYear, setFilterYear] = useState<string>('all');
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({});
  const fileUrlsRef = useRef<Record<string, string>>({});

  // Keep ref in sync with state
  useEffect(() => {
    fileUrlsRef.current = fileUrls;
  }, [fileUrls]);

  useEffect(() => {
    return () => {
      // Clean up all blob URLs when component unmounts
      Object.values(fileUrlsRef.current).forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, []);

  const extractYear = (title: string): string => {
    const yearMatch = title.match(/\b(19|20)\d{2}\b/);
    return yearMatch ? yearMatch[0] : 'Unknown';
  };

  const availableYears = Array.from(
    new Set(resources.map((r) => extractYear(r.title)))
  ).sort((a, b) => b.localeCompare(a));

  const filteredResources =
    filterYear === 'all'
      ? resources
      : resources.filter((r) => extractYear(r.title) === filterYear);

  const handleDelete = async (resource: Resource) => {
    if (!confirm('Are you sure you want to delete this PYQ?')) return;

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
      console.error('Error deleting PYQ:', error);
      alert('Failed to delete PYQ');
    }
  };

  const handleView = async (resource: Resource) => {
    try {
      // If we don't have a blob URL yet, get it
      if (!fileUrls[resource.id]) {
        const url = await storage.getFileUrl(resource.id);
        setFileUrls(prev => ({ ...prev, [resource.id]: url }));
        setSelectedPYQ({ ...resource, file_url: url });
      } else {
        setSelectedPYQ({ ...resource, file_url: fileUrls[resource.id] });
      }
    } catch (error) {
      console.error('Error loading PYQ:', error);
      alert('Failed to load PYQ');
    }
  };

  useEffect(() => {
    if (!openResourceId) return;
    const resource = resources.find((item) => item.id === openResourceId);
    if (!resource) return;

    const openSelected = async () => {
      try {
        if (!fileUrlsRef.current[resource.id]) {
          const url = await storage.getFileUrl(resource.id);
          setFileUrls((prev) => ({ ...prev, [resource.id]: url }));
          setSelectedPYQ({ ...resource, file_url: url });
        } else {
          setSelectedPYQ({ ...resource, file_url: fileUrlsRef.current[resource.id] });
        }
      } catch (error) {
        console.error('Error loading PYQ:', error);
        alert('Failed to load PYQ');
      }
    };

    openSelected();
  }, [openResourceId, openResourceToken, resources]);

  if (selectedPYQ) {
    return (
      <div className="h-full flex flex-col">
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">{selectedPYQ.title}</h3>
          <button
            onClick={() => setSelectedPYQ(null)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
          >
            Back to List
          </button>
        </div>
        <div className="flex-1">
          {selectedPYQ.file_url && (
            <PDFViewer fileUrl={selectedPYQ.file_url} title={selectedPYQ.title} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900">Previous Year Questions</h2>
            {availableYears.length > 0 && (
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                >
                  <option value="all">All Years</option>
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
          >
            <Plus className="w-4 h-4" />
            Add PYQ
          </button>
        </div>

        {showUpload && (
          <FileUpload
            topicId={topicId}
            subjectId={subjectId}
            resourceType="pyqs"
            acceptedTypes=".pdf"
            onSuccess={() => {
              setShowUpload(false);
              onResourceAdded();
            }}
          />
        )}

        {resources.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <HelpCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No PYQs yet</h3>
            <p className="text-gray-600 mb-4">
              Upload previous year questions to practice
            </p>
            <button
              onClick={() => setShowUpload(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
            >
              <Plus className="w-4 h-4" />
              Upload PYQ
            </button>
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <HelpCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No PYQs for {filterYear}
            </h3>
            <p className="text-gray-600">Try selecting a different year</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredResources.map((resource) => {
              const year = extractYear(resource.title);
              return (
                <div
                  key={resource.id}
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition group"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <HelpCircle className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {resource.title}
                        </h3>
                      </div>
                      <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                        {year}
                      </span>
                      {resource.description && (
                        <p className="text-sm text-gray-600 line-clamp-2 mt-2">
                          {resource.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleView(resource)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-medium"
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
