import { withAuth } from "@/lib/auth";
import { ok, created } from "@/lib/http";
import { dateKeySchema, prisma, streakSchema, toDateKey, withStats } from "./_lib";

/** GET /api/streaks ?today=YYYY-MM-DD — rachas con sus estadísticas calculadas. */
export const GET = withAuth(async ({ searchParams }) => {
  const todayParam = searchParams.get("today");
  const today = todayParam ? dateKeySchema.parse(todayParam) : toDateKey();

  const rows = await prisma.streak.findMany({
    include: { checkins: { select: { date: true } } },
    orderBy: { createdAt: "asc" },
  });
  return ok(rows.map((r) => withStats(r, today)));
});

/** POST /api/streaks — { name, color?, mode: 'daily' | 'alternate' } */
export const POST = withAuth(async ({ req }) => {
  const data = streakSchema.parse(await req.json());
  const row = await prisma.streak.create({ data, include: { checkins: { select: { date: true } } } });
  return created(withStats(row, toDateKey()));
});
