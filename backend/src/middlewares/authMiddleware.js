import { errorResponse } from '../utils/apiResponse.js';

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse(res, 'Access denied. No token provided.', null, 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    // TODO: Pasang jwt.verify(token, process.env.JWT_SECRET) jika jsonwebtoken sudah dipasang
    // Dummy decoded user untuk starter
    req.user = { id: 1, role: 'admin', username: 'admin' };
    next();
  } catch (error) {
    return errorResponse(res, 'Invalid or expired token.', null, 403);
  }
};

