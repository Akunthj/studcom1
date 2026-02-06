// src/hooks/useTopics.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const DEMO_KEY = 'studcom:topics';

export type Topic = {
  id: string;
  subjectId: string;
  title: string;
  createdAt?: number;
  completed?: boolean;
};

function readDemo() {
  try {
    return JSON.parse(localStorage.getItem(DEMO_KEY) || '{}') as Record<string, Topic[]>;
  } catch {
    return {};
  }
}

function writeDemo(all: Record<string, Topic[]>) {
  localStorage.setItem(DEMO_KEY, JSON.stringify(all));
}

export function useTopics(subjectId?: string) {
  const [topics, setTopics] = useState<Topic[]>([]);

  useEffect(() => {
    if (!subjectId) {
      setTopics([]);
      return;
    }

    if (!supabase) {
      const all = readDemo();
      setTopics(all[subjectId] ?? []);
      return;
    }

    // TODO: Supabase fetch if needed
    const fetch = async () => {
      const { data, error } = await supabase.from('topics').select('*').eq('subject_id', subjectId);
      if (error) {
        console.error('useTopics error', error);
        setTopics([]);
      } else {
        setTopics(data ?? []);
      }
    };
    fetch();
  }, [subjectId]);

  const addTopic = (title: string) => {
    if (!subjectId) return;
    if (!supabase) {
      const all = readDemo();
      const arr = all[subjectId] ?? [];
      const topic = {
        id: crypto.randomUUID(),
        subjectId,
        title,
        createdAt: Date.now(),
        completed: false,
      } as Topic;
      const updated = [topic, ...arr];
      all[subjectId] = updated;
      writeDemo(all);
      setTopics(updated);
      return;
    }

    // supabase insert (if available)
    (async () => {
      const { data, error } = await supabase.from('topics').insert({ subject_id: subjectId, title }).select().single();
      if (error) {
        console.error('addTopic error', error);
        return;
      }
      setTopics((t) => [data, ...t]);
    })();
  };

  const toggleComplete = (topicId: string) => {
    if (!subjectId) return;
    if (!supabase) {
      const all = readDemo();
      const arr = (all[subjectId] ?? []).map((t) =>
        t.id === topicId ? { ...t, completed: !t.completed } : t,
      );
      all[subjectId] = arr;
      writeDemo(all);
      setTopics(arr);
      return;
    }
    // Supabase toggle logic (optional)
  };

  return { topics, addTopic, toggleComplete };
}