import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { demoStorage } from '@/lib/demoMode';
import { X, BookOpen } from 'lucide-react';

interface AddItemModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
  '#F97316', '#14B8A6'
];

const EMOJIS = [
  '📚', '📖', '📝', '🎓', '🔬', '💻', 
  '🎨', '🌍', '🧮', '⚛️', '🎭', '📊',
  '🔭', '🎵', '🏛️', '📐'
];

export const AddItemModal: React.FC<AddItemModalProps> = ({ onClose, onSuccess }) => {
  const { user, isDemo } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Pre-select random color and icon
  const [selectedColor, setSelectedColor] = useState(() => 
    COLORS[Math.floor(Math.random() * COLORS.length)]
  );
  const [selectedIcon, setSelectedIcon] = useState(() => 
    EMOJIS[Math.floor(Math.random() * EMOJIS.length)]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !user) return;

    setLoading(true);
    setError('');

    try {
      if (isDemo) {
        const newSubject = demoStorage.addSubject({
          name: name.trim(),
          description: description.trim() || null,
          color: selectedColor,
          icon: selectedIcon,
        });
        const demoTopics = demoStorage.getTopics();
        demoStorage.setTopics([
          ...demoTopics,
          {
            id: crypto.randomUUID(),
            subject_id: newSubject.id,
            name: 'General',
            description: null,
            created_at: new Date().toISOString(),
          },
        ]);
      } else {
        const { data: subjectData, error } = await supabase
          .from('subjects')
          .insert({
            name: name.trim(),
            description: description.trim() || null,
            color: selectedColor,
            icon: selectedIcon,
          })
          .select()
          .single();

        if (error) throw error;

        if (subjectData) {
          const { error: topicError } = await supabase.from('topics').insert({
            subject_id: subjectData.id,
            name: 'General',
            description: null,
          });

          if (topicError) throw topicError;
        }
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add subject');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create New Subject</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Live Preview Card */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Preview</p>
            <div 
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md border-l-4 transition-all"
              style={{ borderLeftColor: selectedColor }}
            >
              <div className="flex items-start gap-4">
                <div 
                  className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl flex-shrink-0 transition-colors"
                  style={{ backgroundColor: selectedColor + '20' }}
                >
                  {selectedIcon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 truncate">
                    {name || 'Subject Name'}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {description || 'Subject description will appear here'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Subject Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Subject Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Data Structures & Algorithms"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 transition"
              required
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Description <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a brief description of what you'll learn..."
              rows={3}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none resize-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 transition"
            />
          </div>

          {/* Icon Picker */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Choose an Icon
            </label>
            <div className="grid grid-cols-8 gap-2">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedIcon(emoji)}
                  className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl transition-all ${
                    selectedIcon === emoji
                      ? 'bg-blue-100 dark:bg-blue-900/40 ring-2 ring-blue-500 dark:ring-blue-400 scale-110'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Choose a Color
            </label>
            <div className="flex gap-3 flex-wrap">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`w-12 h-12 rounded-lg transition-all ${
                    selectedColor === color
                      ? 'ring-4 ring-offset-2 ring-offset-white dark:ring-offset-gray-800 scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{ 
                    backgroundColor: color,
                    ringColor: color
                  }}
                  title={color}
                />
              ))}
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <BookOpen className="w-5 h-5" />
                  Create Subject
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
