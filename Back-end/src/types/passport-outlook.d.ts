declare module 'passport-outlook' {
    import { Strategy as PassportStrategy } from 'passport';

    interface StrategyOptions {
        clientID: string;
        clientSecret: string;
        callbackURL: string;
    }

    interface VerifyCallback {
        (error: any, user?: any, info?: any): void;
    }

    class Strategy extends PassportStrategy {
        constructor(options: StrategyOptions, verify: (accessToken: string, refreshToken: string, profile: any, done: VerifyCallback) => void);
    }
}
