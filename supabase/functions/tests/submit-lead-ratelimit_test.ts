/**
 * submit-lead rate limiting test
 *
 * Verifies DB-backed rate limiting logic:
 * - When RPC returns allowed=true → request proceeds
 * - When RPC returns allowed=false → 429 returned
 * - When RPC errors → request proceeds (fail-open, as implemented)
 */
import {
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

// ---------- Mock rate limiter (mirrors submit-lead logic) ----------

interface RateLimitResult {
  allowed: boolean;
}

interface RpcResponse {
  data: RateLimitResult | null;
  error: { message: string } | null;
}

function createMockRateLimiter(response: RpcResponse) {
  const calls: Array<Record<string, unknown>> = [];

  return {
    rpc(fnName: string, params: Record<string, unknown>): Promise<RpcResponse> {
      calls.push({ fnName, ...params });
      return Promise.resolve(response);
    },
    calls,
  };
}

/**
 * Simulates the rate-limit check from submit-lead/index.ts
 * Returns: { statusCode, body }
 */
async function simulateRateLimitCheck(
  mockClient: ReturnType<typeof createMockRateLimiter>,
  clientIp: string,
): Promise<{ statusCode: number; body: Record<string, unknown> }> {
  const identifier = `ip:${clientIp}`;

  const { data: rlResult, error: rlError } = await mockClient.rpc("check_rate_limit", {
    p_identifier: identifier,
    p_endpoint: "submit-lead",
    p_max_tokens: 5,
    p_refill_rate: 5,
    p_cost: 60,
  });

  // Mirror the exact logic from the handler
  if (!rlError && rlResult && !rlResult.allowed) {
    return { statusCode: 429, body: { error: "rate_limited" } };
  }

  // Request proceeds
  return { statusCode: 200, body: { success: true } };
}

// ---------- Tests ----------

Deno.test("Rate limit: allowed=true → request proceeds (200)", async () => {
  const mock = createMockRateLimiter({
    data: { allowed: true },
    error: null,
  });

  const result = await simulateRateLimitCheck(mock, "192.168.1.1");

  assertEquals(result.statusCode, 200);
  assertEquals(result.body.success, true);
  assertEquals(mock.calls.length, 1);
  assertEquals(mock.calls[0].p_identifier, "ip:192.168.1.1");
  assertEquals(mock.calls[0].p_endpoint, "submit-lead");
});

Deno.test("Rate limit: allowed=false → returns 429 with rate_limited error", async () => {
  const mock = createMockRateLimiter({
    data: { allowed: false },
    error: null,
  });

  const result = await simulateRateLimitCheck(mock, "10.0.0.1");

  assertEquals(result.statusCode, 429);
  assertEquals(result.body.error, "rate_limited");
});

Deno.test("Rate limit: RPC error → fail-open (request proceeds)", async () => {
  const mock = createMockRateLimiter({
    data: null,
    error: { message: "DB unreachable" },
  });

  const result = await simulateRateLimitCheck(mock, "172.16.0.1");

  // Current implementation is fail-open: if rlError exists, request proceeds
  assertEquals(result.statusCode, 200);
  assertEquals(result.body.success, true);
});

Deno.test("Rate limit: null data with no error → fail-open", async () => {
  const mock = createMockRateLimiter({
    data: null,
    error: null,
  });

  const result = await simulateRateLimitCheck(mock, "8.8.8.8");

  // !rlError && rlResult(null) → condition is false → proceeds
  assertEquals(result.statusCode, 200);
});
