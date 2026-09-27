import { redirect } from "next/navigation";
import { renameNode } from "@/app/actions/files";
import { PromptForm } from "@/components/PromptForm";
import { requireOwner } from "@/lib/access";
import { getNodeOr404 } from "@/lib/folders";
import { headerFor } from "@/lib/screens";

export default async function RenamePage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const access = await requireOwner(slug);
  const node = await getNodeOr404(access.terminal.id, id);
  if (!node) redirect(`/${access.terminal.slug}/files`);
  return (
    <PromptForm
      back={`/${access.terminal.slug}/files/${node.id}`}
      blocks={[...headerFor(access), { t: "line", text: `Rename "${node.title}"` }, { t: "gap" }]}
      fields={[{ name: "title", label: "NEW NAME:", initial: node.title, maxLength: 60 }]}
      submit={renameNode.bind(null, access.terminal.slug, node.id)}
    />
  );
}
