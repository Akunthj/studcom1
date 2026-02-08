// src/hooks/useResources.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { readScopedStorageItem, writeScopedStorageItem } from '@/lib/storageScope';

const DEMO_KEY = 'studcom:resources';

export type Resource = {
  id: string;
  topic_id: string;
  title: string;
  description?: string | null;
  type: 'book' | 'slides' | 'notes' | 'pyqs' | 'other';
  file_name?: string;
  file_url?: string | null;
  file_path?: string | null;
  uploaded_at?: number;
  demo?: boolean;
};

function readDemoAll(): Record<string, Resource[]> {
  try {
    return JSON.parse(readScopedStorageItem(DEMO_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeDemoAll(all: Record<string, Resource[]>) {
  writeScopedStorageItem(DEMO_KEY, JSON.stringify(all));
}

export function useResources(subjectId?: string) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!subjectId) {
      setResources([]);
      return;
    }

    const fetch = async () => {
      setLoading(true);
      if (!supabase) {
        const all = readDemoAll();
        setResources(all[subjectId] ?? []);
        setLoading(false);
        return;
      }

      // Real supabase branch (adjust table/column names to your schema)
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .eq('topic_id', subjectId)
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('useResources fetch error', error);
        setResources([]);
      } else {
        setResources(data ?? []);
      }
      setLoading(false);
    };

    fetch();
    // optionally subscribe to realtime updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId]);

  const addDemoResource = (r: Resource) => {
    const all = readDemoAll();
    const arr = all[subjectId!] ?? [];
    const updated = [r, ...arr];
    all[subjectId!] = updated;
    writeDemoAll(all);
    setResources(updated);
  };

  const removeDemoResource = (resourceId: string) => {
    const all = readDemoAll();
    const arr = (all[subjectId!] ?? []).filter((x) => x.id !== resourceId);
    all[subjectId!] = arr;
    writeDemoAll(all);
    setResources(arr);
  };

  return {
    resources,
    loading,
    addDemoResource,
    removeDemoResource,
    // you can add helpers for update, rename, etc.
  };
}
