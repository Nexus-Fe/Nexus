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

export function startResourceLoad<T>(
  loader: (signal: AbortSignal) => Promise<T>,
  signal: AbortSignal,
  onSuccess: (data: T) => void,
  onError: (error: unknown) => void,
): void {
  if (signal.aborted) return;
  const deliverSuccess = (data: T) => { if (!signal.aborted) onSuccess(data); };
  const deliverError = (error: unknown) => { if (!signal.aborted) onError(error); };
  try {
    loader(signal).then(deliverSuccess, deliverError);
  } catch (error) {
    deliverError(error);
  }
}

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
    const onSuccess = (data: T) => {
      setState({ key, revision: currentRevision, data, error: null });
    };
    const onError = (error: unknown) => {
      setState({
        key,
        revision: currentRevision,
        data: null,
        error: error instanceof Error ? error : new Error("Không tải được dữ liệu."),
      });
    };
    startResourceLoad(loaderRef.current, controller.signal, onSuccess, onError);
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
