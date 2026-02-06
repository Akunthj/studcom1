import React, { useState } from 'react';
import { Topic, Subject } from '@/lib/types';
import { X, Lightbulb, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { AIChat } from './AIChat';
import { ConceptExplainerPanel } from './ConceptExplainerPanel';

interface AIAssistantPanelProps {
  topic?: Topic;
  subject?: Subject;
  onClose: () => void;
  isGeneralHelper?: boolean;
}

type AIMode = 'concept_explainer' | 'ai_doubt';

export const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({ 
  topic, 
  subject,
  onClose,
  isGeneralHelper = false 
}) => {
  const [mode, setMode] = useState<AIMode>('ai_doubt');
  const [modeMenuOpen, setModeMenuOpen] = useState(false);

  const modes = [
    {
      id: 'concept_explainer' as AIMode,
      label: 'Concept Explainer',
      description: 'Breaks down complex concepts',
      icon: Lightbulb,
    },
    {
      id: 'ai_doubt' as AIMode,
      label: isGeneralHelper ? 'General AI Helper' : 'AI Doubt Assistant',
      description: isGeneralHelper 
        ? 'Ask any questions about studying, learning strategies, or general help'
        : 'Ask questions about the selected topic. The AI will provide contextual answers.',
      icon: MessageCircle,
    },
  ];

  const currentMode = modes.find((m) => m.id === mode)!;
  const CurrentIcon = currentMode.icon;

  // Get context for AI
  const getContext = () => {
    if (isGeneralHelper) {
      return 'General Study Helper - You can ask me anything about studying, learning strategies, time management, or general academic help.';
    }
    if (subject && topic) {
      return `Subject: ${subject.name}${subject.description ? ` - ${subject.description}` : ''}\nTopic: ${topic.name}${topic.description ? ` - ${topic.description}` : ''}`;
    }
    if (subject) {
      return `Subject: ${subject.name}${subject.description ? ` - ${subject.description}` : ''}`;
    }
    return '';
  };

  return (
    <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            AI Assistant
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
          >
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="relative">
          <button
            onClick={() => setModeMenuOpen(!modeMenuOpen)}
            className="w-full flex items-center justify-between gap-3 px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <div className="flex items-center gap-2 flex-1 text-left">
              <div className={`p-1.5 rounded ${
                mode === 'concept_explainer'
                  ? 'bg-yellow-100 dark:bg-yellow-900/30'
                  : 'bg-blue-100 dark:bg-blue-900/30'
              }`}>
                <CurrentIcon className={`w-4 h-4 ${
                  mode === 'concept_explainer'
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-blue-600 dark:text-blue-400'
                }`} />
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {currentMode.label}
              </span>
            </div>
            {modeMenuOpen ? (
              <ChevronUp className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            )}
          </button>

          {modeMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setModeMenuOpen(false)}
              />
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden z-50">
                {modes.map((modeOption) => {
                  const Icon = modeOption.icon;
                  return (
                    <button
                      key={modeOption.id}
                      onClick={() => {
                        setMode(modeOption.id);
                        setModeMenuOpen(false);
                      }}
                      className={`w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition ${
                        mode === modeOption.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-1.5 rounded ${
                          modeOption.id === 'concept_explainer'
                            ? 'bg-yellow-100 dark:bg-yellow-900/30'
                            : 'bg-blue-100 dark:bg-blue-900/30'
                        }`}>
                          <Icon className={`w-4 h-4 ${
                            modeOption.id === 'concept_explainer'
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : 'text-blue-600 dark:text-blue-400'
                          }`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {modeOption.label}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                            {modeOption.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {mode === 'concept_explainer' && topic ? (
          <ConceptExplainerPanel topicId={topic.id} topicName={topic.name} />
        ) : (
          <AIChat 
            topicId={topic?.id} 
            topicName={topic?.name}
            subjectName={subject?.name}
            context={getContext()}
            isGeneralHelper={isGeneralHelper}
          />
        )}
      </div>
    </div>
  );
};
