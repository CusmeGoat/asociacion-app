import AsyncStorage from '@react-native-async-storage/async-storage';

import {API_BASE_URL} from '../config/api';

type RequestOptions = RequestInit & {
  auth?: boolean;
  retry?: boolean;
};

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export class ApiClient {
  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const headers = new Headers(options.headers);
    if (!(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    if (options.auth !== false) {
      const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });

    if (response.status === 401 && options.auth !== false && options.retry !== false) {
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
