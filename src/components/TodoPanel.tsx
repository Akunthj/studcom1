import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { X, Plus, Trash2, Check, Circle, Filter } from 'lucide-react';
import { useSubject } from '@/contexts/SubjectContext';
import {
  finalizeLegacyTodoMigration,
  getLegacyTodoMigrationKey,
  loadLegacyTodos,
  loadSubjectTodos,
  markLegacyTodoMigrationChecked,
  mergeLegacyTodos,
} from '@/lib/todoUtils';
import { getScopedStorageKey } from '@/lib/storageScope';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

type FilterType = 'all' | 'active' | 'completed';

interface TodoPanelProps {
  onClose: () => void;
}

const getStorageKey = (subjectId: string) =>
  getScopedStorageKey(`studcom:todos:subject:${subjectId}`);
export const TodoPanel: React.FC<TodoPanelProps> = ({ onClose }) => {
  const { currentSubjectId } = useSubject();
  const [searchParams] = useSearchParams();
  const subjectIdFromUrl = searchParams.get('subject');
  const activeSubjectId = currentSubjectId ?? subjectIdFromUrl;
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputText, setInputText] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Load todos from localStorage on subject change
  useEffect(() => {
    if (!activeSubjectId) {
      setTodos([]);
      return;
    }
    const subjectKey = getStorageKey(activeSubjectId);
    const initialTodos = loadSubjectTodos<Todo>(activeSubjectId, subjectKey) ?? [];

    const legacyMigrated = localStorage.getItem(getLegacyTodoMigrationKey()) === 'true';
    const legacyTodos = legacyMigrated ? null : loadLegacyTodos<Todo>();
    if (legacyTodos && !legacyMigrated) {
      const mergedTodos = mergeLegacyTodos(initialTodos, legacyTodos);
      setTodos(mergedTodos);
      localStorage.setItem(subjectKey, JSON.stringify(mergedTodos));
      finalizeLegacyTodoMigration();
      return;
    }

    if (!legacyTodos && !legacyMigrated) {
      markLegacyTodoMigrationChecked();
    }

    setTodos(initialTodos);
  }, [activeSubjectId]);

  const syncTodosToServer = async (todosToSync: Todo[]) => {
    void todosToSync;
    // TODO: Implement server sync when backend is ready
    // await supabase.from('todos').upsert(todos);
  };

  const updateTodos = (updater: (current: Todo[]) => Todo[]) => {
    if (!activeSubjectId) return;
    setTodos((current) => {
      const updated = updater(current);
      localStorage.setItem(getStorageKey(activeSubjectId), JSON.stringify(updated));
      syncTodosToServer(updated);
      return updated;
    });
  };

  const addTodo = () => {
    if (!inputText.trim() || !activeSubjectId) return;

    const newTodo: Todo = {
      id: Date.now().toString(),
      text: inputText.trim(),
      completed: false,
      createdAt: Date.now(),
    };

    updateTodos((current) => [newTodo, ...current]);
    setInputText('');
  };

  const toggleTodo = (id: string) => {
    updateTodos((current) =>
      current.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const deleteTodo = (id: string) => {
    updateTodos((current) => current.filter((todo) => todo.id !== id));
  };

  const startEdit = (todo: Todo) => {
    setEditingId(todo.id);
    setEditText(todo.text);
  };

  const saveEdit = () => {
    if (!editText.trim() || !editingId) return;

    updateTodos((current) =>
      current.map((todo) =>
        todo.id === editingId ? { ...todo, text: editText.trim() } : todo
      )
    );
    setEditingId(null);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const filteredTodos = todos.filter((todo) => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  const stats = {
    total: todos.length,
    active: todos.filter((t) => !t.completed).length,
    completed: todos.filter((t) => t.completed).length,
  };

  return (
    <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            To-Do List
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
            aria-label="Close to-do panel"
          >
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addTodo()}
            placeholder="Add a new task..."
            className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          />
          <button
            onClick={addTodo}
            disabled={!inputText.trim()}
            className="p-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Add task"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterType)}
            className="flex-1 px-2 py-1 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent outline-none text-gray-900 dark:text-gray-100"
          >
            <option value="all">All ({stats.total})</option>
            <option value="active">Active ({stats.active})</option>
            <option value="completed">Completed ({stats.completed})</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {filteredTodos.length === 0 ? (
          <div className="text-center py-12">
            <Circle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {filter === 'all'
                ? 'No tasks yet. Add one above!'
                : filter === 'active'
                ? 'No active tasks'
                : 'No completed tasks'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTodos.map((todo) => (
              <div
                key={todo.id}
                className={`p-3 rounded-lg border transition ${
                  todo.completed
                    ? 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-sm'
                }`}
              >
                {editingId === todo.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') saveEdit();
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      className="w-full px-2 py-1 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent outline-none text-gray-900 dark:text-gray-100"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={saveEdit}
                        className="flex-1 px-2 py-1 text-xs bg-green-600 dark:bg-green-500 text-white rounded hover:bg-green-700 dark:hover:bg-green-600 transition"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex-1 px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleTodo(todo.id)}
                      className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                        todo.completed
                          ? 'bg-green-600 dark:bg-green-500 border-green-600 dark:border-green-500'
                          : 'border-gray-300 dark:border-gray-600 hover:border-green-500 dark:hover:border-green-400'
                      }`}
                      aria-label={todo.completed ? 'Mark as incomplete' : 'Mark as complete'}
                    >
                      {todo.completed && <Check className="w-3 h-3 text-white" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm break-words cursor-pointer ${
                          todo.completed
                            ? 'line-through text-gray-500 dark:text-gray-500'
                            : 'text-gray-900 dark:text-gray-100'
                        }`}
                        onClick={() => !todo.completed && startEdit(todo)}
                        title="Click to edit"
                      >
                        {todo.text}
                      </p>
                    </div>

                    <button
                      onClick={() => deleteTodo(todo.id)}
                      className="flex-shrink-0 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition"
                      aria-label="Delete task"
                    >
                      <Trash2 className="w-3 h-3 text-red-600 dark:text-red-400" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {todos.length > 0 && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>
              {stats.active} {stats.active === 1 ? 'task' : 'tasks'} remaining
            </span>
            {stats.completed > 0 && (
              <button
                onClick={() => setTodos(todos.filter((t) => !t.completed))}
                className="text-red-600 dark:text-red-400 hover:underline"
              >
                Clear completed
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
