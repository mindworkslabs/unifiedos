import { redirect } from "next/navigation";
import { HackScreen } from "@/components/HackScreen";
import { getAccess, getLockout } from "@/lib/access";
import { toPublic } from "@/lib/hack/engine";
import { loadOrCreateBoard, recentSolvedBoard } from "@/lib/hack/server";
import { getVisitorId } from "@/lib/session";

export const metadata = { title: "Termlink" };
export const dynamic = "force-dynamic";

export default async function HackPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const access = await getAccess(slug);
  const base = `/${access.terminal.slug}`;
  const visitorId = await getVisitorId();
  if (access.role === "intruder") {
    const solved = await recentSolvedBoard(access.terminal.id, visitorId);
    if (solved) return <HackScreen slug={access.terminal.slug} boardId={solved.id} initial={toPublic(solved.state)} />;
  }
  if (access.role) redirect(base);
  if (await getLockout(access.terminal.id)) redirect(base);
  const board = await loadOrCreateBoard(access.terminal, visitorId);
  return <HackScreen slug={access.terminal.slug} boardId={board.id} initial={toPublic(board.state)} />;
}
