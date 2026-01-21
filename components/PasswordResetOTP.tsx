import React, { useState, useEffect } from 'react';
import { api } from '../services/supabaseService';
import { Shield, ArrowRight, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

interface PasswordResetOTPProps {
  email: string;
  onSuccess: (resetToken: string) => void;
  onBack: () => void;
  onResendOTP: () => void;
}

const PasswordResetOTP: React.FC<PasswordResetOTPProps> = ({
  email,
  onSuccess,
  onBack,
  onResendOTP
}) => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes in seconds
  const [canResend, setCanResend] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else {
      setCanResend(true);
    }
  }, [resendCooldown]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otp.trim() || otp.length !== 6) {
      setMessage({ type: 'error', text: 'Please enter a valid 6-digit OTP.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const result = await api.verifyPasswordResetOTP(email, otp.trim());

      if (result.success && result.resetToken) {
        setMessage({ type: 'success', text: result.message });
        // Wait a moment to show success message, then proceed
        setTimeout(() => {
          onSuccess(result.resetToken!);
        }, 1500);
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setCanResend(false);
    setResendCooldown(60); // 60 seconds cooldown
    setMessage(null);
    await onResendOTP();
  };

  const isExpired = timeLeft === 0;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="inline-block p-4 rounded-full bg-blue-100 mb-4">
              <Shield size={32} className="text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Verify OTP</h1>
            <p className="text-gray-600">
              We've sent a 6-digit code to <strong>{email}</strong>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                Enter OTP
              </label>
              <input
                id="otp"
                type="text"
                value={otp}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setOtp(value);
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors text-center text-2xl font-mono tracking-widest"
                placeholder="000000"
                maxLength={6}
                required
                disabled={loading || isExpired}
              />
            </div>

            {/* Timer */}
            <div className="text-center">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
                isExpired
                  ? 'bg-red-50 border border-red-200'
                  : 'bg-blue-50 border border-blue-200'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isExpired ? 'bg-red-500' : 'bg-blue-500'
                }`}></div>
                <span className={`text-sm font-medium ${
                  isExpired ? 'text-red-700' : 'text-blue-700'
                }`}>
                  {isExpired ? 'OTP Expired' : `Expires in ${formatTime(timeLeft)}`}
                </span>
              </div>
            </div>

            {message && (
              <div className={`flex items-start gap-3 p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}>
                {message.type === 'success' ? (
                  <CheckCircle size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
                )}
                <p className={`text-sm ${
                  message.type === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {message.text}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || isExpired || otp.length !== 6}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg shadow-blue-500/30 transform hover:-translate-y-0.5"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Verifying...
                </>
              ) : (
                <>
                  Verify OTP
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Resend OTP */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-3">
                Didn't receive the code?
              </p>
              <button
                onClick={handleResendOTP}
                disabled={!canResend || loading}
                className="flex items-center justify-center gap-2 text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium py-2 px-4 rounded-lg transition-colors mx-auto"
              >
                <RefreshCw size={16} />
                {canResend ? 'Resend OTP' : `Resend in ${resendCooldown}s`}
              </button>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={onBack}
              className="w-full text-gray-600 hover:text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
            >
              ← Back to Email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordResetOTP;
