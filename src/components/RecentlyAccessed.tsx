import React from 'react';
import { SubjectWithProgress } from '@/lib/types';
import { Clock } from 'lucide-react';

interface RecentlyAccessedProps {
  subjects: SubjectWithProgress[];
  onSubjectClick?: (subject: SubjectWithProgress) => void;
  compact?: boolean;
}

export const RecentlyAccessed: React.FC<RecentlyAccessedProps> = ({
  subjects,
  onSubjectClick,
  compact = false
}) => {
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
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Recently Accessed</h2>
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 ${compact ? 'gap-3' : 'gap-4'}`}>
        {subjects.map((subject) => (
          <div
            key={subject.id}
            onClick={() => onSubjectClick?.(subject)}
            className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer group
              ${compact ? 'p-3' : 'p-4'}
              transition-all duration-200 hover:shadow-md hover:scale-[1.02] hover:-translate-y-0.5
              motion-reduce:hover:scale-100 motion-reduce:hover:translate-y-0 motion-reduce:transition-none
            `}
          >
            <div
              className={`rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200 motion-reduce:group-hover:scale-100 motion-reduce:transition-none
                ${compact ? 'w-10 h-10 text-lg mb-2' : 'w-12 h-12 text-xl mb-3'}
              `}
              style={{ backgroundColor: subject.color + '20', color: subject.color }}
            >
              📚
            </div>
            <h3 className={`font-semibold text-gray-900 dark:text-white ${compact ? 'text-sm mb-1' : 'mb-1'}`}>
              {subject.name}
            </h3>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Clock className="w-4 h-4" />
              <span>{getTimeAgo(subject.last_accessed)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
