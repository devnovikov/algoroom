// API client configuration
// Toggle this flag to switch between mock and real API
export const USE_MOCKS = false;

// In production (Docker), use same origin (empty string)
// In development, use localhost:8000
export const API_BASE_URL = import.meta.env.VITE_API_URL ??
  (import.meta.env.PROD ? '' : 'http://localhost:8000');
export const WS_BASE_URL = import.meta.env.VITE_WS_URL ??
  (import.meta.env.PROD ? `ws://${window.location.host}` : 'ws://localhost:8000');

// Default timeout for API requests (10 seconds)
const DEFAULT_TIMEOUT = 10000;

// Custom error class for API errors
export class ApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {},
    timeout: number = DEFAULT_TIMEOUT
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    // Create AbortController for timeout and cancellation
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: 'An error occurred',
          code: 'UNKNOWN_ERROR',
        }));

        throw new ApiError(
          errorData.message || 'An error occurred',
          errorData.code || 'UNKNOWN_ERROR',
          response.status
        );
      }

      // Handle 204 No Content responses
      if (response.status === 204) {
        return undefined as T;
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new ApiError('Request timed out', 'TIMEOUT', 408);
        }
        throw new ApiError(error.message, 'NETWORK_ERROR', 0);
      }

      throw new ApiError('An unknown error occurred', 'UNKNOWN_ERROR', 0);
    }
  }

  async get<T>(endpoint: string, timeout?: number): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' }, timeout);
  }

  async post<T>(endpoint: string, data?: unknown, timeout?: number): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      },
      timeout
    );
  }

  async put<T>(endpoint: string, data: unknown, timeout?: number): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      },
      timeout
    );
  }

  async delete<T>(endpoint: string, timeout?: number): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' }, timeout);
  }
}

export const apiClient = new ApiClient();

// WebSocket connection manager with auto-reconnection
export type WebSocketState = 'connecting' | 'connected' | 'disconnected';

interface WebSocketManagerOptions<T> {
  url: string;
  onMessage: (data: T) => void;
  onStateChange?: (state: WebSocketState) => void;
  maxReconnectAttempts?: number;
  initialReconnectDelay?: number;
  maxReconnectDelay?: number;
}

export class WebSocketManager<T> {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private state: WebSocketState = 'disconnected';
  private isIntentionalClose = false;

  private readonly url: string;
  private readonly onMessage: (data: T) => void;
  private readonly onStateChange?: (state: WebSocketState) => void;
  private readonly maxReconnectAttempts: number;
  private readonly initialReconnectDelay: number;
  private readonly maxReconnectDelay: number;

  constructor(options: WebSocketManagerOptions<T>) {
    this.url = options.url;
    this.onMessage = options.onMessage;
    this.onStateChange = options.onStateChange;
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 10;
    this.initialReconnectDelay = options.initialReconnectDelay ?? 1000;
    this.maxReconnectDelay = options.maxReconnectDelay ?? 30000;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.isIntentionalClose = false;
    this.setState('connecting');

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.setState('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as T;
          this.onMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        this.ws = null;
        this.setState('disconnected');

        if (!this.isIntentionalClose) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        // onclose will be called after onerror
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.setState('disconnected');
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.isIntentionalClose = true;

    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.setState('disconnected');
  }

  private setState(state: WebSocketState): void {
    if (this.state !== state) {
      this.state = state;
      this.onStateChange?.(state);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    // Exponential backoff with jitter
    const delay = Math.min(
      this.initialReconnectDelay * Math.pow(2, this.reconnectAttempts) + Math.random() * 1000,
      this.maxReconnectDelay
    );

    this.reconnectAttempts++;

    console.log(`Reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimeoutId = setTimeout(() => {
      this.connect();
    }, delay);
  }

  getState(): WebSocketState {
    return this.state;
  }
}
