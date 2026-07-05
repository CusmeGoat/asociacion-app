import {NativeModules} from 'react-native';

const PUBLIC_API_BASE_URL = '';

function resolveApiBaseUrl() {
  const publicUrl = PUBLIC_API_BASE_URL.trim();
  if (publicUrl) {
    return publicUrl.replace(/\/$/, '');
  }

  const scriptUrl = NativeModules.SourceCode?.scriptURL as string | undefined;
  const host = scriptUrl?.match(/^https?:\/\/([^:/]+)/)?.[1];

  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return `http://${host}:8000`;
  }

  return 'http://127.0.0.1:8000';
}

export const API_BASE_URL = resolveApiBaseUrl();
