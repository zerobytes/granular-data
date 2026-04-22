import { signal, state, after } from '@granularjs/core';
import { QueryClient } from '@granularjs/core';

let _defaultClient = null;

export function createQueryStore(options = {}) {
  const client = new QueryClient();
  if (Array.isArray(options.middlewares)) {
    for (const mw of options.middlewares) client.use(mw);
  }
  return client;
}

function defaultClient() {
  if (!_defaultClient) _defaultClient = createQueryStore();
  return _defaultClient;
}

export function useQuery(key, fetcher, options = {}) {
  const client = options.client || defaultClient();
  return client.query({ ...options, key, fetcher });
}

export function useMutation(mutateFn, options = {}) {
  const status = signal('idle');
  const errorSig = signal(null);
  const dataSig = signal(undefined);
  const pendingCount = signal(0);

  const handleStart = () => {
    pendingCount.set(pendingCount.get() + 1);
    status.set('loading');
    errorSig.set(null);
  };
  const handleSettle = () => {
    pendingCount.set(Math.max(0, pendingCount.get() - 1));
  };

  async function mutate(input) {
    handleStart();
    try {
      const data = await mutateFn(input);
      dataSig.set(data);
      status.set('success');
      if (typeof options.onSuccess === 'function') options.onSuccess(data, input);
      handleSettle();
      return data;
    } catch (err) {
      errorSig.set(err);
      status.set('error');
      if (typeof options.onError === 'function') options.onError(err, input);
      handleSettle();
      if (options.throwOnError !== false) throw err;
      return undefined;
    }
  }

  return {
    mutate,
    status,
    error: errorSig,
    data: dataSig,
    get isLoading() { return status.get() === 'loading'; },
    get isSuccess() { return status.get() === 'success'; },
    get isError() { return status.get() === 'error'; },
    reset() {
      status.set('idle');
      errorSig.set(null);
      dataSig.set(undefined);
    },
  };
}
