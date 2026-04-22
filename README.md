# @granularjs/data

Higher-level data primitives for `@granularjs/core`:

- `useQuery(key, fetcher, options?)` — TanStack-style queries with cache, dedupe, retry, GC.
- `useMutation(fn, { onSuccess, onError })` — reactive mutation primitive with status/error/data signals.
- `createQueryStore({ middlewares })` — opt-in standalone QueryClient with middleware chain.
- `persistedSignal(key, initial, { adapter })` — signal that hydrates from and writes to a storage backend.
- `persistedState(key, initial, { adapter })` — same for `state()` snapshots.
- `whenReady(target)` — awaits hydration of a persisted signal/state.
- `localStorageAdapter` / `sessionStorageAdapter` / `indexedDbAdapter({ dbName, store })` — built-in storage adapters.
- `asyncForm(schema, { onSubmit })` — `formSchema` extended with `submitting`, `submitError`, `submitCount`, `lastResult` signals.

## Install

```bash
npm install @granularjs/core @granularjs/data
```

## Examples

### Query + mutation

```js
import { useQuery, useMutation } from '@granularjs/data';

const todos = useQuery(['todos'], async ({ signal }) => {
  const res = await fetch('/api/todos', { signal });
  return res.json();
}, { staleTime: 30_000 });

const createTodo = useMutation(async (body) => {
  const res = await fetch('/api/todos', { method: 'POST', body: JSON.stringify(body) });
  if (!res.ok) throw new Error('create failed');
  return res.json();
}, {
  onSuccess: () => todos.refetch(),
});
```

### Persisted state

```js
import { persistedState, indexedDbAdapter, whenReady } from '@granularjs/data';

const settings = persistedState('settings', { theme: 'light' }, {
  adapter: indexedDbAdapter({ dbName: 'app' }),
});

await whenReady(settings);
settings.set({ theme: 'dark' });
```

### Async form

```js
import { asyncForm } from '@granularjs/data';

const form = asyncForm({
  email: { initial: '', required: true, email: true },
  password: { initial: '', required: true, minLength: 8 },
});

const submit = form.submit(async (values) => {
  const res = await fetch('/api/login', { method: 'POST', body: JSON.stringify(values) });
  if (!res.ok) throw new Error('login failed');
  return res.json();
});

// in your component template
//   <form onsubmit={submit}>...
//   {after(form.submitting).compute(s => s ? Spinner() : Submit())}
//   {after(form.submitError).compute(e => e && ErrorMessage(e.message))}
```
