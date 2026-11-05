import { useEffect, useState, useCallback } from "react";
import { api } from "../services/api.js";
export function useData(path, { poll = false } = {}) {
  const [state, setState] = useState({ data: null, error: "", loading: true }),
    [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    if (!path) {
      setState({ data: null, error: "", loading: false });
      return;
    }
    const controller = new AbortController();
    let timer;
    setState({ data: null, error: "", loading: true });
    async function load() {
      try {
        const data = await api(path, { signal: controller.signal });
        if (!controller.signal.aborted)
          setState({ data, error: "", loading: false });
      } catch (error) {
        if (!controller.signal.aborted)
          setState((old) => ({ ...old, error: error.message, loading: false }));
      }
      if (poll && !controller.signal.aborted) timer = setTimeout(load, 30000);
    }
    load();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [path, version, poll]);
  return { ...state, reload };
}
