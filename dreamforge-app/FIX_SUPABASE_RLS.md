# Fix Supabase Row Level Security (RLS) Error

## Error Message
```
new row violates row-level security policy for table "ai_models"
```

## Quick Fix
Run this SQL in your Supabase SQL Editor:

```sql
-- Disable RLS temporarily (for development/demo)
ALTER TABLE ai_models DISABLE ROW LEVEL SECURITY;
```

## Proper Fix (Recommended)
Run the migration file `supabase/migrations/003_fix_rls_policies.sql` in your Supabase SQL Editor.

This will:
1. Enable RLS on the ai_models table
2. Create policies that allow:
   - Everyone to READ models
   - Anon users to INSERT/UPDATE/DELETE (for demo purposes)

## Steps to Apply:
1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy the contents of `supabase/migrations/003_fix_rls_policies.sql`
4. Paste and run in the SQL Editor
5. Test creating a model in the admin panel

## For Production
In production, you should:
1. Set up proper authentication
2. Create a user_roles table
3. Use the commented-out production policies in the migration file
4. Restrict INSERT/UPDATE/DELETE to admin users only

## Alternative: Service Role Key
If you need immediate access without dealing with RLS:
1. Use the Service Role key instead of Anon key
2. Update your `.env` file:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```
3. Update `lib/supabase.ts` to use the service role key for admin operations

**Warning**: Service role key bypasses all RLS policies. Only use in secure server-side contexts.