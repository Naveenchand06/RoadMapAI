import jwt from 'jsonwebtoken';

export const withAuth = (handler: Function) => {
  return async (req: any, context: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return {
        status: 401,
        body: { error: 'No token provided' }
      };
    }
    
    try {
      const user = jwt.verify(token, process.env.JWT_SECRET!);
      req.user = user; 
      
      return await handler(req, context);
    } catch (error) {
      return {
        status: 401,
        body: { error: 'Invalid token' }
      };
    }
  };
};