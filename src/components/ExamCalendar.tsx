import React, { useState, useEffect } from 'react';
import { Calendar, Plus, X, Clock, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { Exam, Subject } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { demoStorage } from '@/lib/demoMode';
import { supabase } from '@/lib/supabase';

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
    const stored = localStorage.getItem('studcom:exams');
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
    localStorage.setItem('studcom:exams', JSON.stringify(updatedExams));
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
      days.push(<div key={`empty-${i}`} className="aspect-square" />);
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
          className={`aspect-square p-1 rounded-lg text-sm transition-all ${
            isToday ? 'bg-blue-50 dark:bg-blue-900/30 font-bold' : ''
          } ${
            isSelected ? 'ring-2 ring-blue-500' : ''
          } ${
            dateExams.length > 0 ? 'bg-orange-50 dark:bg-orange-900/20' : ''
          } hover:bg-gray-100 dark:hover:bg-gray-700`}
        >
          <div className="text-gray-900 dark:text-white">{day}</div>
          {dateExams.length > 0 && (
            <div className="flex justify-center mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            </div>
          )}
        </button>
      );
    }

    return days;
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="space-y-4">
      {/* Study Suggestion Card */}
      {nearestExam && (
        <div className="bg-gradient-to-r from-orange-500 to-red-500 dark:from-orange-600 dark:to-red-600 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-start gap-4">
            <div className="bg-white/20 rounded-lg p-3">
              <BookOpen className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-1">📖 Suggested to Study</h3>
              <p className="text-white/90 mb-2">
                <strong>{nearestExam.name}</strong> is coming up {getDaysUntil(nearestExam.date) === 0 ? 'today' : `in ${getDaysUntil(nearestExam.date)} ${getDaysUntil(nearestExam.date) === 1 ? 'day' : 'days'}`}
              </p>
              <p className="text-sm text-white/80 mb-3">
                Subject: {nearestExam.subject_name}
              </p>
              {onNavigateToSubject && (
                <button
                  onClick={() => onNavigateToSubject(nearestExam.subject_id)}
                  className="bg-white text-orange-600 px-4 py-2 rounded-lg font-medium hover:bg-white/90 transition"
                >
                  Start Studying →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Calendar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Exam Calendar
          </h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Test
          </button>
        </div>

        {/* Calendar Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h3>
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
          >
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-semibold text-gray-600 dark:text-gray-400 py-2">
              {day}
            </div>
          ))}
          {renderCalendar()}
        </div>

        {/* Selected Date Exams */}
        {selectedDate && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              {selectedDate.toDateString()}
            </h4>
            {getExamsForDate(selectedDate).map(exam => (
              <div key={exam.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900 dark:text-white">{exam.name}</h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{exam.subject_name}</p>
                    {exam.syllabus && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{exam.syllabus}</p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteExam(exam.id)}
                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition"
                  >
                    <X className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upcoming Exams List */}
        {upcomingExams.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Upcoming Tests</h4>
            <div className="space-y-2">
              {upcomingExams.slice(0, 5).map(exam => {
                const daysUntil = getDaysUntil(exam.date);
                return (
                  <div key={exam.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <h5 className="font-medium text-gray-900 dark:text-white truncate">{exam.name}</h5>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{exam.subject_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {new Date(exam.date).toLocaleDateString()} - {
                          daysUntil === 0 ? 'Today' : 
                          daysUntil === 1 ? '1 day to go' : 
                          `${daysUntil} days to go`
                        }
                      </p>
                    </div>
                    <button
                      onClick={() => deleteExam(exam.id)}
                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition"
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
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
