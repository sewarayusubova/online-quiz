import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, FileText, CheckSquare, PlusCircle, TrendingUp } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(async res => {
        if (!res.ok) {
          const text = await res.text();
          try {
            const json = JSON.parse(text);
            throw new Error(json.error || `Error ${res.status}: ${res.statusText}`);
          } catch {
            throw new Error(`Error ${res.status}: ${text || res.statusText}`);
          }
        }
        return res.json();
      })
      .then(data => {
        if (data && data.recentResults && Array.isArray(data.recentResults)) {
          setStats(data);
        } else {
           console.error('Invalid stats data:', data);
           setError('Invalid data received from server');
           setStats({ totalStudents: 0, totalTests: 0, totalSubmissions: 0, recentResults: [] });
        }
      })
      .catch(err => {
        console.error('Fetch error:', err);
        setError(err.message);
        setStats({ totalStudents: 0, totalTests: 0, totalSubmissions: 0, recentResults: [] });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-10">Loading stats...</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <Link
          to="/admin/create-test"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm"
        >
          <PlusCircle className="w-5 h-5" />
          Create New Test
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/admin/students" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-xl">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Students</p>
            <p className="text-3xl font-bold text-gray-900">{stats.totalStudents}</p>
          </div>
        </Link>
        <Link to="/admin/tests" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer">
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-xl">
            <FileText className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Tests</p>
            <p className="text-3xl font-bold text-gray-900">{stats.totalTests}</p>
          </div>
        </Link>
        <Link to="/admin/submissions" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer">
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckSquare className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Submissions</p>
            <p className="text-3xl font-bold text-gray-900">{stats.totalSubmissions}</p>
          </div>
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 flex items-center gap-2 bg-gray-50">
          <TrendingUp className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">Recent Submissions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.recentResults.map((result: any) => (
                <tr key={result.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {result.username}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {result.test_title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      result.score / result.total >= 0.5 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {result.score} / {result.total}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(result.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {stats.recentResults.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No submissions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
