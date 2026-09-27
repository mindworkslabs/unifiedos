import { Terminal } from "@/components/Terminal";
import { requireRead } from "@/lib/access";
import { folderScreen } from "@/lib/folders";

export const metadata = { title: "Personal Files" };

export default async function FilesRoot({ params }: { params: Promise<{ slug: string }> }) {
  const access = await requireRead((await params).slug);
  const { blocks, back } = await folderScreen(access, null);
  return <Terminal blocks={blocks} back={back} />;
}
