/**
 * Fetch and resolve AI prompt config for a given function and workspace.
 *
 * Wraps the config resolver from @kaibase/ai with DB lookups.
 */

import { eq, and } from 'drizzle-orm';
import { db } from '@kaibase/db';
import { aiPromptConfigs } from '@kaibase/db';
import { resolvePromptConfig } from '@kaibase/ai';
import type { ResolvedPromptConfig } from '@kaibase/ai';
import type { AiPromptFunctionId } from '@kaibase/shared';

// Re-export applyPromptOverrides from @kaibase/ai for convenience
export { applyPromptOverrides } from '@kaibase/ai';

/**
 * Resolve the effective AI config for a function in a workspace.
 * Queries the DB for any workspace-level override, then merges with
 * env var and code defaults.
 */
export async function resolveAiConfig(
  functionId: AiPromptFunctionId,
  workspaceId: string,
): Promise<ResolvedPromptConfig> {
  const rows = await db
    .select()
    .from(aiPromptConfigs)
    .where(
      and(
        eq(aiPromptConfigs.workspaceId, workspaceId),
        eq(aiPromptConfigs.functionId, functionId),
      ),
    )
    .limit(1);

  const dbRow = rows[0] ?? null;
  return resolvePromptConfig(functionId, dbRow);
}
