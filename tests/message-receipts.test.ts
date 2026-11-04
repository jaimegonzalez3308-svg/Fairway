import { test } from "node:test";
import assert from "node:assert/strict";
import { incomingWatermarks, messageReceipt } from "../lib/message-receipts";
import type { Conversation, Message } from "../lib/use-fairway";
const before = "2026-11-03T12:00:00Z";
const sent = "2026-11-03T12:01:00Z";
const after = "2026-11-03T12:02:00Z";
const message: Message = {
  id: "m1",
  conversation_id: "chat",
  sender_id: "sender",
  body: "Hola",
  created_at: sent,
};
function conversation(
  members: Conversation["conversation_members"],
): Conversation {
  return {
    id: "chat",
    match_id: "match",
    game_id: null,
    conversation_members: [
      { user_id: "sender", last_read_at: after },
      ...members,
    ],
  };
}
test("saved messages are sent until the recipient receives them, then delivered and seen", () => {
  assert.equal(
    messageReceipt(
      message,
      conversation([{ user_id: "peer", last_read_at: before }]),
    ),
    "sent",
  );
  assert.equal(
    messageReceipt(
      message,
      conversation([
        { user_id: "peer", last_read_at: before, last_delivered_at: sent },
      ]),
    ),
    "delivered",
  );
  assert.equal(
    messageReceipt(
      message,
      conversation([{ user_id: "peer", last_read_at: sent }]),
    ),
    "seen",
  );
});
test("group receipts require every other member; reading also acknowledges delivery", () => {
  const reader = { user_id: "one", last_read_at: after };
  assert.equal(
    messageReceipt(
      message,
      conversation([reader, { user_id: "two", last_read_at: before }]),
    ),
    "sent",
  );
  assert.equal(
    messageReceipt(
      message,
      conversation([
        reader,
        { user_id: "two", last_read_at: before, last_delivered_at: after },
      ]),
    ),
    "delivered",
  );
  assert.equal(
    messageReceipt(
      message,
      conversation([reader, { user_id: "two", last_read_at: after }]),
    ),
    "seen",
  );
});
test("missing recipients and invalid timestamps never fabricate delivery or seen", () => {
  assert.equal(messageReceipt(message, conversation([])), "sent");
  assert.equal(
    messageReceipt(
      message,
      conversation([
        { user_id: "peer", last_read_at: "bad", last_delivered_at: "bad" },
      ]),
    ),
    "sent",
  );
  assert.equal(
    messageReceipt(
      { ...message, created_at: "bad" },
      conversation([{ user_id: "peer", last_read_at: after }]),
    ),
    "sent",
  );
});
test("delivery watermarks use received server timestamps, ignoring own messages and arrival order", () => {
  const latest = incomingWatermarks(
    [
      { ...message, sender_id: "peer", created_at: after },
      { ...message, sender_id: "peer", created_at: before },
      { ...message, sender_id: "sender", created_at: "2027-01-01T00:00:00Z" },
      {
        ...message,
        sender_id: "peer",
        conversation_id: "other",
        created_at: sent,
      },
      {
        ...message,
        sender_id: "peer",
        conversation_id: "bad",
        created_at: "bad",
      },
    ],
    "sender",
  );
  assert.deepEqual(
    [...latest.entries()],
    [
      ["chat", after],
      ["other", sent],
    ],
  );
});
