# Docker PostgreSQL Setup

## Option 1: Using Docker Compose (Recommended)

1. **Start PostgreSQL with Docker Compose:**
   ```bash
   docker compose up -d
   ```

2. **Stop PostgreSQL:**
   ```bash
   docker compose down
   ```

3. **View logs:**
   ```bash
   docker compose logs postgres
   ```

## Option 2: Using Docker directly

1. **Start PostgreSQL container:**
   ```bash
   docker run --name personal-finance-db \
     -e POSTGRES_DB=personal_finance \
     -e POSTGRES_USER=postgres \
     -e POSTGRES_PASSWORD=password \
     -p 5432:5432 \
     -d postgres:15
   ```

2. **Stop and remove container:**
   ```bash
   docker stop personal-finance-db
   docker rm personal-finance-db
   ```

## Database Connection

- **Host:** localhost
- **Port:** 5432
- **Database:** personal_finance
- **Username:** postgres (or your system username for local PostgreSQL)
- **Password:** password (for Docker) or no password (for local PostgreSQL)

## Environment Variables

Update your `.env` file with the appropriate connection string:

```env
# For Docker PostgreSQL
DATABASE_URL="postgresql://postgres:password@localhost:5432/personal_finance?schema=public"

# For local PostgreSQL (current setup)
DATABASE_URL="postgresql://sachinthadhananjana@localhost:5432/personal_finance?schema=public"
```

## Database Management

- **Connect to database:** `psql personal_finance`
- **List databases:** `psql -l`
- **Reset database:** `dropdb personal_finance && createdb personal_finance`
