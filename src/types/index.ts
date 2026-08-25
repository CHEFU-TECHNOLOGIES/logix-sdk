export type LogLevel = 'info' | 'warning' | 'error' | 'debug' | 'audit' | 'metric' | 'success';
export type LogType = LogLevel;
export type Importance = 'critical' | 'high' | 'medium' | 'low';
export type SubSystem = string;
export type LogTrack = Record<string, any>;
export type LogSecurity = Record<string, any>;
export type LogMetrics = Record<string, any>;

export interface LogTimestamps {
    event_time?: string | number;
}

export interface LoggerConfig {
    apiKey: string;
    endpoint?: string;
    batchSize?: number;
    flushInterval?: number;
}

export interface LogPayload {
    type?: LogLevel | string;
    message: string;
    appName?: string;
    environment?: string;
    service?: string;
    subsystem?: string;
    operation?: string;
    importance?: number | Importance;
    track?: LogTrack;
    security?: LogSecurity;
    metrics?: LogMetrics;
    timestamps?: LogTimestamps;
    [key: string]: any;
}

export interface VerifyWebhookOptions {
    signature: string;
    timestamp: string;
    body: any;
}

export interface VerifyWebhookResult {
    valid: boolean;
    data?: any;
    error?: string;
}

export interface StreamLogRaw {
    key_id: string;
    user_id: string;
    type: string;
    message: string;
    app_name?: string;
    environment?: string;
    importance?: number;
    subsystem?: string;
    operation?: string;
    track?: string;
    security?: string;
    metrics?: string;
    timestamp: number | string;
    ingested_at?: string;
}

export interface StreamLogNormalized {
    id: string;
    ts: string;
    level: LogLevel;
    source: string;
    message: string;
    payload: any;
}

export interface GetStreamResult {
    data: StreamLogNormalized[];
    isLoading: boolean;
    error: Error | null;
    connected: boolean;
    disconnect: () => void;
}

export interface GetLogsResult<T = any> {
    data: T | null;
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
}