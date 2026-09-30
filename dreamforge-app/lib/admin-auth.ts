import { betterAuth } from 'better-auth';
import { magicLink } from 'better-auth/plugins';
import { nextCookies } from 'better-auth/next-js';
import { Pool } from 'pg';
import { Resend } from 'resend';

const ADMIN_EMAIL = 'mnights@tutanota.com';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Named `auth` for BetterAuth CLI compatibility, re-exported as `adminAuth`
export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),
  emailAndPassword: {
    enabled: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        if (email !== ADMIN_EMAIL) {
          throw new Error('Unauthorized email');
        }
        if (!resend) {
          console.log('\n========================================');
          console.log('MAGIC LINK URL (no Resend configured):');
          console.log(url);
          console.log('========================================\n');
          return; // Don't throw - allow token to be used via URL or manual entry
        }
        await resend.emails.send({
          from: 'DreamForge Admin <onboarding@resend.dev>',
          to: email,
          subject: 'DreamForge Admin Login',
          html: `<p>Click the link below to sign in to the DreamForge admin dashboard:</p><p><a href="${url}">Sign In</a></p><p>This link expires in 15 minutes.</p>`,
        });
      },
    }),
    nextCookies(), // must be last
  ],
});

export const adminAuth = auth;
