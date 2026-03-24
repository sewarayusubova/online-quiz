import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save, ArrowLeft } from 'lucide-react';

export default function CreateTest() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(30);
  const [questions, setQuestions] = useState([
    { text: '', options: ['', '', '', ''], correct_option_index: 0 }
  ]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const handleAddQuestion = () => {
    setQuestions([...questions, { text: '', options: ['', '', '', ''], correct_option_index: 0 }]);
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const handleQuestionChange = (index: number, field: string, value: any) => {
    const newQuestions = [...questions];
    (newQuestions[index] as any)[field] = value;
    setQuestions(newQuestions);
  };

  const handleOptionChange = (qIndex: number, optIndex: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[optIndex] = value;
    setQuestions(newQuestions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!title.trim()) return setError('Title is required');
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) return setError(`Question ${i + 1} text is required`);
      if (q.options.some(opt => !opt.trim())) return setError(`All options for Question ${i + 1} are required`);
    }

    setSaving(true);
    try {
      const res = await fetch('/api/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, questions, duration_minutes: duration }),
      });
      
      let data;
      try {
        const text = await res.text();
        data = JSON.parse(text);
      } catch {
        throw new Error('Server returned invalid response');
      }

      if (!res.ok) throw new Error(data.error || 'Failed to create test');
      navigate('/admin');
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin')} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Create New Test</h1>
        </div>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save Test'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Test Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-lg"
            placeholder="e.g., Midterm Examination 2024"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            placeholder="Provide instructions or details about this test..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes)</label>
          <input
            type="number"
            min="1"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            placeholder="30"
          />
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Questions</h2>
          <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            Total: {questions.length}
          </span>
        </div>

        {questions.map((q, qIndex) => (
          <div key={qIndex} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 relative group">
            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleRemoveQuestion(qIndex)}
                disabled={questions.length === 1}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50"
                title="Remove Question"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6 pr-12">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Question {qIndex + 1}
              </label>
              <input
                type="text"
                value={q.text}
                onChange={(e) => handleQuestionChange(qIndex, 'text', e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter question text..."
              />
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Options</label>
              {q.options.map((opt, optIndex) => (
                <div key={optIndex} className="flex items-center gap-4">
                  <input
                    type="radio"
                    name={`correct-${qIndex}`}
                    checked={q.correct_option_index === optIndex}
                    onChange={() => handleQuestionChange(qIndex, 'correct_option_index', optIndex)}
                    className="w-5 h-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 cursor-pointer"
                    title="Mark as correct answer"
                  />
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => handleOptionChange(qIndex, optIndex, e.target.value)}
                    className={`flex-1 px-4 py-2 rounded-lg border ${
                      q.correct_option_index === optIndex 
                        ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' 
                        : 'border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                    }`}
                    placeholder={`Option ${optIndex + 1}`}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        <button
          onClick={handleAddQuestion}
          className="w-full py-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-600 font-medium hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Another Question
        </button>
      </div>
    </div>
  );
}
