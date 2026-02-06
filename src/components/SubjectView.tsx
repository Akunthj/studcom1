import React, { useState } from 'react';
import { useSubject } from '@/contexts/SubjectContext';
import { useTopics } from '@/hooks/useTopics';
import { Plus, Check, Circle, Trash2 } from 'lucide-react';

export const SubjectView: React.FC = () => {
  const { currentSubjectId } = useSubject();
  const { topics, loading, addTopic, toggleComplete, removeTopic } = useTopics(currentSubjectId);
  const [newTopicName, setNewTopicName] = useState('');

  if (!currentSubjectId) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <Circle className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Select a subject from the sidebar to begin</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
          <p>Loading topics...</p>
        </div>
      </div>
    );
  }

  const totalTopics = topics.length;
  const completedTopics = topics.filter((t) => t.completed).length;
  const progress = totalTopics === 0 ? 0 : Math.round((completedTopics / totalTopics) * 100);

  const handleAddTopic = () => {
    if (!newTopicName.trim()) return;
    addTopic(newTopicName.trim());
    setNewTopicName('');
  };

  return (
    <div className="h-full p-6 overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Topics
          </h1>

          {totalTopics > 0 && (
            <div className="max-w-md mb-6">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span>Progress</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {completedTopics} of {totalTopics} topics completed
              </p>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newTopicName}
              onChange={(e) => setNewTopicName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTopic()}
              placeholder="Add a new topic..."
              className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
            <button
              onClick={handleAddTopic}
              disabled={!newTopicName.trim()}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
        </div>

        {topics.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
            <Circle className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-2">No topics yet</p>
            <p className="text-sm text-gray-500 dark:text-gray-500">Add your first topic above to get started</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {topics.map((topic) => (
              <li
                key={topic.id}
                className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md hover:scale-[1.01] transition-all duration-150 ease-out"
              >
                <button
                  onClick={() => toggleComplete(topic.id)}
                  className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${
                    topic.completed
                      ? 'bg-green-500 border-green-500'
                      : 'border-gray-300 dark:border-gray-600 hover:border-green-500'
                  }`}
                  aria-label={topic.completed ? 'Mark as incomplete' : 'Mark as complete'}
                >
                  {topic.completed && <Check className="w-4 h-4 text-white" />}
                </button>

                <span
                  className={`flex-1 text-gray-900 dark:text-white ${
                    topic.completed ? 'line-through opacity-60' : ''
                  }`}
                >
                  {topic.title || topic.name}
                </span>

                <button
                  onClick={() => removeTopic(topic.id)}
                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition"
                  aria-label="Delete topic"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};