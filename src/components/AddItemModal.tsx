import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { demoStorage } from '@/lib/demoMode';
import { X, BookOpen, FileText, Bookmark, StickyNote } from 'lucide-react';

interface AddItemModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

type ItemType = 'subject' | 'topic' | 'bookmark' | 'note';

export const AddItemModal: React.FC<AddItemModalProps> = ({ onClose, onSuccess }) => {
  const { user, isDemo } = useAuth();
  const [itemType, setItemType] = useState<ItemType>('subject');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !user) return;

    setLoading(true);
    setError('');

    try {
      if (itemType === 'subject') {
        const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
        const icons = ['📚', '📖', '📝', '🎓', '🔬', '💻', '🎨', '🌍'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        const randomIcon = icons[Math.floor(Math.random() * icons.length)];

        if (isDemo) {
          demoStorage.addSubject({
            name: name.trim(),
            description: description.trim() || null,
            color: randomColor,
            icon: randomIcon,
          });
        } else {
          const { error } = await supabase.from('subjects').insert({
            name: name.trim(),
            description: description.trim() || null,
            color: randomColor,
            icon: randomIcon,
          });

          if (error) throw error;
        }
      } else if (itemType === 'note') {
        const notes = JSON.parse(localStorage.getItem('studcom:quick_notes') || '[]');
        notes.unshift({
          id: Date.now().toString(),
          text: name.trim(),
          createdAt: Date.now(),
        });
        localStorage.setItem('studcom:quick_notes', JSON.stringify(notes));
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item');
    } finally {
      setLoading(false);
    }
  };

  const itemTypes = [
    { id: 'subject' as ItemType, label: 'Subject', icon: BookOpen, description: 'Add a new subject to study' },
    { id: 'topic' as ItemType, label: 'Topic', icon: FileText, description: 'Add a topic under a subject' },
    { id: 'bookmark' as ItemType, label: 'Bookmark', icon: Bookmark, description: 'Save a quick bookmark' },
    { id: 'note' as ItemType, label: 'Quick Note', icon: StickyNote, description: 'Jot down a quick note' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add New Item</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              What would you like to add?
            </label>
            <div className="grid grid-cols-2 gap-3">
              {itemTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setItemType(type.id)}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      itemType === type.id
                        ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30 shadow-sm scale-105'
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
                      itemType === type.id
                        ? 'bg-blue-100 dark:bg-blue-800/50'
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      <Icon className={`w-6 h-6 ${
                        itemType === type.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                      }`} />
                    </div>
                    <p className={`text-sm font-semibold mb-1 ${
                      itemType === type.id ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-gray-100'
                    }`}>
                      {type.label}
                    </p>
                    <p className={`text-xs ${
                      itemType === type.id ? 'text-blue-700 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {type.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {itemType === 'note' ? 'Note' : 'Name'} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`Enter ${itemType} name...`}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition"
              required
              autoFocus
            />
          </div>

          {itemType === 'subject' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a brief description..."
                rows={3}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none resize-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition"
              />
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm flex items-start gap-2">
              <span className="text-xl">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-xl hover:bg-blue-700 dark:hover:bg-blue-600 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Adding...
                </span>
              ) : (
                `Add ${itemType === 'subject' ? 'Subject' : itemType === 'note' ? 'Note' : itemType}`
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
