import React, { useState, useEffect } from 'react';
import { CheckCircle, Download, ArrowRight, Mail, Clock, Shield } from 'lucide-react';

interface PaymentSuccessProps {
  planName: string;
  amount: number;
  billingCycle: 'monthly' | 'annual';
  transactionId: string;
  // Called when user continues to the app after viewing success
  onContinue?: () => void;
  // Backwards-compatible prop: onClose
  onClose?: () => void;
  userEmail?: string;
}

const PaymentSuccess: React.FC<PaymentSuccessProps> = ({
  planName,
  amount,
  billingCycle,
  transactionId,
  onContinue,
  userEmail
}) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    // Simulate confetti animation
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);

    // Simulate email sending
    setTimeout(() => setEmailSent(true), 2000);
  }, []);

  const nextBillingDate = billingCycle === 'annual'
    ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString()
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 border border-gray-100 relative overflow-hidden">
        {/* Confetti Animation */}
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-bounce"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${1 + Math.random()}s`
                }}
              >
                <div className={`w-2 h-2 rounded-full ${
                  ['bg-yellow-400', 'bg-blue-400', 'bg-green-400', 'bg-pink-400', 'bg-purple-400'][Math.floor(Math.random() * 5)]
                }`} />
              </div>
            ))}
          </div>
        )}

        <div className="text-center relative z-10">
          <div className="inline-block p-4 rounded-full bg-green-100 mb-6 animate-pulse">
            <CheckCircle size={48} className="text-green-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful! 🎉</h1>
          <p className="text-gray-600 mb-4">
            Welcome to your upgraded {planName} plan!
          </p>

          {/* Security Notice */}
          <div className="flex items-center justify-center gap-2 text-sm text-green-700 bg-green-50 px-4 py-2 rounded-lg mb-6">
            <Shield size={16} />
            <span>Payment processed securely</span>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 mb-8 text-left">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Plan:</span>
                <span className="font-semibold text-gray-900">{planName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Billing:</span>
                <span className="font-semibold text-gray-900 capitalize">{billingCycle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Amount Paid:</span>
                <span className="font-semibold text-gray-900">${amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Next Billing:</span>
                <span className="font-semibold text-gray-900">{nextBillingDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Transaction ID:</span>
                <span className="font-mono text-sm text-gray-900 break-all">{transactionId}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => {
                if (onContinue) onContinue();
                else if (onClose) onClose();
              }}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg shadow-blue-500/30 transform hover:-translate-y-0.5"
            >
              Continue to My Drive
              <ArrowRight size={18} />
            </button>

            <button className="w-full flex items-center justify-center gap-2 text-gray-600 hover:text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors border border-gray-200">
              <Download size={18} />
              Download Receipt
            </button>
          </div>

          {/* Email Confirmation */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-2">
              <Mail size={16} />
              <span>Confirmation sent to {userEmail || 'your email'}</span>
            </div>
            {emailSent ? (
              <div className="flex items-center justify-center gap-2 text-sm text-green-600">
                <CheckCircle size={14} />
                <span>Email sent successfully</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <Clock size={14} />
                <span>Sending confirmation email...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
