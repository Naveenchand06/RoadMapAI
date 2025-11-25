import { StreamConfig } from 'motia'
import { z } from 'zod'
 
export const config: StreamConfig = {
  name: 'learningPathCreation',
  schema: z.object({
    stage: z.enum([
      'analyzing',      // Analyzing user background and topic
      'researching',    // Researching topic and requirements
      'generating',     // Generating curriculum modules
      'enriching',      // Finding and ranking resources
      'completed',      // Learning path ready
      'error'          // Error occurred
    ]),
    message: z.string(),           
    progress: z.number().min(0).max(100),
    data: z.any().optional(),      
    timestamp: z.number().optional()
  }),
  baseConfig: {
    storageType: 'default',
  },
}