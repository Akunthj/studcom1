// src/components/AddTopicModal.tsx
import React, { useState } from 'react';
import { useTopics } from '@/hooks/useTopics';

export const AddTopicModal: React.FC<{ subjectId?: string; onClose: () => void }> = ({ subjectId, onClose }) => {
  const { addTopic } = useTopics(subjectId);
  const [title, setTitle] = useState('');

  const submit = () => {
    if (!title.trim()) return;
    addTopic(title.trim());
    setTitle('');
    onClose();
  };

  if (!subjectId) return null;

  return (
    <div className="p-4 bg-white rounded shadow">
      <h3 className="font-semibold mb-2">Add Topic</h3>
      <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2 border rounded mb-3" />
      <div className="flex gap-2">
        <button onClick={submit} className="px-3 py-2 bg-blue-600 text-white rounded">Add</button>
        <button onClick={onClose} className="px-3 py-2 border rounded">Cancel</button>
      </div>
    </div>
  );
};