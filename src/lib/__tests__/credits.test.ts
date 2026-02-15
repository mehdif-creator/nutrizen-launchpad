import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FEATURE_COSTS, type Feature } from '@/lib/credits';

// We mock the supabase client at module level so we can control RPC responses
const mockRpc = vi.fn();
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: () => mockGetUser() },
    rpc: (...args: any[]) => mockRpc(...args),
    from: (...args: any[]) => mockFrom(...args),
  },
}));

// Import AFTER mock setup
const { checkAndConsumeCredits, getCreditsBalance } = await import('@/lib/credits');

describe('FEATURE_COSTS', () => {
  it('defines expected feature costs', () => {
    expect(FEATURE_COSTS.swap).toBe(1);
    expect(FEATURE_COSTS.inspifrigo).toBe(1);
    expect(FEATURE_COSTS.scanrepas).toBe(1);
    expect(FEATURE_COSTS.substitution).toBe(5);
  });

  it('has no unknown features', () => {
    const validKeys: Feature[] = ['swap', 'inspifrigo', 'scanrepas', 'substitution'];
    expect(Object.keys(FEATURE_COSTS).sort()).toEqual(validKeys.sort());
  });
});

describe('checkAndConsumeCredits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns UNAUTHORIZED when no user session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await checkAndConsumeCredits('swap');

    expect(result.success).toBe(false);
    expect(result.error_code).toBe('UNAUTHORIZED');
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('calls RPC with correct params and returns result on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });
    mockRpc.mockResolvedValue({
      data: {
        success: true,
        current_balance: 9,
        new_balance: 8,
        consumed: 1,
      },
      error: null,
    });

    const result = await checkAndConsumeCredits('swap', 1);

    expect(mockRpc).toHaveBeenCalledWith('check_and_consume_credits', {
      p_user_id: 'user-123',
      p_feature: 'swap',
      p_cost: 1,
    });
    expect(result.success).toBe(true);
    expect(result.new_balance).toBe(8);
  });

  it('returns RPC_ERROR when Supabase RPC fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB down' } });

    const result = await checkAndConsumeCredits('inspifrigo');

    expect(result.success).toBe(false);
    expect(result.error_code).toBe('RPC_ERROR');
  });

  it('uses custom cost parameter', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });
    mockRpc.mockResolvedValue({
      data: { success: true, new_balance: 5, consumed: 5 },
      error: null,
    });

    await checkAndConsumeCredits('substitution', 5);

    expect(mockRpc).toHaveBeenCalledWith('check_and_consume_credits', {
      p_user_id: 'user-123',
      p_feature: 'substitution',
      p_cost: 5,
    });
  });
});

describe('getCreditsBalance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns zero balances when wallet does not exist (PGRST116)', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({ data: null, error: { code: 'PGRST116' } }),
        }),
      }),
    });

    const result = await getCreditsBalance('user-new');

    expect(result).toEqual({ subscription: 0, lifetime: 0, total: 0 });
  });

  it('returns correct totals from wallet data', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({
              data: { subscription_credits: 10, lifetime_credits: 5 },
              error: null,
            }),
        }),
      }),
    });

    const result = await getCreditsBalance('user-123');

    expect(result).toEqual({ subscription: 10, lifetime: 5, total: 15 });
  });

  it('returns null on unexpected DB error', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({ data: null, error: { code: 'UNEXPECTED', message: 'fail' } }),
        }),
      }),
    });

    const result = await getCreditsBalance('user-err');

    expect(result).toBeNull();
  });
});
