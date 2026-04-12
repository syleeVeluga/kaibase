export type GraphNodeType = 'page' | 'entity' | 'concept' | 'source';

export type GraphEdgeType =
  | 'cites'
  | 'mentions'
  | 'related_to'
  | 'parent_of'
  | 'derived_from'
  | 'contradicts';

export interface GraphNode {
  id: string;
  workspaceId: string;
  nodeType: GraphNodeType;
  refId: string;
  label: string;
  metadata: Record<string, unknown>;
  updatedAt: Date;
}

export interface GraphEdge {
  id: string;
  workspaceId: string;
  edgeType: GraphEdgeType;
  sourceNodeId: string;
  targetNodeId: string;
  weight: number | null;
  metadata: Record<string, unknown>;
  updatedAt: Date;
}
