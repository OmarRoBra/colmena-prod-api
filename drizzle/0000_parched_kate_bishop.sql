CREATE TABLE "asambleas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominio_id" uuid NOT NULL,
	"titulo" varchar(200) NOT NULL,
	"descripcion" text,
	"fecha" timestamp NOT NULL,
	"ubicacion" varchar(200),
	"tipo" varchar(50) NOT NULL,
	"estado" varchar(50) DEFAULT 'programada' NOT NULL,
	"documentos" json,
	"acuerdos" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "condominios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" varchar(200) NOT NULL,
	"direccion" text NOT NULL,
	"ciudad" varchar(100) NOT NULL,
	"estado" varchar(100) NOT NULL,
	"codigo_postal" varchar(10),
	"telefono" varchar(20),
	"email" varchar(255),
	"total_unidades" integer DEFAULT 0 NOT NULL,
	"gerente_id" uuid,
	"thumbnail" varchar(500),
	"configuracion" json,
	"status_condominio" varchar(20) DEFAULT 'activo' NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mantenimiento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominio_id" uuid NOT NULL,
	"unidad_id" uuid,
	"solicitante_id" uuid NOT NULL,
	"titulo" varchar(200) NOT NULL,
	"descripcion" text NOT NULL,
	"categoria" varchar(100) NOT NULL,
	"prioridad" varchar(50) DEFAULT 'media' NOT NULL,
	"estado" varchar(50) DEFAULT 'pendiente' NOT NULL,
	"asignado_a" uuid,
	"costo" numeric(10, 2),
	"imagenes" json,
	"fecha_inicio" timestamp,
	"fecha_completado" timestamp,
	"notas" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pagos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unidad_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"monto" numeric(10, 2) NOT NULL,
	"concepto" varchar(200) NOT NULL,
	"metodo_pago" varchar(50) NOT NULL,
	"referencia" varchar(100),
	"estado" varchar(50) DEFAULT 'pendiente' NOT NULL,
	"fecha_pago" timestamp,
	"comprobante" varchar(500),
	"notas" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reglamentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominio_id" uuid NOT NULL,
	"titulo" varchar(200) NOT NULL,
	"contenido" text NOT NULL,
	"categoria" varchar(100),
	"vigencia_desde" timestamp NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"documento" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reservaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominio_id" uuid NOT NULL,
	"unidad_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"area" varchar(100) NOT NULL,
	"fecha_inicio" timestamp NOT NULL,
	"fecha_fin" timestamp NOT NULL,
	"estado" varchar(50) DEFAULT 'pendiente' NOT NULL,
	"costo" numeric(10, 2) DEFAULT '0',
	"notas" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trabajadores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominio_id" uuid NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"apellido" varchar(100) NOT NULL,
	"puesto" varchar(100) NOT NULL,
	"telefono" varchar(20),
	"email" varchar(255),
	"salario" numeric(10, 2),
	"fecha_contratacion" timestamp NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"documentos" json,
	"notas" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unidades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condominio_id" uuid NOT NULL,
	"numero" varchar(50) NOT NULL,
	"propietario_id" uuid,
	"inquilino_id" uuid,
	"tipo" varchar(50) NOT NULL,
	"metros_cuadrados" numeric(10, 2),
	"habitaciones" integer,
	"banos" integer,
	"estacionamientos" integer DEFAULT 0,
	"cuota_mantenimiento" numeric(10, 2) NOT NULL,
	"estado_pago" varchar(50) DEFAULT 'al_corriente',
	"notas" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"apellido" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"telefono" varchar(20),
	"rol" varchar(50) DEFAULT 'owner' NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "asambleas" ADD CONSTRAINT "asambleas_condominio_id_condominios_id_fk" FOREIGN KEY ("condominio_id") REFERENCES "public"."condominios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condominios" ADD CONSTRAINT "condominios_gerente_id_usuarios_id_fk" FOREIGN KEY ("gerente_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mantenimiento" ADD CONSTRAINT "mantenimiento_condominio_id_condominios_id_fk" FOREIGN KEY ("condominio_id") REFERENCES "public"."condominios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mantenimiento" ADD CONSTRAINT "mantenimiento_unidad_id_unidades_id_fk" FOREIGN KEY ("unidad_id") REFERENCES "public"."unidades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mantenimiento" ADD CONSTRAINT "mantenimiento_solicitante_id_usuarios_id_fk" FOREIGN KEY ("solicitante_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mantenimiento" ADD CONSTRAINT "mantenimiento_asignado_a_usuarios_id_fk" FOREIGN KEY ("asignado_a") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_unidad_id_unidades_id_fk" FOREIGN KEY ("unidad_id") REFERENCES "public"."unidades"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reglamentos" ADD CONSTRAINT "reglamentos_condominio_id_condominios_id_fk" FOREIGN KEY ("condominio_id") REFERENCES "public"."condominios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservaciones" ADD CONSTRAINT "reservaciones_condominio_id_condominios_id_fk" FOREIGN KEY ("condominio_id") REFERENCES "public"."condominios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservaciones" ADD CONSTRAINT "reservaciones_unidad_id_unidades_id_fk" FOREIGN KEY ("unidad_id") REFERENCES "public"."unidades"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservaciones" ADD CONSTRAINT "reservaciones_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trabajadores" ADD CONSTRAINT "trabajadores_condominio_id_condominios_id_fk" FOREIGN KEY ("condominio_id") REFERENCES "public"."condominios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unidades" ADD CONSTRAINT "unidades_condominio_id_condominios_id_fk" FOREIGN KEY ("condominio_id") REFERENCES "public"."condominios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unidades" ADD CONSTRAINT "unidades_propietario_id_usuarios_id_fk" FOREIGN KEY ("propietario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unidades" ADD CONSTRAINT "unidades_inquilino_id_usuarios_id_fk" FOREIGN KEY ("inquilino_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;