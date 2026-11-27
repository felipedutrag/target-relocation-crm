"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

const FRESH_MS = 60_000;
const MAX_ENTRIES = 72;
const MAX_ENTRY_SIZE = 2_000_000;
const MAX_CACHE_SIZE = 8_000_000;
type Entry = { response: Response; at: number; size: number };

function createCrmCache() {
  const entries = new Map<string, Entry>();
  const pending = new Map<string, Promise<Response>>();
  let revision = 0;
  let cachedSize = 0;

  function clear() {
    revision++;
    entries.clear();
    pending.clear();
    cachedSize = 0;
  }

  async function refresh(url: string) {
    const existing = pending.get(url);
    if (existing) return (await existing).clone();

    const requestRevision = revision;
    const request = (async () => {
      const response = await fetch(url, { cache: "no-store" });
      if (requestRevision === revision) {
        if (response.status === 401 || response.status === 403) clear();
        if (response.status === 200 && response.headers.get("content-type")?.includes("application/json")) {
          const body = await response.clone().text();
          const size = body.length * 2;
          if (requestRevision === revision && size <= MAX_ENTRY_SIZE) {
            cachedSize -= entries.get(url)?.size ?? 0;
            entries.delete(url);
            entries.set(url, {
              at: Date.now(),
              size,
              response: new Response(body, { status: response.status, headers: { "Content-Type": "application/json" } }),
            });
            cachedSize += size;
            while (entries.size > MAX_ENTRIES || cachedSize > MAX_CACHE_SIZE) {
              const oldest = entries.keys().next().value!;
              cachedSize -= entries.get(oldest)!.size;
              entries.delete(oldest);
            }
          }
        }
      }
      return response;
    })();
    pending.set(url, request);
    try {
      return (await request).clone();
    } finally {
      if (pending.get(url) === request) pending.delete(url);
    }
  }

  async function request(url: string, options?: RequestInit, onRefresh?: (response: Response) => void) {
    const method = options?.method?.toUpperCase() ?? "GET";
    if (method !== "GET") {
      const response = await fetch(url, options);
      if (response.ok) clear();
      return response;
    }
    if (options?.cache === "no-store" || options?.headers || options?.signal?.aborted) return fetch(url, options);
    const entry = entries.get(url);
    if (entry && Date.now() - entry.at < FRESH_MS) return entry.response.clone();
    if (entry && onRefresh) {
      const requestRevision = revision;
      void refresh(url).then(response => {
        if (response.ok && revision === requestRevision && !options?.signal?.aborted) onRefresh(response);
      }).catch(() => {});
      return entry.response.clone();
    }
    const response = await refresh(url);
    options?.signal?.throwIfAborted();
    return response;
  }

  return request;
}

const CrmRequest = createContext<ReturnType<typeof createCrmCache>>((url, options) => fetch(url, options));

export function CrmCacheProvider({ children }: { children: ReactNode }) {
  const [request] = useState(createCrmCache);
  return <CrmRequest.Provider value={request}>{children}</CrmRequest.Provider>;
}

export function useCrmFetch() {
  return useContext(CrmRequest);
}

export function useCrmRead() {
  const request = useCrmFetch();
  const latest = useRef<AbortController | null>(null);
  useEffect(() => () => latest.current?.abort(), []);

  return useCallback(async (url: string, apply: (data: Awaited<ReturnType<Response["json"]>>) => void) => {
    latest.current?.abort();
    const controller = new AbortController();
    latest.current = controller;
    let freshApplied = false;
    const update = async (response: Response, fresh = false) => {
      if (!response.ok || controller.signal.aborted) return false;
      const data = await response.json();
      if (controller.signal.aborted || (freshApplied && !fresh)) return freshApplied;
      if (fresh) freshApplied = true;
      apply(data);
      return true;
    };
    try {
      return await update(await request(url, { signal: controller.signal }, fresh => {
        void update(fresh, true).catch(() => {});
      }));
    } catch {
      return false;
    }
  }, [request]);
}
