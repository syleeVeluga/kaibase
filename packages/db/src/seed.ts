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
import type { NewCollection } from './schema/index.js';

// The 8 default collections every workspace must have, in display order.
const DEFAULT_COLLECTIONS: Omit<NewCollection, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>[] =
  [
    {
      name: 'Inbox',
      nameKo: '받은편지함',
      collectionType: 'inbox',
      description: 'Newly ingested items awaiting processing',
      sortOrder: 0,
    },
    {
      name: 'Projects',
      nameKo: '프로젝트',
      collectionType: 'project',
      description: 'Project-scoped knowledge pages',
      sortOrder: 1,
    },
    {
      name: 'Entities',
      nameKo: '엔티티',
      collectionType: 'entities',
      description: 'Entity pages (people, organisations, products)',
      sortOrder: 2,
    },
    {
      name: 'Concepts',
      nameKo: '개념',
      collectionType: 'concepts',
      description: 'Concept and topic pages',
      sortOrder: 3,
    },
    {
      name: 'Briefs',
      nameKo: '브리프',
      collectionType: 'briefs',
      description: 'AI-generated briefs and answer pages',
      sortOrder: 4,
    },
    {
      name: 'Review Queue',
      nameKo: '검토 대기열',
      collectionType: 'review_queue',
      description: 'Items pending human review',
      sortOrder: 5,
    },
    {
      name: 'Knowledge Index',
      nameKo: '지식 색인',
      collectionType: 'knowledge_index',
      description: 'Catalog of all canonical pages',
      sortOrder: 6,
    },
    {
      name: 'Activity Log',
      nameKo: '활동 로그',
      collectionType: 'activity_log',
      description: 'System event timeline',
      sortOrder: 7,
    },
  ];

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
