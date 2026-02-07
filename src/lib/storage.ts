import { Subject, Topic, Resource, AIChatMessage, UserProgress } from './types';
import { localStorageBackend } from './localStorageBackend';

/**
 * Storage Backend Interface
 * Defines the contract for all storage implementations (local, cloud, etc.)
 */
export interface StorageBackend {
  // Files
  saveFile(
    topicId: string,
    resourceType: 'book' | 'slides' | 'notes' | 'pyqs',
    file: File,
    title: string,
    description?: string
  ): Promise<Resource>;
  getFileUrl(resourceId: string): Promise<string>;
  deleteFile(resourceId: string): Promise<void>;

  // Subjects
  getSubjects(): Promise<Subject[]>;
  saveSubject(subject: Omit<Subject, 'id' | 'created_at'>): Promise<Subject>;
  deleteSubject(subjectId: string): Promise<void>;

  // Topics
  getTopics(subjectId: string): Promise<Topic[]>;
  saveTopic(topic: Omit<Topic, 'id' | 'created_at'>): Promise<Topic>;
  deleteTopic(topicId: string): Promise<void>;

  // Resources
  getResources(topicId: string): Promise<Resource[]>;
  deleteResource(resourceId: string): Promise<void>;

  // RAG
  saveChunks(
    resourceId: string,
    topicId: string,
    subjectId: string,
    chunks: Array<{
      content: string;
      embedding: number[];
      chunkIndex: number;
      sourceType: string;
      sourceTitle: string;
    }>
  ): Promise<void>;
  searchSimilar(
    queryEmbedding: number[],
    topicId: string,
    limit?: number,
    threshold?: number
  ): Promise<Array<{
    content: string;
    sourceTitle: string;
    sourceType: string;
    similarity: number;
  }>>;

  // Chat
  getChatHistory(topicId: string, chatType: string): Promise<AIChatMessage[]>;
  saveChatMessage(msg: Omit<AIChatMessage, 'id' | 'created_at'>): Promise<AIChatMessage>;
  clearChatHistory(topicId: string, chatType: string, userId: string): Promise<void>;

  // Progress & Analytics
  getProgress(userId: string): Promise<UserProgress[]>;
  updateProgress(userId: string, topicId: string, updates: Partial<UserProgress>): Promise<void>;
}

// Export the storage backend singleton
// Currently using local-first storage with IndexedDB
export const storage: StorageBackend = localStorageBackend;
