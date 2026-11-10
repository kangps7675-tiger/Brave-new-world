/**
 * 하단 기사에 붙는 반응 수.
 * surprised 놀랐어요, interested 흥미로워요, more 더 보고 싶어요.
 * 기기·기사·반응마다 한 번. 다시 누르면 빠진다. 등급과 무관하다.
 */
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { newsArticleReactions } from "@/db/schema";

export const NEWS_REACTIONS = ["surprised", "interested", "more"] as const;
export type NewsReaction = (typeof NEWS_REACTIONS)[number];

export type ReactionCounts = Record<NewsReaction, number>;

const EMPTY: ReactionCounts = { surprised: 0, interested: 0, more: 0 };

const ARTICLE_ID = /^[A-Za-z0-9_-]{4,80}$/;

export function isNewsReaction(value: string): value is NewsReaction {
  return (NEWS_REACTIONS as readonly string[]).includes(value);
}

export function isArticleId(value: string): boolean {
  return ARTICLE_ID.test(value);
}

let tableReady: Promise<void> | null = null;

async function ensureTable(): Promise<void> {
  if (!tableReady) {
    tableReady = (async () => {
      const db = await getDb();
      await db.run(
        sql.raw(`CREATE TABLE IF NOT EXISTS news_article_reactions (
          article_id TEXT NOT NULL,
          device_id TEXT NOT NULL,
          reaction TEXT NOT NULL,
          created_at TEXT NOT NULL,
          PRIMARY KEY (article_id, device_id, reaction)
        )`),
      );
    })().catch((error) => {
      tableReady = null;
      throw error;
    });
  }
  await tableReady;
}

function zero(): ReactionCounts {
  return { ...EMPTY };
}

export async function readNewsReactions(options: {
  articleIds: string[];
  deviceId?: string;
}): Promise<{ counts: Record<string, ReactionCounts>; mine: Record<string, NewsReaction[]> }> {
  const ids = [...new Set(options.articleIds.filter(isArticleId))].slice(0, 80);
  const counts: Record<string, ReactionCounts> = {};
  const mine: Record<string, NewsReaction[]> = {};
  for (const id of ids) counts[id] = zero();
  if (ids.length === 0) return { counts, mine };

  try {
    await ensureTable();
    const db = await getDb();
    const rows = await db
      .select({
        articleId: newsArticleReactions.articleId,
        reaction: newsArticleReactions.reaction,
        n: sql<number>`count(*)`.mapWith(Number),
      })
      .from(newsArticleReactions)
      .where(inArray(newsArticleReactions.articleId, ids))
      .groupBy(newsArticleReactions.articleId, newsArticleReactions.reaction);

    for (const row of rows) {
      const bag = counts[row.articleId] ?? zero();
      if (isNewsReaction(row.reaction)) bag[row.reaction] = Number(row.n) || 0;
      counts[row.articleId] = bag;
    }

    if (options.deviceId && options.deviceId.length >= 8 && options.deviceId.length <= 80) {
      const own = await db
        .select({
          articleId: newsArticleReactions.articleId,
          reaction: newsArticleReactions.reaction,
        })
        .from(newsArticleReactions)
        .where(
          and(
            inArray(newsArticleReactions.articleId, ids),
            eq(newsArticleReactions.deviceId, options.deviceId),
          ),
        );
      for (const row of own) {
        if (!isNewsReaction(row.reaction)) continue;
        const list = mine[row.articleId] ?? [];
        list.push(row.reaction);
        mine[row.articleId] = list;
      }
    }
  } catch {
    return { counts, mine };
  }
  return { counts, mine };
}

export async function toggleNewsReaction(options: {
  articleId: string;
  deviceId: string;
  reaction: NewsReaction;
}): Promise<{ counts: ReactionCounts; mine: NewsReaction[] } | null> {
  if (!isArticleId(options.articleId) || options.deviceId.length < 8 || options.deviceId.length > 80) {
    return null;
  }
  await ensureTable();
  const db = await getDb();
    const existing = await db
      .select({ reaction: newsArticleReactions.reaction })
      .from(newsArticleReactions)
      .where(
        and(
          eq(newsArticleReactions.articleId, options.articleId),
          eq(newsArticleReactions.deviceId, options.deviceId),
          eq(newsArticleReactions.reaction, options.reaction),
        ),
      )
      .limit(1);
    if (existing.length > 0) {
      await db
        .delete(newsArticleReactions)
        .where(
          and(
            eq(newsArticleReactions.articleId, options.articleId),
            eq(newsArticleReactions.deviceId, options.deviceId),
            eq(newsArticleReactions.reaction, options.reaction),
          ),
        );
    } else {
      await db.insert(newsArticleReactions).values({
        articleId: options.articleId,
        deviceId: options.deviceId,
        reaction: options.reaction,
        createdAt: new Date().toISOString(),
      });
    }
  const snap = await readNewsReactions({
    articleIds: [options.articleId],
    deviceId: options.deviceId,
  });
  return {
    counts: snap.counts[options.articleId] ?? zero(),
    mine: snap.mine[options.articleId] ?? [],
  };
}
