import test from 'node:test';
import assert from 'node:assert/strict';
import { useQuery, useMutation, createQueryStore } from '../src/query.js';

test('useQuery: resolves data through default client', async () => {
  const client = createQueryStore();
  const q = useQuery(['users', 1], async () => ({ id: 1, name: 'Ada' }), { client });
  await new Promise((r) => setTimeout(r, 5));
  await q.refetch();
  assert.equal(q.data.id, 1);
  assert.equal(q.status, 'success');
});

test('useQuery: error path sets status', async () => {
  const client = createQueryStore();
  const q = useQuery(['fail'], async () => { throw new Error('boom'); }, { client });
  await assert.rejects(() => q.refetch(), /boom/);
  assert.equal(q.status, 'error');
  assert.equal(q.error.message, 'boom');
});

test('useMutation: tracks success/error and invokes callbacks', async () => {
  let onSuccessVal = null;
  const m = useMutation(async (x) => x + 1, {
    onSuccess: (v) => { onSuccessVal = v; },
  });
  assert.equal(m.status.get(), 'idle');
  const res = await m.mutate(1);
  assert.equal(res, 2);
  assert.equal(onSuccessVal, 2);
  assert.equal(m.status.get(), 'success');
  assert.equal(m.data.get(), 2);
});

test('useMutation: error path sets error and propagates', async () => {
  const m = useMutation(async () => { throw new Error('nope'); });
  await assert.rejects(() => m.mutate(), /nope/);
  assert.equal(m.status.get(), 'error');
  assert.equal(m.error.get().message, 'nope');
});

test('useMutation: reset clears state', async () => {
  const m = useMutation(async (x) => x);
  await m.mutate('hello');
  m.reset();
  assert.equal(m.status.get(), 'idle');
  assert.equal(m.data.get(), undefined);
  assert.equal(m.error.get(), null);
});
