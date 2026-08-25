import { OMLTransport } from '../utils/index.js';
import type {
    LoggerConfig,
    LogPayload,
    VerifyWebhookOptions,
    VerifyWebhookResult,
} from '../types/index.js';

export class Logger {
    private transport: OMLTransport;

    constructor(config: LoggerConfig) {
        this.transport = new OMLTransport(config);
    }

    public log(payload: LogPayload) {
        this.transport.send(payload);
    }

    public info(message: string, meta?: Record<string, any>) {
        this.log({ type: 'info', message, ...meta });
    }

    public warn(message: string, meta?: Record<string, any>) {
        this.log({ type: 'warning', message, ...meta });
    }

    public error(message: string, meta?: Record<string, any>) {
        this.log({ type: 'error', message, ...meta });
    }

    public debug(message: string, meta?: Record<string, any>) {
        this.log({ type: 'debug', message, ...meta });
    }

    public async verifyWebhook(options: VerifyWebhookOptions): Promise<VerifyWebhookResult> {
        return this.transport.verifyWebhook(options);
    }

    public async flush(): Promise<void> {
        await this.transport.flush();
    }
}

export function createLogger(config: LoggerConfig): Logger {
    return new Logger(config);
}