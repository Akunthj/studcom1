import React from 'react';
import { Search, BookMarked } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  totalSubjects: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({ value, onChange, totalSubjects }) => {
  return (
    <div className="flex items-center gap-4">
      <div className="flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search subjects..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg">
        <BookMarked className="w-5 h-5 text-blue-600" />
        <span className="font-semibold text-gray-900">Subjects: {totalSubjects}</span>
      </div>
    </div>
  );
};
