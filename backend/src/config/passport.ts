import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../models/User';
import { logger } from '../utils/logger';

passport.use(
  new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL:  `${process.env.BASE_URL}/api/auth/google/callback`,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error('No email from Google'), undefined);

        // Find or create user
        let user = await User.findOne({ email });
        if (!user) {
          user = await User.create({
            name:     profile.displayName || 'Google User',
            email,
            password: `google_oauth_${profile.id}_${Date.now()}`, // random unhashable password
            role:     'user',
          });
          logger.info(`New user created via Google OAuth: ${email}`);
        } else {
          logger.info(`Existing user logged in via Google: ${email}`);
        }

        return done(null, user);
      } catch (err) {
        return done(err as Error, undefined);
      }
    }
  )
);

passport.serializeUser((user: any, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

export default passport;
