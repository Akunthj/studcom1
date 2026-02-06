const SubjectView: React.FC = () => {
  // 🔑 Which subject is currently active (from Sidebar)
  const { currentSubjectId } = useSubject();

  // 🔑 Topics scoped to the active subject
  const {
    topics,
    addTopic,
    toggleComplete,
    loading,
  } = useTopics(currentSubjectId);

  // UI-only state
  const [newTopicName, setNewTopicName] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);

  // 🚫 Safety: no subject selected yet
  if (!currentSubjectId) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        Select a subject from the sidebar to begin
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        Loading topics…
      </div>
    );
  }

  /* -----------------------------
     PROGRESS CALCULATION
  ------------------------------*/
  const totalTopics = topics.length;
  const completedTopics = topics.filter(t => t.completed).length;
  const progress =
    totalTopics === 0 ? 0 : Math.round((completedTopics / totalTopics) * 100);

  /* -----------------------------
     ADD TOPIC HANDLER
  ------------------------------*/
  const handleAddTopic = () => {
    if (!newTopicName.trim()) return;
    addTopic(newTopicName.trim());
    setNewTopicName('');
  };

  return (
    <div className="h-full p-6 overflow-y-auto">
      {/* ---------------- HEADER ---------------- */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Topics
        </h1>

        {/* Progress Bar */}
        <div className="max-w-md">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded">
            <div
              className="h-2 bg-blue-600 rounded transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* ---------------- ADD TOPIC ---------------- */}
      <div className="flex items-center gap-2 mb-6">
        <input
          type="text"
          value={newTopicName}
          onChange={(e) => setNewTopicName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddTopic()}
          placeholder="Add new topic…"
          className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <button
          onClick={handleAddTopic}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Add
        </button>
      </div>

      {/* ---------------- TOPIC LIST ---------------- */}
      {topics.length === 0 ? (
        <div className="text-gray-500 italic">
          No topics yet. Add your first topic above.
        </div>
      ) : (
        <ul className="space-y-2 max-w-xl">
          {topics.map((topic) => (
            <li
              key={topic.id}
              className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition"
            >
              <input
                type="checkbox"
                checked={!!topic.completed}
                onChange={() => toggleComplete(topic.id)}
              />
              <span
                className={`flex-1 ${
                  topic.completed
                    ? 'line-through text-gray-400'
                    : 'text-gray-800'
                }`}
                onClick={() => setSelectedTopic(topic)}
              >
                {topic.name}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};