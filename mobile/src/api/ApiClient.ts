import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactNativeBlobUtil from 'react-native-blob-util';

import {API_BASE_URL} from '../config/api';

type RequestOptions = RequestInit & {
  auth?: boolean;
  retry?: boolean;
  timeoutMs?: number;
};

type MultipartField = {
  name: string;
  data: string;
  filename?: string;
  type?: string;
};

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const DEFAULT_TIMEOUT_MS = 15000;

function normalizeHeaders(input?: RequestInit['headers']) {
  const output: Record<string, string> = {};
  if (!input) return output;

  if (input instanceof Headers) {
    input.forEach((value, key) => {
      output[key] = value;
    });
    return output;
  }

  if (Array.isArray(input)) {
    input.forEach(([key, value]) => {
      output[key] = value;
    });
    return output;
  }

  Object.entries(input).forEach(([key, value]) => {
    if (typeof value === 'string') {
      output[key] = value;
    }
  });
  return output;
}

function isFormDataBody(body: RequestInit['body']) {
  return (
    typeof FormData !== 'undefined' &&
    (body instanceof FormData ||
      Boolean(body && typeof body === 'object' && '_parts' in body))
  );
}

export class ApiClient {
  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const {auth, retry, timeoutMs, ...fetchOptions} = options;
    const headers = normalizeHeaders(options.headers);
    if (isFormDataBody(options.body)) {
      delete headers['Content-Type'];
      delete headers['content-type'];
    } else {
      headers['Content-Type'] = 'application/json';
    }

    if (auth !== false) {
      const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs ?? DEFAULT_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}${path}`, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('La solicitud tardo demasiado. Verifica que el backend este levantado.');
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }

    if (response.status === 401 && auth !== false && retry !== false) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        return this.request<T>(path, {...options, retry: false});
      }
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(this.extractError(text));
    }

    return (await response.json()) as T;
  }

  async saveTokens(accessToken: string, refreshToken: string) {
    await AsyncStorage.multiSet([
      [ACCESS_TOKEN_KEY, accessToken],
      [REFRESH_TOKEN_KEY, refreshToken],
    ]);
  }

  async clearTokens() {
    await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
  }

  async getRefreshToken() {
    return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  }

  async uploadForm<T>(
    path: string,
    fields: MultipartField[],
    options: {
      method?: 'POST' | 'PUT' | 'PATCH';
      auth?: boolean;
      timeoutMs?: number;
      retry?: boolean;
    } = {},
  ): Promise<T> {
    const method = options.method ?? 'POST';
    const token = options.auth === false ? null : await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'multipart/form-data',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await ReactNativeBlobUtil.config({
        timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      }).fetch(method, `${API_BASE_URL}${path}`, headers, fields);
      const status = response.info().status;
      const text = await Promise.resolve(response.text());

      if (status === 401 && options.auth !== false && options.retry !== false) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          return this.uploadForm<T>(path, fields, {...options, retry: false});
        }
      }

      if (status < 200 || status >= 300) {
        throw new Error(this.extractError(text));
      }

      return text ? (JSON.parse(text) as T) : ({} as T);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`No se pudo subir el archivo al backend. ${detail}`);
    }
  }

  private async refreshToken() {
    const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      return false;
    }

    try {
      const data = await this.request<{
        access_token: string;
        refresh_token: string;
      }>('/auth/refresh', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({refresh_token: refreshToken}),
      });
      await this.saveTokens(data.access_token, data.refresh_token);
      return true;
    } catch {
      await this.clearTokens();
      return false;
    }
  }

  private extractError(text: string) {
    try {
      const parsed = JSON.parse(text);
      return parsed.detail ?? parsed.message ?? text;
    } catch {
      return text || 'Error de comunicacion con el servidor';
    }
  }
}

export const apiClient = new ApiClient();
