import React, { useState } from 'react';
import { StoragePlan, BillingCycle } from '../types';
import { Check, Smartphone } from 'lucide-react';
import Modal from './Modal';
import UPIPaymentFlow from './UPIPaymentFlow';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: StoragePlan;
  targetPlan: StoragePlan;
  userId: string;
  billingCycle?: BillingCycle;
  onSuccess: (transactionId: string) => void;
  onShowToast: (message: string, type: 'success' | 'error') => void;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  currentPlan,
  targetPlan,
  userId,
  billingCycle: initialBillingCycle,
  onSuccess,
  onShowToast
}) => {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(initialBillingCycle || 'monthly');
  const [showUPIPayment, setShowUPIPayment] = useState(false);

  const amount = billingCycle === 'annual' ? targetPlan.annualPrice : targetPlan.monthlyPrice;

  const handleUpgradeClick = () => {
    // Navigate to UPI payment flow
    setShowUPIPayment(true);
  };

  const handleUPIPaymentSubmitted = (transactionId: string) => {
    // Do NOT call onSuccess here because payment still needs verification by admin.
    // Inform user that payment was submitted and await verification.
    onShowToast('Payment submitted. Awaiting verification by admin.', 'success');
    setShowUPIPayment(false);
    onClose();
  };

  const handleUPIPaymentClose = () => {
    setShowUPIPayment(false);
  };

  if (showUPIPayment) {
    return (
      <UPIPaymentFlow
        isOpen={showUPIPayment}
        onClose={handleUPIPaymentClose}
        userId={userId}
        selectedPlan={targetPlan}
        billingCycle={billingCycle}
        onPaymentSubmitted={handleUPIPaymentSubmitted}
        onShowToast={onShowToast}
      />
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Upgrade to ${targetPlan.name}`}>
      <div className="space-y-6">
        {/* Plan Details */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900">{targetPlan.name}</h3>
          <p className="text-gray-600 mt-1">{targetPlan.storageGB} GB Storage</p>
          <ul className="mt-2 space-y-1">
            {targetPlan.features.map((feature, index) => (
              <li key={index} className="flex items-center text-sm text-gray-600">
                <Check className="w-4 h-4 text-green-500 mr-2" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Billing Cycle Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Billing Cycle
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="monthly"
                checked={billingCycle === 'monthly'}
                onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}
                className="mr-2"
              />
              <span className="text-sm">
                Monthly - ₹{targetPlan.monthlyPrice}
                {billingCycle === 'monthly' && (
                  <span className="text-green-600 font-medium ml-1">(Selected)</span>
                )}
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="annual"
                checked={billingCycle === 'annual'}
                onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}
                className="mr-2"
              />
              <span className="text-sm">
                Annual - ₹{targetPlan.annualPrice}
                {billingCycle === 'annual' && (
                  <span className="text-green-600 font-medium ml-1">(Selected)</span>
                )}
              </span>
            </label>
          </div>
        </div>

        {/* UPI Payment Info */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-start">
            <Smartphone className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-900">UPI Payment</h4>
              <p className="mt-1 text-sm text-blue-800">
                You'll be redirected to complete payment via UPI QR code. Admin verification required before plan upgrade.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Cancel
          </button>

          <button
            onClick={handleUpgradeClick}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Proceed to UPI Payment - ₹{amount}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default UpgradeModal;
