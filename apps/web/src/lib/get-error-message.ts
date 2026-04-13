import type { TFunction } from 'i18next';
import { ApiError, NetworkError } from './api-client.js';

export function getErrorMessage(err: unknown, t: TFunction): string {
  if (err instanceof NetworkError) {
    return t('backendUnavailable', { ns: 'errors' });
  }

  if (err instanceof ApiError) {
    const message = err.body['message'] as string | undefined;
    if (message && message.startsWith('errors.')) {
      const key = message.slice(7);
      const translated = t(key, { ns: 'errors' });
      if (translated !== key) return translated;
    }
  }

  if (err instanceof TypeError && err.message === 'Failed to fetch') {
    return t('backendUnavailable', { ns: 'errors' });
  }

  return t('internal', { ns: 'errors' });
}
