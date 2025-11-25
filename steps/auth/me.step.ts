import { ApiRouteConfig, Handlers } from 'motia';
import { withAuth } from '../common/middleware/auth-middleware';

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'GetCurrentUser',
  description: 'Get current logged in user details',
  path: '/auth/me',
  method: 'GET',
  emits: [],
  flows: ['Authentication'],
};

const meHandler: Handlers['GetCurrentUser'] = async (req, { logger }) => {
  const user = (req as any).user;
  
  logger.info('GetCurrentUser accessed', { userId: user.userId });

  return {
    status: 200,
    body: {
      user,
    },
  };
};

export const handler = withAuth(meHandler);
