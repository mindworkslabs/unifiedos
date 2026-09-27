"use server";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { nodes } from "@/db/schema";
import { logEvent, requireOwner } from "@/lib/access";
import { isUuid } from "@/lib/slug";
import type { PromptResult } from "@/components/PromptForm";
import type { ActionResult } from "@/components/screen";

const MAX_TITLE = 60;
const MAX_BODY = 100_000;

async function ownedNode(terminalId: string, id: string) {
  if (!isUuid(id)) return null;
  const db = await getDb();
  const [node] = await db
    .select()
    .from(nodes)
    .where(and(eq(nodes.id, id), eq(nodes.terminalId, terminalId)));
  return node ?? null;
}

function cleanTitle(t: string) {
  return t.replace(/\s+/g, " ").trim().slice(0, MAX_TITLE);
}

export async function createNode(
  slug: string,
  parentId: string | null,
  kind: "folder" | "document",
  values: Record<string, string>,
): Promise<PromptResult> {
  const { terminal } = await requireOwner(slug);
  if (kind !== "folder" && kind !== "document") return { error: "INVALID FILE TYPE" };
  const title = cleanTitle(values.title ?? "");
  if (!title) return { error: "NAME REQUIRED", field: "title" };
  if (parentId) {
    const parent = await ownedNode(terminal.id, parentId);
    if (!parent || parent.kind !== "folder") return { error: "FOLDER NOT FOUND" };
  }
  const db = await getDb();
  const [node] = await db.insert(nodes).values({ terminalId: terminal.id, parentId, kind, title }).returning();
  await logEvent(terminal.id, "owner", kind === "folder" ? "FOLDER CREATED" : "FILE CREATED", title);
  return { redirect: kind === "document" ? `/${terminal.slug}/files/${node.id}/edit` : `/${terminal.slug}/files/${node.id}` };
}

export async function saveDocument(slug: string, id: string, title: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const { terminal } = await requireOwner(slug);
  if (typeof title !== "string" || typeof body !== "string") return { ok: false, error: "INVALID INPUT" };
  const node = await ownedNode(terminal.id, id);
  if (!node || node.kind !== "document") return { ok: false, error: "FILE NOT FOUND" };
  if (body.length > MAX_BODY) return { ok: false, error: "FILE TOO LARGE FOR TAPE STORAGE" };
  const db = await getDb();
  await db
    .update(nodes)
    .set({ title: cleanTitle(title) || node.title, body, updatedAt: new Date() })
    .where(eq(nodes.id, id));
  return { ok: true };
}

export async function renameNode(slug: string, id: string, values: Record<string, string>): Promise<PromptResult> {
  const { terminal } = await requireOwner(slug);
  const node = await ownedNode(terminal.id, id);
  if (!node) return { error: "FILE NOT FOUND" };
  const title = cleanTitle(values.title ?? "");
  if (!title) return { error: "NAME REQUIRED", field: "title" };
  const db = await getDb();
  await db.update(nodes).set({ title, updatedAt: new Date() }).where(eq(nodes.id, id));
  return { redirect: `/${terminal.slug}/files/${id}` };
}

export async function deleteNode(slug: string, id: string): Promise<ActionResult> {
  const { terminal } = await requireOwner(slug);
  const node = await ownedNode(terminal.id, id);
  if (!node) return { response: "FILE NOT FOUND" };
  const db = await getDb();
  await db.delete(nodes).where(eq(nodes.id, id));
  await logEvent(terminal.id, "owner", node.kind === "folder" ? "FOLDER DELETED" : "FILE DELETED", node.title);
  return { redirect: node.parentId ? `/${terminal.slug}/files/${node.parentId}` : `/${terminal.slug}/files` };
}
