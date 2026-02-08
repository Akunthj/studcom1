import { getScopedStorageKey, readScopedStorageItem } from './storageScope';

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

export const getUnscopedSubjectTodoKey = (subjectId: string) =>
  `studcom:todos:subject:${subjectId}`;

export const loadSubjectTodos = <T>(subjectId: string, scopedKey?: string) => {
  const resolvedScopedKey =
    scopedKey ?? getScopedStorageKey(`studcom:todos:subject:${subjectId}`);
  const legacyKey = getUnscopedSubjectTodoKey(subjectId);
  let saved = localStorage.getItem(resolvedScopedKey);
  if (!saved && resolvedScopedKey !== legacyKey) {
    const legacySaved = localStorage.getItem(legacyKey);
    if (legacySaved) {
      localStorage.setItem(resolvedScopedKey, legacySaved);
      localStorage.removeItem(legacyKey);
      saved = legacySaved;
    }
  }
  if (!saved) return null;
  try {
    return JSON.parse(saved) as T[];
  } catch (error) {
    console.error('Failed to parse todos', error);
    return null;
  }
};

export const loadLegacyTodos = <T>() => {
  const stored = readScopedStorageItem(legacyTodoStorageKey);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as T[];
  } catch (error) {
    console.error('Failed to parse todos', error);
    return null;
  }
};

export const finalizeLegacyTodoMigration = () => {
  const scopedKey = getLegacyTodoStorageKey();
  const legacyKey = legacyTodoStorageKey;
  const hasScoped = localStorage.getItem(scopedKey) !== null;
  const hasLegacy = localStorage.getItem(legacyKey) !== null;
  if (hasLegacy && (scopedKey === legacyKey || hasScoped)) {
    localStorage.removeItem(legacyKey);
  }
  if (hasScoped && scopedKey !== legacyKey) {
    localStorage.removeItem(scopedKey);
  }
  localStorage.setItem(getLegacyTodoMigrationKey(), 'true');
};

export const markLegacyTodoMigrationChecked = () => {
  localStorage.setItem(getLegacyTodoMigrationKey(), 'true');
};
