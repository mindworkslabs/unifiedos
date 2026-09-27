import { deleteNode } from "@/app/actions/files";
import { backItem, type Block, type MenuItem } from "@/components/screen";
import { Terminal } from "@/components/Terminal";
import { logEvent, requireRead } from "@/lib/access";
import { folderScreen, getNodeOr404 } from "@/lib/folders";
import { formatStamp, headerFor } from "@/lib/screens";

export default async function FileView({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const access = await requireRead(slug);
  const { terminal, role } = access;
  const node = await getNodeOr404(terminal.id, id);
  const base = `/${terminal.slug}`;

  if (node.kind === "folder") {
    const { blocks, back } = await folderScreen(access, node);
    return <Terminal blocks={blocks} back={back} />;
  }

  if (role === "intruder") await logEvent(terminal.id, "intruder", "READ FILE", node.title);

  const back = node.parentId ? `${base}/files/${node.parentId}` : `${base}/files`;
  const items: MenuItem[] = [];
  if (role === "owner") {
    items.push(
      { label: "[Edit]", href: `${base}/files/${node.id}/edit` },
      { label: "[Rename]", href: `${base}/files/${node.id}/rename` },
      { label: "[Delete]", confirm: `Delete "${node.title}"?`, action: deleteNode.bind(null, terminal.slug, node.id) },
    );
  }
  items.push(...backItem(terminal.firmware, back));

  const blocks: Block[] = [
    ...headerFor(access),
    { t: "line", text: node.title },
    { t: "line", text: `Last modified ${formatStamp(node.updatedAt)}`, dim: true },
    { t: "gap" },
    { t: "text", text: node.body || "(empty)" },
    { t: "gap" },
    { t: "menu", items },
  ];
  return <Terminal blocks={blocks} back={back} />;
}
