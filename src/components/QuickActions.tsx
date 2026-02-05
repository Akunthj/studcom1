import React from 'react';
import { Plus, Upload, MessageCircle } from 'lucide-react';

export const QuickActions: React.FC = () => {
  const actions = [
    {
      id: 'add-subject',
      title: 'Add New Subject',
      description: 'Start tracking a new subject',
      icon: Plus,
      color: 'from-blue-50 to-blue-100',
      iconColor: 'bg-blue-100 text-blue-600',
    },
    {
      id: 'import-notes',
      title: 'Import Notes',
      description: 'Upload PDFs and slides',
      icon: Upload,
      color: 'from-purple-50 to-purple-100',
      iconColor: 'bg-purple-100 text-purple-600',
    },
    {
      id: 'ask-ai',
      title: 'Ask AI Doubt',
      description: 'Get instant help',
      icon: MessageCircle,
      color: 'from-green-50 to-green-100',
      iconColor: 'bg-green-100 text-green-600',
    },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              className={`bg-gradient-to-br ${action.color} rounded-lg p-6 border border-gray-200 hover:shadow-md transition text-left group`}
            >
              <div className={`w-12 h-12 rounded-lg ${action.iconColor} flex items-center justify-center mb-4 group-hover:scale-110 transition`}>
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{action.title}</h3>
              <p className="text-sm text-gray-600">{action.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
