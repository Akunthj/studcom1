import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { storage } from '@/lib/storage';
import { embedText, generateResponse } from '@/lib/geminiClient';
import { AIChatMessage } from '@/lib/types';
import { Send, Loader2, Sparkles } from 'lucide-react';

interface AIChatProps {
  topicId?: string;
  topicName?: string;
  subjectName?: string;
  context?: string;
  isGeneralHelper?: boolean;
}

export const AIChat: React.FC<AIChatProps> = ({ 
  topicId, 
  topicName,
  subjectName,
  context,
  isGeneralHelper = false 
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (topicId) {
      fetchChatHistory();
    } else {
      setLoadingHistory(false);
    }
  }, [topicId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChatHistory = async () => {
    if (!user || !topicId) return;

    try {
      setLoadingHistory(true);
      const history = await storage.getChatHistory(topicId, 'doubt');
      setMessages(history);
    } catch (error) {
      console.error('Error fetching chat history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !user || loading || !topicId || !topicName) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    const tempUserMsg: AIChatMessage = {
      id: 'temp-user-' + Date.now(),
      user_id: user.id,
      topic_id: topicId,
      message: userMessage,
      response: null,
      role: 'user',
      chat_type: 'doubt',
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      // Save user message
      const savedUserMsg = await storage.saveChatMessage({
        user_id: user.id,
        topic_id: topicId,
        message: userMessage,
        response: null,
        role: 'user',
        chat_type: 'doubt',
      });

      setMessages((prev) =>
        prev.map((msg) => (msg.id === tempUserMsg.id ? savedUserMsg : msg))
      );

      // Check if Gemini API key is configured
      if (!import.meta.env.VITE_GEMINI_API_KEY) {
        throw new Error('VITE_GEMINI_API_KEY not configured. Please set it in your .env file.');
      }

      // Embed the query
      const queryEmbedding = await embedText(userMessage);

      // Search for similar chunks
      const similarChunks = await storage.searchSimilar(queryEmbedding, topicId, 5, 0.7);

      // Build context from similar chunks
      let ragContext = '';
      if (similarChunks && similarChunks.length > 0) {
        ragContext = similarChunks
          .map((chunk, idx) => {
            return `[Source ${idx + 1}: ${chunk.sourceTitle} (${chunk.sourceType})]
${chunk.content}
`;
          })
          .join('\n---\n\n');
      }

      // Generate AI response
      const aiResponse = await generateResponse(
        userMessage,
        ragContext,
        topicName,
        'doubt'
      );

      // Save assistant message
      const assistantMsg = await storage.saveChatMessage({
        user_id: user.id,
        topic_id: topicId,
        message: aiResponse,
        response: null,
        role: 'assistant',
        chat_type: 'doubt',
      });

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) =>
        prev.filter((msg) => msg.id !== tempUserMsg.id)
      );
      alert(error instanceof Error ? error.message : 'Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!user || !topicId || !confirm('Clear all chat history for this topic?')) return;

    try {
      await storage.clearChatHistory(topicId, 'doubt');
      setMessages([]);
    } catch (error) {
      console.error('Error clearing chat history:', error);
      alert('Failed to clear history');
    }
  };

  if (loadingHistory) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-2" />
          <p className="text-gray-600 dark:text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center px-4">
              <Sparkles className="w-10 h-10 text-blue-600 dark:text-blue-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Ask me anything about {topicName}
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    message.role === 'user'
                      ? 'bg-blue-600 dark:bg-blue-500 text-white'
                      : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{message.message}</p>
                  <p className="text-xs mt-1.5 opacity-60">
                    {new Date(message.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
                    <span className="text-gray-600 dark:text-gray-400 text-sm">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !loading && handleSendMessage()}
            placeholder="Type your question..."
            disabled={loading}
            className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none disabled:opacity-50 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || loading}
            className="p-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
