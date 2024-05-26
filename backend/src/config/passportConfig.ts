import passport from 'passport';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const OutlookStrategy: any = require('passport-outlook').Strategy;
import { Request } from 'express';
import {
  OUTLOOK_CLIENT_ID,
  OUTLOOK_CLIENT_SECRET,
  OUTLOOK_CALLBACK_URL,
} from './azureConfig';

import User from '../types/user';

// Serialize user
passport.serializeUser((obj: any, done) => {
  done(null, obj as User);
});

// Deserialize user
passport.deserializeUser((obj: any, done) => {
  done(null, obj as User);
});

// Configure Outlook Strategy
passport.use(
  new OutlookStrategy(
    {
      clientID: OUTLOOK_CLIENT_ID,
      clientSecret: OUTLOOK_CLIENT_SECRET,
      callbackURL: OUTLOOK_CALLBACK_URL,
      passReqToCallback: true,
    },
    (
      req: Request,
      accessToken: string,
      refreshToken: string,
      profile: any,
      done: (error: any, user?: any) => void,
    ) => {
      const user: User = {
        id: profile.id,
        email: profile.emails[0].value,
        accessToken,
        refreshToken,
      };
      return done(null, user);
    },
  ),
);

// Export the configured passport
export default passport;
