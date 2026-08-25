import type {
    LoggerConfig,
    LogPayload,
    VerifyWebhookOptions,
    VerifyWebhookResult,
} from '../types/index.js';

export class OMLTransport {
    private config: LoggerConfig;
    private buffer: LogPayload[] = [];
    private timer: NodeJS.Timeout | null = null;

    constructor(config: LoggerConfig) {
        this.config = config;
    }

    public send(payload: LogPayload) {
        this.buffer.push(payload);

        if (this.buffer.length >= (this.config.batchSize || 10)) {
            this.flush();
        } else if (!this.timer) {
            this.timer = setTimeout(() => this.flush(), this.config.flushInterval || 2000);
        }
    }

    public async flush(): Promise<void> {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        if (this.buffer.length === 0) return;

        const logsToSend = [...this.buffer];
        this.buffer = [];

        try {
            await fetch(`${this.config.endpoint || 'http://localhost:3000'}/logs/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.config.apiKey,
                },
                body: JSON.stringify({ logs: logsToSend }),
            });
        } catch (err) {
            console.error('Failed to send log batch:', err);
        }
    }

    public async verifyWebhook(options: VerifyWebhookOptions): Promise<VerifyWebhookResult> {
        try {
            const res = await fetch(
                `${this.config.endpoint || 'http://localhost:3000'}/alerts/verify-webhook`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': this.config.apiKey,
                    },
                    body: JSON.stringify(options),
                }
            );

            if (!res.ok) {
                const text = await res.text();
                return { valid: false, error: text };
            }

            const json = await res.json();
            return { valid: true, data: json };
        } catch (err: any) {
            return { valid: false, error: err.message || 'Webhook verification failed' };
        }
    }
}