const LOCAL_USER_ID_KEY = 'local-user-id';
const LEGACY_OWNER_KEY = 'studcom:legacy-owner';

export const getScopedStorageKey = (key: string) => {
  const userId = localStorage.getItem(LOCAL_USER_ID_KEY);
  return userId ? `${userId}:${key}` : key;
};

export const readScopedStorageItem = (key: string) => {
  const userId = localStorage.getItem(LOCAL_USER_ID_KEY);
  const scopedKey = userId ? `${userId}:${key}` : key;
  const stored = localStorage.getItem(scopedKey);
  if (stored !== null) {
    return stored;
  }
  if (!userId) {
    return null;
  }
  const legacy = localStorage.getItem(key);
  if (legacy === null) {
    return null;
  }
  const legacyOwner = localStorage.getItem(LEGACY_OWNER_KEY);
  if (!legacyOwner) {
    localStorage.setItem(LEGACY_OWNER_KEY, userId);
  }
  if (!legacyOwner || legacyOwner === userId) {
    localStorage.setItem(scopedKey, legacy);
    localStorage.removeItem(key);
    return legacy;
  }
  return null;
};

export const writeScopedStorageItem = (key: string, value: string) => {
  localStorage.setItem(getScopedStorageKey(key), value);
};
