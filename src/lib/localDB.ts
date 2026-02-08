import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Subject, Topic, Resource, AIChatMessage, UserProgress, StudySession, StudyStreak } from './types';

interface FileBlob {
  id: string;
  blob: Blob;
  mimeType: string;
  fileName: string;
}

interface ChunkRecord {
  id: string;
  resourceId: string;
  topicId: string;
  subjectId: string;
  content: string;
  chunkIndex: number;
  sourceType: string;
  sourceTitle: string;
  embedding: Float32Array;
  created_at: string;
}

interface StudcomDB extends DBSchema {
  files: {
    key: string;
    value: FileBlob;
  };
  subjects: {
    key: string;
    value: Subject;
  };
  topics: {
    key: string;
    value: Topic;
    indexes: { 'by-subject': string };
  };
  resources: {
    key: string;
    value: Resource;
    indexes: { 'by-topic': string };
  };
  chunks: {
    key: string;
    value: ChunkRecord;
    indexes: { 'by-topic': string; 'by-resource': string };
  };
  chatHistory: {
    key: string;
    value: AIChatMessage;
    indexes: { 'by-topic-type': [string, string] };
  };
  progress: {
    key: string;
    value: UserProgress;
    indexes: { 'by-user': string; 'by-topic': string };
  };
  sessions: {
    key: string;
    value: StudySession;
    indexes: { 'by-user': string; 'by-topic': string };
  };
  streaks: {
    key: string;
    value: StudyStreak;
    indexes: { 'by-user': string };
  };
}

const DB_NAME = 'studcom';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<StudcomDB> | null = null;
let currentDbName: string | null = null;
const LEGACY_DB_OWNER_KEY = 'studcom:legacy-db-owner';

const getDbName = () => {
  const userId = localStorage.getItem('local-user-id');
  if (!userId) {
    return DB_NAME;
  }
  const legacyOwner = localStorage.getItem(LEGACY_DB_OWNER_KEY);
  if (!legacyOwner) {
    localStorage.setItem(LEGACY_DB_OWNER_KEY, userId);
    return DB_NAME;
  }
  return legacyOwner === userId ? DB_NAME : `${DB_NAME}:${userId}`;
};

export async function getDB(): Promise<IDBPDatabase<StudcomDB>> {
  const dbName = getDbName();
  if (dbInstance && currentDbName === dbName) {
    return dbInstance;
  }

  if (dbInstance && currentDbName !== dbName) {
    try {
      dbInstance.close();
    } catch (error) {
      console.warn('Failed to close previous database instance', error);
    }
  }

  currentDbName = dbName;
  dbInstance = await openDB<StudcomDB>(dbName, DB_VERSION, {
    upgrade(db) {
      // Files store
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files', { keyPath: 'id' });
      }

      // Subjects store
      if (!db.objectStoreNames.contains('subjects')) {
        db.createObjectStore('subjects', { keyPath: 'id' });
      }

      // Topics store
      if (!db.objectStoreNames.contains('topics')) {
        const topicsStore = db.createObjectStore('topics', { keyPath: 'id' });
        topicsStore.createIndex('by-subject', 'subject_id');
      }

      // Resources store
      if (!db.objectStoreNames.contains('resources')) {
        const resourcesStore = db.createObjectStore('resources', { keyPath: 'id' });
        resourcesStore.createIndex('by-topic', 'topic_id');
      }

      // Chunks store
      if (!db.objectStoreNames.contains('chunks')) {
        const chunksStore = db.createObjectStore('chunks', { keyPath: 'id' });
        chunksStore.createIndex('by-topic', 'topicId');
        chunksStore.createIndex('by-resource', 'resourceId');
      }

      // Chat history store
      if (!db.objectStoreNames.contains('chatHistory')) {
        const chatStore = db.createObjectStore('chatHistory', { keyPath: 'id' });
        chatStore.createIndex('by-topic-type', ['topic_id', 'chat_type']);
      }

      // Progress store
      if (!db.objectStoreNames.contains('progress')) {
        const progressStore = db.createObjectStore('progress', { keyPath: 'id' });
        progressStore.createIndex('by-user', 'user_id');
        progressStore.createIndex('by-topic', 'topic_id');
      }

      // Sessions store
      if (!db.objectStoreNames.contains('sessions')) {
        const sessionsStore = db.createObjectStore('sessions', { keyPath: 'id' });
        sessionsStore.createIndex('by-user', 'user_id');
        sessionsStore.createIndex('by-topic', 'topic_id');
      }

      // Streaks store
      if (!db.objectStoreNames.contains('streaks')) {
        const streaksStore = db.createObjectStore('streaks', { keyPath: 'id' });
        streaksStore.createIndex('by-user', 'user_id');
      }
    },
  });

  return dbInstance;
}

// Helper functions for each store
export const localDB = {
  // Files
  async saveFile(id: string, blob: Blob, fileName: string, mimeType: string): Promise<void> {
    const db = await getDB();
    await db.put('files', { id, blob, fileName, mimeType });
  },

  async getFile(id: string): Promise<FileBlob | undefined> {
    const db = await getDB();
    return await db.get('files', id);
  },

  async deleteFile(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('files', id);
  },

  // Subjects
  async getSubjects(): Promise<Subject[]> {
    const db = await getDB();
    return await db.getAll('subjects');
  },

  async getSubject(id: string): Promise<Subject | undefined> {
    const db = await getDB();
    return await db.get('subjects', id);
  },

  async saveSubject(subject: Subject): Promise<void> {
    const db = await getDB();
    await db.put('subjects', subject);
  },

  async deleteSubject(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('subjects', id);
  },

  // Topics
  async getTopics(subjectId: string): Promise<Topic[]> {
    const db = await getDB();
    return await db.getAllFromIndex('topics', 'by-subject', subjectId);
  },

  async getTopic(id: string): Promise<Topic | undefined> {
    const db = await getDB();
    return await db.get('topics', id);
  },

  async saveTopic(topic: Topic): Promise<void> {
    const db = await getDB();
    await db.put('topics', topic);
  },

  async deleteTopic(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('topics', id);
  },

  // Resources
  async getResources(topicId: string): Promise<Resource[]> {
    const db = await getDB();
    const resources = await db.getAllFromIndex('resources', 'by-topic', topicId);
    // Sort by created_at descending
    return resources.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  async getResource(id: string): Promise<Resource | undefined> {
    const db = await getDB();
    return await db.get('resources', id);
  },

  async saveResource(resource: Resource): Promise<void> {
    const db = await getDB();
    await db.put('resources', resource);
  },

  async deleteResource(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('resources', id);
  },

  // Chunks
  async saveChunks(chunks: ChunkRecord[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction('chunks', 'readwrite');
    await Promise.all(chunks.map(chunk => tx.store.put(chunk)));
    await tx.done;
  },

  async getChunksByTopic(topicId: string): Promise<ChunkRecord[]> {
    const db = await getDB();
    return await db.getAllFromIndex('chunks', 'by-topic', topicId);
  },

  async deleteChunksByResource(resourceId: string): Promise<void> {
    const db = await getDB();
    const chunks = await db.getAllFromIndex('chunks', 'by-resource', resourceId);
    const tx = db.transaction('chunks', 'readwrite');
    await Promise.all(chunks.map(chunk => tx.store.delete(chunk.id)));
    await tx.done;
  },

  // Chat History
  async getChatHistory(topicId: string, chatType: string): Promise<AIChatMessage[]> {
    const db = await getDB();
    const messages = await db.getAllFromIndex('chatHistory', 'by-topic-type', [topicId, chatType]);
    // Sort by created_at ascending
    return messages.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  },

  async saveChatMessage(message: AIChatMessage): Promise<void> {
    const db = await getDB();
    await db.put('chatHistory', message);
  },

  async clearChatHistory(topicId: string, chatType: string): Promise<void> {
    const db = await getDB();
    const messages = await db.getAllFromIndex('chatHistory', 'by-topic-type', [topicId, chatType]);
    const tx = db.transaction('chatHistory', 'readwrite');
    await Promise.all(messages.map(msg => tx.store.delete(msg.id)));
    await tx.done;
  },

  // Progress
  async getProgress(userId: string): Promise<UserProgress[]> {
    const db = await getDB();
    return await db.getAllFromIndex('progress', 'by-user', userId);
  },

  async getProgressByTopic(userId: string, topicId: string): Promise<UserProgress | undefined> {
    const db = await getDB();
    const allProgress = await db.getAllFromIndex('progress', 'by-user', userId);
    return allProgress.find(p => p.topic_id === topicId);
  },

  async saveProgress(progress: UserProgress): Promise<void> {
    const db = await getDB();
    await db.put('progress', progress);
  },

  // Sessions
  async getSessions(userId: string): Promise<StudySession[]> {
    const db = await getDB();
    return await db.getAllFromIndex('sessions', 'by-user', userId);
  },

  async saveSession(session: StudySession): Promise<void> {
    const db = await getDB();
    await db.put('sessions', session);
  },

  // Streaks
  async getStreak(userId: string): Promise<StudyStreak | undefined> {
    const db = await getDB();
    const streaks = await db.getAllFromIndex('streaks', 'by-user', userId);
    return streaks[0];
  },

  async saveStreak(streak: StudyStreak): Promise<void> {
    const db = await getDB();
    await db.put('streaks', streak);
  },
};
