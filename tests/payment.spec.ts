import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  // Reset localStorage and modules between tests
  localStorage.clear();
  vi.resetModules();
  // stub URL.createObjectURL used by upload mock
  global.URL.createObjectURL = () => 'blob://test';
});

describe('Payment lifecycle', async () => {
  it('creates intent, submits UTR, and verifies to upgrade subscription', async () => {
    const { api } = await import('../services/supabaseService');

    // register user
    await api.registerUser('test-pay@example.com', 'Password123!', 'Test Pay');
    const users = await api.getUsers();
    const user = users.find(u => u.email === 'test-pay@example.com');
    expect(user).toBeDefined();
    const userId = user!.id;

    // Ensure subscription initialized
    const sub = await api.getUserSubscription(userId);
    expect(sub.planId).toBe('free');

    // Create payment intent for 'basic' monthly
    const planId = 'basic';
    const plans = await api.getPlans();
    const plan = plans.find(p => p.id === planId);
    expect(plan).toBeDefined();
    const amount = plan!.monthlyPrice;

    const intent = await api.createUPIPaymentIntent(userId, planId, 'monthly', amount);
    expect(intent).toBeDefined();

    // Generate QR (should return qrCodeUrl and upiString)
    const qr = await api.generateUPIQR(intent.id);
    expect(qr.qrCodeUrl).toBeTruthy();
    expect(qr.upiString).toContain('upi://pay');

    // Submit UPI confirmation
    const utr = `UTR${Date.now()}`;
    const submit = await api.submitUPIPaymentConfirmation(intent.id, utr, 'gpay');
    expect(submit.success).toBe(true);

    // Payment should now be pending with UTR stored
    const payments = await api.getPayments(userId);
    const p = payments.find((x: any) => x.id === intent.id || x.transactionId === intent.id);
    expect(p).toBeDefined();
    expect(p.upiTransactionId).toBe(utr);
    expect(p.status).toBe('pending');

    // Simulate admin verification
    const verify = await api.updatePaymentStatus(p.transactionId || p.id, 'verified', 'Test verify');
    expect(verify.success).toBe(true);

    // Subscription must be upgraded to planId
    const sub2 = await api.getUserSubscription(userId);
    expect(sub2.planId).toBe(planId);
  });
});
