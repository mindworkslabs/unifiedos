import "server-only";
import { notFound } from "next/navigation";
import { and, asc, eq, isNull } from "drizzle-orm";
import { deleteNode } from "@/app/actions/files";
import { backItem, type Block, type MenuItem } from "@/components/screen";
import { getDb } from "@/db";
import { nodes, type Node } from "@/db/schema";
import type { Access } from "./access";
import { headerFor } from "./screens";
import { isUuid } from "./slug";

/** Blocks for a folder listing (root when `folder` is null). */
export async function folderScreen(access: Access, folder: Node | null): Promise<{ blocks: Block[]; back: string }> {
  const { terminal, role } = access;
  const base = `/${terminal.slug}`;
  const db = await getDb();
  const children = await db
    .select({ id: nodes.id, kind: nodes.kind, title: nodes.title })
    .from(nodes)
    .where(and(eq(nodes.terminalId, terminal.id), folder ? eq(nodes.parentId, folder.id) : isNull(nodes.parentId)))
    .orderBy(asc(nodes.title));

  const folders = children.filter((c) => c.kind === "folder");
  const docs = children.filter((c) => c.kind === "document");
  const items: MenuItem[] = [
    ...folders.map((f) => ({ label: `> ${f.title}`, href: `${base}/files/${f.id}` })),
    ...docs.map((d) => ({ label: d.title, href: `${base}/files/${d.id}` })),
  ];
  if (role === "owner") {
    const parent = folder ? `?parent=${folder.id}` : "";
    items.push(
      { label: "[Create Document]", href: `${base}/files/new${parent}${parent ? "&" : "?"}kind=document` },
      { label: "[Create Folder]", href: `${base}/files/new${parent}${parent ? "&" : "?"}kind=folder` },
    );
    if (folder) {
      items.push(
        { label: "[Rename Folder]", href: `${base}/files/${folder.id}/rename` },
        {
          label: "[Delete Folder]",
          confirm: `Delete folder "${folder.title}" and everything in it?`,
          action: deleteNode.bind(null, terminal.slug, folder.id),
        },
      );
    }
  }
  const back = folder?.parentId ? `${base}/files/${folder.parentId}` : folder ? `${base}/files` : base;
  items.push(...backItem(terminal.firmware, back));

  const title = folder ? folder.title : "Personal Files";
  const blocks: Block[] = [...headerFor(access), { t: "line", text: title }, { t: "gap" }];
  if (!children.length) blocks.push({ t: "line", text: "No files found.", dim: true }, { t: "gap" });
  blocks.push({ t: "menu", items });
  return { blocks, back };
}

/** Load a node of this terminal by id, or 404. */
export async function getNodeOr404(terminalId: string, id: string) {
  if (!isUuid(id)) notFound();
  const db = await getDb();
  const [node] = await db
    .select()
    .from(nodes)
    .where(and(eq(nodes.id, id), eq(nodes.terminalId, terminalId)));
  if (!node) notFound();
  return node;
}
