import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Lightbulb, Loader2, BookOpen, Target, Layers, CheckCircle } from 'lucide-react';

interface ConceptExplainerProps {
  topicId: string;
  topicName: string;
}

interface Explanation {
  overview: string;
  keyPoints: string[];
  examples: string[];
  summary: string;
}

export const ConceptExplainer: React.FC<ConceptExplainerProps> = ({
  topicId,
  topicName,
}) => {
  const { user } = useAuth();
  const [concept, setConcept] = useState('');
  const [explanation, setExplanation] = useState<Explanation | null>(null);
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

      const parsed: Explanation = {
        overview: aiResponse.split('\n\n')[0] || aiResponse,
        keyPoints: aiResponse.match(/- .+/g) || [],
        examples: [],
        summary: aiResponse,
      };

      setExplanation(parsed);
    } catch (err) {
      setError('Failed to get explanation. Please try again.');
      console.error('Error explaining concept:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-auto p-6 bg-gray-50">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
              <Lightbulb className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Concept Explainer</h3>
              <p className="text-sm text-gray-600">
                Get detailed explanations for any concept in {topicName}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What concept would you like explained?
              </label>
              <input
                type="text"
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleExplain()}
                placeholder="e.g., Binary Search Trees, Photosynthesis, Newton's Laws..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
              />
            </div>

            <button
              onClick={handleExplain}
              disabled={!concept.trim() || loading}
              className="w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-600 text-white font-semibold rounded-lg hover:from-yellow-600 hover:to-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating explanation...
                </>
              ) : (
                <>
                  <Lightbulb className="w-5 h-5" />
                  Explain Concept
                </>
              )}
            </button>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
          </div>
        </div>

        {explanation && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <h4 className="font-semibold text-gray-900">Overview</h4>
              </div>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {explanation.summary}
              </p>
            </div>

            {explanation.keyPoints.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-5 h-5 text-green-600" />
                  <h4 className="font-semibold text-gray-900">Key Points</h4>
                </div>
                <ul className="space-y-2">
                  {explanation.keyPoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{point.replace(/^- /, '')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-6">
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-5 h-5 text-blue-600" />
                <h4 className="font-semibold text-gray-900">Next Steps</h4>
              </div>
              <p className="text-gray-700 text-sm">
                Now that you understand this concept, try practicing with examples or ask
                more specific questions in the AI Doubt Assistant.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
