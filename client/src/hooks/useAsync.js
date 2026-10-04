import { useCallback, useEffect, useState } from 'react';
import { errMsg } from '../services/api.js';

// Runs `fn` on mount/deps change; exposes reload() for manual or socket-triggered refetch.
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback((silent = false) => {
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
    return fn().then((data) => setState({ data, loading: false, error: null }))
      .catch((e) => setState((s) => ({ data: silent ? s.data : null, loading: false, error: errMsg(e) })));
  }, deps);
  useEffect(() => { run(); }, [run]);
  return { ...state, reload: () => run(true), setData: (data) => setState((s) => ({ ...s, data })) };
}
