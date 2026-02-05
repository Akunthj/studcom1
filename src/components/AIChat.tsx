import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { AIChatMessage } from '@/lib/types';
import { MessageCircle, Send, Loader2, Trash2, Sparkles } from 'lucide-react';

interface AIChatProps {
  topicId: string;
  topicName: string;
}

export const AIChat: React.FC<AIChatProps> = ({ topicId, topicName }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchChatHistory();
  }, [topicId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChatHistory = async () => {
    if (!user) return;

    try {
      setLoadingHistory(true);
      const { data, error } = await supabase
        .from('ai_chat_history')
        .select('*')
        .eq('user_id', user.id)
        .eq('topic_id', topicId)
        .eq('chat_type', 'doubt')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching chat history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !user || loading) return;

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
      const { data: savedUserMsg, error: userError } = await supabase
        .from('ai_chat_history')
        .insert({
          user_id: user.id,
          topic_id: topicId,
          message: userMessage,
          response: null,
          role: 'user',
          chat_type: 'doubt',
        })
        .select()
        .single();

      if (userError) throw userError;

      setMessages((prev) =>
        prev.map((msg) => (msg.id === tempUserMsg.id ? savedUserMsg : msg))
      );

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          topicName,
          chatType: 'doubt',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const { response: aiResponse } = await response.json();

      const { data: assistantMsg, error: assistantError } = await supabase
        .from('ai_chat_history')
        .insert({
          user_id: user.id,
          topic_id: topicId,
          message: aiResponse,
          response: null,
          role: 'assistant',
          chat_type: 'doubt',
        })
        .select()
        .single();

      if (assistantError) throw assistantError;

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) =>
        prev.filter((msg) => msg.id !== tempUserMsg.id)
      );
      alert('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!user || !confirm('Clear all chat history for this topic?')) return;

    try {
      const { error } = await supabase
        .from('ai_chat_history')
        .delete()
        .eq('user_id', user.id)
        .eq('topic_id', topicId)
        .eq('chat_type', 'doubt');

      if (error) throw error;
      setMessages([]);
    } catch (error) {
      console.error('Error clearing chat history:', error);
      alert('Failed to clear history');
    }
  };

  if (loadingHistory) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
          <p className="text-gray-600">Loading chat history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">AI Doubt Assistant</h3>
            <p className="text-sm text-gray-600">Ask questions about {topicName}</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            <Trash2 className="w-4 h-4" />
            Clear History
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Ask Your First Question
              </h3>
              <p className="text-gray-600">
                I'm here to help you understand {topicName}. Ask me anything!
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
                  className={`max-w-[70%] rounded-lg px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-900'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.message}</p>
                  <p className="text-xs mt-2 opacity-70">
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
                <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span className="text-gray-600">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask a question..."
            disabled={loading}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            Send
          </button>
        </div>
      </div>
    </div>
  );
};
