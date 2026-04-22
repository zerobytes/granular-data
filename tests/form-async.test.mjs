import test from 'node:test';
import assert from 'node:assert/strict';
import { asyncForm } from '../src/form-async.js';

test('asyncForm: tracks submitting state through async submit', async () => {
  const f = asyncForm({
    email: { initial: 'a@b.com', required: true, email: true },
  });
  let resolveSubmit;
  const handler = f.submit(async () => {
    await new Promise((r) => { resolveSubmit = r; });
    return { ok: true };
  });
  const promise = handler();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(f.submitting.get(), true);
  resolveSubmit();
  const result = await promise;
  assert.equal(result.ok, true);
  assert.equal(f.submitting.get(), false);
  assert.equal(f.submitCount.get(), 1);
});

test('asyncForm: surfaces submit error on signal', async () => {
  const f = asyncForm({
    email: { initial: 'a@b.com', required: true, email: true },
  });
  const handler = f.submit(async () => { throw new Error('fail'); });
  await assert.rejects(() => handler(), /fail/);
  assert.equal(f.submitError.get().message, 'fail');
  assert.equal(f.submitting.get(), false);
});

test('asyncForm: validation errors short-circuit submit', async () => {
  const f = asyncForm({
    email: { initial: '', required: true, email: true },
  });
  let called = false;
  const handler = f.submit(async () => { called = true; return 'ok'; });
  const result = await handler();
  assert.equal(result.ok, false);
  assert.equal(called, false);
});
