import React, { useState, useEffect } from 'react';
import { Calendar, Plus, X, Clock, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { Exam, Subject } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { demoStorage } from '@/lib/demoMode';
import { supabase } from '@/lib/supabase';
import { readScopedStorageItem, writeScopedStorageItem } from '@/lib/storageScope';

interface ExamCalendarProps {
  onNavigateToSubject?: (subjectId: string) => void;
}

export const ExamCalendar: React.FC<ExamCalendarProps> = ({ onNavigateToSubject }) => {
  const { isDemo } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    loadExams();
    loadSubjects();
  }, [isDemo]);

  const loadExams = () => {
    const stored = readScopedStorageItem('studcom:exams');
    if (stored) {
      setExams(JSON.parse(stored));
    }
  };

  const loadSubjects = async () => {
    if (isDemo) {
      setSubjects(demoStorage.getSubjects());
    } else {
      const { data } = await supabase.from('subjects').select('*').order('name');
      if (data) setSubjects(data);
    }
  };

  const saveExams = (updatedExams: Exam[]) => {
    writeScopedStorageItem('studcom:exams', JSON.stringify(updatedExams));
    setExams(updatedExams);
  };

  const addExam = (exam: Omit<Exam, 'id' | 'created_at'>) => {
    const newExam: Exam = {
      ...exam,
      id: `exam-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    saveExams([...exams, newExam]);
  };

  const deleteExam = (examId: string) => {
    saveExams(exams.filter(e => e.id !== examId));
  };

  const upcomingExams = exams
    .filter(e => new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const nearestExam = upcomingExams[0];

  const getDaysUntil = (date: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const examDate = new Date(date);
    examDate.setHours(0, 0, 0, 0);
    const diff = examDate.getTime() - today.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  // Calendar logic
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getExamsForDate = (date: Date) => {
    return exams.filter(e => {
      const examDate = new Date(e.date);
      return examDate.toDateString() === date.toDateString();
    });
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-7 h-7" />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const dateExams = getExamsForDate(date);
      const isToday = date.toDateString() === new Date().toDateString();
      const isSelected = selectedDate?.toDateString() === date.toDateString();

      days.push(
        <button
          key={day}
          onClick={() => setSelectedDate(date)}
          className={`w-7 h-7 rounded text-[11px] transition-all flex flex-col items-center justify-center ${
            isToday ? 'bg-blue-100 dark:bg-blue-900/40 font-bold text-blue-600 dark:text-blue-400' : ''
          } ${
            isSelected ? 'ring-1 ring-blue-500' : ''
          } ${
            dateExams.length > 0 ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 font-semibold' : 'text-gray-700 dark:text-gray-300'
          } hover:bg-gray-100 dark:hover:bg-gray-700`}
        >
          {day}
          {dateExams.length > 0 && (
            <div className="w-1 h-1 rounded-full bg-orange-500 mt-0.5" />
          )}
        </button>
      );
    }

    return days;
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Compact Study Suggestion Banner */}
      {nearestExam && (
        <div className="bg-gradient-to-r from-orange-500 to-red-500 dark:from-orange-600 dark:to-red-600 px-4 py-3 flex items-center gap-3 text-white">
          <BookOpen className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">
              📖 {nearestExam.name} is coming up {getDaysUntil(nearestExam.date) === 0 ? 'today' : `in ${getDaysUntil(nearestExam.date)} ${getDaysUntil(nearestExam.date) === 1 ? 'day' : 'days'}`}
            </p>
          </div>
          {onNavigateToSubject && (
            <button
              onClick={() => onNavigateToSubject(nearestExam.subject_id)}
              className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition"
            >
              Study Now →
            </button>
          )}
        </div>
      )}

      {/* Horizontal Layout: Calendar + Upcoming Tests */}
      <div className="flex flex-col md:flex-row">
        {/* Left: Mini Calendar */}
        <div className="flex-1 p-4 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Compact Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <div key={i} className="text-center text-[10px] font-semibold text-gray-500 dark:text-gray-400 py-1">
                {day}
              </div>
            ))}
            {renderCalendar()}
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition text-xs font-medium"
          >
            <Plus className="w-3 h-3" />
            Add Test
          </button>
        </div>

        {/* Right: Upcoming Tests (max 3) */}
        <div className="w-full md:w-64 p-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Upcoming Tests
          </h3>
          
          {upcomingExams.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">No upcoming tests</p>
          ) : (
            <div className="space-y-2">
              {upcomingExams.slice(0, 3).map(exam => {
                const daysUntil = getDaysUntil(exam.date);
                return (
                  <div key={exam.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 group relative">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <h5 className="text-xs font-semibold text-gray-900 dark:text-white truncate">{exam.name}</h5>
                        <p className="text-[10px] text-gray-600 dark:text-gray-400 truncate">{exam.subject_name}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-500 mt-0.5">
                          {daysUntil === 0 ? '🔴 Today' : 
                           daysUntil === 1 ? '🟠 Tomorrow' : 
                           `🟢 ${daysUntil} days`}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteExam(exam.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition"
                        aria-label="Delete exam"
                      >
                        <X className="w-3 h-3 text-red-500" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Exam Modal */}
      {showAddModal && (
        <AddExamModal
          subjects={subjects}
          onAdd={addExam}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
};

interface AddExamModalProps {
  subjects: Subject[];
  onAdd: (exam: Omit<Exam, 'id' | 'created_at'>) => void;
  onClose: () => void;
}

const AddExamModal: React.FC<AddExamModalProps> = ({ subjects, onAdd, onClose }) => {
  const [name, setName] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [syllabus, setSyllabus] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !subjectId || !date) return;

    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return;

    const dateTime = `${date}T${time}:00`;
    
    onAdd({
      subject_id: subjectId,
      subject_name: subject.name,
      name,
      date: dateTime,
      syllabus,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add New Test</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Test Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Midterm Exam"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Subject
            </label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              required
            >
              <option value="">Select a subject</option>
              {subjects.map(subject => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Time
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Syllabus (Optional)
            </label>
            <textarea
              value={syllabus}
              onChange={(e) => setSyllabus(e.target.value)}
              placeholder="Describe what topics are covered..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition font-medium"
            >
              Add Test
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
