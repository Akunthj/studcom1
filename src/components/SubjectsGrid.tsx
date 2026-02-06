import React from 'react';
import { SubjectWithProgress } from '@/lib/types';

interface SubjectsGridProps {
  subjects: SubjectWithProgress[];
  onSubjectClick?: (subject: SubjectWithProgress) => void;
  compact?: boolean;
}

export const SubjectsGrid: React.FC<SubjectsGridProps> = ({
  subjects,
  onSubjectClick,
  compact = false
}) => {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">All Subjects</h2>
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${compact ? 'gap-3' : 'gap-4'}`}>
        {subjects.map((subject) => (
          <div
            key={subject.id}
            onClick={() => onSubjectClick?.(subject)}
            className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer group
              ${compact ? 'p-4' : 'p-6'}
              transition-all duration-200 hover:shadow-lg hover:scale-[1.02] hover:-translate-y-0.5
              motion-reduce:hover:scale-100 motion-reduce:hover:translate-y-0 motion-reduce:transition-none
            `}
          >
            <div
              className={`rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200 motion-reduce:group-hover:scale-100 motion-reduce:transition-none
                ${compact ? 'w-12 h-12 text-2xl mb-3' : 'w-16 h-16 text-3xl mb-4'}
              `}
              style={{ backgroundColor: subject.color + '20', color: subject.color }}
            >
              📚
            </div>

            <h3 className={`font-bold text-gray-900 dark:text-white ${compact ? 'text-base mb-3' : 'text-lg mb-4'}`}>
              {subject.name}
            </h3>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Progress</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {subject.progress_percentage || 0}%
                </span>
              </div>

              <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ${compact ? 'h-1.5' : 'h-2'}`}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${subject.progress_percentage || 0}%`,
                    backgroundColor: subject.color,
                  }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {subjects.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 dark:text-gray-500 mb-2">
            <p className="text-lg font-semibold">No subjects found</p>
            <p className="text-sm">Try adjusting your search or add a new subject</p>
          </div>
        </div>
      )}
    </div>
  );
};
