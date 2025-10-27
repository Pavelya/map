# Database Migration Scripts

This directory contains all database migration scripts and utilities for the Team Vote Map project.

## Files

- `001_initial_schema.sql` - Complete PostgreSQL schema with all tables, indexes, and constraints
- `migrate-supabase.ts` - Migration runner for Supabase (displays SQL for manual execution)
- `run-migration.ts` - Generic migration runner (for direct PostgreSQL connections)
- `validate-schema.ts` - Schema validation utility
- `test-complete-setup.ts` - Complete setup validation

## Quick Start

1. **Validate Setup**
   ```bash
   pnpm test-setup
   ```

2. **Set up Supabase credentials in `.env.local`**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

3. **Run Migration**
   ```bash
   pnpm migrate
   ```
   
   Or manually execute the SQL from `001_initial_schema.sql` in Supabase SQL editor.

4. **Test Database**
   ```sql
   SELECT * FROM matches;
   ```

## Database Schema

### Tables Created
- `migrations` - Migration tracking
- `matches` - Match/game definitions
- `admin_users` - Admin user accounts
- `votes_raw` - Individual vote records
- `vote_agg_h3` - H3 geographic aggregates
- `vote_agg_country` - Country-level aggregates
- `fraud_events` - Fraud detection logs
- `audit_log` - Admin action audit trail

### Key Features
- ✅ All constraints and foreign keys
- ✅ 14 optimized indexes
- ✅ ENUM types for data integrity
- ✅ Computed columns for vote counts
- ✅ Automatic timestamp updates
- ✅ UUID primary keys
- ✅ Proper CASCADE deletes

## Database Helpers

Located in `src/lib/db-helpers.ts`:

- `getActiveMatch()` - Get current active match
- `getUserVoteCount()` - Count user votes
- `incrementVoteAggregate()` - Atomic vote increment
- `incrementCountryVoteAggregate()` - Country-level increment
- `getVoteAggregatesByResolution()` - Get H3 aggregates
- `getCountryVoteAggregates()` - Get country aggregates

All functions include proper error handling, logging, and use parameterized queries.

## Security

- ✅ No SQL injection vulnerabilities
- ✅ Environment variables for credentials
- ✅ Parameterized queries only
- ✅ Proper error handling
- ✅ Winston logger integration
- ✅ Database constraints prevent invalid data