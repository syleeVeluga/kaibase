import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { requestId } from 'hono/request-id';
import { errorHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/request-logger.js';
import { authRoutes } from './routes/auth.js';
import { workspaceRoutes } from './routes/workspaces.js';
import { sourceRoutes } from './routes/sources.js';
import { connectorRoutes } from './routes/connectors.js';
import { pageRoutes } from './routes/pages.js';
import { reviewRoutes } from './routes/reviews.js';
import { policyRoutes } from './routes/policies.js';
import { healthRoutes } from './routes/health.js';
import { collectionRoutes } from './routes/collections.js';
import { qaRoutes } from './routes/qa.js';
import { searchRoutes } from './routes/search.js';
import { activityRoutes } from './routes/activity.js';
import { templateRoutes } from './routes/templates.js';
import { dashboardRoutes } from './routes/dashboard.js';

export const app = new Hono();

// Global middleware
app.use('*', requestId());
app.use('*', cors({ origin: ['http://localhost:5173'], credentials: true }));
app.use('*', requestLogger());
app.onError(errorHandler);

// Health check
app.route('/api/health', healthRoutes);

// Auth routes (no workspace scoping)
app.route('/api/v1/auth', authRoutes);

// Workspace routes
app.route('/api/v1/workspaces', workspaceRoutes);

// Workspace-scoped resource routes
app.route('/api/v1/workspaces/:wid/sources', sourceRoutes);
app.route('/api/v1/workspaces/:wid/connectors', connectorRoutes);
app.route('/api/v1/workspaces/:wid/pages', pageRoutes);
app.route('/api/v1/workspaces/:wid/reviews', reviewRoutes);
app.route('/api/v1/workspaces/:wid/policy', policyRoutes);
app.route('/api/v1/workspaces/:wid/collections', collectionRoutes);
app.route('/api/v1/workspaces/:wid/qa', qaRoutes);
app.route('/api/v1/workspaces/:wid/search', searchRoutes);
app.route('/api/v1/workspaces/:wid/activity', activityRoutes);
app.route('/api/v1/workspaces/:wid/templates', templateRoutes);
app.route('/api/v1/workspaces/:wid/dashboard', dashboardRoutes);
