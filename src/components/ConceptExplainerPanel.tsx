import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Send, Loader2, Sparkles } from 'lucide-react';

interface ConceptExplainerPanelProps {
  topicId: string;
  topicName: string;
}

export const ConceptExplainerPanel: React.FC<ConceptExplainerPanelProps> = ({
  topicId,
  topicName,
}) => {
  const { user } = useAuth();
  const [concept, setConcept] = useState('');
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleExplain = async () => {
    if (!concept.trim() || !user) return;

    setLoading(true);
    setError('');
    setExplanation(null);

    try {
      await supabase.from('ai_chat_history').insert({
        user_id: user.id,
        topic_id: topicId,
        message: `Explain: ${concept}`,
        response: null,
        role: 'user',
        chat_type: 'concept_explainer',
      });

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: concept,
          topicName,
          topicId, // Add topicId for RAG
          chatType: 'concept_explainer',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get explanation');
      }

      const { response: aiResponse } = await response.json();

      await supabase.from('ai_chat_history').insert({
        user_id: user.id,
        topic_id: topicId,
        message: aiResponse,
        response: null,
        role: 'assistant',
        chat_type: 'concept_explainer',
      });

      setExplanation(aiResponse);
    } catch (err) {
      setError('Failed to get explanation');
      console.error('Error explaining concept:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-3">
        {!explanation ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center px-4">
              <Sparkles className="w-10 h-10 text-yellow-600 dark:text-yellow-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Enter a concept to get a detailed explanation
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
                {explanation}
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-yellow-600 dark:text-yellow-400 animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Generating explanation...
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !loading && handleExplain()}
            placeholder="Enter concept to explain..."
            disabled={loading}
            className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 dark:focus:ring-yellow-400 focus:border-transparent outline-none disabled:opacity-50 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          />
          <button
            onClick={handleExplain}
            disabled={!concept.trim() || loading}
            className="p-2 bg-yellow-600 dark:bg-yellow-500 text-white rounded-lg hover:bg-yellow-700 dark:hover:bg-yellow-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
