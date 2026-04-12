export type ChannelType = 'email' | 'slack' | 'discord' | 'mcp' | 'webhook';

export type ChannelDirection = 'inbound' | 'outbound' | 'bidirectional';

export interface ChannelEndpoint {
  id: string;
  workspaceId: string;
  channelType: ChannelType;
  direction: ChannelDirection;
  config: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
