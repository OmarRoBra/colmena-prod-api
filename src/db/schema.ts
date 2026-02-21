import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  decimal,
  json,
  date,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ==========================================
// USUARIOS (Users)
// ==========================================
export const usuarios = pgTable('usuarios', {
  id: uuid('id').primaryKey(), // Matches Supabase auth.users.id
  nombre: varchar('nombre', { length: 100 }).notNull(),
  apellido: varchar('apellido', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  telefono: varchar('telefono', { length: 20 }),
  rol: varchar('rol', { length: 50 }).notNull().default('owner'), // admin, condoAdmin, owner, tenant, worker, serviceProvider
  activo: boolean('activo').notNull().default(true),
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
  statusCondominio: varchar('status_condominio', { length: 20 })
    .notNull()
    .default('activo'), // activo, inactivo, archivado
  activo: boolean('activo').notNull().default(true), // Deprecated: use statusCondominio instead
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ==========================================
// UNIDADES (Units/Apartments)
// ==========================================
export const unidades = pgTable('unidades', {
  id: uuid('id').defaultRandom().primaryKey(),
  condominiumId: uuid('condominium_id')
    .notNull()
    .references(() => condominios.id, { onDelete: 'cascade' }),
  numero: varchar('numero', { length: 50 }).notNull(), // Unit number
  tipo: varchar('tipo', { length: 50 }).notNull(), // Apartamento, Casa, Local Comercial, Estacionamiento
  area: decimal('area', { precision: 10, scale: 2 }).notNull(),
  propietario: varchar('propietario', { length: 200 }).notNull(), // Owner name
  estado: varchar('estado', { length: 50 }).notNull().default('Vacío'), // Ocupado, Vacío, Mantenimiento
  habitaciones: integer('habitaciones').notNull().default(0),
  banos: integer('banos').notNull().default(0),
  estacionamientos: integer('estacionamientos').notNull().default(0),
  cuotaMantenimiento: decimal('cuota_mantenimiento', {
    precision: 10,
    scale: 2,
  }).notNull(),
  notas: text('notas'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ==========================================
// PAGOS (Payments)
// ==========================================
export const pagos = pgTable('pagos', {
  id: uuid('id').defaultRandom().primaryKey(),
  unidadId: uuid('unidad_id')
    .notNull()
    .references(() => unidades.id, { onDelete: 'cascade' }),
  usuarioId: uuid('usuario_id')
    .notNull()
    .references(() => usuarios.id),
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
// ÁREAS COMUNES (Shared/Common Areas)
// ==========================================
export const areasComunes = pgTable('areas_comunes', {
  id: uuid('id').defaultRandom().primaryKey(),
  condominioId: uuid('condominio_id')
    .notNull()
    .references(() => condominios.id, { onDelete: 'cascade' }),
  nombre: varchar('nombre', { length: 200 }).notNull(),
  descripcion: text('descripcion'),
  tipo: varchar('tipo', { length: 100 }).notNull(), // salon, terraza, gym, alberca, jardin, asador, ludoteca, otro
  capacidad: integer('capacidad').notNull().default(0),
  costo: decimal('costo', { precision: 10, scale: 2 }).default('0'),
  requiereAprobacion: boolean('requiere_aprobacion').notNull().default(true),
  horaApertura: varchar('hora_apertura', { length: 5 }).default('08:00'),
  horaCierre: varchar('hora_cierre', { length: 5 }).default('22:00'),
  imagenes: json('imagenes'), // Array of image URLs
  activo: boolean('activo').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ==========================================
// RESERVACIONES (Reservations for common areas)
// ==========================================
export const reservaciones = pgTable('reservaciones', {
  id: uuid('id').defaultRandom().primaryKey(),
  condominioId: uuid('condominio_id')
    .notNull()
    .references(() => condominios.id, { onDelete: 'cascade' }),
  unidadId: uuid('unidad_id')
    .references(() => unidades.id),
  usuarioId: uuid('usuario_id')
    .notNull(), // Supabase Auth UID - no FK to usuarios table
  areaComunId: uuid('area_comun_id')
    .references(() => areasComunes.id),
  area: varchar('area', { length: 100 }).notNull(), // salon, terraza, gym, etc.
  fechaInicio: timestamp('fecha_inicio').notNull(),
  fechaFin: timestamp('fecha_fin').notNull(),
  estado: varchar('estado', { length: 50 }).notNull().default('pendiente'), // pendiente, confirmado, cancelado
  costo: decimal('costo', { precision: 10, scale: 2 }).default('0'),
  numPersonas: integer('num_personas').default(1),
  motivo: text('motivo'),
  notas: text('notas'),
  pagado: boolean('pagado').notNull().default(false),
  aprobadoPor: uuid('aprobado_por'), // Supabase Auth UID
  fechaAprobacion: timestamp('fecha_aprobacion'),
  motivoRechazo: text('motivo_rechazo'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ==========================================
// GASTOS (Expenses)
// ==========================================
export const gastos = pgTable('gastos', {
  id: uuid('id').defaultRandom().primaryKey(),
  condominioId: uuid('condominio_id')
    .notNull()
    .references(() => condominios.id, { onDelete: 'cascade' }),
  concepto: varchar('concepto', { length: 200 }).notNull(),
  descripcion: text('descripcion'),
  monto: decimal('monto', { precision: 10, scale: 2 }).notNull(),
  categoria: varchar('categoria', { length: 100 }).notNull(), // mantenimiento, servicios, nomina, seguros, impuestos, otro
  fechaGasto: timestamp('fecha_gasto').notNull(),
  comprobante: varchar('comprobante', { length: 500 }),
  notas: text('notas'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ==========================================
// ASAMBLEAS (Assembly meetings)
// ==========================================
export const asambleas = pgTable('asambleas', {
  id: uuid('id').defaultRandom().primaryKey(),
  condominioId: uuid('condominio_id')
    .notNull()
    .references(() => condominios.id, { onDelete: 'cascade' }),
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
// COMITÉS (Committees)
// ==========================================
export const comites = pgTable('comites', {
  id: uuid('id').defaultRandom().primaryKey(),
  condominioId: uuid('condominio_id')
    .notNull()
    .references(() => condominios.id, { onDelete: 'cascade' }),
  nombre: varchar('nombre', { length: 200 }).notNull(),
  descripcion: text('descripcion'),
  tipo: varchar('tipo', { length: 100 }).notNull(), // administracion, vigilancia, mantenimiento, social, otro
  fechaFormacion: date('fecha_formacion').notNull(),
  estado: varchar('estado', { length: 50 }).notNull().default('activo'), // activo, inactivo, disuelto
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ==========================================
// COMITÉ MIEMBROS (Committee Members)
// ==========================================
export const comiteMiembros = pgTable('comite_miembros', {
  id: uuid('id').defaultRandom().primaryKey(),
  comiteId: uuid('comite_id')
    .notNull()
    .references(() => comites.id, { onDelete: 'cascade' }),
  residenteId: uuid('residente_id')
    .notNull()
    .references(() => residentes.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 100 }).notNull(), // presidente, secretario, tesorero, vocal
  fechaIngreso: date('fecha_ingreso').notNull(),
  activo: boolean('activo').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ==========================================
// REGLAMENTOS (Rules/Regulations)
// ==========================================
export const reglamentos = pgTable('reglamentos', {
  id: uuid('id').defaultRandom().primaryKey(),
  condominioId: uuid('condominio_id')
    .notNull()
    .references(() => condominios.id, { onDelete: 'cascade' }),
  titulo: varchar('titulo', { length: 200 }).notNull(),
  descripcion: text('descripcion'), // Description of the regulation
  contenido: text('contenido'), // HTML content of the regulation (editable)
  categoria: varchar('categoria', { length: 100 }), // general, mascotas, ruido, estacionamiento, etc.
  version: varchar('version', { length: 20 }).notNull().default('v1.0'), // Version number (v1.0, v2.0, etc.)
  vigenciaDesde: timestamp('vigencia_desde').notNull(), // Effective date
  estado: varchar('estado', { length: 50 }).notNull().default('active'), // active, archived, draft, pending_approval
  documento: varchar('documento', { length: 500 }), // URL to PDF
  pages: integer('pages'), // Number of pages in PDF
  fileSize: varchar('file_size', { length: 50 }), // File size (e.g., "2.5 MB")
  approvedBy: varchar('approved_by', { length: 200 }), // Who approved this version
  activo: boolean('activo').notNull().default(true), // Deprecated: use estado instead
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ==========================================
// MANTENIMIENTO (Maintenance requests)
// ==========================================
export const mantenimiento = pgTable('mantenimiento', {
  id: uuid('id').defaultRandom().primaryKey(),
  condominioId: uuid('condominio_id')
    .notNull()
    .references(() => condominios.id, { onDelete: 'cascade' }),
  unidadId: uuid('unidad_id').references(() => unidades.id),
  solicitanteId: uuid('solicitante_id')
    .references(() => usuarios.id),
  residenteId: uuid('residente_id').references(() => residentes.id, { onDelete: 'set null' }),
  tipo: varchar('tipo', { length: 50 }).notNull().default('mantenimiento'), // 'mantenimiento' | 'incidente'
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
// RESIDENTES (Residents)
// ==========================================
export const residentes = pgTable('residentes', {
  id: uuid('id').defaultRandom().primaryKey(),
  condominioId: uuid('condominio_id')
    .notNull()
    .references(() => condominios.id, { onDelete: 'cascade' }),
  unidadId: uuid('unidad_id')
    .references(() => unidades.id, { onDelete: 'set null' }),
  nombre: varchar('nombre', { length: 200 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  telefono: varchar('telefono', { length: 20 }).notNull(),
  tipo: varchar('tipo', { length: 50 }).notNull().default('Propietario'), // Propietario, Inquilino, Familiar
  fechaIngreso: timestamp('fecha_ingreso').notNull(),
  documentoIdentidad: varchar('documento_identidad', { length: 50 }),
  contactoEmergencia: varchar('contacto_emergencia', { length: 200 }),
  telefonoEmergencia: varchar('telefono_emergencia', { length: 20 }),
  notas: text('notas'),
  activo: boolean('activo').notNull().default(true),
  usuarioId: uuid('usuario_id').references(() => usuarios.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ==========================================
// TRABAJADORES (Workers/Staff)
// ==========================================
export const trabajadores = pgTable('trabajadores', {
  id: uuid('id').defaultRandom().primaryKey(),
  condominioId: uuid('condominio_id')
    .notNull()
    .references(() => condominios.id, { onDelete: 'cascade' }),
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
  usuarioId: uuid('usuario_id').references(() => usuarios.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ==========================================
// PROVEEDORES (Providers/Vendors)
// ==========================================
export const proveedores = pgTable('proveedores', {
  id: uuid('id').defaultRandom().primaryKey(),
  condominioId: uuid('condominio_id')
    .notNull()
    .references(() => condominios.id, { onDelete: 'cascade' }),
  nombreEmpresa: varchar('nombre_empresa', { length: 200 }).notNull(),
  nombreContacto: varchar('nombre_contacto', { length: 200 }).notNull(),
  tipoServicio: varchar('tipo_servicio', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  telefono: varchar('telefono', { length: 20 }).notNull(),
  estado: varchar('estado', { length: 20 }).notNull().default('active'), // active, inactive, suspended
  direccion: varchar('direccion', { length: 500 }),
  rfc: varchar('rfc', { length: 50 }),
  calificacion: integer('calificacion').default(5),
  inicioContrato: timestamp('inicio_contrato'),
  finContrato: timestamp('fin_contrato'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ==========================================
// CONTRATOS (Contracts)
// ==========================================
export const contratos = pgTable('contratos', {
  id: uuid('id').defaultRandom().primaryKey(),
  condominioId: uuid('condominio_id')
    .notNull()
    .references(() => condominios.id, { onDelete: 'cascade' }),
  tipo: varchar('tipo', { length: 100 }).notNull(), // servicios, mantenimiento, seguridad, limpieza, otro
  partes: varchar('partes', { length: 500 }).notNull(), // Parties involved
  monto: decimal('monto', { precision: 10, scale: 2 }).notNull(),
  fechaInicio: timestamp('fecha_inicio').notNull(),
  fechaFin: timestamp('fecha_fin').notNull(),
  estado: varchar('estado', { length: 50 }).notNull().default('activo'), // activo, inactivo, vencido
  documento: varchar('documento', { length: 500 }), // URL to contract document
  notas: text('notas'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ==========================================
// MENSAJES (Messages / Communications)
// ==========================================
export const mensajes = pgTable('mensajes', {
  id: uuid('id').defaultRandom().primaryKey(),
  condominioId: uuid('condominio_id')
    .notNull()
    .references(() => condominios.id, { onDelete: 'cascade' }),
  de: varchar('de', { length: 200 }).notNull(), // sender
  para: varchar('para', { length: 200 }).notNull(), // recipient
  asunto: varchar('asunto', { length: 300 }).notNull(), // subject
  contenido: text('contenido').notNull(), // content
  estado: varchar('estado', { length: 50 }).notNull().default('enviado'), // enviado, leido, borrador
  prioridad: varchar('prioridad', { length: 50 }).default('normal'), // baja, normal, alta
  fecha: timestamp('fecha').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ==========================================
// ENCUESTAS (Surveys / Polls)
// ==========================================
export const encuestas = pgTable('encuestas', {
  id: uuid('id').defaultRandom().primaryKey(),
  condominioId: uuid('condominio_id')
    .notNull()
    .references(() => condominios.id, { onDelete: 'cascade' }),
  titulo: varchar('titulo', { length: 200 }).notNull(),
  descripcion: text('descripcion'),
  fechaInicio: timestamp('fecha_inicio').notNull(),
  fechaFin: timestamp('fecha_fin').notNull(),
  destinatarios: varchar('destinatarios', { length: 100 }).notNull().default('todos'),
  estado: varchar('estado', { length: 50 }).notNull().default('activo'),
  preguntas: json('preguntas').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ==========================================
// ENCUESTA RESPUESTAS (Survey Responses)
// ==========================================
export const encuestaRespuestas = pgTable('encuesta_respuestas', {
  id: uuid('id').defaultRandom().primaryKey(),
  encuestaId: uuid('encuesta_id')
    .notNull()
    .references(() => encuestas.id, { onDelete: 'cascade' }),
  respondidoPor: varchar('respondido_por', { length: 200 }).notNull(),
  unidadId: uuid('unidad_id').references(() => unidades.id, { onDelete: 'set null' }),
  respuestas: json('respuestas').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ==========================================
// DOCUMENTOS (Documents)
// ==========================================
export const documentos = pgTable('documentos', {
  id: uuid('id').defaultRandom().primaryKey(),
  condominioId: uuid('condominio_id')
    .notNull()
    .references(() => condominios.id, { onDelete: 'cascade' }),
  nombre: varchar('nombre', { length: 255 }).notNull(),
  categoria: varchar('categoria', { length: 100 }),
  tamano: integer('tamano'), // file size in bytes
  tipoArchivo: varchar('tipo_archivo', { length: 100 }),
  url: varchar('url', { length: 500 }).notNull(),
  subidoPor: varchar('subido_por', { length: 200 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ==========================================
// FAMILIARES (Family Contacts of Residents)
// ==========================================
export const familiares = pgTable('familiares', {
  id: uuid('id').defaultRandom().primaryKey(),
  residenteId: uuid('residente_id')
    .notNull()
    .references(() => residentes.id, { onDelete: 'cascade' }),
  condominioId: uuid('condominio_id')
    .notNull()
    .references(() => condominios.id, { onDelete: 'cascade' }),
  nombre: varchar('nombre', { length: 200 }).notNull(),
  telefono: varchar('telefono', { length: 20 }),
  relacion: varchar('relacion', { length: 100 }).notNull(), // hijo, esposa, padre, hermano, etc.
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ==========================================
// VISITAS (Visit QR Tracking)
// ==========================================
export const visitas = pgTable('visitas', {
  id: uuid('id').defaultRandom().primaryKey(),
  condominioId: uuid('condominio_id')
    .notNull()
    .references(() => condominios.id, { onDelete: 'cascade' }),
  residenteId: uuid('residente_id')
    .notNull()
    .references(() => residentes.id, { onDelete: 'cascade' }),
  familiarId: uuid('familiar_id')
    .references(() => familiares.id, { onDelete: 'set null' }),
  nombreVisitante: varchar('nombre_visitante', { length: 200 }).notNull(),
  fechaEsperada: timestamp('fecha_esperada').notNull(),
  qrToken: varchar('qr_token', { length: 100 }).notNull().unique(),
  estado: varchar('estado', { length: 50 }).notNull().default('pendiente'), // pendiente | llegada | salida
  llegadaAt: timestamp('llegada_at'),
  salidaAt: timestamp('salida_at'),
  notas: text('notas'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ==========================================
// RELACIONES (Relations)
// ==========================================
export const usuariosRelations = relations(usuarios, ({ many }) => ({
  condominiosGestionados: many(condominios),
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
  areasComunes: many(areasComunes),
  asambleas: many(asambleas),
  comites: many(comites),
  reglamentos: many(reglamentos),
  mantenimiento: many(mantenimiento),
  trabajadores: many(trabajadores),
  proveedores: many(proveedores),
  gastos: many(gastos),
  contratos: many(contratos),
  mensajes: many(mensajes),
  documentos: many(documentos),
  encuestas: many(encuestas),
  familiares: many(familiares),
  visitas: many(visitas),
}));

export const areasComunesRelations = relations(areasComunes, ({ one, many }) => ({
  condominio: one(condominios, {
    fields: [areasComunes.condominioId],
    references: [condominios.id],
  }),
  reservaciones: many(reservaciones),
}));

export const unidadesRelations = relations(unidades, ({ one, many }) => ({
  condominio: one(condominios, {
    fields: [unidades.condominiumId],
    references: [condominios.id],
  }),
  residentes: many(residentes),
  pagos: many(pagos),
  reservaciones: many(reservaciones),
}));

export const residentesRelations = relations(residentes, ({ one, many }) => ({
  unidad: one(unidades, {
    fields: [residentes.unidadId],
    references: [unidades.id],
  }),
  usuario: one(usuarios, {
    fields: [residentes.usuarioId],
    references: [usuarios.id],
  }),
  familiares: many(familiares),
  visitas: many(visitas),
}));

export const comitesRelations = relations(comites, ({ one, many }) => ({
  condominio: one(condominios, {
    fields: [comites.condominioId],
    references: [condominios.id],
  }),
  miembros: many(comiteMiembros),
}));

export const comiteMiembrosRelations = relations(comiteMiembros, ({ one }) => ({
  comite: one(comites, {
    fields: [comiteMiembros.comiteId],
    references: [comites.id],
  }),
  residente: one(residentes, {
    fields: [comiteMiembros.residenteId],
    references: [residentes.id],
  }),
}));

export const encuestasRelations = relations(encuestas, ({ one, many }) => ({
  condominio: one(condominios, {
    fields: [encuestas.condominioId],
    references: [condominios.id],
  }),
  respuestas: many(encuestaRespuestas),
}));

export const encuestaRespuestasRelations = relations(encuestaRespuestas, ({ one }) => ({
  encuesta: one(encuestas, {
    fields: [encuestaRespuestas.encuestaId],
    references: [encuestas.id],
  }),
  unidad: one(unidades, {
    fields: [encuestaRespuestas.unidadId],
    references: [unidades.id],
  }),
}));

export const familiaresRelations = relations(familiares, ({ one, many }) => ({
  residente: one(residentes, {
    fields: [familiares.residenteId],
    references: [residentes.id],
  }),
  condominio: one(condominios, {
    fields: [familiares.condominioId],
    references: [condominios.id],
  }),
  visitas: many(visitas),
}));

export const visitasRelations = relations(visitas, ({ one }) => ({
  condominio: one(condominios, {
    fields: [visitas.condominioId],
    references: [condominios.id],
  }),
  residente: one(residentes, {
    fields: [visitas.residenteId],
    references: [residentes.id],
  }),
  familiar: one(familiares, {
    fields: [visitas.familiarId],
    references: [familiares.id],
  }),
}));
