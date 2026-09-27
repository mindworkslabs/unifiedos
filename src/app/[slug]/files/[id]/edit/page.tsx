import { redirect } from "next/navigation";
import { DocEditor } from "@/components/DocEditor";
import { requireOwner } from "@/lib/access";
import { getNodeOr404 } from "@/lib/folders";

export const metadata = { title: "Edit" };

export default async function EditPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const access = await requireOwner(slug);
  const node = await getNodeOr404(access.terminal.id, id);
  const base = `/${access.terminal.slug}/files`;
  if (node.kind !== "document") redirect(`${base}/${node.id}`);
  return <DocEditor slug={access.terminal.slug} id={node.id} initialTitle={node.title} initialBody={node.body} exitTo={`${base}/${node.id}`} />;
}
