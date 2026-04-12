import { useTranslation } from 'react-i18next';
import { getErrorMessage } from '../lib/get-error-message.js';
import * as shared from '../theme/shared.css.js';

interface MutationErrorProps {
  error: unknown;
}

export function MutationError({ error }: MutationErrorProps): React.ReactElement | null {
  const { t } = useTranslation('errors');
  if (!error) return null;
  return <div className={shared.mutationError}>{getErrorMessage(error, t)}</div>;
}
