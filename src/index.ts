export { createLogger, Logger } from './core/index.js';
export { OMLTransport } from './utils/index.js';

export { getLogs } from './getlogs.js';
export { getStream } from './getstream.js';

export type {
    LoggerConfig,
    LogPayload,
    VerifyWebhookOptions,
    VerifyWebhookResult,
    LogLevel,
    LogType,
    Importance,
    SubSystem,
    LogTrack,
    LogSecurity,
    LogMetrics,
    LogTimestamps,
    StreamLogRaw,
    StreamLogNormalized,
    GetStreamResult,
    GetLogsResult,
} from './types/index.js';