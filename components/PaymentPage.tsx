import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { StoragePlan, BillingCycle, UserProfile } from '../types';
import { ArrowLeft, CreditCard } from 'lucide-react';
import UPIPaymentFlow from './UPIPaymentFlow';
import { api } from '../services/supabaseService';

const PaymentPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<StoragePlan | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [loading, setLoading] = useState(true);
  const [showUPIPayment, setShowUPIPayment] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [polling, setPolling] = useState(false);
  const [successPayment, setSuccessPayment] = useState<{ planName: string; amount: number; billingCycle: BillingCycle; transactionId: string } | null>(null);

  useEffect(() => {
    initializePaymentPage();
  }, []);

  const initializePaymentPage = async () => {
    try {
      // Get user from localStorage
      const storedUser = localStorage.getItem('cloud_drive_current_user');
      if (!storedUser) {
        navigate('/');
        return;
      }

      const userData = JSON.parse(storedUser);
      setUser(userData);

      // Get plan data from URL params (planId required)
      const planId = searchParams.get('planId');
      const cycle = (searchParams.get('billingCycle') as BillingCycle) || 'monthly';

      if (!planId) {
        showToast('Invalid payment parameters', 'error');
        navigate('/pricing');
        return;
      }

      // Get plan details and determine amount server-side
      const plans = await api.getPlans();
      const plan = plans.find(p => p.id === planId);

      if (!plan) {
        showToast('Plan not found', 'error');
        navigate('/pricing');
        return;
      }

      setSelectedPlan(plan);
      setBillingCycle(cycle || 'monthly');
      // Do NOT auto-open payment flow. Wait for explicit user action (Pay Now).
      setShowUPIPayment(false);
    } catch (error) {
      console.error('Failed to initialize payment page:', error);
      showToast('Failed to load payment page', 'error');
      navigate('/pricing');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    // Simple toast implementation
    alert(`${type.toUpperCase()}: ${message}`);
  };

  const handlePaymentSubmitted = (transactionId: string) => {
    // Payment confirmation has been submitted; do not upgrade here.
    // Show a pending message and keep user on the payment page.
    setShowUPIPayment(false);
    showToast('Payment submitted. Awaiting verification by admin.', 'success');
    // Optionally refresh status or show pending UI here.
    // Start polling for payment verification
    setPolling(true);
  };

  const handleClosePayment = () => {
    // Close payment flow but remain on the payment page
    setShowUPIPayment(false);
    // Start polling to detect any submitted payments awaiting verification
    setPolling(true);
  };

  // Poll payments for this user while polling=true
  useEffect(() => {
    let mounted = true;
    let timer: any = null;
    const poll = async () => {
      if (!user) return;
      try {
        const res = await api.getPayments(user.id);
        if (!mounted) return;
        setPayments(res || []);

        // Look for completed payment
        const completed = (res || []).find((p: any) => p.status === 'verified');
        if (completed) {
          setSuccessPayment({
            planName: completed.planId,
            amount: completed.amount,
            billingCycle: completed.billingCycle || 'monthly',
            transactionId: completed.transactionId || completed.id || ''
          });
          setPolling(false);
          return;
        }
      } catch (err) {
        console.error('Payment polling failed', err);
      }
      if (mounted && polling) {
        timer = setTimeout(poll, 5000);
      }
    };

    if (polling) poll();

    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [polling, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || !selectedPlan) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Invalid payment session</p>
          <button
            onClick={() => navigate('/pricing')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Return to Pricing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate('/pricing')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="font-medium">Back to Pricing</span>
            </button>
            <div className="flex items-center gap-2">
              <CreditCard className="text-blue-600" size={24} />
              <h1 className="text-xl font-semibold text-gray-900">Complete Payment</h1>
            </div>
            <div className="w-24"></div> {/* Spacer */}
          </div>
        </div>
      </div>

      {/* Payment Flow */}
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-3">Confirm Payment</h2>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-medium">{selectedPlan.name}</p>
              <p className="text-sm text-gray-600">{selectedPlan.storageGB} GB • {billingCycle === 'annual' ? 'Annual' : 'Monthly'}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">₹{billingCycle === 'annual' ? selectedPlan.annualPrice : selectedPlan.monthlyPrice}</p>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-4">Review the plan details. Payment will be initiated only when you click <strong>Pay Now</strong>. Your payment will be verified by the admin before the plan is upgraded.</p>

          <div className="flex gap-3">
            <button
              onClick={() => setShowUPIPayment(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Pay Now
            </button>
            <button
              onClick={() => navigate('/pricing')}
              className="bg-gray-100 px-4 py-2 rounded-lg"
            >
              Back to Plans
            </button>
          </div>

          {showUPIPayment && (
            <UPIPaymentFlow
              isOpen={showUPIPayment}
              onClose={handleClosePayment}
              userId={user.id}
              selectedPlan={selectedPlan}
              billingCycle={billingCycle}
              onPaymentSubmitted={handlePaymentSubmitted}
              onShowToast={showToast}
            />
          )}
          {/* Pending status UI */}
          {polling && payments.length > 0 && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="font-medium text-yellow-800">Payment pending verification</p>
              <p className="text-sm text-yellow-700">We detected a submitted payment. Verification may take a few minutes.</p>
              <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
                {payments.filter(p => p.status === 'pending').map(p => (
                  <li key={p.transactionId || p.id}>Transaction: {p.transactionId || p.id} — Amount: ₹{p.amount}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Payment success UI when verification completes */}
          {successPayment && (
            <div className="mt-6">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h3 className="text-lg font-semibold">Payment Verified</h3>
                <p className="text-sm text-gray-700">Transaction {successPayment.transactionId} confirmed. Your plan will be upgraded shortly.</p>
                <div className="mt-4">
                  <button onClick={() => navigate('/')} className="bg-blue-600 text-white px-4 py-2 rounded-lg">Continue to Drive</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
