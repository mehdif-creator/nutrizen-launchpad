/**
 * stripe-webhook idempotency test
 *
 * Verifies that the webhook handler rejects duplicate Stripe event IDs
 * by checking the stripe_events table for prior processing.
 *
 * This test exercises the idempotency logic extracted from the handler,
 * mocking DB calls to avoid needing a live Stripe signature.
 */
import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

// ---------- Minimal mock Supabase client ----------

function createMockSupabaseClient(existingEventIds: Set<string>) {
  const insertedEvents: Array<{ event_id: string; event_type: string }> = [];

  return {
    client: {
      from(table: string) {
        if (table === "stripe_events") {
          return {
            select(_cols: string) {
              return {
                eq(_col: string, value: string) {
                  return {
                    maybeSingle() {
                      const found = existingEventIds.has(value);
                      return Promise.resolve({
                        data: found ? { id: value } : null,
                        error: null,
                      });
                    },
                  };
                },
              };
            },
            insert(row: { event_id: string; event_type: string }) {
              insertedEvents.push(row);
              return Promise.resolve({ error: null });
            },
          };
        }
        // Default stub for other tables
        return {
          select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
          insert: () => Promise.resolve({ error: null }),
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      },
    },
    insertedEvents,
  };
}

// ---------- Extracted idempotency check (mirrors handler logic) ----------

async function checkIdempotency(
  supabaseAdmin: ReturnType<typeof createMockSupabaseClient>["client"],
  eventId: string,
  eventType: string,
): Promise<{ skipped: boolean }> {
  const { data: existingEvent } = await supabaseAdmin
    .from("stripe_events")
    .select("id")
    .eq("event_id", eventId)
    .maybeSingle();

  if (existingEvent) {
    return { skipped: true };
  }

  await supabaseAdmin.from("stripe_events").insert({
    event_id: eventId,
    event_type: eventType,
  });

  return { skipped: false };
}

// ---------- Tests ----------

Deno.test("First event processing: records event and returns skipped=false", async () => {
  const { client, insertedEvents } = createMockSupabaseClient(new Set());

  const result = await checkIdempotency(client, "evt_first_123", "checkout.session.completed");

  assertEquals(result.skipped, false);
  assertEquals(insertedEvents.length, 1);
  assertEquals(insertedEvents[0].event_id, "evt_first_123");
  assertEquals(insertedEvents[0].event_type, "checkout.session.completed");
});

Deno.test("Duplicate event: returns skipped=true without inserting again", async () => {
  const existingIds = new Set(["evt_duplicate_456"]);
  const { client, insertedEvents } = createMockSupabaseClient(existingIds);

  const result = await checkIdempotency(client, "evt_duplicate_456", "checkout.session.completed");

  assertEquals(result.skipped, true);
  assertEquals(insertedEvents.length, 0); // No new insert
});

Deno.test("Different event IDs are processed independently", async () => {
  const existingIds = new Set(["evt_old_789"]);
  const { client, insertedEvents } = createMockSupabaseClient(existingIds);

  const r1 = await checkIdempotency(client, "evt_old_789", "invoice.payment_succeeded");
  const r2 = await checkIdempotency(client, "evt_new_101", "invoice.payment_succeeded");

  assertEquals(r1.skipped, true);
  assertEquals(r2.skipped, false);
  assertEquals(insertedEvents.length, 1);
  assertEquals(insertedEvents[0].event_id, "evt_new_101");
});
