import { vi } from 'vitest';

type TestQuery = {
  data: null;
  error: null;
  select: () => TestQuery;
  insert: () => TestQuery;
  update: () => TestQuery;
  upsert: () => TestQuery;
  eq: () => TestQuery;
  neq: () => TestQuery;
  in: () => TestQuery;
  order: () => TestQuery;
  limit: () => TestQuery;
  maybeSingle: () => TestQuery;
  single: () => TestQuery;
  then: (resolve: (value: { data: null; error: null }) => unknown, reject?: (reason: unknown) => unknown) => Promise<unknown>;
};

const createTestQuery = (): TestQuery => {
  const query = {
    data: null,
    error: null,
    select() { return query; },
    insert() { return query; },
    update() { return query; },
    upsert() { return query; },
    eq() { return query; },
    neq() { return query; },
    in() { return query; },
    order() { return query; },
    limit() { return query; },
    maybeSingle() { return query; },
    single() { return query; },
    then(resolve: (value: { data: null; error: null }) => unknown, reject?: (reason: unknown) => unknown) {
      return Promise.resolve({ data: null, error: null }).then(resolve, reject);
    },
  } as TestQuery;

  return query;
};

const testSupabaseClient = {
  from: vi.fn(() => createTestQuery()),
  rpc: vi.fn(async () => ({ data: null, error: null })),
};

vi.mock('../src/supabase/client', () => ({
  isSupabaseConfigured: () => true,
  getSupabaseClient: () => testSupabaseClient,
}));
