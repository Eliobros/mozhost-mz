// utils/passport.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const database = require('../models/database');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const users = await database.query('SELECT * FROM users WHERE id = ?', [id]);
    done(null, users[0] || null);
  } catch (err) {
    done(err, null);
  }
});

// Google Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'https://api.mozhost.topaziocoin.online/api/auth/google/callback'
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
      const avatarUrl = profile.photos && profile.photos[0] ? profile.photos[0].value : null;

      // Check if user already exists with this Google ID
      let users = await database.query(
        'SELECT * FROM users WHERE oauth_provider = ? AND oauth_provider_id = ?',
        ['google', profile.id]
      );

      if (users.length > 0) {
        return done(null, users[0]);
      }

      // Check if email already exists (link accounts)
      if (email) {
        users = await database.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length > 0) {
          // Link Google to existing account
          await database.query(
            'UPDATE users SET oauth_provider = ?, oauth_provider_id = ?, avatar_url = ?, email_verified = true WHERE id = ?',
            ['google', profile.id, avatarUrl, users[0].id]
          );
          const updated = await database.query('SELECT * FROM users WHERE id = ?', [users[0].id]);
          return done(null, updated[0]);
        }
      }

      // Create new user (without username - needs to complete profile)
      const tempUsername = 'google_' + profile.id.substring(0, 10) + '_' + Date.now().toString(36);
      const result = await database.query(
        `INSERT INTO users (username, email, password_hash, oauth_provider, oauth_provider_id, avatar_url, email_verified, profile_completed, plan, max_containers, max_ram_mb, max_storage_mb, coins, free_trial_ends)
         VALUES (?, ?, NULL, 'google', ?, ?, true, false, 'free', 2, 0, 0, 250, DATE_ADD(NOW(), INTERVAL 30 DAY))`,
        [tempUsername, email || `${tempUsername}@oauth.temp`, profile.id, avatarUrl]
      );

      const newUser = await database.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
      done(null, newUser[0]);
    } catch (err) {
      done(err, null);
    }
  }));
  console.log('✅ Google OAuth strategy configured');
} else {
  console.log('ℹ️  Google OAuth not configured (missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET)');
}

// GitHub Strategy
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK_URL || 'https://api.mozhost.topaziocoin.online/api/auth/github/callback',
    scope: ['user:email']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
      const avatarUrl = profile.photos && profile.photos[0] ? profile.photos[0].value : null;

      // Check if user already exists with this GitHub ID
      let users = await database.query(
        'SELECT * FROM users WHERE oauth_provider = ? AND oauth_provider_id = ?',
        ['github', profile.id.toString()]
      );

      if (users.length > 0) {
        return done(null, users[0]);
      }

      // Check if email already exists
      if (email) {
        users = await database.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length > 0) {
          await database.query(
            'UPDATE users SET oauth_provider = ?, oauth_provider_id = ?, avatar_url = ?, email_verified = true WHERE id = ?',
            ['github', profile.id.toString(), avatarUrl, users[0].id]
          );
          const updated = await database.query('SELECT * FROM users WHERE id = ?', [users[0].id]);
          return done(null, updated[0]);
        }
      }

      // Create new user
      const tempUsername = 'github_' + (profile.username || profile.id.toString().substring(0, 10)) + '_' + Date.now().toString(36);
      const result = await database.query(
        `INSERT INTO users (username, email, password_hash, oauth_provider, oauth_provider_id, avatar_url, email_verified, profile_completed, plan, max_containers, max_ram_mb, max_storage_mb, coins, free_trial_ends)
         VALUES (?, ?, NULL, 'github', ?, ?, true, false, 'free', 2, 0, 0, 250, DATE_ADD(NOW(), INTERVAL 30 DAY))`,
        [tempUsername, email || `${tempUsername}@oauth.temp`, profile.id.toString(), avatarUrl]
      );

      const newUser = await database.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
      done(null, newUser[0]);
    } catch (err) {
      done(err, null);
    }
  }));
  console.log('✅ GitHub OAuth strategy configured');
} else {
  console.log('ℹ️  GitHub OAuth not configured (missing GITHUB_CLIENT_ID/GITHUB_CLIENT_SECRET)');
}

module.exports = passport;
