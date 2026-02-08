import React, { useState, useEffect } from 'react';
import { Check, Circle, Trash2, Plus } from 'lucide-react';
import { getScopedStorageKey } from '@/lib/storageScope';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

interface SubjectTodoProps {
  subjectId: string | null;
}

export const SubjectTodo: React.FC<SubjectTodoProps> = ({ subjectId }) => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodoText, setNewTodoText] = useState('');

  useEffect(() => {
    if (!subjectId) {
      setTodos([]);
      return;
    }

    const key = getScopedStorageKey(`studcom:todos:subject:${subjectId}`);
    const legacyKey = `studcom:todos:subject:${subjectId}`;
    let saved = localStorage.getItem(key);
    if (!saved && key !== legacyKey) {
      const legacySaved = localStorage.getItem(legacyKey);
      if (legacySaved) {
        localStorage.setItem(key, legacySaved);
        localStorage.removeItem(legacyKey);
        saved = legacySaved;
      }
    }
    if (saved) {
      try {
        setTodos(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse subject todos', e);
      }
    } else {
      setTodos([]);
    }
  }, [subjectId]);

  useEffect(() => {
    if (!subjectId) return;
    const key = getScopedStorageKey(`studcom:todos:subject:${subjectId}`);
    localStorage.setItem(key, JSON.stringify(todos));
  }, [todos, subjectId]);

  const addTodo = () => {
    if (!newTodoText.trim() || !subjectId) return;
    const newTodo: Todo = {
      id: Date.now().toString(),
      text: newTodoText.trim(),
      completed: false,
      createdAt: Date.now(),
    };
    setTodos([newTodo, ...todos]);
    setNewTodoText('');
  };

  const toggleTodo = (id: string) => {
    setTodos(todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter((t) => t.id !== id));
  };

  if (!subjectId) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Subject To-Do</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Select a subject to add tasks</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Subject To-Do</h3>

      <div className="flex items-center gap-2 mb-4">
        <input
          type="text"
          value={newTodoText}
          onChange={(e) => setNewTodoText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTodo()}
          placeholder="Add a task for this subject..."
          className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
        />
        <button
          onClick={addTodo}
          disabled={!newTodoText.trim()}
          className="p-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {todos.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
          <Circle className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>No tasks for this subject yet</p>
        </div>
      ) : (
        <ul className="space-y-2 max-h-64 overflow-y-auto">
          {todos.map((todo) => (
            <li
              key={todo.id}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
            >
              <button
                onClick={() => toggleTodo(todo.id)}
                className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                  todo.completed
                    ? 'bg-green-500 border-green-500'
                    : 'border-gray-300 dark:border-gray-600 hover:border-green-500'
                }`}
              >
                {todo.completed && <Check className="w-3 h-3 text-white" />}
              </button>

              <span
                className={`flex-1 text-sm ${
                  todo.completed
                    ? 'line-through text-gray-500 dark:text-gray-500'
                    : 'text-gray-900 dark:text-white'
                }`}
              >
                {todo.text}
              </span>

              <button
                onClick={() => deleteTodo(todo.id)}
                className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {todos.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {todos.filter((t) => !t.completed).length} of {todos.length} tasks remaining
          </p>
        </div>
      )}
    </div>
  );
};
