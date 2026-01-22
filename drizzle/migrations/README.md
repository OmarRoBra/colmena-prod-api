# Database Migrations

This directory contains SQL migration files for the Colmena API database.

## Migration Files

### 001_add_new_user_roles_and_tenant_field.sql
**Purpose**: Adds support for new user roles and tenant relationship to units

**Changes**:
1. Updates existing user roles:
   - `gerente` → `condoAdmin`
   - `residente` → `owner`
2. Adds new roles: `tenant`, `worker`, `serviceProvider`
3. Adds `inquilino_id` column to `unidades` table for tenant relationships
4. Creates foreign key constraint and index for performance

**Rollback**: `001_add_new_user_roles_and_tenant_field.rollback.sql`

### 002_add_thumbnail_to_condominios.sql
**Purpose**: Adds optional thumbnail/image field to condominiums

**Changes**:
1. Adds `thumbnail` column to `condominios` table (VARCHAR 500)
2. Creates index for better query performance
3. Stores URL to condominium image

**Rollback**: `002_add_thumbnail_to_condominios.rollback.sql`

### 003_add_estado_to_condominios.sql
**Purpose**: Adds status_condominio field to replace boolean activo field

**Changes**:
1. Adds `status_condominio` column to `condominios` table (VARCHAR 20, default 'activo')
2. Adds CHECK constraint to enforce valid values: 'activo', 'inactivo', 'archivado'
3. Migrates existing data: activo=true → status_condominio='activo', activo=false → status_condominio='inactivo'
4. Creates index for better query performance
5. Keeps `activo` boolean for backward compatibility (deprecated)
6. Note: The existing `estado` column is for state/province (e.g., CDMX, Jalisco)

**Rollback**: `003_add_estado_to_condominios.rollback.sql`

## How to Run Migrations

### Option 1: Using psql (PostgreSQL CLI)

```bash
# Run the migration
psql -U your_username -d your_database -f drizzle/migrations/001_add_new_user_roles_and_tenant_field.sql

# Rollback if needed
psql -U your_username -d your_database -f drizzle/migrations/001_add_new_user_roles_and_tenant_field.rollback.sql
```

### Option 2: Using DATABASE_URL environment variable

```bash
# Make sure your .env file has DATABASE_URL set
# Example: DATABASE_URL=postgresql://user:password@localhost:5432/colmena_db

# Run the migration
psql $DATABASE_URL -f drizzle/migrations/001_add_new_user_roles_and_tenant_field.sql

# Rollback if needed
psql $DATABASE_URL -f drizzle/migrations/001_add_new_user_roles_and_tenant_field.rollback.sql
```

### Option 3: Using a GUI tool (e.g., pgAdmin, DBeaver, TablePlus)

1. Connect to your database
2. Open the migration SQL file
3. Execute the entire script
4. Verify the changes

### Option 4: Using Node.js script

Create a script to run migrations programmatically:

```typescript
// scripts/run-migration.ts
import { db } from './src/db';
import { readFileSync } from 'fs';
import { join } from 'path';

async function runMigration(filename: string) {
  const sql = readFileSync(join(__dirname, '../drizzle/migrations', filename), 'utf-8');
  await db.execute(sql);
  console.log(`Migration ${filename} completed successfully`);
}

runMigration('001_add_new_user_roles_and_tenant_field.sql')
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
```

## Verification

After running the migration, verify the changes:

```sql
-- Check user roles distribution
SELECT COUNT(*), rol FROM usuarios GROUP BY rol;

-- Check unidades table structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'unidades';

-- Check for any units with tenants
SELECT u.numero, o.nombre as owner, t.nombre as tenant
FROM unidades u
LEFT JOIN usuarios o ON u.propietario_id = o.id
LEFT JOIN usuarios t ON u.inquilino_id = t.id
WHERE u.inquilino_id IS NOT NULL;
```

## Important Notes

1. **Backup First**: Always backup your database before running migrations
   ```bash
   pg_dump -U your_username your_database > backup_$(date +%Y%m%d).sql
   ```

2. **Test in Development**: Run migrations in a development/staging environment first

3. **Role Updates**: The migration automatically updates existing roles:
   - All `gerente` users become `condoAdmin`
   - All `residente` users become `owner`

4. **Application Code**: Ensure the application code is updated to use new roles before running migration

5. **Rollback**: If you need to rollback, use the `.rollback.sql` file, but note:
   - New roles (`tenant`, `worker`, `serviceProvider`) will be converted to `residente`
   - The `inquilino_id` column and its data will be permanently deleted

## Migration History

| # | Name | Date | Status |
|---|------|------|--------|
| 001 | add_new_user_roles_and_tenant_field | 2025-12-30 | Pending |
| 002 | add_thumbnail_to_condominios | 2025-12-30 | Pending |
| 003 | add_estado_to_condominios | 2025-12-30 | Pending |

## Next Steps

After running this migration:

1. Update your application code to use the new roles
2. Test all authorization rules with different user roles
3. Update any existing API documentation
4. Consider implementing data filtering in controllers based on user roles
5. Review the PERMISSIONS_MATRIX.md for detailed role permissions
