import React from 'react';
import { SubjectWithProgress } from '@/lib/types';

interface SubjectsGridProps {
  subjects: SubjectWithProgress[];
}

export const SubjectsGrid: React.FC<SubjectsGridProps> = ({ subjects }) => {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">All Subjects</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map((subject) => (
          <div
            key={subject.id}
            className="bg-white rounded-lg p-6 border border-gray-200 hover:shadow-lg transition cursor-pointer group"
          >
            <div
              className="w-16 h-16 rounded-xl mb-4 flex items-center justify-center text-3xl group-hover:scale-110 transition"
              style={{ backgroundColor: subject.color + '20', color: subject.color }}
            >
              📚
            </div>

            <h3 className="font-bold text-gray-900 text-lg mb-4">{subject.name}</h3>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-600">Progress</span>
                <span className="text-sm font-bold text-gray-900">
                  {subject.progress_percentage || 0}%
                </span>
              </div>

              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
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
          <div className="text-gray-400 mb-2">
            <p className="text-lg font-semibold">No subjects found</p>
            <p className="text-sm">Try adjusting your search or add a new subject</p>
          </div>
        </div>
      )}
    </div>
  );
};
