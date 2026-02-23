'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

// Normalize Vietnamese phone number to +84 format
function normalizePhoneNumber(input: string): string {
  // Remove all non-digit characters
  let cleaned = input.replace(/\D/g, '');

  // If starts with 84 (country code without +), add +
  if (cleaned.startsWith('84') && cleaned.length === 11) {
    return `+${cleaned}`;
  }

  // If starts with 0, replace with +84
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return '+84' + cleaned.substring(1);
  }

  // If already has +, return as is
  if (input.startsWith('+')) {
    return input;
  }

  // If it's just digits starting with 84, add +
  if (cleaned.startsWith('84')) {
    return `+${cleaned}`;
  }

  // Return original if no pattern matched
  return input;
}

export default function LoginPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [needsTelegramLink, setNeedsTelegramLink] = useState(false);
  const router = useRouter();

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNeedsTelegramLink(false);

    // Normalize phone number before sending
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: normalizedPhone }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      setSuccess(true);

      setTimeout(() => {
        router.push(`/verify-otp?phone=${encodeURIComponent(normalizedPhone)}`);
      }, 1500);
    } catch (err: any) {
      const errorMessage = err.message || 'Something went wrong';

      if (errorMessage.includes('Telegram') || errorMessage.includes('whitelisted')) {
        setNeedsTelegramLink(true);
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <span className="text-2xl font-bold text-white">eP</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            ePass Toll Manager
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Đăng nhập bằng số điện thoại của bạn
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {success ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-lg font-medium text-gray-900">
                Đã gửi OTP qua Telegram!
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Đang chuyển hướng...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSendOTP} className="space-y-6">
              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  Số điện thoại
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    autoComplete="tel"
                    required
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="+84912345678"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className={`rounded-lg p-4 ${needsTelegramLink ? 'bg-yellow-50 border border-yellow-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-start gap-3">
                    {needsTelegramLink ? (
                      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${needsTelegramLink ? 'text-yellow-800' : 'text-red-800'}`}>
                        {needsTelegramLink ? 'Cần liên kết Telegram' : error}
                      </p>
                      {needsTelegramLink && (
                        <div className="mt-3 text-sm text-yellow-700 space-y-2">
                          <p>Để sử dụng ePass, bạn cần liên kết tài khoản Telegram:</p>
                          <ol className="list-decimal list-inside mt-2 space-y-1 text-xs">
                            <li>Mở Telegram và tìm bot</li>
                            <li>Gửi <code className="bg-yellow-200 px-1.5 py-0.5 rounded">/start</code> cho bot</li>
                            <li>Gửi số điện thoại của bạn</li>
                            <li>Quay lại đây và thử lại</li>
                          </ol>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !phoneNumber}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang gửi...
                  </>
                ) : (
                  'Gửi mã xác thực'
                )}
              </button>

              <div className="text-xs text-gray-500 text-center space-y-1">
                <p>Nhập số điện thoại: +84912345678, 84912345678, hoặc 0912345678</p>
                <p className="text-blue-600 font-medium">OTP sẽ được gửi qua Telegram</p>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <a
            href="https://telegram.me/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Cần giúp đỡ liên kết Telegram? →
          </a>
        </div>
      </div>
    </div>
  );
}
