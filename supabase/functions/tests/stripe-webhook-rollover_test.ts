/**
 * Regression tests for stripe-webhook rollover and upgrade proration logic.
 *
 * These test the PURE LOGIC extracted from the webhook, not the full HTTP flow.
 * Run with: deno test supabase/functions/tests/stripe-webhook-rollover_test.ts
 */
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

// ─── Extracted rollover carry logic ───
function calculateRolloverCarry(
  subscriptionCredits: number,
  lifetimeCredits: number,
  rolloverCap: number,
  creditsMonthly: number,
): { carry: number; newSubscriptionCredits: number; totalBalance: number } {
  // CRITICAL: carry is based ONLY on subscription_credits, NOT lifetime_credits
  const carry = Math.min(subscriptionCredits, rolloverCap);
  const newSubscriptionCredits = carry + creditsMonthly;
  const totalBalance = newSubscriptionCredits + lifetimeCredits;
  return { carry, newSubscriptionCredits, totalBalance };
}

// ─── Extracted upgrade delta logic ───
function calculateUpgradeDelta(
  oldCreditsMonthly: number,
  newCreditsMonthly: number,
  periodStartUnix: number,
  periodEndUnix: number,
  nowUnix: number,
): number {
  const remainingRatio = Math.max(0, Math.min(1, (periodEndUnix - nowUnix) / (periodEndUnix - periodStartUnix)));
  const maxDelta = newCreditsMonthly - oldCreditsMonthly;
  return Math.min(Math.ceil(maxDelta * remainingRatio), maxDelta);
}

// ════════════════════════════════════════════
// ROLLOVER TESTS
// ════════════════════════════════════════════

Deno.test("Rollover: lifetime=200, subscription=0, cap=20 → carry must be 0", () => {
  const result = calculateRolloverCarry(0, 200, 20, 80);
  assertEquals(result.carry, 0, "carry must NOT include lifetime credits");
  assertEquals(result.newSubscriptionCredits, 80, "new sub credits = 0 carry + 80 monthly");
  assertEquals(result.totalBalance, 280, "total = 80 sub + 200 lifetime");
});

Deno.test("Rollover: lifetime=0, subscription=50, cap=20 → carry=20", () => {
  const result = calculateRolloverCarry(50, 0, 20, 80);
  assertEquals(result.carry, 20);
  assertEquals(result.newSubscriptionCredits, 100);
  assertEquals(result.totalBalance, 100);
});

Deno.test("Rollover: lifetime=100, subscription=15, cap=20 → carry=15", () => {
  const result = calculateRolloverCarry(15, 100, 20, 80);
  assertEquals(result.carry, 15);
  assertEquals(result.newSubscriptionCredits, 95);
  assertEquals(result.totalBalance, 195);
});

Deno.test("Rollover: subscription=0, lifetime=0, cap=20 → carry=0", () => {
  const result = calculateRolloverCarry(0, 0, 20, 80);
  assertEquals(result.carry, 0);
  assertEquals(result.newSubscriptionCredits, 80);
  assertEquals(result.totalBalance, 80);
});

Deno.test("Rollover: premium sub=150, lifetime=50, cap=80 → carry=80", () => {
  const result = calculateRolloverCarry(150, 50, 80, 200);
  assertEquals(result.carry, 80);
  assertEquals(result.newSubscriptionCredits, 280);
  assertEquals(result.totalBalance, 330);
});

// ════════════════════════════════════════════
// UPGRADE PRORATION TESTS
// ════════════════════════════════════════════

Deno.test("Upgrade: half period remaining → delta = ceil(120 * 0.5) = 60", () => {
  const start = 1000;
  const end = 2000;
  const now = 1500; // exactly half
  const delta = calculateUpgradeDelta(80, 200, start, end, now);
  assertEquals(delta, 60);
});

Deno.test("Upgrade: full period remaining → delta capped at maxDelta=120", () => {
  const start = 1000;
  const end = 2000;
  const now = 1000; // beginning
  const delta = calculateUpgradeDelta(80, 200, start, end, now);
  assertEquals(delta, 120);
});

Deno.test("Upgrade: period ended → delta = 0", () => {
  const start = 1000;
  const end = 2000;
  const now = 2500; // past end
  const delta = calculateUpgradeDelta(80, 200, start, end, now);
  assertEquals(delta, 0);
});

Deno.test("Upgrade: 10% remaining → delta = ceil(120 * 0.1) = 12", () => {
  const start = 0;
  const end = 1000;
  const now = 900;
  const delta = calculateUpgradeDelta(80, 200, start, end, now);
  assertEquals(delta, 12);
});

Deno.test("Upgrade: same plan → delta = 0", () => {
  const delta = calculateUpgradeDelta(200, 200, 0, 1000, 500);
  assertEquals(delta, 0);
});
