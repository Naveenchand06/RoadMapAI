import { ApiRouteConfig, Handlers } from 'motia';
import mongoose, { Schema, model } from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { connectToDatabase } from '../common/db';

import { User } from '../common/models';

// Validation Schema
const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Register APIEndpoint Configuration
export const config: ApiRouteConfig = {
  type: 'api',
  name: 'RegisterUser',
  description: 'Register a new user',
  path: '/auth/register',
  method: 'POST',
  emits: [],
  bodySchema: registerSchema,
  flows: ['Authentication'],
};

// Register APIEndpoint Handler Implementation   
export const handler: Handlers['RegisterUser'] = async (input, { logger }) => {
  try {
    await connectToDatabase();

    // Validate input
    const validatedData = registerSchema.parse(input.body);
    const { name, email, password } = validatedData;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return {
        status: 400,
        body: { error: 'User already exists' },
      };
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    // Generate JWT Token
    const token = jwt.sign(
      { userId: newUser._id, email: newUser.email },
      process.env.JWT_SECRET || 'dev-secret-key',
      { expiresIn: '24h' }
    );

    logger.info('User registered successfully', { userId: newUser._id, email });

    return {
      status: 201,
      body: {
        message: 'User registered successfully',
        token,
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
        },
      },
    };
  } catch (error: any) {
    logger.error('Registration failed', { error: error.message });

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
