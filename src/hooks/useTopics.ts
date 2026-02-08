// src/hooks/useTopics.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { readScopedStorageItem, writeScopedStorageItem } from '@/lib/storageScope';

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
    return JSON.parse(readScopedStorageItem(DEMO_KEY) || '{}') as Record<string, Topic[]>;
  } catch {
    return {};
  }
}

function writeDemo(all: Record<string, Topic[]>) {
  writeScopedStorageItem(DEMO_KEY, JSON.stringify(all));
}

export function useTopics(subjectId?: string | null) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!subjectId) {
      setTopics([]);
      return;
    }

    const fetchTopics = async () => {
      setLoading(true);
      if (!supabase) {
        const all = readDemo();
        setTopics(all[subjectId] ?? []);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.from('topics').select('*').eq('subject_id', subjectId).order('created_at', { ascending: false });
      if (error) {
        console.error('useTopics error', error);
        setTopics([]);
      } else {
        setTopics(data ?? []);
      }
      setLoading(false);
    };

    fetchTopics();
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

    (async () => {
      const { data, error } = await supabase.from('topics').insert({ subject_id: subjectId, name: title }).select().single();
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

    (async () => {
      const topic = topics.find(t => t.id === topicId);
      if (!topic) return;
      const { error } = await supabase.from('user_progress').upsert({
        topic_id: topicId,
        completed: !topic.completed,
      });
      if (error) {
        console.error('toggleComplete error', error);
        return;
      }
      setTopics((t) => t.map((item) => item.id === topicId ? { ...item, completed: !item.completed } : item));
    })();
  };

  const removeTopic = (topicId: string) => {
    if (!subjectId) return;
    if (!supabase) {
      const all = readDemo();
      const arr = (all[subjectId] ?? []).filter((t) => t.id !== topicId);
      all[subjectId] = arr;
      writeDemo(all);
      setTopics(arr);
      return;
    }

    (async () => {
      const { error } = await supabase.from('topics').delete().eq('id', topicId);
      if (error) {
        console.error('removeTopic error', error);
        return;
      }
      setTopics((t) => t.filter((item) => item.id !== topicId));
    })();
  };

  return { topics, loading, addTopic, toggleComplete, removeTopic };
}
