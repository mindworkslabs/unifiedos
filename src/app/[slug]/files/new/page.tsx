import { createNode } from "@/app/actions/files";
import { PromptForm } from "@/components/PromptForm";
import { requireOwner } from "@/lib/access";
import { getNodeOr404 } from "@/lib/folders";
import { headerFor } from "@/lib/screens";

export default async function NewNodePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ parent?: string; kind?: string }>;
}) {
  const { slug } = await params;
  const { parent, kind: rawKind } = await searchParams;
  const access = await requireOwner(slug);
  const kind = rawKind === "folder" ? "folder" : "document";
  const folder = parent ? await getNodeOr404(access.terminal.id, parent) : null;
  const base = `/${access.terminal.slug}/files`;
  return (
    <PromptForm
      back={folder ? `${base}/${folder.id}` : base}
      blocks={[
        ...headerFor(access),
        { t: "line", text: kind === "folder" ? "Create Folder" : "Create Document" },
        { t: "line", text: `Location: ${folder ? folder.title : "Personal Files"}`, dim: true },
        { t: "gap" },
      ]}
      fields={[{ name: "title", label: kind === "folder" ? "FOLDER NAME:" : "DOCUMENT TITLE:", maxLength: 60 }]}
      submit={createNode.bind(null, access.terminal.slug, folder?.id ?? null, kind)}
    />
  );
}
