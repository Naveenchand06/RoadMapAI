import { ApiRouteConfig, Handlers } from 'motia';
import { withAuth } from '../common/middleware/auth-middleware';
import { connectToDatabase } from '../common/db';
import { LearningPath } from '../common/models';
import { z } from 'zod';

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'GetLearningPathDetails',
  description: 'Get details of a specific learning path by PathID',
  path: '/api/learning/path/:pathId',
  method: 'GET',
  emits: [],
  bodySchema: z.object({}),
  flows: ['RoadMapAI'],
};

const getLearningPathDetailsHandler: Handlers['GetLearningPathDetails'] = async (req: any, { logger }: any) => {
  try {
    await connectToDatabase();
    
    const userId = req.user?.userId;
    const pathId = req.pathParams?.pathId;

    if (!userId) {
      return {
        status: 401,
        body: { message: 'Unauthorized' }
      };
    }

    if (!pathId) {
      return {
        status: 400,
        body: { message: 'Trace ID is required' }
      };
    }

    const learningPath = await LearningPath.findOne({ _id: pathId, userId });

    if (!learningPath) {
      return {
        status: 404,
        body: { message: 'Learning path not found' }
      };
    }

    return {
      status: 200,
      body: {
        learningPath
      }
    };

  } catch (error: any) {
    logger.error('Failed to get learning path details', { error: error.message, traceId: req.params?.traceId });
    return {
      status: 500,
      body: { message: 'Internal server error' }
    };
  }
};

export const handler = withAuth(getLearningPathDetailsHandler);
