// src/components/ResourceList.tsx
import React from 'react';
import { useResources, Resource } from '@/hooks/useResources';
import { CheckCircle, FileText, BookOpen } from 'lucide-react';

export const ResourceList: React.FC<{ subjectId?: string }> = ({ subjectId }) => {
  const { resources, loading, removeDemoResource } = useResources(subjectId);

  if (!subjectId) return <div className="p-4 text-sm opacity-60">Select a subject to see resources</div>;
  if (loading) return <div className="p-4">Loading...</div>;
  if (!resources || resources.length === 0)
    return <div className="p-4 text-sm opacity-60">No resources yet. Upload from the sidebar.</div>;

  return (
    <div className="space-y-3">
      {resources.map((r: Resource) => (
        <div key={r.id} className="flex items-center justify-between p-3 rounded-md border hover:bg-slate-50 transition">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-gray-100 flex items-center justify-center">
              {r.type === 'book' ? <BookOpen /> : <FileText />}
            </div>
            <div>
              <div className="font-medium">{r.title}</div>
              <div className="text-xs text-gray-500">{r.file_name ?? r.file_url ?? ''}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {r.file_url || r.demo ? (
              <a
                href={r.file_url ?? '#'}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                Open
              </a>
            ) : null}
            <button
              onClick={() => {
                // remove demo resource or supabase delete
                if (r.demo) removeDemoResource(r.id);
              }}
              className="text-sm text-red-600 hover:underline"
            >
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};