// Stub client that mimics @supabase/supabase-js shape during the
// Supabase → Postgres migration. Every chained method accepts variadic
// args and returns `this` (or a new builder of a different result shape
// where needed) so existing call sites compile unchanged. Resolves to
// `{ data: null, error: null }` plus `count: 0` for count-mode queries.
//
// Real data wiring happens in Phase 3b once the data path (direct DB
// vs RPC over HTTPS) is decided.

/* eslint-disable @typescript-eslint/no-explicit-any */

type StubError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
} | null;

type EmptyResult<T = any> = {
  data: T | null;
  error: StubError;
  count: number | null;
};

class StubBuilder<T = unknown> implements PromiseLike<EmptyResult<T>> {
  // Filter / projection / range methods all return `this`-ish so chains compile
  select(..._args: any[]): StubBuilder<T> { return this; }
  insert(..._args: any[]): StubBuilder<T> { return this; }
  update(..._args: any[]): StubBuilder<T> { return this; }
  upsert(..._args: any[]): StubBuilder<T> { return this; }
  delete(..._args: any[]): StubBuilder<T> { return this; }
  eq(..._args: any[]): StubBuilder<T> { return this; }
  neq(..._args: any[]): StubBuilder<T> { return this; }
  in(..._args: any[]): StubBuilder<T> { return this; }
  is(..._args: any[]): StubBuilder<T> { return this; }
  gt(..._args: any[]): StubBuilder<T> { return this; }
  gte(..._args: any[]): StubBuilder<T> { return this; }
  lt(..._args: any[]): StubBuilder<T> { return this; }
  lte(..._args: any[]): StubBuilder<T> { return this; }
  like(..._args: any[]): StubBuilder<T> { return this; }
  ilike(..._args: any[]): StubBuilder<T> { return this; }
  match(..._args: any[]): StubBuilder<T> { return this; }
  not(..._args: any[]): StubBuilder<T> { return this; }
  filter(..._args: any[]): StubBuilder<T> { return this; }
  or(..._args: any[]): StubBuilder<T> { return this; }
  and(..._args: any[]): StubBuilder<T> { return this; }
  contains(..._args: any[]): StubBuilder<T> { return this; }
  containedBy(..._args: any[]): StubBuilder<T> { return this; }
  textSearch(..._args: any[]): StubBuilder<T> { return this; }
  range(..._args: any[]): StubBuilder<T> { return this; }
  limit(..._args: any[]): StubBuilder<T> { return this; }
  order(..._args: any[]): StubBuilder<T> { return this; }
  maybeSingle(): StubBuilder<any> { return this as any; }
  single(): StubBuilder<any> { return this as any; }
  csv(): StubBuilder<T> { return this; }
  returns<U>(): StubBuilder<U> { return new StubBuilder<U>(); }
  abortSignal(..._args: any[]): StubBuilder<T> { return this; }
  explain(..._args: any[]): StubBuilder<T> { return this; }
  geojson(..._args: any[]): StubBuilder<T> { return this; }
  rollback(..._args: any[]): StubBuilder<T> { return this; }
  // Aliased for some callers
  throwOnError(): StubBuilder<T> { return this; }

  then<TResult1 = EmptyResult<T>, TResult2 = never>(
    onfulfilled?:
      | ((value: EmptyResult<T>) => TResult1 | PromiseLike<TResult1>)
      | undefined
      | null,
    onrejected?:
      | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
      | undefined
      | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve({
      data: null as T | null,
      error: null,
      count: 0,
    }).then(onfulfilled, onrejected);
  }
}

type StubUser = {
  id: string;
  email: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
  aud?: string;
  created_at?: string;
} | null;

type StubSession = {
  user?: { id: string; email: string };
  expires_at?: number;
} | null;

const stubAuth = {
  async getUser(): Promise<{ data: { user: StubUser }; error: null }> {
    return { data: { user: null }, error: null };
  },
  async getSession(): Promise<{ data: { session: StubSession }; error: null }> {
    return { data: { session: null }, error: null };
  },
  async signInWithPassword(_args?: any) {
    return {
      data: { user: null, session: null },
      error: { message: "Password auth removed — use OTP at /login", name: "AuthError" } as Error,
    };
  },
  async signUp(_args?: any) {
    return {
      data: { user: null, session: null },
      error: { message: "Signup migrated — use OTP at /login", name: "AuthError" } as Error,
    };
  },
  async signOut() {
    return { error: null };
  },
  async refreshSession(_args?: any) {
    return { data: { session: null, user: null }, error: null };
  },
  async resetPasswordForEmail(_args?: any, _opts?: any) {
    return { data: {}, error: null };
  },
  async updateUser(_args?: any) {
    return { data: { user: null }, error: null };
  },
  async exchangeCodeForSession(_args?: any) {
    return { data: { session: null, user: null }, error: null };
  },
  onAuthStateChange(_cb?: any) {
    return {
      data: { subscription: { unsubscribe() { /* no-op */ } } },
    };
  },
};

const stubStorage = {
  from(_bucket: string) {
    return {
      async upload(..._args: any[]) { return { data: null, error: null }; },
      async download(..._args: any[]) { return { data: null, error: null }; },
      async remove(..._args: any[]) { return { data: null, error: null }; },
      getPublicUrl(..._args: any[]) { return { data: { publicUrl: "" } }; },
    };
  },
};

const stubFunctions = {
  async invoke(..._args: any[]) { return { data: null, error: null }; },
};

export function createStubClient() {
  return {
    from(_table: string): StubBuilder<any> {
      return new StubBuilder<any>();
    },
    auth: stubAuth,
    storage: stubStorage,
    functions: stubFunctions,
    rpc(..._args: any[]): StubBuilder<any> {
      return new StubBuilder<any>();
    },
  };
}

export type StubClient = ReturnType<typeof createStubClient>;
