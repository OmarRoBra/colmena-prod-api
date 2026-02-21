/**
 * Seed script — creates 4 test users with known passwords
 * Run with:  npx ts-node scripts/seed-test-users.ts
 *
 * Users created:
 *   admin@test.com      / Test1234!   → rol: admin
 *   residente@test.com  / Test1234!   → rol: resident  (linked to new residente record)
 *   trabajador@test.com / Test1234!   → rol: worker     (linked to new trabajador record)
 *   seguridad@test.com  / Test1234!   → rol: securityWorker (linked to new trabajador record)
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { db } from '../src/db';
import { usuarios, residentes, trabajadores } from '../src/db/schema';
import { eq } from 'drizzle-orm';

// ─── Config ──────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use the first available condominio + unidad from the DB
const CONDOMINIO_ID = '71537b41-9862-447c-a99a-0bce7edb249b'; // "dewdw"
const UNIDAD_ID     = '876a2f77-0f2f-41c9-8ddf-e17912201d1d'; // "123"

const PASSWORD = 'Test1234!';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function createOrGetAuthUser(email: string, password: string, rolMeta: string) {
  // Try to create; if the email already exists the error code is "email_exists"
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,          // skip email confirmation step
    user_metadata: { rol: rolMeta },
  });

  if (error) {
    if (error.message?.toLowerCase().includes('already been registered')) {
      // fetch existing user instead
      const { data: list } = await supabase.auth.admin.listUsers();
      const existing = list?.users?.find(u => u.email === email);
      if (existing) {
        console.log(`  ↩  ${email} already exists in Auth — reusing`);
        return existing.id;
      }
    }
    throw new Error(`Auth createUser failed for ${email}: ${error.message}`);
  }

  return data.user.id;
}

async function upsertUsuario(id: string, nombre: string, apellido: string, email: string, rol: string) {
  await db
    .insert(usuarios)
    .values({ id, nombre, apellido, email, rol })
    .onConflictDoUpdate({ target: usuarios.id, set: { rol, nombre, apellido, email } });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('\n🌱  Seeding test users...\n');

  // ── 1. Admin ──────────────────────────────────────────────────────────────
  console.log('1/4  admin@test.com');
  const adminId = await createOrGetAuthUser('admin@test.com', PASSWORD, 'admin');
  await upsertUsuario(adminId, 'Admin', 'Test', 'admin@test.com', 'admin');
  console.log('     ✓  usuario record upserted');

  // ── 2. Resident ───────────────────────────────────────────────────────────
  console.log('2/4  residente@test.com');
  const residenteId = await createOrGetAuthUser('residente@test.com', PASSWORD, 'resident');
  await upsertUsuario(residenteId, 'Residente', 'Test', 'residente@test.com', 'resident');

  // Check if residente record already linked
  const [existingResidente] = await db
    .select({ id: residentes.id })
    .from(residentes)
    .where(eq(residentes.usuarioId, residenteId))
    .limit(1);

  if (!existingResidente) {
    await db.insert(residentes).values({
      condominioId: CONDOMINIO_ID,
      unidadId: UNIDAD_ID,
      usuarioId: residenteId,
      nombre: 'Residente Test',
      email: 'residente@test.com',
      telefono: '555-0001',
      tipo: 'Propietario',
      fechaIngreso: new Date(),
      activo: true,
    });
    console.log('     ✓  residente record created');
  } else {
    console.log('     ↩  residente record already exists');
  }

  // ── 3. Worker ─────────────────────────────────────────────────────────────
  console.log('3/4  trabajador@test.com');
  const workerId = await createOrGetAuthUser('trabajador@test.com', PASSWORD, 'worker');
  await upsertUsuario(workerId, 'Trabajador', 'Test', 'trabajador@test.com', 'worker');

  const [existingWorker] = await db
    .select({ id: trabajadores.id })
    .from(trabajadores)
    .where(eq(trabajadores.usuarioId, workerId))
    .limit(1);

  if (!existingWorker) {
    await db.insert(trabajadores).values({
      condominioId: CONDOMINIO_ID,
      usuarioId: workerId,
      nombre: 'Trabajador',
      apellido: 'Test',
      email: 'trabajador@test.com',
      telefono: '555-0002',
      puesto: 'mantenimiento',
      fechaContratacion: new Date(),
      activo: true,
    });
    console.log('     ✓  trabajador record created');
  } else {
    console.log('     ↩  trabajador record already exists');
  }

  // ── 4. Security Worker ────────────────────────────────────────────────────
  console.log('4/4  seguridad@test.com');
  const securityId = await createOrGetAuthUser('seguridad@test.com', PASSWORD, 'securityWorker');
  await upsertUsuario(securityId, 'Guardia', 'Test', 'seguridad@test.com', 'securityWorker');

  const [existingSecurity] = await db
    .select({ id: trabajadores.id })
    .from(trabajadores)
    .where(eq(trabajadores.usuarioId, securityId))
    .limit(1);

  if (!existingSecurity) {
    await db.insert(trabajadores).values({
      condominioId: CONDOMINIO_ID,
      usuarioId: securityId,
      nombre: 'Guardia',
      apellido: 'Test',
      email: 'seguridad@test.com',
      telefono: '555-0003',
      puesto: 'seguridad',
      fechaContratacion: new Date(),
      activo: true,
    });
    console.log('     ✓  trabajador(seguridad) record created');
  } else {
    console.log('     ↩  trabajador(seguridad) record already exists');
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n✅  Done! Test credentials:\n');
  console.log('  Role            Email                    Password');
  console.log('  ─────────────── ──────────────────────── ──────────');
  console.log('  admin           admin@test.com           Test1234!');
  console.log('  resident        residente@test.com       Test1234!');
  console.log('  worker          trabajador@test.com      Test1234!');
  console.log('  securityWorker  seguridad@test.com       Test1234!');
  console.log('');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌  Seed failed:', err.message ?? err);
    process.exit(1);
  });
