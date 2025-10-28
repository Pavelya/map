# Admin Dashboard Setup Guide

This guide will help you set up the admin dashboard for the Team Vote Map application.

## Prerequisites

- Supabase account and project (free tier works fine)
- Environment variables configured in `.env.local`

## Step 1: Set Up Database Tables

You have two options:

### Option A: Run SQL Directly in Supabase (Recommended)

1. Open your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Open the file: `scripts/setup-database.sql`
6. Copy the entire contents
7. Paste into the Supabase SQL editor
8. Click **Run**

You should see a success message. The script creates:
- All required tables (admin_users, matches, votes, fraud_events, etc.)
- Indexes for optimal performance
- Triggers for automatic timestamp updates
- Initial migration record

### Option B: Verify Existing Setup

If you've already run the SQL or want to check the status:

```bash
pnpm setup-db
```

This will verify that all required tables exist in your database.

## Step 2: Create an Admin User

Once the database tables are created, create your first admin user:

```bash
pnpm create-admin
```

You'll be prompted for:
- **Username**: Choose a username (3+ characters, letters/numbers/underscores/hyphens only)
- **Email**: A valid email address
- **Password**: At least 8 characters

Example:
```
Enter username: admin
Enter email: admin@example.com
Enter password: ********
Confirm password: ********
```

After successful creation, you'll see:
```
==================================================
Admin user created successfully!
==================================================

Admin Details:
  ID:       xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  Username: admin
  Email:    admin@example.com
  Created:  2025-10-28T12:00:00.000Z

You can now use these credentials to log in.
```

## Step 3: Access the Admin Dashboard

1. Start the development server:
```bash
pnpm dev
```

2. Navigate to: http://localhost:3000/admin/login

3. Enter your credentials and click **Sign In**

4. You'll be redirected to the admin dashboard at `/admin/matches`

## Admin Dashboard Features

Once logged in, you have access to:

### Matches Management (`/admin/matches`)
- View all voting matches
- Create new matches
- Edit existing matches
- Activate, end, or delete matches
- Filter by status and search by title
- Sortable table with pagination

### Match Details (`/admin/matches/[id]`)
- View detailed match statistics
- See votes over time chart
- Review fraud events for the match
- Export match data (CSV)

### Analytics (`/admin/analytics`)
- Overview statistics (total votes, matches, active users)
- Votes over time chart
- Votes by country breakdown
- Votes by hour of day analysis
- Team dominance visualization
- Date range and match filters

### Fraud Detection (`/admin/fraud`)
- View all fraud events
- Filter by severity (low, medium, high, critical)
- Filter by review status
- Mark events as reviewed
- Add notes to fraud events
- View detailed event metadata

### Settings (`/admin/settings`)
- General application settings
- Admin user management (coming soon)
- Security configuration
- Notification preferences

## Troubleshooting

### "Database tables not found" error

Run the verification script:
```bash
pnpm setup-db
```

If tables are missing, go back to Step 1 and run the SQL in Supabase.

### "Invalid credentials" error

Make sure you're using the credentials from the `create-admin` script output.

### Environment variables not loading

Ensure your `.env.local` file contains:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-jwt-refresh-secret
```

### Cannot create admin user

If you get database connection errors:
1. Check your Supabase credentials in `.env.local`
2. Verify your Supabase project is running
3. Check that the `admin_users` table exists in Supabase

## Security Notes

- The admin dashboard requires authentication for all routes
- JWT tokens are used for session management
- Passwords are hashed using bcrypt with salt rounds
- Rate limiting is applied to login attempts
- The service role key should be kept secret and never committed to git

## Next Steps

After setting up the admin dashboard:

1. Create your first match
2. Test the voting flow on the public-facing pages
3. Monitor votes and fraud events in the admin dashboard
4. Review analytics to understand voting patterns

## Support

If you encounter issues:
1. Check the console for error messages
2. Verify all environment variables are set
3. Ensure Supabase database is accessible
4. Review the logs in `pnpm dev` output
