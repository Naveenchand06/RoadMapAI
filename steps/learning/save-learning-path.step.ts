import { EventConfig, Handlers } from 'motia';
import { connectToDatabase } from '../common/db';
import { LearningPath } from '../common/models';

export const config = {
  type: 'event',
  name: 'SaveLearningPath',
  description: 'Saves the generated learning path to MongoDB',
  subscribes: ['learning.path.generated', 'learning.path.failed'],
  emits: [],
  flows: ['RoadMapAI'],
};

export const handler: Handlers["SaveLearningPath"] = async (req, { logger }) => {
  // The 'req' object IS the data payload from the emitted event.
  // We distinguish between success and failure based on the presence of 'error' or 'learningPath'.
  
  const { userId, topic, traceId, learningPath, error } = req as any;

  logger.info('🔍 SaveLearningPath handler processing', { 
    userId, 
    topic, 
    traceId, 
    isSuccess: !!learningPath, 
    isError: !!error 
  });

  try {
    await connectToDatabase();

    if (learningPath) {
      logger.info('💾 Saving learning path to MongoDB', { userId, traceId });

      // Create new LearningPath document
      const newPath = new LearningPath({
        ...learningPath,
        userId,
        status: 'completed',
        traceId
      });

      await newPath.save();

      logger.info('✅ Learning path saved successfully', { 
        id: newPath._id,
        topic: learningPath.topic 
      });

    } else if (error) {
      logger.error('❌ Learning path generation failed', {
        userId,
        topic,
        error,
        traceId
      });
    } else {
      logger.warn('⚠️ Received unknown event payload structure', { req });
    }

  } catch (err: any) {
    logger.error('❌ Error in SaveLearningPath handler', {
      error: err.message,
      topic,
      traceId
    });
  }
};
