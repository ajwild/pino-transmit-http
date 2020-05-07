import { LogEvent } from 'pino';

interface Headers {
  [key: string]: string;
}

export interface TransmitHttpOptions {
  throttle?: number;
  debounce?: number;
  url?: string;
  useSendBeacon?: boolean;
  method?: string;
  fetch?: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
  level?: string;
  headers?: Headers | null;
  onError?: (e: Error, data: string, headers: Headers) => any;
  prepareBody?: (collection: LogEvent[]) => Promise<string>;
  prepareHeaders?: (headers: Headers | null) => Promise<Headers | null>;
}

export interface BrowserTransmit {
  level: string;
  send: (level: string, logEvent: LogEvent) => Promise<void> | void;
  flush: () => Promise<void> | void;
}

export default function transmitHttp(options?: TransmitHttpOptions): BrowserTransmit;
