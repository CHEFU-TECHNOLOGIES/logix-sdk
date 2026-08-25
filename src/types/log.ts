import { Importance, LogType, SubSystem } from "./index.js";
import { LogMetrics } from "./metric.js";
import { LogSecurity } from "./security.js";
import { LogTrack } from "./track.js";

export interface LogTimestamps {
    eventTime?: string;
    ingestTime?: string;
}

export interface LogMessage {
    type: LogType;
    message: string;
    importance?: Importance;
    subsystem?: SubSystem;
    operation?: string;
    track?: LogTrack;
    security?: LogSecurity;
    metrics?: LogMetrics;
    timestamps?: LogTimestamps;
}