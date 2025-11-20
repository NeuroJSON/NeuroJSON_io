// backend/config/passport.config.js
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { User } = require("../models");

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ||
        "http://localhost:5000/api/v1/auth/google/callback",
      scope: ["profile", "email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Extract user info from Google profile
        const email = profile.emails[0].value;
        const googleId = profile.id;
        const username = profile.displayName || email.split("@")[0];

        // Check if user already exists with this Google ID
        let user = await User.findOne({
          where: { google_id: googleId },
        });

        if (user) {
          // User exists, return user
          return done(null, user);
        }

        // Check if user exists with this email (linking accounts)
        user = await User.findOne({
          where: { email },
        });

        if (user) {
          // User exists with email but no Google ID - link the accounts
          user.google_id = googleId;
          await user.save();
          return done(null, user);
        }

        // Create new user
        user = await User.create({
          username: username,
          email: email,
          google_id: googleId,
          hashed_password: null, // OAuth users don't have passwords
        });

        return done(null, user);
      } catch (error) {
        console.error("Google OAuth error:", error);
        return done(error, null);
      }
    }
  )
);

// ORCID OAuth Strategy (using OAuth2Strategy as base)
const OAuth2Strategy = require("passport-oauth2");

// passport.use(
//   "orcid",
//   new OAuth2Strategy(
//     {
//       authorizationURL: "https://orcid.org/oauth/authorize",
//       tokenURL: "https://orcid.org/oauth/token",
//       clientID: process.env.ORCID_CLIENT_ID,
//       clientSecret: process.env.ORCID_CLIENT_SECRET,
//       callbackURL: process.env.ORCID_CALLBACK_URL || "http://localhost:5000/api/v1/auth/orcid/callback",
//       scope: "/authenticate",
//     },
//     async (accessToken, refreshToken, params, profile, done) => {
//       try {
//         // ORCID returns user info in params, not profile
//         const orcidId = params.orcid;
//         const name = params.name || `ORCID User ${orcidId}`;

//         // ORCID doesn't always provide email in the basic scope
//         // You might need to make an additional API call to get email
//         // For now, we'll use ORCID ID as identifier

//         // Check if user exists with this ORCID ID
//         let user = await User.findOne({
//           where: { orcid_id: orcidId },
//         });

//         if (user) {
//           return done(null, user);
//         }

//         // If we have email from ORCID, check for existing user
//         if (params.email) {
//           user = await User.findOne({
//             where: { email: params.email },
//           });

//           if (user) {
//             // Link ORCID to existing account
//             user.orcid_id = orcidId;
//             await user.save();
//             return done(null, user);
//           }
//         }

//         // Create new user
//         // Note: ORCID might not provide email, so we use ORCID ID as part of email
//         const email = params.email || `${orcidId}@orcid.placeholder`;
//         const username = name.replace(/\s+/g, "_").toLowerCase() || `orcid_${orcidId}`;

//         user = await User.create({
//           username: username,
//           email: email,
//           orcid_id: orcidId,
//           hashed_password: null,
//         });

//         return done(null, user);
//       } catch (error) {
//         console.error("ORCID OAuth error:", error);
//         return done(error, null);
//       }
//     }
//   )
// );

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
