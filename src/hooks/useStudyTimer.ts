import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export const useStudyTimer = (topicId: string) => {
  const { user } = useAuth();
  const [isTracking, setIsTracking] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const sessionIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    startSession();

    return () => {
      endSession();
    };
  }, [topicId]);

  const startSession = async () => {
    if (!user || !topicId || isTracking) return;

    try {
      startTimeRef.current = new Date();
      setIsTracking(true);

      const { data, error } = await supabase
        .from('study_sessions')
        .insert({
          user_id: user.id,
          topic_id: topicId,
          start_time: startTimeRef.current.toISOString(),
          duration_seconds: 0,
        })
        .select()
        .single();

      if (error) throw error;
      sessionIdRef.current = data.id;

      intervalRef.current = window.setInterval(() => {
        if (startTimeRef.current) {
          const elapsed = Math.floor(
            (new Date().getTime() - startTimeRef.current.getTime()) / 1000
          );
          setElapsedTime(elapsed);
        }
      }, 1000);

      await updateStreak();
    } catch (error) {
      console.error('Error starting study session:', error);
    }
  };

  const endSession = async () => {
    if (!user || !sessionIdRef.current || !startTimeRef.current) return;

    try {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      const endTime = new Date();
      const durationSeconds = Math.floor(
        (endTime.getTime() - startTimeRef.current.getTime()) / 1000
      );

      await supabase
        .from('study_sessions')
        .update({
          end_time: endTime.toISOString(),
          duration_seconds: durationSeconds,
        })
        .eq('id', sessionIdRef.current);

      await supabase
        .from('user_progress')
        .upsert({
          user_id: user.id,
          topic_id: topicId,
          total_time_seconds: durationSeconds,
          last_accessed: endTime.toISOString(),
          progress_percentage: 0,
        });

      setIsTracking(false);
      sessionIdRef.current = null;
      startTimeRef.current = null;
      setElapsedTime(0);
    } catch (error) {
      console.error('Error ending study session:', error);
    }
  };

  const updateStreak = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];

      const { data: existingStreak } = await supabase
        .from('study_streaks')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!existingStreak) {
        await supabase.from('study_streaks').insert({
          user_id: user.id,
          current_streak: 1,
          longest_streak: 1,
          last_study_date: today,
        });
        return;
      }

      const lastStudyDate = existingStreak.last_study_date;
      const lastDate = new Date(lastStudyDate);
      const todayDate = new Date(today);
      const diffDays = Math.floor(
        (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 0) {
        return;
      }

      let newStreak = existingStreak.current_streak;

      if (diffDays === 1) {
        newStreak += 1;
      } else {
        newStreak = 1;
      }

      const newLongestStreak = Math.max(newStreak, existingStreak.longest_streak);

      await supabase
        .from('study_streaks')
        .update({
          current_streak: newStreak,
          longest_streak: newLongestStreak,
          last_study_date: today,
        })
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error updating streak:', error);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    isTracking,
    elapsedTime,
    formattedTime: formatTime(elapsedTime),
    startSession,
    endSession,
  };
};
