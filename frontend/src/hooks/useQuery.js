import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useToast } from "../components/ui/Toast.jsx";
import { ValidationError } from "../services/errors.js";
import { getVersion, subscribe } from "../services/store.js";

// Loads data from a service function and reloads it whenever the demo store changes,
// so every open page stays consistent after a mutation (in this tab or another one).
export function useQuery(fn, deps = []) {
  const version = useSyncExternalStore(subscribe, getVersion);
  const key = JSON.stringify(deps);
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState({ key: null, data: undefined, error: null });

  useEffect(() => {
    let alive = true;
    fn().then(
      (data) => alive && setState({ key, data, error: null }),
      (error) => alive && setState({ key, data: undefined, error }),
    );
    return () => {
      alive = false;
    };
    // fn is recreated every render; deps (via key) describe what it depends on.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [key, version, nonce]);

  return {
    data: state.data,
    error: state.error,
    loading: state.key !== key,
    reload: () => setNonce((n) => n + 1),
  };
}

// Runs a mutation with a pending flag. Field errors are returned to the form; anything else is toasted.
export function useAction() {
  const toast = useToast();
  const [pending, setPending] = useState(false);

  const run = useCallback(
    async (fn, { success } = {}) => {
      setPending(true);
      try {
        const result = await fn();
        if (success) toast.success(typeof success === "function" ? success(result) : success);
        return { ok: true, result };
      } catch (error) {
        if (error instanceof ValidationError && Object.keys(error.fieldErrors).length) {
          return { ok: false, error, fieldErrors: error.fieldErrors };
        }
        toast.error(error.message);
        return { ok: false, error, fieldErrors: {} };
      } finally {
        setPending(false);
      }
    },
    [toast],
  );

  return [run, pending];
}
