import "server-only";
import { aliasedTable, and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { messages, users } from "@/db/schema";
import { isUuid } from "./slug";

const sender = aliasedTable(users, "sender");
const recipient = aliasedTable(users, "recipient");

const columns = {
  id: messages.id,
  subject: messages.subject,
  body: messages.body,
  createdAt: messages.createdAt,
  readAt: messages.readAt,
  fromUserId: messages.fromUserId,
  toUserId: messages.toUserId,
  deletedByRecipient: messages.deletedByRecipient,
  deletedBySender: messages.deletedBySender,
  from: sender.username,
  to: recipient.username,
};

export async function listMail(userId: string, box: "inbox" | "sent") {
  const db = await getDb();
  return db
    .select(columns)
    .from(messages)
    .innerJoin(sender, eq(sender.id, messages.fromUserId))
    .innerJoin(recipient, eq(recipient.id, messages.toUserId))
    .where(
      box === "inbox"
        ? and(eq(messages.toUserId, userId), eq(messages.deletedByRecipient, false))
        : and(eq(messages.fromUserId, userId), eq(messages.deletedBySender, false)),
    )
    .orderBy(desc(messages.createdAt))
    .limit(200);
}

export async function getMail(userId: string, id: string) {
  if (!isUuid(id)) return null;
  const db = await getDb();
  const [m] = await db
    .select(columns)
    .from(messages)
    .innerJoin(sender, eq(sender.id, messages.fromUserId))
    .innerJoin(recipient, eq(recipient.id, messages.toUserId))
    .where(eq(messages.id, id));
  if (!m) return null;
  const visible =
    (m.toUserId === userId && !m.deletedByRecipient) || (m.fromUserId === userId && !m.deletedBySender);
  if (!visible) return null;
  return m;
}

export async function markRead(id: string) {
  const db = await getDb();
  await db.update(messages).set({ readAt: new Date() }).where(eq(messages.id, id));
}
