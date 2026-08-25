'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { GetLogsResult } from './types/index.js';

const inflight = new Map<string, Promise<any>>();
const cache = new Map<string, any>();

function buildKey(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();
    if (params && Object.keys(params).length > 0) {
        Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== '') {
                searchParams.append(k, String(v));
            }
        });
    }
    return searchParams.toString();
}

function fetchOnce(key: string): Promise<any> {
    if (cache.has(key)) {
        return Promise.resolve(cache.get(key));
    }

    let p = inflight.get(key);
    if (!p) {
        const url = `/api/1minute-logs/logs${key ? `?${key}` : ''}`;
        p = fetch(url, { cache: 'no-store' })
            .then(async (res) => {
                if (!res.ok) {
                    const text = await res.text();
                    throw new Error(`Failed to fetch logs (${res.status}): ${text.slice(0, 200)}`);
                }
                return res.json();
            })
            .then((json) => {
                cache.set(key, json);
                return json;
            })
            .finally(() => {
                inflight.delete(key);
            });

        inflight.set(key, p);
    }

    return p;
}

export function getLogs<T = any>(filters?: Record<string, any>): GetLogsResult<T> {
    const [data, setData] = useState<T | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    const key = useMemo(() => buildKey(filters || {}), [JSON.stringify(filters || {})]);

    const fetchLogs = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const json = await fetchOnce(key);
            const rows = Array.isArray(json)
                ? json
                : Array.isArray(json?.logs)
                    ? json.logs
                    : [];

            setData(rows as T);
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                setError(err instanceof Error ? err : new Error(String(err)));
                setData(null);
            }
        } finally {
            setIsLoading(false);
        }
    }, [key]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const refetch = useCallback(async () => {
        cache.delete(key);
        await fetchLogs();
    }, [key, fetchLogs]);

    return {
        data,
        isLoading,
        error,
        refetch,
    };
}