'use client';

import { useEffect, useState } from 'react';

interface TestResult {
  supabase: string;
  tables: Record<string, any>;
  error: string | null;
  overall: string;
  instructions?: any;
}

export default function TestDatabasePage() {
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(true);

  const testDatabase = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-db');
      const data = await response.json();
      setResult(data);
    } catch (error: unknown) {
      setResult({
        supabase: 'error',
        tables: {},
        error: error instanceof Error ? error.message : 'Unknown error',
        overall: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testDatabase();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accessible': case 'healthy': return 'text-green-600 bg-green-50';
      case 'error': return 'text-red-600 bg-red-50';
      case 'empty': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold mb-2">Supabase Database Test</h1>
          <p className="text-gray-600 mb-6">Verify your Supabase connection and table setup</p>

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Testing database connection...</p>
            </div>
          ) : result ? (
            <div className="space-y-6">
              {/* Overall Status */}
              <div className={`p-4 rounded-lg ${getStatusColor(result.overall)}`}>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Overall Status:</span>
                  <span className="uppercase font-bold">{result.overall}</span>
                </div>
              </div>

              {/* Instructions */}
              {result.instructions && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h3 className="font-semibold text-yellow-800 mb-2">Action Required</h3>
                  <p className="text-sm text-yellow-700 mb-2">{result.instructions.message}</p>
                  <p className="text-xs text-yellow-600">
                    SQL file: <code className="bg-yellow-200 px-1 rounded">{result.instructions.sqlFile}</code>
                  </p>
                </div>
              )}

              {/* Supabase Config */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Supabase Configuration</h3>
                <div className={`inline-block px-2 py-1 rounded text-sm ${result.supabase === 'configured' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {result.supabase}
                </div>
              </div>

              {/* Table Status */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3">Tables Status</h3>
                <div className="space-y-2">
                  {Object.entries(result.tables).map(([table, info]) => (
                    <div key={table} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="font-medium">{table}</span>
                      <span className={`px-2 py-1 rounded text-xs ${getStatusColor((info as any).status)}`}>
                        {(info as any).status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Error Display */}
              {result.error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h3 className="font-semibold text-red-800 mb-1">Error</h3>
                  <p className="text-sm text-red-600">{result.error}</p>
                </div>
              )}

              {/* Retest Button */}
              <button
                onClick={testDatabase}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Retest Connection
              </button>

              {/* Next Steps */}
              {result.overall === 'healthy' ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-2">Database Ready!</h3>
                  <p className="text-sm text-green-700">
                    Your Supabase database is properly configured. You can now:
                  </p>
                  <ul className="text-sm text-green-700 list-disc list-inside mt-2 space-y-1">
                    <li>Deploy to Vercel</li>
                    <li>Test the login flow</li>
                    <li>Add whitelisted phone numbers</li>
                  </ul>
                </div>
              ) : (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-2">Setup Steps</h3>
                  <ol className="text-sm text-blue-700 list-decimal list-inside space-y-2">
                    <li>
                      Go to your <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline font-medium">Supabase Dashboard</a>
                    </li>
                    <li>Open SQL Editor</li>
                    <li>Copy the SQL from <code className="bg-blue-100 px-1 rounded">supabase/migrations/001_initial_schema.sql</code></li>
                    <li>Run the SQL script</li>
                    <li>Come back and click "Retest Connection"</li>
                  </ol>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
