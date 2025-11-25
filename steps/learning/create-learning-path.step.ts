import { ApiRouteConfig, Handlers } from 'motia';
import { withAuth } from '../common/middleware/auth-middleware';
import { z } from 'zod';

// Schema for Create Learning Path
const createLearningPathSchema = z.object({
  topic: z.string().min(1, 'Topic is required').trim(),
  background: z.string().min(1, 'Background information is required').trim(),
  goalLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional().default('intermediate'),
  preferences: z.object({
    includeVideos: z.boolean().optional().default(false),
    includeArticles: z.boolean().optional().default(true),
    includeDocs: z.boolean().optional().default(true),
    languages: z.array(z.string()).optional().default(['en'])
  }).optional()
});

export const config: ApiRouteConfig = {
  type: 'api',
  name: 'CreateLearningPath',
  description: "Create a new learning path",
  path: '/api/learning/path',
  method: 'POST',
  emits: ['learning.path.requested'],
  bodySchema: createLearningPathSchema,
  flows: ['RoadMapAI'],
};

// Handler implementation - wrapped with auth middleware
const createLearningPathHandler: Handlers['CreateLearningPath'] = async (req: any, { emit, logger, streams, traceId }: any) => {
  try {
    // Validate request body
    const validatedData = createLearningPathSchema.parse(req.body);
    
    // Get user ID from JWT (assuming auth middleware sets it)
    const userId = req.user?.userId;
    if (!userId) {
      return {
        status: 401,
        body: { message: 'Unauthorized - User ID not found' }
      };
    }

    if (logger) {
      logger.info('🎓 Learning path creation requested', {
        userId,
        topic: validatedData.topic,
        goalLevel: validatedData.goalLevel,
        traceId
      });
    }

    // Initialize stream with starting message
    let streamResult;
    if (streams && streams.learningPathCreation) {
      streamResult = await streams.learningPathCreation.set(traceId, 'learningPath', {
        stage: 'analyzing',
        message: `Starting to analyze "${validatedData.topic}" for your learning journey...`,
        progress: 5,
        timestamp: Date.now()
      });
    } else {
      if (logger) {
        logger.warn('⚠️ Stream not available, progress updates will not be sent', {
          hasStreams: !!streams,
          hasLearningPath: !!(streams && streams.learningPathCreation)
        });
      }
    }

    // Emit event to trigger Python LangGraph agent
    if (emit) {
      await emit({
        topic: 'learning.path.requested',
        data: {
          userId,
          topic: validatedData.topic,
          background: validatedData.background,
          goalLevel: validatedData.goalLevel,
          preferences: validatedData.preferences,
          traceId,
          requestedAt: Date.now()
        }
      } as any);

      if (logger) {
        logger.info('✅ Event emitted to LangGraph agent', {
          userId,
          topic: validatedData.topic,
          traceId
        });
      }
    }

    // Return immediately with stream information
    // Client can connect to SSE endpoint with streamId to get real-time updates
    return {
      status: 202, 
      body: {
        message: 'Learning path generation started',
        streamId: streamResult?.streamId,
        traceId: traceId,
        topic: validatedData.topic,
        estimatedTime: '2-3 minutes',
        status: 'processing',
        // Client can poll this endpoint or use SSE
        statusUrl: `/api/learning/path/status/${traceId}`
      }
    };

  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        status: 400,
        body: {
          message: 'Validation error',
          errors: error.message,
        }
      };
    }

    if (logger) {
      logger.error('❌ Learning path creation failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return {
      status: 500,
      body: { 
        message: 'Failed to create learning path',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
};

export const handler = withAuth(createLearningPathHandler);