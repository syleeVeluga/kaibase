import type { TFunction } from 'i18next';
import { ApiError } from './api-client.js';

export function getErrorMessage(err: unknown, t: TFunction): string {
  if (err instanceof ApiError) {
    const message = err.body['message'] as string | undefined;
    if (message && message.startsWith('errors.')) {
      const key = message.slice(7);
      const translated = t(key, { ns: 'errors' });
      if (translated !== key) return translated;
    }
  }
  return t('internal', { ns: 'errors' });
}
