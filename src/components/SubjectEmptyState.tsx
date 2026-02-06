import React, { useState } from 'react';
import { Subject } from '@/lib/types';
import { BookOpen, FolderPlus } from 'lucide-react';
import { AddTopicModal } from './AddTopicModal';

interface SubjectEmptyStateProps {
  subject: Subject;
  onTopicAdded?: () => void;
}

export const SubjectEmptyState: React.FC<SubjectEmptyStateProps> = ({ subject, onTopicAdded }) => {
  const [showAddTopicModal, setShowAddTopicModal] = useState(false);

  return (
    <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center max-w-md px-6">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
            <FolderPlus className="w-10 h-10 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            No Topics Yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            This subject doesn't have any topics yet. Create your first topic to start organizing your study materials.
          </p>
        </div>

        <button
          onClick={() => setShowAddTopicModal(true)}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition font-semibold shadow-sm hover:shadow-md"
        >
          <FolderPlus className="w-5 h-5" />
          Create First Topic
        </button>

        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>💡 Tip:</strong> Topics help you organize materials by chapters, modules, or themes.
          </p>
        </div>
      </div>

      {showAddTopicModal && (
        <AddTopicModal
          subjectId={subject.id}
          onClose={() => setShowAddTopicModal(false)}
          onSuccess={() => {
            setShowAddTopicModal(false);
            onTopicAdded?.();
          }}
        />
      )}
    </div>
  );
};
