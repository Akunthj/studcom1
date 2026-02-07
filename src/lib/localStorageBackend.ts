import { StorageBackend } from './storage';
import { localDB } from './localDB';
import { Subject, Topic, Resource, AIChatMessage, UserProgress } from './types';
import { cosineSimilarity } from './geminiClient';

/**
 * Local Storage Backend using IndexedDB
 * Implements all storage operations locally in the browser
 */
export class LocalStorageBackend implements StorageBackend {
  /**
   * Save a file to IndexedDB and create a resource entry
   */
  async saveFile(
    topicId: string,
    resourceType: 'book' | 'slides' | 'notes' | 'pyqs',
    file: File,
    title: string,
    description?: string
  ): Promise<Resource> {
    const resourceId = crypto.randomUUID();
    const fileId = `file-${resourceId}`;

    // Store the actual file blob in IndexedDB
    await localDB.saveFile(fileId, file, file.name, file.type);

    // Create resource metadata
    const resource: Resource = {
      id: resourceId,
      topic_id: topicId,
      title,
      description: description || null,
      type: resourceType,
      file_url: fileId, // Store IndexedDB file ID (not a blob URL - fetched on-demand)
      file_path: null,
      section_id: null,
      processing_status: 'pending',
      created_at: new Date().toISOString(),
    };

    await localDB.saveResource(resource);
    return resource;
  }

  /**
   * Get a blob URL for a file stored in IndexedDB
   */
  async getFileUrl(resourceId: string): Promise<string> {
    const resource = await localDB.getResource(resourceId);
    if (!resource || !resource.file_url) {
      throw new Error('Resource or file not found');
    }

    // If it's already a blob URL, return it
    if (resource.file_url.startsWith('blob:')) {
      return resource.file_url;
    }

    // Otherwise, retrieve from IndexedDB and create blob URL
    const fileBlob = await localDB.getFile(resource.file_url);
    if (!fileBlob) {
      throw new Error('File not found in storage');
    }

    return URL.createObjectURL(fileBlob.blob);
  }

  /**
   * Delete a file and its associated data
   */
  async deleteFile(resourceId: string): Promise<void> {
    const resource = await localDB.getResource(resourceId);
    if (!resource) return;

    // Delete file blob if it exists
    if (resource.file_url && !resource.file_url.startsWith('blob:')) {
      await localDB.deleteFile(resource.file_url);
    }

    // Delete associated chunks
    await localDB.deleteChunksByResource(resourceId);

    // Delete resource metadata
    await localDB.deleteResource(resourceId);
  }

  /**
   * Get all subjects
   */
  async getSubjects(): Promise<Subject[]> {
    return await localDB.getSubjects();
  }

  /**
   * Save a new subject
   */
  async saveSubject(subject: Omit<Subject, 'id' | 'created_at'>): Promise<Subject> {
    const newSubject: Subject = {
      ...subject,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    await localDB.saveSubject(newSubject);
    return newSubject;
  }

  /**
   * Delete a subject
   */
  async deleteSubject(subjectId: string): Promise<void> {
    await localDB.deleteSubject(subjectId);
  }

  /**
   * Get topics for a subject
   */
  async getTopics(subjectId: string): Promise<Topic[]> {
    return await localDB.getTopics(subjectId);
  }

  /**
   * Save a new topic
   */
  async saveTopic(topic: Omit<Topic, 'id' | 'created_at'>): Promise<Topic> {
    const newTopic: Topic = {
      ...topic,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    await localDB.saveTopic(newTopic);
    return newTopic;
  }

  /**
   * Delete a topic
   */
  async deleteTopic(topicId: string): Promise<void> {
    await localDB.deleteTopic(topicId);
  }

  /**
   * Get resources for a topic
   */
  async getResources(topicId: string): Promise<Resource[]> {
    return await localDB.getResources(topicId);
  }

  /**
   * Save a new resource (e.g., notes without file)
   */
  async saveResource(resource: Omit<Resource, 'id' | 'created_at'>): Promise<Resource> {
    const newResource: Resource = {
      ...resource,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    await localDB.saveResource(newResource);
    return newResource;
  }

  /**
   * Update an existing resource
   */
  async updateResource(resourceId: string, updates: Partial<Resource>): Promise<void> {
    const resource = await localDB.getResource(resourceId);
    if (!resource) {
      throw new Error('Resource not found');
    }
    const updatedResource = { ...resource, ...updates };
    await localDB.saveResource(updatedResource);
  }

  /**
   * Delete a resource
   */
  async deleteResource(resourceId: string): Promise<void> {
    await this.deleteFile(resourceId);
  }

  /**
   * Save text chunks with embeddings
   */
  async saveChunks(
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
  ): Promise<void> {
    const chunkRecords = chunks.map((chunk) => ({
      id: `${resourceId}-chunk-${chunk.chunkIndex}`,
      resourceId,
      topicId,
      subjectId,
      content: chunk.content,
      chunkIndex: chunk.chunkIndex,
      sourceType: chunk.sourceType,
      sourceTitle: chunk.sourceTitle,
      embedding: new Float32Array(chunk.embedding),
      created_at: new Date().toISOString(),
    }));

    await localDB.saveChunks(chunkRecords);
  }

  /**
   * Search for similar chunks using cosine similarity
   */
  async searchSimilar(
    queryEmbedding: number[],
    topicId: string,
    limit: number = 5,
    threshold: number = 0.7
  ): Promise<Array<{
    content: string;
    sourceTitle: string;
    sourceType: string;
    similarity: number;
  }>> {
    // Get all chunks for the topic
    const chunks = await localDB.getChunksByTopic(topicId);

    // Calculate similarity for each chunk
    const results = chunks.map((chunk) => {
      const embedding = Array.from(chunk.embedding);
      const similarity = cosineSimilarity(queryEmbedding, embedding);
      return {
        content: chunk.content,
        sourceTitle: chunk.sourceTitle,
        sourceType: chunk.sourceType,
        similarity,
      };
    });

    // Filter by threshold and sort by similarity (descending)
    return results
      .filter((r) => r.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * Get chat history for a topic and chat type
   */
  async getChatHistory(topicId: string, chatType: string): Promise<AIChatMessage[]> {
    return await localDB.getChatHistory(topicId, chatType);
  }

  /**
   * Save a chat message
   */
  async saveChatMessage(msg: Omit<AIChatMessage, 'id' | 'created_at'>): Promise<AIChatMessage> {
    const newMessage: AIChatMessage = {
      ...msg,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    await localDB.saveChatMessage(newMessage);
    return newMessage;
  }

  /**
   * Clear chat history for a topic and chat type
   */
  async clearChatHistory(topicId: string, chatType: string): Promise<void> {
    await localDB.clearChatHistory(topicId, chatType);
  }

  /**
   * Get user progress
   */
  async getProgress(userId: string): Promise<UserProgress[]> {
    return await localDB.getProgress(userId);
  }

  /**
   * Update user progress for a topic
   */
  async updateProgress(userId: string, topicId: string, updates: Partial<UserProgress>): Promise<void> {
    const existing = await localDB.getProgressByTopic(userId, topicId);

    if (existing) {
      const updated: UserProgress = {
        ...existing,
        ...updates,
      };
      await localDB.saveProgress(updated);
    } else {
      const newProgress: UserProgress = {
        id: crypto.randomUUID(),
        user_id: userId,
        topic_id: topicId,
        progress_percentage: 0,
        last_accessed: new Date().toISOString(),
        total_time_seconds: 0,
        completed: false,
        created_at: new Date().toISOString(),
        ...updates,
      };
      await localDB.saveProgress(newProgress);
    }
  }
}

// Export a singleton instance
export const localStorageBackend = new LocalStorageBackend();
