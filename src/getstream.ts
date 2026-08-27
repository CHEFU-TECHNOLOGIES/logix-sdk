'use client';

import { useEffect, useRef, useState } from 'react';
import type { GetStreamResult, LogLevel, StreamLogNormalized, StreamLogRaw } from './types/index.js';

export function getStream(filters?: Record<string, string>): GetStreamResult {
    const [data, setData] = useState<StreamLogNormalized[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);
    const [connected, setConnected] = useState<boolean>(false);

    const esRef = useRef<EventSource | null>(null);

    useEffect(() => {
        const searchParams = new URLSearchParams();
        if (filters && Object.keys(filters).length > 0) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    searchParams.append(key, String(value));
                }
            });
        }

        const qs = searchParams.toString();
        const url = `/api/1minute-logs/stream${qs ? `?${qs}` : ''}`;

        const es = new EventSource(url, { withCredentials: true });
        esRef.current = es;

        setIsLoading(true);
        setError(null);

        es.onopen = () => {
            setConnected(true);
        };

        es.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data);

                setData((prev) => {
                    let incomingRaw: StreamLogRaw[] = [];

                    if (payload.type === 'initial_logs' && Array.isArray(payload.logs)) {
                        incomingRaw = payload.logs;
                    } else if (payload.type === 'live' && Array.isArray(payload.logs)) {
                        incomingRaw = payload.logs;
                    } else if (Array.isArray(payload)) {
                        incomingRaw = payload;
                    } else if (payload && payload.key_id) {
                        incomingRaw = [payload];
                    }

                    const incomingNormalized = incomingRaw.map(toLogEntry);
                    const isInitial = payload.type === 'initial_logs';

                    let next: StreamLogNormalized[];
                    if (isInitial) {
                        next = incomingNormalized;
                        setIsLoading(false);
                    } else {
                        next = [...prev, ...incomingNormalized];
                    }

                    if (next.length > 5000) {
                        next = next.slice(next.length - 5000);
                    }

                    return next;
                });
            } catch (err: any) {
                console.log('OML Stream: Failed to parse SSE message', err);
            }
        };

        es.onerror = (err: any) => {
            console.error('OML Stream SSE Error:', err);
            setError(new Error('SSE Stream disconnected or connection failed'));
            setConnected(false);
            setIsLoading(false);
            es.close();
        };

        return () => {
            setConnected(false);
            es.close();
        };
    }, [JSON.stringify(filters || {})]);

    const disconnect = () => {
        if (esRef.current) {
            esRef.current.close();
            esRef.current = null;
            setConnected(false);
        }
    };

    return {
        data,
        isLoading,
        error,
        connected,
        disconnect,
    };
}

function toLogEntry(l: StreamLogRaw): StreamLogNormalized {
    const rawType = (l.type || 'info').toLowerCase();
    let level: LogLevel = 'info';

    if (rawType === 'warning' || rawType === 'warn') level = 'warning';
    else if (rawType === 'error') level = 'error';
    else if (rawType === 'debug') level = 'debug';
    else if (rawType === 'audit') level = 'audit';
    else if (rawType === 'metric') level = 'metric';
    else if (rawType === 'success') level = 'success';

    let tsIso = new Date().toISOString();
    if (typeof l.timestamp === 'number') {
        tsIso = new Date(l.timestamp * 1000).toISOString();
    } else if (typeof l.timestamp === 'string') {
        tsIso = new Date(l.timestamp).toISOString();
    }

    return {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
        ts: tsIso,
        level,
        source: l.app_name || 'default',
        message: l.message || '',
        payload: l,
    };
}