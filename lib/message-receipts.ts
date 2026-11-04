import type { Conversation, Message } from "./use-fairway";

function covers(watermark: string | null | undefined, createdAt: string) {
  const value = Date.parse(watermark || "");
  const created = Date.parse(createdAt);
  return Number.isFinite(value) && Number.isFinite(created) && value >= created;
}

/** Saved on the server, received by every recipient, or viewed by everyone. */
export function messageReceipt(message: Message, conversation: Conversation) {
  const recipients = conversation.conversation_members.filter(
    (member) => member.user_id !== message.sender_id,
  );
  if (!recipients.length) return "sent";
  if (
    recipients.every((member) =>
      covers(member.last_read_at, message.created_at),
    )
  )
    return "seen";
  if (
    recipients.every(
      (member) =>
        covers(member.last_delivered_at, message.created_at) ||
        covers(member.last_read_at, message.created_at),
    )
  )
    return "delivered";
  return "sent";
}

export function incomingWatermarks(messages: Message[], userId: string) {
  const latest = new Map<string, string>();
  for (const message of messages) {
    if (
      message.sender_id === userId ||
      !Number.isFinite(Date.parse(message.created_at))
    )
      continue;
    const previous = latest.get(message.conversation_id);
    if (!previous || Date.parse(message.created_at) > Date.parse(previous))
      latest.set(message.conversation_id, message.created_at);
  }
  return latest;
}

export const receiptLabels = {
  sent: "Enviado",
  delivered: "Entregado",
  seen: "Visto",
};
