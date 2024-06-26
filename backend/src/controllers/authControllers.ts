import { Request, Response } from 'express';
import passport from 'passport';

export const authenticateOutlook = passport.authenticate('windowslive', {
  scope: ['openid', 'profile', 'offline_access', 'https://outlook.office.com/Mail.Read'],
});

export const outlookCallback = [
  passport.authenticate('windowslive', { failureRedirect: '/' }),
  (req: Request, res: Response) => {
    res.redirect('/initialFetch');
  },
];

export const isAuthenticated = (req: Request, res: Response) => {
  if (req.isAuthenticated()) {
    res.json({ isAuthenticated: true });
  } else {
    res.json({ isAuthenticated: false });
  }
};
