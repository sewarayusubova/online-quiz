import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, CheckCircle, AlertCircle, Clock } from 'lucide-react';

export default function TakeTest() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetch(`/api/tests/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load test');
        return res.json();
      })
      .then(data => {
        if (data && Array.isArray(data.questions)) {
          setTest(data);
          if (data.duration_minutes) {
            setTimeLeft(data.duration_minutes * 60);
          }
        } else {
          throw new Error('Invalid test data received');
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timerRef.current!);
          handleSubmit(true); // Auto-submit
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOptionSelect = (questionId: number, optionIndex: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleSubmit = async (autoSubmit = false) => {
    if (!autoSubmit && Object.keys(answers).length < test.questions.length) {
      if (!confirm('You have unanswered questions. Are you sure you want to submit?')) return;
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/tests/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit test');
      navigate('/');
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center py-10">Loading test...</div>;
  if (error && !test) return <div className="text-center py-10 text-red-500">{error}</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-24">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 sticky top-4 z-10 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{test.title}</h1>
          <p className="text-gray-500 text-sm mt-1">{test.description}</p>
        </div>
        {timeLeft !== null && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono font-bold text-xl ${timeLeft < 60 ? 'bg-red-100 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
            <Clock className="w-5 h-5" />
            {formatTime(timeLeft)}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      <div className="space-y-6">
        {test.questions.map((q: any, index: number) => (
          <div key={q.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              <span className="text-indigo-600 mr-2">{index + 1}.</span>
              {q.text}
            </h3>
            <div className="space-y-3">
              {q.options.map((opt: string, optIndex: number) => (
                <label
                  key={optIndex}
                  className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                    answers[q.id] === optIndex
                      ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${q.id}`}
                    value={optIndex}
                    checked={answers[q.id] === optIndex}
                    onChange={() => handleOptionSelect(q.id, optIndex)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                  <span className="ml-3 text-gray-700 font-medium">{opt}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg flex justify-end max-w-3xl mx-auto rounded-t-2xl">
        <button
          onClick={() => handleSubmit(false)}
          disabled={submitting}
          className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Submit Test'}
          <CheckCircle className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
