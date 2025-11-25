import { ApiRouteConfig, Handlers } from 'motia';
import { withAuth } from '../common/middleware/auth-middleware';
import { connectToDatabase } from '../common/db';
import { LearningPath } from '../common/models';
import { z } from 'zod';

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'GetUserLearningPaths',
  description: 'Get all learning paths for the authenticated user',
  path: '/api/learning/paths',
  method: 'GET',
  emits: [],
  bodySchema: z.object({}),
  flows: ['RoadMapAI'],
};

const getUserLearningPathsHandler: Handlers['GetUserLearningPaths'] = async (req: any, { logger }) => {
  try {
    await connectToDatabase();
    
    const userId = req.user?.userId;

    if (!userId) {
      return {
        status: 401,
        body: { message: 'Unauthorized' }
      };
    }

    const learningPaths = await LearningPath.find({ userId })
      .sort({ createdAt: -1 })
      .select('topic goalLevel status createdAt traceId curriculum.title curriculum.total_hours');

    return {
      status: 200,
      body: {
        learningPaths
      }
    };

  } catch (error: any) {
    logger.error('Failed to get user learning paths', { error: error.message });
    return {
      status: 500,
      body: { message: 'Internal server error' }
    };
  }
};

export const handler = withAuth(getUserLearningPathsHandler);
