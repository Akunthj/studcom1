import React, { useState, useEffect } from 'react';
import { Check, Circle, Trash2, Plus } from 'lucide-react';
import { Subject } from '@/lib/types';
import {
  finalizeLegacyTodoMigration,
  getLegacyTodoMigrationKey,
  loadLegacyTodos,
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

const getStorageKey = (subjectId: string) =>
  getScopedStorageKey(`studcom:todos:subject:${subjectId}`);

interface HomepageTodoProps {
  subjects: Subject[];
}

export const HomepageTodo: React.FC<HomepageTodoProps> = ({ subjects }) => {
  const [subjectTodos, setSubjectTodos] = useState<Record<string, Todo[]>>({});
  const [newTodoText, setNewTodoText] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const defaultSubjectId = subjects[0]?.id ?? '';
  const migrationTargetId = selectedSubjectId || defaultSubjectId || null;

  useEffect(() => {
    if (subjects.length === 0) {
      setSubjectTodos({});
      return;
    }

    const loadedTodos: Record<string, Todo[]> = {};

    subjects.forEach((subject) => {
      const scopedKey = getStorageKey(subject.id);
      const legacyKey = `studcom:todos:subject:${subject.id}`;
      let saved = localStorage.getItem(scopedKey);
      if (!saved && scopedKey !== legacyKey) {
        const legacySaved = localStorage.getItem(legacyKey);
        if (legacySaved) {
          localStorage.setItem(scopedKey, legacySaved);
          localStorage.removeItem(legacyKey);
          saved = legacySaved;
        }
      }
      if (saved) {
        try {
          loadedTodos[subject.id] = JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse todos', e);
          loadedTodos[subject.id] = [];
        }
      } else {
        loadedTodos[subject.id] = [];
      }
    });

    const legacyMigrated = localStorage.getItem(getLegacyTodoMigrationKey()) === 'true';
    const legacyTodos = legacyMigrated ? null : loadLegacyTodos<Todo>();
    if (legacyTodos && migrationTargetId && !legacyMigrated) {
      const mergedTodos = mergeLegacyTodos(
        loadedTodos[migrationTargetId] || [],
        legacyTodos
      );
      if (mergedTodos.length > 0) {
        loadedTodos[migrationTargetId] = mergedTodos;
        localStorage.setItem(
          getStorageKey(migrationTargetId),
          JSON.stringify(mergedTodos)
        );
      }
      finalizeLegacyTodoMigration();
    } else if (!legacyTodos && !legacyMigrated) {
      markLegacyTodoMigrationChecked();
    }

    setSubjectTodos(loadedTodos);
  }, [subjects, migrationTargetId]);

  useEffect(() => {
    if (!selectedSubjectId && subjects.length > 0) {
      setSelectedSubjectId(defaultSubjectId);
      return;
    }

    if (selectedSubjectId && !subjects.some((subject) => subject.id === selectedSubjectId)) {
      setSelectedSubjectId(defaultSubjectId);
    }
  }, [subjects, selectedSubjectId, defaultSubjectId]);

  useEffect(() => {
    Object.entries(subjectTodos).forEach(([subjectId, todos]) => {
      localStorage.setItem(getStorageKey(subjectId), JSON.stringify(todos));
    });
  }, [subjectTodos]);

  const updateSubjectTodos = (subjectId: string, updater: (todos: Todo[]) => Todo[]) => {
    setSubjectTodos((prev) => ({
      ...prev,
      [subjectId]: updater(prev[subjectId] || []),
    }));
  };

  const addTodo = () => {
    if (!newTodoText.trim() || !selectedSubjectId) return;
    const newTodo: Todo = {
      id: Date.now().toString(),
      text: newTodoText.trim(),
      completed: false,
      createdAt: Date.now(),
    };
    updateSubjectTodos(selectedSubjectId, (todos) => [newTodo, ...todos]);
    setNewTodoText('');
  };

  const toggleTodo = (subjectId: string, id: string) => {
    updateSubjectTodos(subjectId, (todos) =>
      todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const deleteTodo = (subjectId: string, id: string) => {
    updateSubjectTodos(subjectId, (todos) => todos.filter((t) => t.id !== id));
  };

  const totalTasks = Object.values(subjectTodos).reduce((sum, todos) => sum + todos.length, 0);
  const subjectTodoList = subjects.map((subject) => ({
    ...subject,
    todos: subjectTodos[subject.id] || [],
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Universal To-Do</h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">{totalTasks} tasks</span>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <select
          value={selectedSubjectId}
          onChange={(e) => setSelectedSubjectId(e.target.value)}
          className="w-32 px-2 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none text-gray-900 dark:text-white"
          disabled={subjects.length === 0}
        >
          {subjects.length === 0 ? (
            <option value="">No subjects</option>
          ) : (
            subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))
          )}
        </select>
        <input
          type="text"
          value={newTodoText}
          onChange={(e) => setNewTodoText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTodo()}
          placeholder={subjects.length === 0 ? 'Add a subject first' : 'Add a task...'}
          className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          disabled={subjects.length === 0}
        />
        <button
          onClick={addTodo}
          disabled={!newTodoText.trim() || subjects.length === 0}
          className="p-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="max-h-64 overflow-y-auto pr-1 space-y-4">
        {subjects.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
            <Circle className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>Add your first subject to start tracking tasks.</p>
          </div>
        ) : totalTasks === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
            <Circle className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No tasks yet. Add one above!</p>
          </div>
        ) : (
          subjectTodoList.map((subject) => (
            <div key={subject.id}>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: subject.color }}
                />
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {subject.name}
                </h4>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {subject.todos.length} tasks
                </span>
              </div>

              {subject.todos.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500">No tasks yet</p>
              ) : (
                <ul className="space-y-2">
                  {subject.todos.map((todo) => (
                    <li
                      key={todo.id}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                    >
                      <button
                        onClick={() => toggleTodo(subject.id, todo.id)}
                        className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                          todo.completed
                            ? 'bg-green-500 border-green-500'
                            : 'border-gray-300 dark:border-gray-600 hover:border-green-500'
                        }`}
                        aria-label={todo.completed ? 'Mark as incomplete' : 'Mark as complete'}
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
                        onClick={() => deleteTodo(subject.id, todo.id)}
                        className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition"
                        aria-label="Delete task"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))
        )}
      </div>

      {totalTasks > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {Object.values(subjectTodos).reduce(
              (count, todos) => count + todos.filter((t) => !t.completed).length,
              0
            )}{' '}
            of {totalTasks} tasks remaining
          </p>
        </div>
      )}
    </div>
  );
};
