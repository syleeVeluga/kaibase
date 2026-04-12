import type { ContentBlock } from '@kaibase/shared';
import * as styles from './BlockContentViewer.css.js';

interface BlockContentViewerProps {
  blocks: ContentBlock[];
  emptyMessage?: string;
}

export function BlockContentViewer({
  blocks,
  emptyMessage = 'No content',
}: BlockContentViewerProps): React.ReactElement {
  if (blocks.length === 0) {
    return <div className={styles.emptyMessage}>{emptyMessage}</div>;
  }

  return (
    <div className={styles.container}>
      {blocks.map((block, i) => (
        <BlockRenderer key={i} block={block} />
      ))}
    </div>
  );
}

function BlockRenderer({ block }: { block: ContentBlock }): React.ReactElement | null {
  const citationMarkers = block.citations?.length ? (
    <CitationMarkers ids={block.citations} />
  ) : null;

  switch (block.type) {
    case 'heading': {
      const level = block.level ?? 2;
      const className =
        level === 1
          ? styles.heading1
          : level === 3
            ? styles.heading3
            : styles.heading2;
      return (
        <div className={className}>
          {block.content}
          {citationMarkers}
        </div>
      );
    }

    case 'paragraph':
      return (
        <p className={styles.paragraph}>
          {block.content}
          {citationMarkers}
        </p>
      );

    case 'list':
      return (
        <div>
          <ul className={styles.list}>
            {(block.items ?? []).map((item, i) => (
              <li key={i} className={styles.listItem}>
                {item}
              </li>
            ))}
          </ul>
          {citationMarkers}
        </div>
      );

    case 'quote':
      return (
        <blockquote className={styles.quote}>
          {block.content}
          {citationMarkers}
        </blockquote>
      );

    case 'table':
      return (
        <div>
          <table className={styles.table}>
            {block.headers && (
              <thead>
                <tr>
                  {block.headers.map((h, i) => (
                    <th key={i}>{h}</th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {(block.rows ?? []).map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {citationMarkers}
        </div>
      );

    case 'divider':
      return <hr className={styles.divider} />;

    default:
      return null;
  }
}

function CitationMarkers({ ids }: { ids: string[] }): React.ReactElement {
  return (
    <>
      {ids.map((id, i) => (
        <span key={id} className={styles.citation} title={id}>
          [{i + 1}]
        </span>
      ))}
    </>
  );
}
