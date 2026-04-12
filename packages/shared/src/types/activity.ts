export type ActivityEventType =
  | 'ingest'
  | 'classify'
  | 'page_create'
  | 'page_update'
  | 'page_publish'
  | 'query'
  | 'answer'
  | 'review_create'
  | 'review_complete'
  | 'lint'
  | 'digest'
  | 'channel_send'
  | 'mcp_call';

export type ActorType = 'user' | 'ai' | 'system' | 'mcp_agent';

export interface ActivityEvent {
  id: string;
  workspaceId: string;
  eventType: ActivityEventType;
  actorType: ActorType;
  actorId: string | null;
  targetType: string | null;
  targetId: string | null;
  detail: Record<string, unknown>;
  createdAt: Date;
}
