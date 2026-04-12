import { useState, useRef, useEffect, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client.js';
import { useWorkspace } from '../lib/workspace-context.js';
import { MutationError } from '../components/MutationError.js';
import * as shared from '../theme/shared.css.js';
import * as styles from './QAPage.css.js';

interface AnswerCitation {
  type: 'canonical_page' | 'raw_source';
  refId: string;
  title: string;
  excerpt: string;
}

interface QAResponse {
  answerId: string;
  answer: string;
  citations: AnswerCitation[];
  confidence: number;
  intentType: string;
  canonicalOnly: boolean;
}

interface ConversationEntry {
  question: string;
  response: QAResponse;
}

export function QAPage(): React.ReactElement {
  const { t } = useTranslation(['qa', 'common']);
  const { workspace } = useWorkspace();
  const wid = workspace?.id;
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState<ConversationEntry[]>([]);
  const [promotedIds, setPromotedIds] = useState<Set<string>>(new Set());
  const answerEndRef = useRef<HTMLDivElement>(null);

  const askMutation = useMutation({
    mutationFn: (q: string) =>
      apiClient.post<QAResponse>(`/workspaces/${wid}/qa/ask`, { question: q }),
    onSuccess: (data, q) => {
      setHistory((prev) => [...prev, { question: q, response: data }]);
      setQuestion('');
    },
  });

  const promoteMutation = useMutation({
    mutationFn: (answerId: string) =>
      apiClient.post<{ pageId: string; slug: string; status: string }>(
        `/workspaces/${wid}/qa/answers/${answerId}/promote`,
        { pageType: 'answer' },
      ),
    onSuccess: (_data, answerId) => {
      setPromotedIds((prev) => new Set(prev).add(answerId));
    },
  });

  useEffect(() => {
    answerEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || askMutation.isPending) return;
    askMutation.mutate(trimmed);
  };

  if (!wid) return <div className={shared.loading}>Select a workspace</div>;

  const confidenceColor = (c: number): string =>
    c >= 0.7 ? '#16a34a' : c >= 0.4 ? '#d97706' : '#dc2626';

  return (
    <div className={styles.container}>
      <div className={styles.answerArea}>
        {history.length === 0 && !askMutation.isPending && (
          <div className={styles.emptyPrompt}>
            <div className={styles.emptyTitle}>{t('qa:title')}</div>
            <div>{t('qa:placeholder')}</div>
          </div>
        )}

        {history.map((entry, idx) => (
          <div key={idx} className={styles.answerCard}>
            <div className={styles.questionText}>{entry.question}</div>
            <div className={styles.answerText}>{entry.response.answer}</div>

            {entry.response.citations.length > 0 && (
              <div className={styles.citationsSection}>
                <div className={styles.citationsTitle}>{t('qa:citations')}</div>
                {entry.response.citations.map((cit, citIdx) => (
                  <div key={citIdx} className={styles.citationItem}>
                    <span className={styles.citationIndex}>[{citIdx + 1}]</span>
                    <span>{cit.title} — {cit.excerpt.slice(0, 120)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className={styles.metaRow}>
              <span
                className={styles.confidenceBadge}
                style={{
                  backgroundColor: `${confidenceColor(entry.response.confidence)}15`,
                  color: confidenceColor(entry.response.confidence),
                }}
              >
                {Math.round(entry.response.confidence * 100)}%
              </span>
              <button
                className={shared.secondaryButton}
                onClick={() => promoteMutation.mutate(entry.response.answerId)}
                disabled={promoteMutation.isPending || promotedIds.has(entry.response.answerId)}
              >
                {t('qa:promote')}
              </button>
              {promotedIds.has(entry.response.answerId) && (
                <span style={{ fontSize: '12px', color: '#16a34a' }}>Saved!</span>
              )}
              <MutationError error={promoteMutation.error} />
            </div>
          </div>
        ))}

        {askMutation.isPending && (
          <div className={styles.answerCard}>
            <div className={shared.loading}>Thinking...</div>
          </div>
        )}

        {askMutation.isError && (
          <div className={styles.answerCard}>
            <div style={{ color: '#dc2626', fontSize: '14px' }}>
              {t('qa:noAnswer')}
            </div>
          </div>
        )}

        <div ref={answerEndRef} />
      </div>

      <form className={styles.inputArea} onSubmit={handleSubmit}>
        <input
          className={styles.inputField}
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={t('qa:placeholder')}
          disabled={askMutation.isPending}
        />
        <button
          className={shared.primaryButton}
          type="submit"
          disabled={askMutation.isPending || !question.trim()}
        >
          {askMutation.isPending ? '...' : t('qa:ask')}
        </button>
      </form>
    </div>
  );
}
