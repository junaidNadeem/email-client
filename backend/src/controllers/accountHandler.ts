import { Request, Response } from 'express';
import { createAccount } from '../services/accountService';

import User from '../types/user';

export const createAccountHandler = async (req: Request, res: Response) => {
  const user = req.user as User;
  const userId = req.header('user_id'); // Get the user ID from header
  if (!user) {
    return res.status(400).json({ message: 'User not authenticated' });
  }

  if (!userId) {
    return res.status(400).json({ message: 'Missing user ID' });
  }

  try {
    const result = await createAccount(user, userId, req.headers.cookie || '');
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json(error);
  }
};
