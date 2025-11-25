import { ApiRouteConfig, Handlers } from 'motia';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { connectToDatabase } from '../common/db';

import { User } from '../common/models';

// Validation Schema
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// Login APIEndpoint Configuration
export const config: ApiRouteConfig = {
  type: 'api',
  name: 'LoginUser',
  description: 'Login a user',
  path: '/auth/login',
  method: 'POST',
  emits: [],
  bodySchema: loginSchema,
  flows: ['Authentication'],
};

// Login APIEndpoint Handler Implementation
export const handler: Handlers['LoginUser'] = async (input, { logger }) => {
  try {
    await connectToDatabase();

    // Validate input
    const validatedData = loginSchema.parse(input.body);
    const { email, password } = validatedData;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return {
        status: 401,
        body: { error: 'Invalid credentials' },
      };
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return {
        status: 401,
        body: { error: 'Invalid credentials' },
      };
    }

    // Generate JWT Token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'dev-secret-key',
      { expiresIn: '24h' }
    );

    logger.info('User logged in successfully', { userId: user._id, email });

    return {
      status: 200,
      body: {
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      },
    };
  } catch (error: any) {
    logger.error('Login failed', { error: error.message });

    if (error instanceof z.ZodError) {
      return {
        status: 400,
        body: { error: 'Validation failed', details: error.issues },
      };
    }

    return {
      status: 500,
      body: { error: 'Internal server error' },
    };
  }
};
