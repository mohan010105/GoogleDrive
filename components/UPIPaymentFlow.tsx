import React, { useState, useEffect } from 'react';
import { StoragePlan, BillingCycle } from '../types';
import { Check, Smartphone, QrCode, Copy, Upload, AlertCircle } from 'lucide-react';
import Modal from './Modal';
import { api } from '../services/supabaseService';

interface UPIPaymentFlowProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  selectedPlan: StoragePlan;
  billingCycle: BillingCycle;
  onPaymentSubmitted: (transactionId: string) => void;
  onShowToast: (message: string, type: 'success' | 'error') => void;
}

const UPIPaymentFlow: React.FC<UPIPaymentFlowProps> = ({
  isOpen,
  onClose,
  userId,
  selectedPlan,
  billingCycle,
  onPaymentSubmitted,
  onShowToast
}) => {
  const [loading, setLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [upiString, setUpiString] = useState<string>('');
  const [adminUpiId, setAdminUpiId] = useState<string>('mohanrajit05-1@okicici');
  const [paymentIntentId, setPaymentIntentId] = useState<string>('');

  // Form state
  const [upiTransactionId, setUpiTransactionId] = useState('');
  const [paymentApp, setPaymentApp] = useState('');
  const [paymentProofUrl, setPaymentProofUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const amount = billingCycle === 'annual' ? selectedPlan.annualPrice : selectedPlan.monthlyPrice;

  useEffect(() => {
    if (isOpen) {
      initializePayment();
    }
  }, [isOpen, userId, selectedPlan.id, billingCycle]);

  const initializePayment = async () => {
    setLoading(true);
    try {
      // Create UPI payment intent
      const intent = await api.createUPIPaymentIntent(userId, selectedPlan.id, billingCycle, amount);
      setPaymentIntentId(intent.id);

      // Generate UPI QR code
      const qrData = await api.generateUPIQR(intent.id);
      setQrCodeUrl(qrData.qrCodeUrl);
      setUpiString(qrData.upiString);
      setAdminUpiId(qrData.adminUpiId);
    } catch (error: any) {
      console.error('Failed to initialize payment:', error);
      onShowToast('Failed to initialize payment. Please try again.', 'error');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const copyUpiId = () => {
    navigator.clipboard.writeText(adminUpiId);
    onShowToast('UPI ID copied to clipboard', 'success');
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!upiTransactionId.trim()) {
      onShowToast('Please enter the UPI Transaction ID (UTR)', 'error');
      return;
    }

    if (!paymentApp) {
      onShowToast('Please select the payment app used', 'error');
      return;
    }

    setSubmitting(true);
    try {
      // Submit payment confirmation
      await api.submitUPIPaymentConfirmation(
        paymentIntentId,
        upiTransactionId.trim(),
        paymentApp,
        paymentProofUrl || undefined
      );

      // Do NOT upgrade plan or show fake success here.
      // Notify the user that payment was submitted and awaits verification.
      onShowToast('Payment submitted. Awaiting verification by admin.', 'success');
      // Close the payment modal and keep user on the payment page. Do not call onPaymentSubmitted which would imply finalization.
      onClose();
    } catch (error: any) {
      console.error('Failed to submit payment:', error);
      onShowToast(error.message || 'Failed to submit payment. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const paymentApps = [
    { value: 'gpay', label: 'Google Pay' },
    { value: 'phonepe', label: 'PhonePe' },
    { value: 'paytm', label: 'Paytm' },
    { value: 'amazonpay', label: 'Amazon Pay' },
    { value: 'bhim', label: 'BHIM UPI' },
    { value: 'other', label: 'Other UPI App' }
  ];

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Initializing Payment..." maxWidth="max-w-md">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Setting up payment...</span>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Complete UPI Payment" maxWidth="max-w-lg">
      <div className="space-y-6 max-h-[70vh] overflow-y-auto">
        {/* Plan Summary */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Plan Summary</h3>
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium text-gray-900">{selectedPlan.name}</p>
              <p className="text-sm text-gray-600">{selectedPlan.storageGB} GB Storage</p>
              <p className="text-sm text-gray-600">{billingCycle === 'annual' ? 'Annual' : 'Monthly'} billing</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">₹{amount}</p>
            </div>
          </div>
        </div>

        {/* UPI Payment Section */}
        <div className="border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Smartphone className="w-5 h-5 text-blue-600 mr-2" />
            <h4 className="text-lg font-semibold text-gray-900">UPI Payment</h4>
          </div>

          {/* QR Code */}
          {qrCodeUrl && (
            <div className="flex justify-center mb-4">
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                <img
                  src={qrCodeUrl}
                  alt="UPI QR Code"
                  className="w-48 h-48"
                  onError={(e) => {
                    console.error('QR code failed to load');
                    // Fallback: show UPI string as text
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'block';
                  }}
                />
                <div style={{ display: 'none' }} className="text-center text-sm text-gray-600 p-4">
                  <QrCode className="w-16 h-16 mx-auto mb-2 text-gray-400" />
                  <p>QR Code Generation Failed</p>
                  <p className="text-xs mt-1">Use UPI ID below instead</p>
                </div>
              </div>
            </div>
          )}

          {/* Admin UPI ID */}
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900">Admin UPI ID</p>
                <p className="text-lg font-mono text-blue-800">{adminUpiId}</p>
              </div>
              <button
                onClick={copyUpiId}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Copy size={16} />
                Copy
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Payment Instructions:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Scan the QR code using any UPI app</li>
                  <li>Verify the amount is ₹{amount}</li>
                  <li>Complete the payment</li>
                  <li>Note down the UPI Transaction ID (UTR)</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Confirmation Form */}
        <form onSubmit={handleSubmitPayment} className="space-y-4">
          <h4 className="text-lg font-semibold text-gray-900">Confirm Payment</h4>

          {/* UPI Transaction ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              UPI Transaction ID (UTR) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={upiTransactionId}
              onChange={(e) => setUpiTransactionId(e.target.value)}
              placeholder="Enter 12-digit UTR number"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              You can find this in your UPI app under transaction details
            </p>
          </div>

          {/* Payment App */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment App Used <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={paymentApp}
              onChange={(e) => setPaymentApp(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">Select payment app</option>
              {paymentApps.map(app => (
                <option key={app.value} value={app.value}>{app.label}</option>
              ))}
            </select>
          </div>

          {/* Paid Amount (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Paid Amount
            </label>
            <input
              type="text"
              value={`₹${amount}`}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>



          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Submitting...
              </>
            ) : (
              <>
                <Check size={18} />
                Submit Payment for Verification
              </>
            )}
          </button>

          <p className="text-xs text-gray-500 text-center">
            Your payment will be verified by our admin team before plan activation.
          </p>
        </form>
      </div>
    </Modal>
  );
};

export default UPIPaymentFlow;
