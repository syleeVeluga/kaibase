import type { AuthUser } from './middleware/auth.js';

export interface AppEnv {
  Variables: {
    user: AuthUser;
    workspaceId: string;
    requestId: string;
  };
}
