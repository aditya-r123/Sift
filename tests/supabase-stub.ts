import type { Session, SupabaseClient } from "@supabase/supabase-js";

declare global {
  interface Window {
    __SIFT_TEST_SUPABASE_SESSION__?: Session | null;
    __SIFT_TEST_SUPABASE_TABLES__?: Record<string, Array<Record<string, unknown>>>;
    __SIFT_TEST_SUPABASE_RPC_CALLS__?: Array<{ name: string; params: Record<string, unknown> }>;
    __SIFT_TEST_SUPABASE_RPC_RESULTS__?: Record<string, { data?: unknown; error?: { message: string } | null }>;
    __SIFT_TEST_SUPABASE_RPC_DELAY_MS__?: number;
    __SIFT_TEST_LIKED_EVENTS__?: unknown[];
  }
}

function getTestHost(): Window | null {
  if (typeof window !== "undefined") return window;
  const host = globalThis as unknown as Window;
  if (
    host.__SIFT_TEST_SUPABASE_TABLES__ ||
    host.__SIFT_TEST_SUPABASE_SESSION__ ||
    host.__SIFT_TEST_SUPABASE_RPC_CALLS__
  ) {
    return host;
  }
  return null;
}

function createNoopQuery(tableName: string) {
  let operation: "select" | "delete" | "insert" | "update" = "select";
  let rows = [...(getTestHost()?.__SIFT_TEST_SUPABASE_TABLES__?.[tableName] ?? [])];
  let mutationPayload: Record<string, unknown> | null = null;
  const tableRows = () => getTestHost()?.__SIFT_TEST_SUPABASE_TABLES__?.[tableName] ?? [];
  const resolve = () => {
    if (operation === "delete") {
      const host = getTestHost();
      if (host?.__SIFT_TEST_SUPABASE_TABLES__) {
        host.__SIFT_TEST_SUPABASE_TABLES__[tableName] = tableRows().filter((row) => !rows.includes(row));
      }
      return Promise.resolve({ data: [], error: null });
    }
    if (operation === "update" && mutationPayload) {
      for (const row of rows) Object.assign(row, mutationPayload);
      return Promise.resolve({ data: rows, error: null });
    }
    return Promise.resolve({ data: rows, error: null });
  };
  const query = {
    select: () => query,
    order: (column: string, options?: { ascending?: boolean }) => {
      rows = [...rows].sort((a, b) => {
        const av = a[column];
        const bv = b[column];
        if (av === bv) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        const direction = options?.ascending === false ? -1 : 1;
        return String(av).localeCompare(String(bv)) * direction;
      });
      return query;
    },
    limit: (count: number) => {
      rows = rows.slice(0, count);
      return resolve();
    },
    eq: (column: string, value: unknown) => {
      rows = rows.filter((row) => row[column] === value);
      return query;
    },
    neq: (column: string, value: unknown) => {
      rows = rows.filter((row) => row[column] !== value);
      return query;
    },
    // [GenAI Use] Prompt: "Implement filtering imitating that of Supabase's ilike filter for the supabase test stub."
    // [GenAI Use] LLM Response Start
    ilike: (column: string, pattern: string) => {
      const needle = pattern.replace(/^%|%$/g, "").replace(/\\([%_\\])/g, "$1").toLowerCase();
      rows = rows.filter((row) => String(row[column] ?? "").toLowerCase().includes(needle));
      return query;
    },
    // [GenAI Use] LLM Response End
    // [GenAI Use] Reflection: I verified that the replacement pattern makes sense and that it matches the logic of Supabase's ilike functionality.
    or: (expression: string) => {
      const clauses = expression.split(",").map((part) => {
        const [column, operator, ...valueParts] = part.split(".");
        return { column, operator, value: valueParts.join(".") };
      });
      rows = rows.filter((row) =>
        clauses.some(({ column, operator, value }) => column && operator === "eq" && String(row[column]) === value)
      );
      return query;
    },
    in: (column: string, values: unknown[]) => {
      rows = rows.filter((row) => values.includes(row[column]));
      return Promise.resolve({ data: rows, error: null });
    },
    insert: (payload: Record<string, unknown>) => {
      operation = "insert";
      const inserted = {
        id: `test-${tableName}-${tableRows().length + 1}`,
        status: "pending",
        ...payload,
      };
      const host = getTestHost();
      if (host) {
        host.__SIFT_TEST_SUPABASE_TABLES__ ??= {};
        host.__SIFT_TEST_SUPABASE_TABLES__[tableName] ??= [];
        host.__SIFT_TEST_SUPABASE_TABLES__[tableName].unshift(inserted);
      }
      rows = [inserted];
      return query;
    },
    update: (payload: Record<string, unknown>) => {
      operation = "update";
      mutationPayload = payload;
      return query;
    },
    delete: () => {
      operation = "delete";
      return query;
    },
    single: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
    then: (
      onfulfilled?: (value: { data: Array<Record<string, unknown>>; error: null }) => unknown,
      onrejected?: (reason?: unknown) => unknown
    ) => resolve().then(onfulfilled, onrejected),
  };
  return query;
}

export function createStubSupabaseClient(): SupabaseClient {
  const readSession = () => getTestHost()?.__SIFT_TEST_SUPABASE_SESSION__ ?? null;
  const callRpc = async (name: string, params: Record<string, unknown>) => {
    const host = getTestHost();
    if (host) {
      host.__SIFT_TEST_SUPABASE_RPC_CALLS__ ??= [];
      host.__SIFT_TEST_SUPABASE_RPC_CALLS__.push({ name, params });
      const delayMs = host.__SIFT_TEST_SUPABASE_RPC_DELAY_MS__ ?? 0;
      if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
      const result = host.__SIFT_TEST_SUPABASE_RPC_RESULTS__?.[name];
      if (result) return { data: result.data ?? [], error: result.error ?? null };
    }
    return { data: [], error: null };
  };

  return {
    auth: {
      getSession: async () => ({ data: { session: readSession() }, error: null }),
      onAuthStateChange: (callback: (_event: string, session: Session | null) => void) => {
        queueMicrotask(() => callback("INITIAL_SESSION", readSession()));
        return { data: { subscription: { unsubscribe: () => undefined } } };
      },
      signInWithPassword: async () => ({ data: { session: null }, error: { message: "Supabase is not configured." } }),
      signUp: async () => ({ data: { session: null }, error: { message: "Supabase is not configured." } }),
      signInWithOAuth: async () => ({ data: {}, error: { message: "Supabase is not configured." } }),
      signOut: async () => ({ error: null }),
    },
    from: (tableName: string) => createNoopQuery(tableName),
    rpc: callRpc,
    channel: () => ({
      on: () => ({
        subscribe: () => ({ unsubscribe: () => undefined }),
      }),
    }),
    removeChannel: async () => ({ error: null }),
  } as unknown as SupabaseClient;
}
