import * as dotenv from 'dotenv';
dotenv.config();

import { db } from '../db';
import { usuarios } from '../db/schema';
import { eq } from 'drizzle-orm';
import { supabaseAdmin } from '../config/supabase';

async function seedAdmin() {
  const email = 'admin@condoadmin.com';
  const password = 'admin123';

  // Check if profile already exists
  const existing = await db.select().from(usuarios).where(eq(usuarios.email, email)).limit(1);

  if (existing.length > 0) {
    console.log(`User ${email} already exists, skipping.`);
    process.exit(0);
  }

  // Create user in Supabase Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    console.error('Error creating Supabase auth user:', authError.message);
    process.exit(1);
  }

  // Create profile in usuarios table
  const [newUser] = await db.insert(usuarios).values({
    id: authData.user.id,
    nombre: 'Admin',
    apellido: 'CondoAdmin',
    email,
    rol: 'admin',
    activo: true,
  }).returning();

  console.log(`Admin user created successfully: ${newUser.email} (id: ${newUser.id})`);
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error('Error seeding admin user:', err);
  process.exit(1);
});
