import { pgTable, uuid, varchar, text, timestamp, boolean, integer, decimal, json } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ==========================================
// USUARIOS (Users)
// ==========================================
export const usuarios = pgTable('usuarios', {
  id: uuid('id').defaultRandom().primaryKey(),
  nombre: varchar('nombre', { length: 100 }).notNull(),
  apellido: varchar('apellido', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  telefono: varchar('telefono', { length: 20 }),
  rol: varchar('rol', { length: 50 }).notNull().default('owner'), // admin, condoAdmin, owner, tenant, worker, serviceProvider
  activo: boolean('activo').notNull().default(true),
  emailVerificado: boolean('email_verificado').notNull().default(false),
  resetPasswordToken: varchar('reset_password_token', { length: 255 }),
  resetPasswordExpires: timestamp('reset_password_expires'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ==========================================
// CONDOMINIOS (Condominiums)
// ==========================================
export const condominios = pgTable('condominios', {
  id: uuid('id').defaultRandom().primaryKey(),
  nombre: varchar('nombre', { length: 200 }).notNull(),
  direccion: text('direccion').notNull(),
  ciudad: varchar('ciudad', { length: 100 }).notNull(),
  estado: varchar('estado', { length: 100 }).notNull(), // State/province (CDMX, Jalisco, etc.)
  codigoPostal: varchar('codigo_postal', { length: 10 }),
  telefono: varchar('telefono', { length: 20 }),
  email: varchar('email', { length: 255 }),
  totalUnidades: integer('total_unidades').notNull().default(0),
  gerenteId: uuid('gerente_id').references(() => usuarios.id),
  thumbnail: varchar('thumbnail', { length: 500 }), // URL to condominium image/thumbnail
  configuracion: json('configuracion'), // JSON for custom settings
  statusCondominio: varchar('status_condominio', { length: 20 }).notNull().default('activo'), // activo, inactivo, archivado
  activo: boolean('activo').notNull().default(true), // Deprecated: use statusCondominio instead
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ==========================================
// UNIDADES (Units/Apartments)
// ==========================================
export const unidades = pgTable('unidades', {
  id: uuid('id').defaultRandom().primaryKey(),
  condominioId: uuid('condominio_id').notNull().references(() => condominios.id, { onDelete: 'cascade' }),
  numero: varchar('numero', { length: 50 }).notNull(), // Unit number
  propietarioId: uuid('propietario_id').references(() => usuarios.id),
  inquilinoId: uuid('inquilino_id').references(() => usuarios.id), // Tenant/renter
  tipo: varchar('tipo', { length: 50 }).notNull(), // departamento, casa, local
  metrosCuadrados: decimal('metros_cuadrados', { precision: 10, scale: 2 }),
  habitaciones: integer('habitaciones'),
  banos: integer('banos'),
  estacionamientos: integer('estacionamientos').default(0),
  cuotaMantenimiento: decimal('cuota_mantenimiento', { precision: 10, scale: 2 }).notNull(),
  estadoPago: varchar('estado_pago', { length: 50 }).default('al_corriente'), // al_corriente, atrasado, moroso
  notas: text('notas'),
  activo: boolean('activo').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ==========================================
// PAGOS (Payments)
// ==========================================
export const pagos = pgTable('pagos', {
  id: uuid('id').defaultRandom().primaryKey(),
  unidadId: uuid('unidad_id').notNull().references(() => unidades.id, { onDelete: 'cascade' }),
  usuarioId: uuid('usuario_id').notNull().references(() => usuarios.id),
  monto: decimal('monto', { precision: 10, scale: 2 }).notNull(),
  concepto: varchar('concepto', { length: 200 }).notNull(),
  metodoPago: varchar('metodo_pago', { length: 50 }).notNull(), // efectivo, transferencia, tarjeta
  referencia: varchar('referencia', { length: 100 }),
  estado: varchar('estado', { length: 50 }).notNull().default('pendiente'), // pendiente, completado, rechazado
  fechaPago: timestamp('fecha_pago'),
  comprobante: varchar('comprobante', { length: 500 }), // URL to receipt
  notas: text('notas'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ==========================================
// RESERVACIONES (Reservations for common areas)
// ==========================================
export const reservaciones = pgTable('reservaciones', {
  id: uuid('id').defaultRandom().primaryKey(),
  condominioId: uuid('condominio_id').notNull().references(() => condominios.id, { onDelete: 'cascade' }),
  unidadId: uuid('unidad_id').notNull().references(() => unidades.id),
  usuarioId: uuid('usuario_id').notNull().references(() => usuarios.id),
  area: varchar('area', { length: 100 }).notNull(), // salon, terraza, gym, etc.
  fechaInicio: timestamp('fecha_inicio').notNull(),
  fechaFin: timestamp('fecha_fin').notNull(),
  estado: varchar('estado', { length: 50 }).notNull().default('pendiente'), // pendiente, confirmado, cancelado
  costo: decimal('costo', { precision: 10, scale: 2 }).default('0'),
  notas: text('notas'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ==========================================
// ASAMBLEAS (Assembly meetings)
// ==========================================
export const asambleas = pgTable('asambleas', {
  id: uuid('id').defaultRandom().primaryKey(),
  condominioId: uuid('condominio_id').notNull().references(() => condominios.id, { onDelete: 'cascade' }),
  titulo: varchar('titulo', { length: 200 }).notNull(),
  descripcion: text('descripcion'),
  fecha: timestamp('fecha').notNull(),
  ubicacion: varchar('ubicacion', { length: 200 }),
  tipo: varchar('tipo', { length: 50 }).notNull(), // ordinaria, extraordinaria
  estado: varchar('estado', { length: 50 }).notNull().default('programada'), // programada, en_curso, finalizada, cancelada
  documentos: json('documentos'), // Array of document URLs
  acuerdos: text('acuerdos'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ==========================================
// REGLAMENTOS (Rules/Regulations)
// ==========================================
export const reglamentos = pgTable('reglamentos', {
  id: uuid('id').defaultRandom().primaryKey(),
  condominioId: uuid('condominio_id').notNull().references(() => condominios.id, { onDelete: 'cascade' }),
  titulo: varchar('titulo', { length: 200 }).notNull(),
  contenido: text('contenido').notNull(),
  categoria: varchar('categoria', { length: 100 }), // general, mascotas, ruido, estacionamiento, etc.
  vigenciaDesde: timestamp('vigencia_desde').notNull(),
  activo: boolean('activo').notNull().default(true),
  documento: varchar('documento', { length: 500 }), // URL to PDF
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ==========================================
// MANTENIMIENTO (Maintenance requests)
// ==========================================
export const mantenimiento = pgTable('mantenimiento', {
  id: uuid('id').defaultRandom().primaryKey(),
  condominioId: uuid('condominio_id').notNull().references(() => condominios.id, { onDelete: 'cascade' }),
  unidadId: uuid('unidad_id').references(() => unidades.id),
  solicitanteId: uuid('solicitante_id').notNull().references(() => usuarios.id),
  titulo: varchar('titulo', { length: 200 }).notNull(),
  descripcion: text('descripcion').notNull(),
  categoria: varchar('categoria', { length: 100 }).notNull(), // fontaneria, electricidad, pintura, etc.
  prioridad: varchar('prioridad', { length: 50 }).notNull().default('media'), // baja, media, alta, urgente
  estado: varchar('estado', { length: 50 }).notNull().default('pendiente'), // pendiente, en_proceso, completado, cancelado
  asignadoA: uuid('asignado_a').references(() => usuarios.id),
  costo: decimal('costo', { precision: 10, scale: 2 }),
  imagenes: json('imagenes'), // Array of image URLs
  fechaInicio: timestamp('fecha_inicio'),
  fechaCompletado: timestamp('fecha_completado'),
  notas: text('notas'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ==========================================
// TRABAJADORES (Workers/Staff)
// ==========================================
export const trabajadores = pgTable('trabajadores', {
  id: uuid('id').defaultRandom().primaryKey(),
  condominioId: uuid('condominio_id').notNull().references(() => condominios.id, { onDelete: 'cascade' }),
  nombre: varchar('nombre', { length: 100 }).notNull(),
  apellido: varchar('apellido', { length: 100 }).notNull(),
  puesto: varchar('puesto', { length: 100 }).notNull(), // conserje, jardinero, mantenimiento, seguridad
  telefono: varchar('telefono', { length: 20 }),
  email: varchar('email', { length: 255 }),
  salario: decimal('salario', { precision: 10, scale: 2 }),
  fechaContratacion: timestamp('fecha_contratacion').notNull(),
  activo: boolean('activo').notNull().default(true),
  documentos: json('documentos'), // Array of document URLs
  notas: text('notas'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ==========================================
// RELACIONES (Relations)
// ==========================================
export const usuariosRelations = relations(usuarios, ({ many }) => ({
  condominiosGestionados: many(condominios),
  unidadesPropias: many(unidades, { relationName: 'propietario' }),
  unidadesRentadas: many(unidades, { relationName: 'inquilino' }),
  pagos: many(pagos),
  reservaciones: many(reservaciones),
  solicitudesMantenimiento: many(mantenimiento),
}));

export const condominiosRelations = relations(condominios, ({ one, many }) => ({
  gerente: one(usuarios, {
    fields: [condominios.gerenteId],
    references: [usuarios.id],
  }),
  unidades: many(unidades),
  reservaciones: many(reservaciones),
  asambleas: many(asambleas),
  reglamentos: many(reglamentos),
  mantenimiento: many(mantenimiento),
  trabajadores: many(trabajadores),
}));

export const unidadesRelations = relations(unidades, ({ one, many }) => ({
  condominio: one(condominios, {
    fields: [unidades.condominioId],
    references: [condominios.id],
  }),
  propietario: one(usuarios, {
    fields: [unidades.propietarioId],
    references: [usuarios.id],
    relationName: 'propietario',
  }),
  inquilino: one(usuarios, {
    fields: [unidades.inquilinoId],
    references: [usuarios.id],
    relationName: 'inquilino',
  }),
  pagos: many(pagos),
  reservaciones: many(reservaciones),
}));
