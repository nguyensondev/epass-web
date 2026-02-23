'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LinkTelegramPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [linkCode, setLinkCode] = useState('');

  const handleGenerateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/telegram/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate code');
      }

      setLinkCode(data.code);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const botUsername = 'EpassRCBot';
  const botLink = `https://t.me/${botUsername}`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Link Telegram Account
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            Connect your Telegram to receive login codes
          </p>
        </div>

        {success ? (
          <div className="space-y-6">
            <div className="rounded-md bg-green-50 p-6">
              <h3 className="text-lg font-medium text-green-900 mb-4">
                ✅ Your Link Code: {linkCode}
              </h3>
              <div className="space-y-3 text-sm text-green-800">
                <p>This code expires in 10 minutes.</p>

                <div className="bg-green-100 p-4 rounded">
                  <p className="font-medium mb-2">Next steps:</p>
                  <ol className="list-decimal list-inside space-y-2">
                    <li>
                      Open Telegram:{' '}
                      <a
                        href={botLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        @{botUsername}
                      </a>
                    </li>
                    <li>Send: <code className="bg-green-200 px-2 py-1 rounded">/start</code></li>
                    <li>Then send: <code className="bg-green-200 px-2 py-1 rounded">{phoneNumber}</code></li>
                    <li>Or just send your phone number directly</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={() => {
                  setSuccess(false);
                  setLinkCode('');
                  setPhoneNumber('');
                }}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Link another phone number
              </button>
            </div>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleGenerateCode}>
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                autoComplete="tel"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="+84912345678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-500">
                Include country code (e.g., +84 for Vietnam)
              </p>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading || !phoneNumber}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate Link Code'}
              </button>
            </div>

            <div className="bg-blue-50 p-4 rounded">
              <p className="text-sm text-blue-800">
                💡 <strong>Quick Link:</strong> You can also directly message{' '}
                <a
                  href={botLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  @{botUsername}
                </a>
                {' '}on Telegram and send your phone number!
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
