const LOCAL_USER_ID_KEY = 'local-user-id';
const LEGACY_OWNER_KEY = 'studcom:legacy-owner';

export const getScopedStorageKey = (key: string) => {
  const userId = localStorage.getItem(LOCAL_USER_ID_KEY);
  return userId ? `${userId}:${key}` : key;
};

export const readScopedStorageItem = (key: string) => {
  const scopedKey = getScopedStorageKey(key);
  const stored = localStorage.getItem(scopedKey);
  if (stored !== null || scopedKey === key) {
    return stored;
  }
  const legacy = localStorage.getItem(key);
  if (legacy !== null) {
    const userId = localStorage.getItem(LOCAL_USER_ID_KEY);
    const legacyOwner = localStorage.getItem(LEGACY_OWNER_KEY);
    if (!userId) {
      return legacy;
    }
    if (!legacyOwner) {
      localStorage.setItem(LEGACY_OWNER_KEY, userId);
    }
    if (!legacyOwner || legacyOwner === userId) {
      localStorage.setItem(scopedKey, legacy);
      localStorage.removeItem(key);
      return legacy;
    }
    return null;
  }
  return null;
};

export const writeScopedStorageItem = (key: string, value: string) => {
  localStorage.setItem(getScopedStorageKey(key), value);
};
