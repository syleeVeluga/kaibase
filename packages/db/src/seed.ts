/**
 * Seed script: initialise default collections for a workspace.
 *
 * Usage:
 *   tsx src/seed.ts [workspaceId]
 *
 * If workspaceId is omitted the script seeds ALL existing workspaces.
 */
import { eq } from 'drizzle-orm';
import { createClient } from './client.js';
import { workspaces, collections } from './schema/index.js';
import { DEFAULT_COLLECTIONS } from './collections.js';

async function seedWorkspace(db: ReturnType<typeof createClient>['db'], workspaceId: string): Promise<void> {
  console.log(`Seeding default collections for workspace ${workspaceId}...`);

  const existing = await db
    .select({ collectionType: collections.collectionType })
    .from(collections)
    .where(eq(collections.workspaceId, workspaceId));

  const existingTypes = new Set(existing.map((r) => r.collectionType));

  const missing = DEFAULT_COLLECTIONS.filter((t) => !existingTypes.has(t.collectionType));

  if (missing.length === 0) {
    console.log('  All default collections already exist.');
    return;
  }

  await db.insert(collections).values(
    missing.map((template) => ({ workspaceId, ...template })),
  );

  for (const t of missing) {
    console.log(`  Created collection: ${t.name}`);
  }
}

async function main(): Promise<void> {
  const { db, sql } = createClient();

  try {
    const targetWorkspaceId = process.argv[2];

    if (targetWorkspaceId !== undefined) {
      // Seed a single workspace
      await seedWorkspace(db, targetWorkspaceId);
    } else {
      // Seed all existing workspaces
      const allWorkspaces = await db
        .select({ id: workspaces.id, name: workspaces.name })
        .from(workspaces);

      if (allWorkspaces.length === 0) {
        console.log('No workspaces found. Create a workspace first, then re-run this seed.');
        return;
      }

      for (const ws of allWorkspaces) {
        console.log(`\nWorkspace: ${ws.name} (${ws.id})`);
        await seedWorkspace(db, ws.id);
      }
    }

    console.log('\nSeed complete.');
  } finally {
    await sql.end();
  }
}

main().catch((err: unknown) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
