import { successResponse, errorResponse } from '../utils/apiResponse.js';

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return errorResponse(res, 'Email and password are required', null, 400);
    }

    // Dummy authentication response untuk template starter
    const token = 'sample-jwt-token-for-development';
    const user = {
      id: 1,
      name: 'HR Admin',
      email,
      role: 'admin',
    };

    return successResponse(res, 'Login successful', { user, token });
  } catch (error) {
    next(error);
  }
};

export const register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return errorResponse(res, 'Please provide all required fields', null, 400);
    }

    return successResponse(res, 'User registered successfully', { username, email }, 201);
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    return successResponse(res, 'Profile retrieved', {
      user: req.user,
    });
  } catch (error) {
    next(error);
  }
};

