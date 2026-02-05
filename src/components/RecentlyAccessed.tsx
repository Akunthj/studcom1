import React from 'react';
import { SubjectWithProgress } from '@/lib/types';
import { Clock } from 'lucide-react';

interface RecentlyAccessedProps {
  subjects: SubjectWithProgress[];
  onSubjectClick?: (subject: SubjectWithProgress) => void;
}

export const RecentlyAccessed: React.FC<RecentlyAccessedProps> = ({ subjects, onSubjectClick }) => {
  const getTimeAgo = (lastAccessed?: string) => {
    if (!lastAccessed) return 'Now';
    const date = new Date(lastAccessed);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours === 0) return 'Just now';
    if (diffInHours === 1) return '1 hour ago';
    if (diffInHours < 24) return `${diffInHours} hours ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Yesterday';
    return `${diffInDays} days ago`;
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">Recently Accessed</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {subjects.map((subject) => (
          <div
            key={subject.id}
            onClick={() => onSubjectClick?.(subject)}
            className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition cursor-pointer"
          >
            <div
              className="w-12 h-12 rounded-lg mb-3 flex items-center justify-center text-xl"
              style={{ backgroundColor: subject.color + '20', color: subject.color }}
            >
              📚
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{subject.name}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>{getTimeAgo(subject.last_accessed)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
