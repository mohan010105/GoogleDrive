import React, { useState, useEffect } from 'react';
import { XCircle, RefreshCw, ArrowLeft, AlertTriangle, CreditCard, Wifi, Clock } from 'lucide-react';

interface PaymentFailureProps {
  errorMessage: string;
  planName: string;
  amount: number;
  billingCycle: 'monthly' | 'annual';
  onRetry: () => void;
  onGoBack: () => void;
  retryCount?: number;
  maxRetries?: number;
}

const PaymentFailure: React.FC<PaymentFailureProps> = ({
  errorMessage,
  planName,
  amount,
  billingCycle,
  onRetry,
  onGoBack,
  retryCount = 0,
  maxRetries = 3
}) => {
  const [showHelp, setShowHelp] = useState(false);

  // Determine error type for better messaging
  const getErrorType = (message: string) => {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('timeout') || lowerMessage.includes('network')) {
      return 'network';
    }
    if (lowerMessage.includes('declined') || lowerMessage.includes('insufficient')) {
      return 'card';
    }
    if (lowerMessage.includes('expired') || lowerMessage.includes('cancelled')) {
      return 'expired';
    }
    return 'general';
  };

  const errorType = getErrorType(errorMessage);

  const getErrorIcon = () => {
    switch (errorType) {
      case 'network': return <Wifi size={20} className="text-red-500 mt-0.5 flex-shrink-0" />;
      case 'card': return <CreditCard size={20} className="text-red-500 mt-0.5 flex-shrink-0" />;
      case 'expired': return <Clock size={20} className="text-red-500 mt-0.5 flex-shrink-0" />;
      default: return <XCircle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />;
    }
  };

  const getErrorTitle = () => {
    switch (errorType) {
      case 'network': return 'Connection Issue';
      case 'card': return 'Payment Declined';
      case 'expired': return 'Session Expired';
      default: return 'Payment Failed';
    }
  };

  const getHelpText = () => {
    switch (errorType) {
      case 'network':
        return 'Check your internet connection and try again. If the problem persists, contact support.';
      case 'card':
        return 'Verify your card details, ensure sufficient funds, or try a different payment method.';
      case 'expired':
        return 'Your payment session has expired. Please start a new payment attempt.';
      default:
        return 'An unexpected error occurred. Please try again or contact our support team.';
    }
  };

  const canRetry = retryCount < maxRetries;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 border border-gray-100">
        <div className="text-center">
          <div className="inline-block p-4 rounded-full bg-red-100 mb-6">
            <XCircle size={48} className="text-red-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">{getErrorTitle()}</h1>
          <p className="text-gray-600 mb-6">
            {errorType === 'network' ? 'Connection problem detected' :
             errorType === 'card' ? 'Your payment method was declined' :
             'We couldn\'t process your payment'}
          </p>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
            <div className="flex items-start gap-3">
              {getErrorIcon()}
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800 mb-1">What happened?</p>
                <p className="text-sm text-red-700">{errorMessage}</p>
                <button
                  onClick={() => setShowHelp(!showHelp)}
                  className="text-xs text-red-600 hover:text-red-800 mt-2 underline"
                >
                  {showHelp ? 'Hide help' : 'Show help'}
                </button>
                {showHelp && (
                  <p className="text-xs text-red-600 mt-2 leading-relaxed">
                    {getHelpText()}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Reassurance Message */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className="text-blue-500 flex-shrink-0" />
              <div className="text-left">
                <p className="text-sm font-medium text-blue-800">No charges were made</p>
                <p className="text-xs text-blue-700">Your account remains secure and unchanged</p>
              </div>
            </div>
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
                <span className="text-gray-600">Amount:</span>
                <span className="font-semibold text-gray-900">${amount.toFixed(2)}</span>
              </div>
              {retryCount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Attempts:</span>
                  <span className="font-semibold text-gray-900">{retryCount}/{maxRetries}</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {canRetry ? (
              <button
                onClick={onRetry}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg shadow-blue-500/30 transform hover:-translate-y-0.5"
              >
                <RefreshCw size={18} />
                Try Again {retryCount > 0 && `(${maxRetries - retryCount} left)`}
              </button>
            ) : (
              <div className="w-full p-3 bg-gray-100 border border-gray-200 rounded-lg text-center">
                <p className="text-sm text-gray-600">Maximum retry attempts reached</p>
                <p className="text-xs text-gray-500 mt-1">Please contact support for assistance</p>
              </div>
            )}

            <button
              onClick={onGoBack}
              className="w-full flex items-center justify-center gap-2 text-gray-600 hover:text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
            >
              <ArrowLeft size={18} />
              Back to Plans
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-2">
              Need help? Contact our support team:
            </p>
            <p className="text-xs text-blue-600 font-medium">
              support@clouddrive.com
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Response time: Usually within 24 hours
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailure;
