"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ResourceState<T> = {
  data: T | null;
  error: Error | null;
  loading: boolean;
  reload: () => void;
};

type StoredState<T> = {
  key: string | null;
  revision: number;
  data: T | null;
  error: Error | null;
};

export function useApiResource<T>(
  key: string | null,
  loader: (signal: AbortSignal) => Promise<T>,
): ResourceState<T> {
  const loaderRef = useRef(loader);
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<StoredState<T>>({
    key: null,
    revision: -1,
    data: null,
    error: null,
  });

  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);

  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    const currentRevision = revision;
    loaderRef.current(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) {
          setState({ key, revision: currentRevision, data, error: null });
        }
      },
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setState({
            key,
            revision: currentRevision,
            data: null,
            error: error instanceof Error ? error : new Error("Không tải được dữ liệu."),
          });
        }
      },
    );
    return () => controller.abort();
  }, [key, revision]);

  const reload = useCallback(() => setRevision((current) => current + 1), []);
  const matchingKey = Boolean(key) && state.key === key;
  const current = matchingKey && state.revision === revision;
  return {
    data: matchingKey ? state.data : null,
    error: current ? state.error : null,
    loading: Boolean(key) && !current,
    reload,
  };
}
