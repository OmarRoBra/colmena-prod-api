import * as dotenv from 'dotenv';
dotenv.config();

import * as bcrypt from 'bcrypt';
import { db } from '../db';
import { usuarios } from '../db/schema';
import { eq } from 'drizzle-orm';

async function seedAdmin() {
  const email = 'admin@condoadmin.com';
  const password = 'admin123';

  // Check if user already exists
  const existing = await db.select().from(usuarios).where(eq(usuarios.email, email)).limit(1);

  if (existing.length > 0) {
    console.log(`User ${email} already exists, skipping.`);
    process.exit(0);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const [newUser] = await db.insert(usuarios).values({
    nombre: 'Admin',
    apellido: 'CondoAdmin',
    email,
    password: hashedPassword,
    rol: 'admin',
    activo: true,
    emailVerificado: true,
  }).returning();

  console.log(`Admin user created successfully: ${newUser.email} (id: ${newUser.id})`);
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error('Error seeding admin user:', err);
  process.exit(1);
});
