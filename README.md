# @chefu-tech/logix-next

> Official Next.js & React SDK for **Logix** — High-performance structured logging, real-time observability, and automated alerting infrastructure by CHEFU Technologies.

[![npm version](https://img.shields.io/npm/v/@chefu-tech/logix-next.svg)](https://www.npmjs.com/package/@chefu-tech/logix-next)

[![license](https://img.shields.io/npm/l/@chefu-tech/logix-next.svg)](https://github.com/CHEFU-TECHNOLOGIES/logix-sdk/blob/main/LICENSE)

[![bundle size](https://img.shields.io/bundlephobia/minzip/@chefu-tech/logix-next)](https://bundlephobia.com/package/@chefu-tech/logix-next)

---

## 📑 Table of Contents

- [Overview & Architecture](#-overview--architecture)

- [Installation](#-installation)

- [Core Concepts & Telemetry Schema](#-core-concepts--telemetry-schema)

- [Quick Start Guide](#-quick-start-guide)

- [Next.js Integration Guide](#-nextjs-integration-guide)

  - [1. Environment Setup](#1-environment-setup)

  - [2. Next.js API Proxy Routes (App Router)](#2-nextjs-api-proxy-routes-app-router)

  - [3. Server Actions & Server Components](#3-server-actions--server-components)

- [React Hooks Reference](#-react-hooks-reference)

  - [Real-Time Stream Hook (`getStream`)](#real-time-stream-hook-getstream)

  - [Historical Query Hook (`getLogs`)](#historical-query-hook-getlogs)

- [Advanced SDK Configuration](#-advanced-sdk-configuration)

- [Webhook Signature Verification](#-webhook-signature-verification)

- [TypeScript Definitions](#-typescript-definitions)

- [License & Support](#-license--support)

---

## 🏗️ Overview & Architecture

`@chefu-tech/logix-next` provides a unified logging engine designed specifically for modern React and Next.js applications (App Router & Pages Router). 

Logix uses an in-memory buffer transport that automatically aggregates telemetry payloads on both the client and server. Instead of sending an HTTP request per log entry (which degrades application performance), logs are flushed asynchronously in optimized batches to your Logix ingestion pipeline.

```text

┌─────────────────────────────────────────────────────────┐

│              Next.js / React Application                │

│                                                         │

│  Client Components  │  Server Components / Actions      │

│  logger.info()      │  logger.error()                   │

└──────────┬──────────────────────────┬───────────────────┘

           │                          │

           ▼                          ▼

┌─────────────────────────────────────────────────────────┐

│            Logix In-Memory Batch Buffer                 │

│         (Max Queue: 10 | Flush Interval: 2s)            │

└──────────────────────────┬──────────────────────────────┘

                           │

                           ▼

┌─────────────────────────────────────────────────────────┐

│                Logix Ingestion Gateway                  │

│               (ClickHouse / NATS / SSE)                 │

└─────────────────────────────────────────────────────────┘

```

---

## 📦 Installation

Install `@chefu-tech/logix-next` along with its peer dependencies using your package manager of choice:

```bash

# npm

npm install @chefu-tech/logix-next

# pnpm

pnpm add @chefu-tech/logix-next

# yarn

yarn add @chefu-tech/logix-next

```

---

## 📊 Core Concepts & Telemetry Schema

Logix structures logs beyond plain text messages. Every event payload supports optional context objects for user tracking, operational metrics, security auditing, and subsystem breakdowns.

### Structured Log Level Hierarchy

\| Level | Severity | Description |

\| --- | --- | --- |

\| `fatal` / `critical` | `4` | System instability, database failure, unhandled crash. |

\| `error` | `3` | Operational errors, API failure, exceptions caught in catch blocks. |

\| `warning` / `warn` | `2` | Degraded features, rate limit warnings, deprecated access. |

\| `info` | `1` | Informational events, user flow completions, state transitions. |

\| `debug` | `0` | Verbose debug outputs, local state dumps, network payloads. |

\| `audit` | `1` | Security actions (logins, password resets, permission changes). |

\| `metric` | `1` | Custom application performance measurements and latencies. |

---

## ⚡ Quick Start Guide

### Creating a Global Logger Singleton

Create a centralized logger module in your application to handle server and client events.

```typescript

// lib/logger.ts

import { createLogger } from '@chefu-tech/logix-next';

export const logger = createLogger({

  apiKey: process.env.LOGIX_API_KEY!,

  endpoint: process.env.NEXT_PUBLIC_LOGIX_SERVER_URI || '[https://logix.chefu.co.za/api](https://logix.chefu.co.za/api)',

  batchSize: 10,       // Batch size before auto-flush

  flushInterval: 2000, // Maximum time (ms) logs remain in buffer

});

```

### Basic Logging Examples

```typescript

import { logger } from '@/lib/logger';

// Standard log shorthand methods

logger.info('Application initialized successfully');

logger.warn('High memory consumption detected', { heapUsedMb: 412 });

logger.error('Failed to connect to primary database', { dbHost: 'db-1.internal' });

logger.debug('State payload inspection', { stateId: 'st_8832' });

// Comprehensive structured payload

logger.log({

  type: 'audit',

  message: 'User modified organization permissions',

  appName: 'chefu-dashboard',

  environment: process.env.NODE_ENV || 'production',

  service: 'identity-service',

  subsystem: 'rbac',

  operation: 'update_role',

  importance: 'high',

  track: {

    userId: 'usr_99482',

    orgId: 'org_chefu_01',

    changedBy: 'admin_01',

  },

  security: {

    ip: '102.132.220.1',

    userAgent: 'Mozilla/5.0...',

    mfaVerified: true,

  },

  metrics: {

    durationMs: 42,

  },

});

```

---

## 🌐 Next.js Integration Guide

To prevent exposing internal Logix API Keys to the browser, Next.js applications should route client-side queries and live streams through API proxy routes.

### 1. Environment Setup

Add your Logix credentials to your `.env.local` file:

```env

# Shared API key for SDK client-side proxies

LOGIX_API_KEY="logix_live_your_api_key_here"

# Core Logix ingestion endpoint

NEXT_PUBLIC_LOGIX_SERVER_URI="[https://your-logix-instance.co.za](https://your-logix-instance.co.za)"

```

---

### 2. Next.js API Proxy Routes (App Router)

Create a dynamic API route to proxy client-side `getLogs` and `getStream` requests.

#### Proxy Route for Log Fetching & SSE Streaming

`app/api/logix/[types]/route.ts`:

```typescript

import { NextRequest, NextResponse } from 'next/server';

export async function GET(

  req: NextRequest,

  { params }: { params: { types: string } }

) {

  const apiKey = process.env.LOGIX_API_KEY;

  if (!apiKey) {

    return NextResponse.json({ error: 'API Key unconfigured' }, { status: 500 });

  }

  const targetType = params.types; // Resolves to 'logs' or 'stream'

  const searchParams = req.nextUrl.searchParams.toString();

  const backendUrl = `${process.env.NEXT_PUBLIC_LOGIX_SERVER_URI}/logs${

    targetType === 'stream' ? '/stream' : ''

  }?${searchParams}`;

  const response = await fetch(backendUrl, {

    headers: {

      'x-api-key': apiKey,

    },

    cache: 'no-store',

  });

  return new NextResponse(response.body, {

    status: response.status,

    headers: {

      'Content-Type': response.headers.get('Content-Type') || 'application/json',

      'Cache-Control': 'no-cache',

      Connection: 'keep-alive',

    },

  });

}

```

---

### 3. Server Actions & Server Components

Use the logger instance directly in Next.js Server Components, Server Actions, and Middleware:

```typescript

// app/actions/auth.ts

'use server';

import { logger } from '@/lib/logger';

export async function loginUser(formData: FormData) {

  const email = formData.get('email') as string;

  try {

    // Perform authentication logic...

    logger.log({

      type: 'info',

      message: 'User authentication successful',

      appName: 'logix-portal',

      environment: process.env.NODE_ENV,

      track: { email },

    });

    // Ensure buffered log batch is delivered before redirecting

    await logger.flush();

    return { success: true };

  } catch (error: any) {

    logger.error('Authentication attempt failed', {

      email,

      error: error.message,

    });

    await logger.flush();

    throw error;

  }

}

```

---

## 🎣 React Hooks Reference

### Real-Time Stream Hook (`getStream`)

The `getStream` hook establishes a persistent Server-Sent Events (SSE) tail stream to render live logs in your dashboard terminal components. It includes auto-reconnection and a circular buffer limit (capped at 5,000 logs) to prevent browser memory leaks.

```tsx

'use client';

import { useState } from 'react';

import { getStream } from '@chefu-tech/logix-next';

export default function LiveLogViewer() {

  const [filterLevel, setFilterLevel] = useState<string>('');

  const [searchTerm, setSearchTerm] = useState<string>('');

  const { data: logs, connected, isLoading, error, disconnect } = getStream({

    type: filterLevel,

    search: searchTerm,

  });

  return (

    <div className="p-4 bg-black text-green-400 font-mono text-xs rounded-lg">

      <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-2">

        <div className="flex items-center gap-2">

          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />

          <span>STATUS: {connected ? 'CONNECTED (LIVE)' : 'DISCONNECTED'}</span>

        </div>

        <div className="flex gap-2">

          <input

            type="text"

            placeholder="Search stream..."

            value={searchTerm}

            onChange={(e) => setSearchTerm(e.target.value)}

            className="bg-gray-900 border border-gray-700 px-2 py-1 text-white rounded"

          />

          <button onClick={disconnect} className="bg-red-950 text-red-400 px-2 py-1 rounded">

            Stop Stream

          </button>

        </div>

      </div>

      <div className="h-96 overflow-y-auto space-y-1">

        {isLoading && logs.length === 0 ? (

          <div>Connecting to live tail server...</div>

        ) : logs.length === 0 ? (

          <div className="text-gray-600">No incoming stream events matching active filters.</div>

        ) : (

          logs.map((log) => (

            <div key={log.id} className="hover:bg-gray-900 p-1 rounded">

              <span className="text-gray-500">[{log.ts}]</span>{' '}

              <span className="text-yellow-400 font-bold">[{log.level.toUpperCase()}]</span>{' '}

              <span className="text-blue-400">[{log.source}]</span>:{' '}

              <span className="text-gray-200">{log.message}</span>

            </div>

          ))

        )}

      </div>

    </div>

  );

}

```

---

### Historical Query Hook (`getLogs`)

The `getLogs` hook queries historical records stored in Logix's ClickHouse analytics engine. It features in-flight promise deduplication (preventing duplicate fetches during React 18 Strict Mode mounts) and automatic response caching.

```tsx

'use client';

import { useState } from 'react';

import { getLogs } from '@chefu-tech/logix-next';

export default function HistoricalQueryTable() {

  const [search, setSearch] = useState<string>('');

  const [appName, setAppName] = useState<string>('');

  const { data: logs, isLoading, error, refetch } = getLogs({

    search,

    appName,

    type: 'error',

    limit: 100,

  });

  return (

    <div className="space-y-4">

      <div className="flex gap-2">

        <input

          type="text"

          placeholder="Filter logs by message..."

          value={search}

          onChange={(e) => setSearch(e.target.value)}

          className="border p-2 rounded text-sm w-full"

        />

        <button onClick={() => refetch()} className="bg-blue-600 text-white px-4 py-2 rounded text-sm">

          Refresh

        </button>

      </div>

      {isLoading ? (

        <p>Executing ClickHouse query...</p>

      ) : error ? (

        <p className="text-red-500">Error loading query: {error.message}</p>

      ) : (

        <table className="w-full text-left text-xs font-mono border">

          <thead className="bg-gray-100 border-b">

            <tr>

              <th className="p-2">Timestamp</th>

              <th className="p-2">Level</th>

              <th className="p-2">App Name</th>

              <th className="p-2">Message</th>

            </tr>

          </thead>

          <tbody>

            {logs?.map((log: any, index: number) => (

              <tr key={log.id || index} className="border-b hover:bg-gray-50">

                <td className="p-2 text-gray-500">{new Date(log.timestamp * 1000).toLocaleString()}</td>

                <td className="p-2 font-bold uppercase">{log.type}</td>

                <td className="p-2">{log.app_name || 'default'}</td>

                <td className="p-2">{log.message}</td>

              </tr>

            ))}

          </tbody>

        </table>

      )}

    </div>

  );

}

```

---

## ⚙️ Advanced SDK Configuration

You can customize buffering and flushing parameters when creating your `Logger` instance:

```typescript

import { Logger } from '@chefu-tech/logix-next';

const customLogger = new Logger({

  apiKey: process.env.LOGIX_API_KEY!,

  endpoint: '[https://custom-ingestion-domain.com](https://custom-ingestion-domain.com)',

  batchSize: 25,       // Send payload batch once 25 items are collected

  flushInterval: 5000, // Or auto-flush every 5 seconds

});

```

---

## 🛡️ Webhook Signature Verification

Logix allows you to configure real-time alert webhooks. To ensure incoming HTTP requests originate from your Logix engine and haven't been tampered with, use `verifyWebhook`:

```typescript

// app/api/webhooks/logix-alerts/route.ts

import { NextResponse } from 'next/server';

import { logger } from '@/lib/logger';

export async function POST(req: Request) {

  try {

    const body = await req.json();

    const signature = req.headers.get('x-signature') || '';

    const timestamp = req.headers.get('x-timestamp') || '';

    // Verify signature against backend

    const verification = await logger.verifyWebhook({

      signature,

      timestamp,

      body,

    });

    if (!verification.valid) {

      return NextResponse.json(

        { error: `Invalid signature: ${verification.error}` },

        { status: 401 }

      );

    }

    // Process alert notification payload

    const { alertId, alertName, sampleLog } = body;

    console.log(`Alert Triggered [${alertName}]:`, sampleLog);

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (err: any) {

    return NextResponse.json({ error: err.message }, { status: 500 });

  }

}

```

---

## 📐 TypeScript Definitions

The SDK exposes types for log customization and hook integration:

```typescript

import type {

  LoggerConfig,

  LogPayload,

  LogLevel,

  Importance,

  VerifyWebhookOptions,

  VerifyWebhookResult,

  StreamLogNormalized,

  GetStreamResult,

  GetLogsResult,

} from '@chefu-tech/logix-next';

```

---

## 📄 License & Support

Distributed under the **MIT License**.

Developed and maintained by [CHEFU Technologies](https://chefu.co.za).

For technical issues, bug reports, or feature requests, visit the [logix-sdk GitHub repository](https://github.com/CHEFU-TECHNOLOGIES/logix-sdk/issues).


---

### Step to Update NPM

1. Save the new `README.md` in your SDK root directory (`D:\CheFuProj\logix-sdks\README.md`).

2. Update the patch version in `package.json`:

   ```json

   "version": "1.0.2"

```

3. Run the publish command:

```bash

npm publish --access public

```





The npm package page at `[https://www.npmjs.com/package/@chefu-tech/logix-next](https://www.npmjs.com/package/@chefu-tech/logix-next)` will render the complete, detailed documentation with all guides and code examples.
