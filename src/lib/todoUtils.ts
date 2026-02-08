import { getScopedStorageKey } from './storageScope';

export const mergeLegacyTodos = <T extends { id: string }>(
  current: T[],
  legacy: T[]
) => {
  const seen = new Set<string>();
  const merged: T[] = [];
  [current, legacy].forEach((todoList) => {
    todoList.forEach((todo) => {
      if (!seen.has(todo.id)) {
        seen.add(todo.id);
        merged.push(todo);
      }
    });
  });
  return merged;
};

export const legacyTodoStorageKey = 'studcom:todos';
export const legacyTodoMigrationKey = 'studcom:todos:migrated';

export const getLegacyTodoStorageKey = () => getScopedStorageKey(legacyTodoStorageKey);

export const getLegacyTodoMigrationKey = () => getScopedStorageKey(legacyTodoMigrationKey);

export const loadLegacyTodos = <T>() => {
  const stored = localStorage.getItem(getLegacyTodoStorageKey()) ?? localStorage.getItem(legacyTodoStorageKey);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as T[];
  } catch (error) {
    console.error('Failed to parse todos', error);
    return null;
  }
};

export const finalizeLegacyTodoMigration = () => {
  localStorage.removeItem(legacyTodoStorageKey);
  localStorage.removeItem(getLegacyTodoStorageKey());
  localStorage.setItem(getLegacyTodoMigrationKey(), 'true');
};

export const markLegacyTodoMigrationChecked = () => {
  localStorage.setItem(getLegacyTodoMigrationKey(), 'true');
};
