/**
 * Cloudflare D1 REST API 기반 클라이언트.
 *
 * Vercel처럼 Workers 바인딩(env.DB)이 없는 런타임에서 D1에 접속할 때 쓴다.
 * drizzle-orm/d1 세션이 실제로 호출하는 최소 인터페이스만 구현한다:
 *   client.prepare(sql).bind(...params).all() / .run() / .raw()
 *   client.batch([...boundStatements])
 *
 * 진짜 Workers D1Database와 달리 batch()는 원자적이지 않다 — HTTP API가
 * 멀티스테이트먼트 트랜잭션을 노출하지 않아서 순차 실행으로 흉내만 낸다.
 * (지금 이 프로젝트의 batch 사용처는 마이그레이션/시드 성격이라 문제없음.
 *  진짜 원자성이 필요한 다중 쓰기가 생기면 이 가정을 다시 봐야 한다.)
 */

export type D1HttpConfig = {
  accountId: string;
  databaseId: string;
  apiToken: string;
};

type D1HttpMeta = {
  duration?: number;
  rows_read?: number;
  rows_written?: number;
  last_row_id?: number;
  changes?: number;
  served_by?: string;
  changed_db?: boolean;
  size_after?: number;
};

type D1HttpResult = {
  results: Record<string, unknown>[];
  success: boolean;
  meta: D1HttpMeta;
};

async function runD1Query(
  config: D1HttpConfig,
  sql: string,
  params: unknown[],
): Promise<D1HttpResult> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/d1/database/${config.databaseId}/query`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql, params }),
  });

  let json: {
    success: boolean;
    result?: D1HttpResult[];
    errors?: Array<{ code: number; message: string }>;
  };
  try {
    json = (await res.json()) as typeof json;
  } catch {
    throw new Error(`D1 HTTP query failed (${res.status}): non-JSON response`);
  }

  if (!res.ok || !json.success) {
    const msg =
      json.errors?.map((e) => `${e.code}: ${e.message}`).join("; ") ||
      `D1 HTTP query failed (${res.status})`;
    throw new Error(msg);
  }

  const first = json.result?.[0];
  if (!first) throw new Error("D1 HTTP query returned no result rows");
  return first;
}

class D1HttpBoundStatement {
  constructor(
    private readonly config: D1HttpConfig,
    private readonly sql: string,
    private readonly params: unknown[],
  ) {}

  async all(): Promise<D1HttpResult> {
    return runD1Query(this.config, this.sql, this.params);
  }

  async run(): Promise<D1HttpResult> {
    return this.all();
  }

  async raw<T = unknown[]>(): Promise<T[]> {
    const { results } = await this.all();
    return results.map((row) => Object.values(row)) as T[];
  }

  async first<T = Record<string, unknown>>(colName?: string): Promise<T | null> {
    const { results } = await this.all();
    const row = results[0];
    if (!row) return null;
    return (colName ? row[colName] : row) as T;
  }
}

class D1HttpPreparedStatement {
  constructor(
    private readonly config: D1HttpConfig,
    private readonly sql: string,
  ) {}

  bind(...params: unknown[]): D1HttpBoundStatement {
    return new D1HttpBoundStatement(this.config, this.sql, params);
  }

  // drizzle는 파라미터 없는 쿼리도 대부분 .bind()를 거치지만, 혹시 직접
  // .all()/.run()을 부르는 경로가 있을 때를 대비해 위임해둔다.
  async all(): Promise<D1HttpResult> {
    return runD1Query(this.config, this.sql, []);
  }

  async run(): Promise<D1HttpResult> {
    return this.all();
  }
}

export class D1HttpDatabase {
  constructor(private readonly config: D1HttpConfig) {}

  prepare(sql: string): D1HttpPreparedStatement {
    return new D1HttpPreparedStatement(this.config, sql);
  }

  /** 원자적이지 않은 순차 실행 — 위 파일 상단 주석 참조. */
  async batch(statements: D1HttpBoundStatement[]): Promise<D1HttpResult[]> {
    const out: D1HttpResult[] = [];
    for (const stmt of statements) {
      out.push(await stmt.all());
    }
    return out;
  }
}

export function createD1HttpClient(config: D1HttpConfig): D1HttpDatabase {
  return new D1HttpDatabase(config);
}
