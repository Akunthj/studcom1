import React, { useState } from 'react';
import { Resource } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { FileText, Plus, Edit, Trash2, Save, X } from 'lucide-react';

interface NotesTabProps {
  resources: Resource[];
  topicId: string;
  onResourceAdded: () => void;
}

export const NotesTab: React.FC<NotesTabProps> = ({
  resources,
  topicId,
  onResourceAdded,
}) => {
  const [showCreate, setShowCreate] = useState(false);
  const [editingNote, setEditingNote] = useState<Resource | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreateNote = async () => {
    if (!title.trim() || !content.trim()) {
      alert('Please provide both title and content');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('resources').insert({
        topic_id: topicId,
        title,
        description: content,
        type: 'notes',
        file_url: null,
        file_path: null,
      });

      if (error) throw error;

      setTitle('');
      setContent('');
      setShowCreate(false);
      onResourceAdded();
    } catch (error) {
      console.error('Error creating note:', error);
      alert('Failed to create note');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateNote = async () => {
    if (!editingNote || !title.trim() || !content.trim()) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('resources')
        .update({
          title,
          description: content,
        })
        .eq('id', editingNote.id);

      if (error) throw error;

      setEditingNote(null);
      setTitle('');
      setContent('');
      onResourceAdded();
    } catch (error) {
      console.error('Error updating note:', error);
      alert('Failed to update note');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (resource: Resource) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      // If it's a demo resource (no file_path, stored in localStorage)
      if (!resource.file_path) {
        // Remove from localStorage
        const demoStored = JSON.parse(localStorage.getItem('demo_resources') || '{}');
        const topicResources = (demoStored[topicId] || []).filter((r: Resource) => r.id !== resource.id);
        demoStored[topicId] = topicResources;
        localStorage.setItem('demo_resources', JSON.stringify(demoStored));
        
        onResourceAdded();
        return;
      }

      // Otherwise, delete from Supabase
      const { error } = await supabase.from('resources').delete().eq('id', resource.id);

      if (error) throw error;
      onResourceAdded();
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('Failed to delete note');
    }
  };

  const startEdit = (note: Resource) => {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.description || '');
    setShowCreate(false);
  };

  const cancelEdit = () => {
    setEditingNote(null);
    setTitle('');
    setContent('');
    setShowCreate(false);
  };

  if (showCreate || editingNote) {
    return (
      <div className="h-full overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingNote ? 'Edit Note' : 'Create New Note'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter note title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your notes here..."
                  rows={15}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none resize-none font-mono text-sm"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={editingNote ? handleUpdateNote : handleCreateNote}
                  disabled={saving || !title.trim() || !content.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-medium disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Note'}
                </button>
                <button
                  onClick={cancelEdit}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Notes</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-medium"
          >
            <Plus className="w-4 h-4" />
            New Note
          </button>
        </div>

        {resources.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No notes yet</h3>
            <p className="text-gray-600 mb-4">Create your first note to get started</p>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-medium"
            >
              <Plus className="w-4 h-4" />
              Create Note
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resources.map((resource) => (
              <div
                key={resource.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {resource.title}
                    </h3>
                    {resource.description && (
                      <p className="text-sm text-gray-600 line-clamp-3 mt-1">
                        {resource.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startEdit(resource)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition text-sm font-medium"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
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
