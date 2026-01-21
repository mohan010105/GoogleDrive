import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { api } from '../services/supabaseService';
import { PaymentIntent, PaymentStatus, PaymentContextType, Payment, BillingCycle } from '../types';

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

interface PaymentProviderProps {
  children: ReactNode;
}

export const PaymentProvider: React.FC<PaymentProviderProps> = ({ children }) => {
  // Load persisted payment state from localStorage
  const loadPersistedState = () => {
    try {
      const persisted = localStorage.getItem('payment_state');
      if (persisted) {
        const state = JSON.parse(persisted);
        // Only restore if the state is recent (within last 30 minutes)
        const stateAge = Date.now() - state.timestamp;
        if (stateAge < 30 * 60 * 1000) {
          return state;
        }
      }
    } catch (e) {
      console.warn('Failed to load persisted payment state:', e);
    }
    return null;
  };

  const persistedState = loadPersistedState();
  const [currentIntent, setCurrentIntent] = useState<PaymentIntent | null>(persistedState?.currentIntent || null);
  const [status, setStatus] = useState<PaymentStatus>(persistedState?.status || 'idle');
  const [error, setError] = useState<string | null>(persistedState?.error || null);
  const [retryCount, setRetryCount] = useState<number>(persistedState?.retryCount || 0);
  const maxRetries = 3;

  const createUPIPaymentIntent = useCallback(async (
    userId: string,
    planId: string,
    billingCycle: BillingCycle,
    amount: number
  ): Promise<PaymentIntent> => {
    try {
      setStatus('creating_intent');
      setError(null);

      const intent = await api.createUPIPaymentIntent(userId, planId, billingCycle, amount);
      setCurrentIntent(intent);
      setStatus('idle');

      return intent;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create UPI payment intent';
      setError(errorMessage);
      setStatus('failed');
      throw err;
    }
  }, []);

  const processPayment = useCallback(async (
    intentId: string,
    paymentMethod: Payment['paymentMethod']
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> => {
    try {
      setStatus('processing');
      setError(null);

      // STEP 3: PAYMENT PROCESSING - Async processing with timeout
      const result = await Promise.race([
        api.processPayment(intentId, paymentMethod),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Payment timeout')), 30000) // 30 second timeout
        )
      ]);

      if (result.success) {
        setStatus('verifying');
        // Update current intent status to processing
        if (currentIntent) {
          setCurrentIntent({
            ...currentIntent,
            status: 'processing',
            transactionId: result.transactionId
          });
        }
        return result;
      } else {
        setStatus('failed');
        setError(result.error || 'Payment failed');
        return result;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment processing failed';
      setError(errorMessage);
      setStatus('failed');
      return { success: false, error: errorMessage };
    }
  }, [currentIntent]);

  const verifyPayment = useCallback(async (transactionId: string): Promise<{ verified: boolean; error?: string }> => {
    try {
      setStatus('verifying');
      setError(null);

      const result = await api.verifyPayment(transactionId);

      if (result.verified) {
        setStatus('completed');
      } else {
        setStatus('failed');
        setError(result.error || 'Payment verification failed');
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment verification failed';
      setError(errorMessage);
      setStatus('failed');
      return { verified: false, error: errorMessage };
    }
  }, []);

  const upgradePlan = useCallback(async (
    userId: string,
    planId: string,
    billingCycle: BillingCycle,
    transactionId: string
  ): Promise<void> => {
    try {
      // Verify payment first
      const verification = await verifyPayment(transactionId);
      if (!verification.verified) {
        throw new Error(verification.error || 'Payment verification failed');
      }

      // The subscription update is already handled in processPayment
      // This method can be used for additional post-payment logic if needed

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Plan upgrade failed';
      setError(errorMessage);
      setStatus('failed');
      throw err;
    }
  }, [verifyPayment]);

  const retryPayment = useCallback(async (
    intentId: string,
    paymentMethod: Payment['paymentMethod']
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> => {
    if (retryCount >= maxRetries) {
      return { success: false, error: 'Maximum retry attempts exceeded' };
    }

    setRetryCount(prev => prev + 1);

    // Exponential backoff: 1s, 2s, 4s
    const delay = Math.pow(2, retryCount) * 1000;
    await new Promise(resolve => setTimeout(resolve, delay));

    return processPayment(intentId, paymentMethod);
  }, [retryCount, maxRetries, processPayment]);

  const resetPayment = useCallback(() => {
    setCurrentIntent(null);
    setStatus('idle');
    setError(null);
    setRetryCount(0);
  }, []);

  const value: PaymentContextType = {
    currentIntent,
    status,
    error,
    retryCount,
    maxRetries,
    createUPIPaymentIntent,
    processPayment,
    retryPayment,
    verifyPayment,
    upgradePlan,
    resetPayment
  };

  return (
    <PaymentContext.Provider value={value}>
      {children}
    </PaymentContext.Provider>
  );
};

export const usePayment = (): PaymentContextType => {
  const context = useContext(PaymentContext);
  if (context === undefined) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  return context;
};
