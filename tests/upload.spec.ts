import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
  global.URL.createObjectURL = () => 'blob://test';
});

describe('Upload enforcement', async () => {
  it('allows small uploads and blocks uploads exceeding quota', async () => {
    const { api } = await import('../services/supabaseService');

    // Register user
    await api.registerUser('test-up@example.com', 'Password123!', 'Test Up');
    const users = await api.getUsers();
    const user = users.find(u => u.email === 'test-up@example.com');
    expect(user).toBeDefined();
    const userId = user!.id;

    // Ensure default subscription free
    const sub = await api.getUserSubscription(userId);
    expect(sub.planId).toBe('free');

    // Small file (1 KB)
    const smallFile = { name: 'small.txt', type: 'text/plain', size: 1024 } as any;
    const uploaded = await api.uploadFile(userId, smallFile as any, null);
    expect(uploaded).toBeDefined();

    const subAfter = await api.getUserSubscription(userId);
    expect(subAfter.storageUsed).toBeGreaterThanOrEqual(1024);

    // Large file exceeding free plan limit (15 GB)
    const plans = await api.getPlans();
    const freePlan = plans.find(p => p.id === 'free')!;
    const allowedBytes = freePlan.storageGB * 1024 * 1024 * 1024;
    const largeSize = allowedBytes + 1024;
    const largeFile = { name: 'big.bin', type: 'application/octet-stream', size: largeSize } as any;

    let threw = false;
    try {
      await api.uploadFile(userId, largeFile as any, null);
    } catch (e: any) {
      threw = true;
      expect(e.message).toContain('Storage limit exceeded');
    }
    expect(threw).toBe(true);
  });
});
