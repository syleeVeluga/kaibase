import { useTranslation } from 'react-i18next';
import { getErrorMessage } from '../lib/get-error-message.js';
import * as shared from '../theme/shared.css.js';

interface ErrorBannerProps {
  error: unknown;
  onRetry?: () => void;
}

export function ErrorBanner({ error, onRetry }: ErrorBannerProps): React.ReactElement {
  const { t } = useTranslation(['errors', 'common']);
  const message = getErrorMessage(error, t);

  return (
    <div className={shared.errorBanner}>
      <span>{message}</span>
      {onRetry && (
        <button className={shared.secondaryButton} onClick={onRetry}>
          {t('common:actions.retry')}
        </button>
      )}
    </div>
  );
}
