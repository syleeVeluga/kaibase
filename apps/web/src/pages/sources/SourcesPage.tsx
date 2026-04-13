import { useState, useCallback, useRef } from 'react';
import type { FormEvent, DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiClient } from '../../lib/api-client.js';
import { useWorkspace } from '../../lib/workspace-context.js';
import { StatusBadge } from '../../components/StatusBadge.js';
import * as shared from '../../theme/shared.css.js';
import * as styles from './SourcesPage.css.js';

type Tab = 'list' | 'upload' | 'connectors';

interface Source {
  id: string;
  sourceType: string;
  title: string;
  status: string;
  channel: string;
  ingestedAt: string;
}

function hasActiveSources(sources: Source[] | undefined): boolean {
  return sources?.some((s) => s.status === 'pending' || s.status === 'processing') ?? false;
}

interface Connector {
  id: string;
  connectorType: string;
  name: string;
  syncStatus: string;
  fileCount: number | null;
  lastSyncedAt: string | null;
  config: Record<string, unknown>;
}

interface UploadResponse {
  id: string;
  deduplicated?: boolean;
  replaced?: boolean;
  retried?: boolean;
  cancelled?: boolean;
}

interface FilenameConflictErrorDetails {
  existingSource?: {
    id?: string;
  };
}

export function SourcesPage(): React.ReactElement {
  const { t } = useTranslation();
  const { workspace } = useWorkspace();
  const [activeTab, setActiveTab] = useState<Tab>('list');

  if (!workspace) return <div className={shared.loading}>Select a workspace</div>;

  return (
    <div>
      <div className={shared.pageHeader}>
        <h1 className={shared.pageTitle}>{t('nav.sources')}</h1>
      </div>

      <div className={styles.tabs}>
        <button
          className={activeTab === 'list' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('list')}
        >
          All Sources
        </button>
        <button
          className={activeTab === 'upload' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('upload')}
        >
          Add Source
        </button>
        <button
          className={activeTab === 'connectors' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('connectors')}
        >
          Connectors
        </button>
      </div>

      {activeTab === 'list' && <SourceList workspaceId={workspace.id} />}
      {activeTab === 'upload' && <UploadPanel workspaceId={workspace.id} />}
      {activeTab === 'connectors' && <ConnectorPanel workspaceId={workspace.id} />}
    </div>
  );
}

/* ---------- Source List ---------- */

function SourceList({ workspaceId }: { workspaceId: string }): React.ReactElement {
  const query = useQuery({
    queryKey: ['sources', workspaceId],
    queryFn: () =>
      apiClient.get<{ sources: Source[] }>(`/workspaces/${workspaceId}/sources`),
    refetchInterval: (query) =>
      hasActiveSources(query.state.data?.sources) ? 3000 : false,
  });

  const sources = query.data?.sources ?? [];

  if (query.isLoading) return <div className={shared.loading}>Loading...</div>;

  if (sources.length === 0) {
    return (
      <div className={shared.emptyState}>
        <p>No sources yet. Upload a file, paste a URL, or connect a folder.</p>
      </div>
    );
  }

  return (
    <table className={shared.table}>
      <thead>
        <tr>
          <th className={shared.th}>Title</th>
          <th className={shared.th}>Type</th>
          <th className={shared.th}>Channel</th>
          <th className={shared.th}>Status</th>
          <th className={shared.th}>Ingested</th>
        </tr>
      </thead>
      <tbody>
        {sources.map((s) => (
          <tr key={s.id}>
            <td className={shared.td}>{s.title}</td>
            <td className={shared.td}>{s.sourceType}</td>
            <td className={shared.td}>{s.channel}</td>
            <td className={shared.td}>
              <StatusBadge status={s.status} />
            </td>
            <td className={shared.td}>
              {new Date(s.ingestedAt).toLocaleDateString()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ---------- Upload / Add Source Panel ---------- */

function UploadPanel({ workspaceId }: { workspaceId: string }): React.ReactElement {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [success, setSuccess] = useState('');

  // File upload
  const uploadMutation = useMutation({
    mutationFn: async (file: File): Promise<UploadResponse> => {
      const buildFormData = (replaceSourceId?: string): FormData => {
        const formData = new FormData();
        formData.append('file', file);
        if (replaceSourceId) {
          formData.append('replaceExisting', 'true');
          formData.append('replaceSourceId', replaceSourceId);
        }
        return formData;
      };

      try {
        return await apiClient.upload<UploadResponse>(
          `/workspaces/${workspaceId}/sources/upload`,
          buildFormData(),
        );
      } catch (err) {
        if (!(err instanceof ApiError)) {
          throw err;
        }

        const details = err.body.details as FilenameConflictErrorDetails | undefined;
        const existingSourceId = details?.existingSource?.id;

        if (
          err.status === 409
          && err.body.code === 'SOURCE_FILENAME_CONFLICT'
          && existingSourceId
        ) {
          const confirmed = window.confirm(
            t('sourcesUpload.filenameConflictPrompt', { filename: file.name }),
          );

          if (!confirmed) {
            return { id: '', cancelled: true };
          }

          return apiClient.upload<UploadResponse>(
            `/workspaces/${workspaceId}/sources/upload`,
            buildFormData(existingSourceId),
          );
        }

        throw err;
      }
    },
    onSuccess: (data) => {
      if (data.cancelled) {
        return;
      }

      if (data.replaced) {
        setSuccess(t('sourcesUpload.fileReplaced'));
      } else if (data.deduplicated) {
        setSuccess(t('sourcesUpload.fileDeduplicated'));
      } else {
        setSuccess(data.id ? t('sourcesUpload.fileUploaded') : '');
      }

      void queryClient.invalidateQueries({ queryKey: ['sources', workspaceId] });
    },
  });

  // URL submit
  const [url, setUrl] = useState('');
  const urlMutation = useMutation({
    mutationFn: (submitUrl: string) =>
      apiClient.post<{ id: string }>(`/workspaces/${workspaceId}/sources/url`, {
        url: submitUrl,
      }),
    onSuccess: () => {
      setUrl('');
      setSuccess('URL submitted successfully!');
      void queryClient.invalidateQueries({ queryKey: ['sources', workspaceId] });
    },
  });

  // Text submit
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const textMutation = useMutation({
    mutationFn: () =>
      apiClient.post<{ id: string }>(`/workspaces/${workspaceId}/sources/text`, {
        title: textTitle,
        content: textContent,
      }),
    onSuccess: () => {
      setTextTitle('');
      setTextContent('');
      setSuccess('Text submitted successfully!');
      void queryClient.invalidateQueries({ queryKey: ['sources', workspaceId] });
    },
  });

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) uploadMutation.mutate(file);
    },
    [uploadMutation],
  );

  const handleFileSelect = useCallback(() => {
    const file = fileInputRef.current?.files?.[0];
    if (file) uploadMutation.mutate(file);
  }, [uploadMutation]);

  return (
    <div>
      {success && <div className={styles.successMessage}>{success}</div>}

      {/* File Upload */}
      <h3 style={{ fontWeight: 600, marginBottom: '8px' }}>Upload File</h3>
      <div
        className={dragging ? styles.dropZoneActive : styles.dropZone}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt,.md,.html"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
        {uploadMutation.isPending
          ? 'Uploading...'
          : 'Drop a file here or click to browse (PDF, DOCX, TXT, MD, HTML)'}
      </div>

      {/* URL Submit */}
      <h3 style={{ fontWeight: 600, marginTop: '24px', marginBottom: '8px' }}>
        Submit URL
      </h3>
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          if (url.trim()) urlMutation.mutate(url.trim());
        }}
      >
        <div className={styles.formGroup}>
          <input
            className={styles.formInput}
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/article"
          />
        </div>
        <button
          className={shared.primaryButton}
          type="submit"
          disabled={!url.trim() || urlMutation.isPending}
        >
          {urlMutation.isPending ? 'Submitting...' : 'Submit URL'}
        </button>
      </form>

      {/* Text Input */}
      <h3 style={{ fontWeight: 600, marginTop: '24px', marginBottom: '8px' }}>
        Paste Text
      </h3>
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          if (textTitle.trim() && textContent.trim()) textMutation.mutate();
        }}
      >
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Title</label>
          <input
            className={styles.formInput}
            value={textTitle}
            onChange={(e) => setTextTitle(e.target.value)}
            placeholder="Source title"
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Content</label>
          <textarea
            className={styles.formTextarea}
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            placeholder="Paste text content here..."
          />
        </div>
        <button
          className={shared.primaryButton}
          type="submit"
          disabled={!textTitle.trim() || !textContent.trim() || textMutation.isPending}
        >
          {textMutation.isPending ? 'Submitting...' : 'Submit Text'}
        </button>
      </form>
    </div>
  );
}

/* ---------- Connector Panel ---------- */

function ConnectorPanel({ workspaceId }: { workspaceId: string }): React.ReactElement {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['connectors', workspaceId],
    queryFn: () =>
      apiClient.get<{ connectors: Connector[] }>(
        `/workspaces/${workspaceId}/connectors`,
      ),
  });

  const [name, setName] = useState('');
  const [folderPath, setFolderPath] = useState('');

  const createMutation = useMutation({
    mutationFn: () =>
      apiClient.post<{ id: string }>(`/workspaces/${workspaceId}/connectors`, {
        connectorType: 'local_folder',
        name,
        config: { folderPath },
      }),
    onSuccess: () => {
      setName('');
      setFolderPath('');
      void queryClient.invalidateQueries({ queryKey: ['connectors', workspaceId] });
    },
  });

  const syncMutation = useMutation({
    mutationFn: (connectorId: string) =>
      apiClient.post<{ totalFiles: number; newFilesIngested: number }>(
        `/workspaces/${workspaceId}/connectors/${connectorId}/sync`,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['connectors', workspaceId] });
      void queryClient.invalidateQueries({ queryKey: ['sources', workspaceId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (connectorId: string) =>
      apiClient.delete(`/workspaces/${workspaceId}/connectors/${connectorId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['connectors', workspaceId] });
    },
  });

  const connectors = query.data?.connectors ?? [];

  return (
    <div>
      {/* Add Connector Form */}
      <div className={shared.card} style={{ marginBottom: '24px' }}>
        <h3 style={{ fontWeight: 600, marginBottom: '12px' }}>Connect Local Folder</h3>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (name.trim() && folderPath.trim()) createMutation.mutate();
          }}
        >
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Connector name</label>
            <input
              className={styles.formInput}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Project Alpha Docs"
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Folder path</label>
            <input
              className={styles.formInput}
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              placeholder="e.g. C:\Users\me\Documents\project"
            />
          </div>
          <button
            className={shared.primaryButton}
            type="submit"
            disabled={!name.trim() || !folderPath.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating...' : 'Connect Folder'}
          </button>
        </form>
      </div>

      {/* Connector List */}
      <h3 style={{ fontWeight: 600, marginBottom: '12px' }}>Active Connectors</h3>
      {query.isLoading && <div className={shared.loading}>Loading...</div>}
      {connectors.length === 0 && !query.isLoading && (
        <div className={shared.emptyState}>
          <p>No connectors configured yet.</p>
        </div>
      )}
      {connectors.map((c) => (
        <div key={c.id} className={styles.connectorCard}>
          <div className={styles.connectorInfo}>
            <span className={styles.connectorName}>{c.name}</span>
            <span className={styles.connectorMeta}>
              {c.connectorType} &middot; {c.fileCount ?? 0} files
              {c.lastSyncedAt &&
                ` · Last synced ${new Date(c.lastSyncedAt).toLocaleDateString()}`}
            </span>
          </div>
          <div className={styles.connectorActions}>
            <button
              className={shared.secondaryButton}
              onClick={() => syncMutation.mutate(c.id)}
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? 'Syncing...' : 'Sync Now'}
            </button>
            <button
              className={styles.dangerButton}
              onClick={() => deleteMutation.mutate(c.id)}
            >
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

