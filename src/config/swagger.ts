import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './env';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Colmena API - Sistema de Administración de Condominios',
    version: '1.0.0',
    description: `
API REST para la gestión integral de condominios.

## Características principales:
- Gestión de condominios, unidades y residentes
- Sistema de pagos y cuotas de mantenimiento
- Reservaciones de áreas comunes
- Solicitudes de mantenimiento
- Asambleas y reglamentos
- Sistema de roles y permisos

## Roles disponibles:
- **admin**: Administrador del sistema con acceso completo
- **condoAdmin**: Administrador de condominio específico
- **owner**: Propietario de unidad(es)
- **tenant**: Inquilino/arrendatario
- **worker**: Trabajador de mantenimiento
- **serviceProvider**: Proveedor de servicios externo

## Autenticación:
Usa el endpoint \`/api/v1/auth/login\` para obtener un token JWT.
Luego incluye el token en el header Authorization: \`Bearer {token}\`
    `,
    contact: {
      name: 'API Support',
      email: 'support@colmena.com',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: `http://localhost:${config.port}${config.apiPrefix}`,
      description: 'Development server',
    },
    {
      url: `https://api.colmena.com${config.apiPrefix}`,
      description: 'Production server',
    },
  ],
  tags: [
    { name: 'Auth', description: 'Authentication endpoints' },
    { name: 'Usuarios', description: 'User management' },
    { name: 'Condominios', description: 'Condominium management' },
    { name: 'Unidades', description: 'Unit/apartment management' },
    { name: 'Pagos', description: 'Payment management' },
    { name: 'Reservaciones', description: 'Common area reservations' },
    { name: 'Asambleas', description: 'Assembly meetings' },
    { name: 'Reglamentos', description: 'Rules and regulations' },
    { name: 'Mantenimiento', description: 'Maintenance requests' },
    { name: 'Trabajadores', description: 'Workers/staff management' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token obtained from /auth/login',
      },
    },
    schemas: {
      // Common schemas
      Error: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'error' },
          message: { type: 'string', example: 'Error message' },
          statusCode: { type: 'integer', example: 400 },
          errors: {
            type: 'array',
            items: { type: 'object' },
          },
        },
      },
      Success: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'success' },
          message: { type: 'string' },
          data: { type: 'object' },
        },
      },

      // Auth schemas
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'test@example.com' },
          password: { type: 'string', format: 'password', example: 'password123' },
        },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'success' },
          message: { type: 'string', example: 'Login exitoso' },
          data: {
            type: 'object',
            properties: {
              token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
              user: { $ref: '#/components/schemas/Usuario' },
            },
          },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['nombre', 'apellido', 'email', 'password'],
        properties: {
          nombre: { type: 'string', minLength: 2, maxLength: 100, example: 'Juan' },
          apellido: { type: 'string', minLength: 2, maxLength: 100, example: 'Pérez' },
          email: { type: 'string', format: 'email', example: 'juan.perez@example.com' },
          password: { type: 'string', minLength: 6, example: 'password123' },
          telefono: { type: 'string', maxLength: 20, example: '+52 123 456 7890' },
          rol: {
            type: 'string',
            enum: ['admin', 'condoAdmin', 'owner', 'tenant', 'worker', 'serviceProvider'],
            example: 'owner',
          },
        },
      },
      ChangePasswordRequest: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string', format: 'password' },
          newPassword: { type: 'string', minLength: 6, format: 'password' },
        },
      },

      // Usuario schemas
      Usuario: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000' },
          nombre: { type: 'string', example: 'Juan' },
          apellido: { type: 'string', example: 'Pérez' },
          email: { type: 'string', format: 'email', example: 'juan.perez@example.com' },
          telefono: { type: 'string', example: '+52 123 456 7890' },
          rol: {
            type: 'string',
            enum: ['admin', 'condoAdmin', 'owner', 'tenant', 'worker', 'serviceProvider'],
            example: 'owner',
          },
          activo: { type: 'boolean', example: true },
          emailVerificado: { type: 'boolean', example: false },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateUsuarioRequest: {
        type: 'object',
        required: ['nombre', 'apellido', 'email', 'password'],
        properties: {
          nombre: { type: 'string', minLength: 2, maxLength: 100 },
          apellido: { type: 'string', minLength: 2, maxLength: 100 },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
          telefono: { type: 'string', maxLength: 20 },
          rol: {
            type: 'string',
            enum: ['admin', 'condoAdmin', 'owner', 'tenant', 'worker', 'serviceProvider'],
          },
        },
      },
      UpdateUsuarioRequest: {
        type: 'object',
        properties: {
          nombre: { type: 'string', minLength: 2, maxLength: 100 },
          apellido: { type: 'string', minLength: 2, maxLength: 100 },
          telefono: { type: 'string', maxLength: 20 },
          rol: {
            type: 'string',
            enum: ['admin', 'condoAdmin', 'owner', 'tenant', 'worker', 'serviceProvider'],
          },
          activo: { type: 'boolean' },
        },
      },

      // Condominio schemas
      Condominio: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          nombre: { type: 'string', example: 'Residencial Las Palmas' },
          direccion: { type: 'string', example: 'Av. Principal 123' },
          ciudad: { type: 'string', example: 'Ciudad de México' },
          estado: { type: 'string', example: 'CDMX', description: 'State/Province (e.g., CDMX, Jalisco)' },
          codigoPostal: { type: 'string', example: '01000' },
          telefono: { type: 'string', example: '+52 55 1234 5678' },
          email: { type: 'string', format: 'email', example: 'info@laspalmas.com' },
          totalUnidades: { type: 'integer', example: 50 },
          gerenteId: { type: 'string', format: 'uuid' },
          thumbnail: { type: 'string', format: 'uri', example: 'https://storage.example.com/condos/laspalmas.jpg', nullable: true },
          configuracion: { type: 'object' },
          statusCondominio: { type: 'string', enum: ['activo', 'inactivo', 'archivado'], example: 'activo', description: 'Status of the condominium' },
          activo: { type: 'boolean', example: true, description: 'Deprecated: use statusCondominio field instead' },
          totalUnits: { type: 'integer', example: 50, description: 'Total number of units in the condominium' },
          occupiedUnits: { type: 'integer', example: 35, description: 'Number of occupied units (with owner or tenant)' },
          availableUnits: { type: 'integer', example: 15, description: 'Number of available units' },
          occupationRate: { type: 'string', example: '70.00%', description: 'Occupation rate percentage' },
          status: { type: 'string', enum: ['activo', 'inactivo', 'archivado'], example: 'activo', description: 'Computed status of the condominium' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateCondominioRequest: {
        type: 'object',
        required: ['nombre', 'direccion', 'ciudad', 'estado'],
        properties: {
          nombre: { type: 'string', maxLength: 200 },
          direccion: { type: 'string' },
          ciudad: { type: 'string', maxLength: 100 },
          estado: { type: 'string', maxLength: 100, description: 'State/Province (e.g., CDMX, Jalisco)' },
          codigoPostal: { type: 'string', maxLength: 10 },
          telefono: { type: 'string', maxLength: 20 },
          email: { type: 'string', format: 'email', maxLength: 255 },
          totalUnidades: { type: 'integer', minimum: 0 },
          gerenteId: { type: 'string', format: 'uuid' },
          thumbnail: { type: 'string', format: 'uri', maxLength: 500 },
          statusCondominio: { type: 'string', enum: ['activo', 'inactivo', 'archivado'], description: 'Condominium status (defaults to activo)' },
          configuracion: { type: 'object' },
        },
      },

      // Unidad schemas
      Unidad: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          condominioId: { type: 'string', format: 'uuid' },
          numero: { type: 'string', example: 'A-101' },
          propietarioId: { type: 'string', format: 'uuid' },
          inquilinoId: { type: 'string', format: 'uuid', nullable: true },
          tipo: { type: 'string', enum: ['departamento', 'casa', 'local'], example: 'departamento' },
          metrosCuadrados: { type: 'number', example: 85.5 },
          habitaciones: { type: 'integer', example: 2 },
          banos: { type: 'integer', example: 2 },
          estacionamientos: { type: 'integer', example: 1 },
          cuotaMantenimiento: { type: 'number', example: 1500.00 },
          estadoPago: {
            type: 'string',
            enum: ['al_corriente', 'atrasado', 'moroso'],
            example: 'al_corriente',
          },
          notas: { type: 'string' },
          activo: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateUnidadRequest: {
        type: 'object',
        required: ['condominioId', 'numero', 'tipo', 'cuotaMantenimiento'],
        properties: {
          condominioId: { type: 'string', format: 'uuid' },
          numero: { type: 'string', maxLength: 50 },
          propietarioId: { type: 'string', format: 'uuid' },
          inquilinoId: { type: 'string', format: 'uuid' },
          tipo: { type: 'string', enum: ['departamento', 'casa', 'local'] },
          metrosCuadrados: { type: 'number' },
          habitaciones: { type: 'integer' },
          banos: { type: 'integer' },
          estacionamientos: { type: 'integer' },
          cuotaMantenimiento: { type: 'number' },
          estadoPago: { type: 'string', enum: ['al_corriente', 'atrasado', 'moroso'] },
          notas: { type: 'string' },
        },
      },

      // Pago schemas
      Pago: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          unidadId: { type: 'string', format: 'uuid' },
          usuarioId: { type: 'string', format: 'uuid' },
          monto: { type: 'number', example: 1500.00 },
          concepto: { type: 'string', example: 'Cuota de mantenimiento - Enero 2025' },
          metodoPago: {
            type: 'string',
            enum: ['efectivo', 'transferencia', 'tarjeta'],
            example: 'transferencia',
          },
          referencia: { type: 'string', example: 'REF123456' },
          estado: {
            type: 'string',
            enum: ['pendiente', 'completado', 'rechazado'],
            example: 'completado',
          },
          fechaPago: { type: 'string', format: 'date-time' },
          comprobante: { type: 'string', format: 'uri' },
          notas: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreatePagoRequest: {
        type: 'object',
        required: ['unidadId', 'usuarioId', 'monto', 'concepto', 'metodoPago'],
        properties: {
          unidadId: { type: 'string', format: 'uuid' },
          usuarioId: { type: 'string', format: 'uuid' },
          monto: { type: 'number', minimum: 0 },
          concepto: { type: 'string', maxLength: 200 },
          metodoPago: { type: 'string', enum: ['efectivo', 'transferencia', 'tarjeta'] },
          referencia: { type: 'string', maxLength: 100 },
          comprobante: { type: 'string', format: 'uri', maxLength: 500 },
          notas: { type: 'string' },
        },
      },

      // Reservacion schemas
      Reservacion: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          condominioId: { type: 'string', format: 'uuid' },
          unidadId: { type: 'string', format: 'uuid' },
          usuarioId: { type: 'string', format: 'uuid' },
          area: { type: 'string', example: 'Salón de fiestas' },
          fechaInicio: { type: 'string', format: 'date-time' },
          fechaFin: { type: 'string', format: 'date-time' },
          estado: {
            type: 'string',
            enum: ['pendiente', 'confirmado', 'cancelado'],
            example: 'confirmado',
          },
          costo: { type: 'number', example: 500.00 },
          notas: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },

      // Asamblea schemas
      Asamblea: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          condominioId: { type: 'string', format: 'uuid' },
          titulo: { type: 'string', example: 'Asamblea Ordinaria - Enero 2025' },
          descripcion: { type: 'string' },
          fecha: { type: 'string', format: 'date-time' },
          ubicacion: { type: 'string', example: 'Salón de usos múltiples' },
          tipo: { type: 'string', enum: ['ordinaria', 'extraordinaria'], example: 'ordinaria' },
          estado: {
            type: 'string',
            enum: ['programada', 'en_curso', 'finalizada', 'cancelada'],
            example: 'programada',
          },
          documentos: { type: 'array', items: { type: 'string' } },
          acuerdos: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },

      // Reglamento schemas
      Reglamento: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          condominioId: { type: 'string', format: 'uuid' },
          titulo: { type: 'string', example: 'Reglamento de convivencia' },
          contenido: { type: 'string' },
          categoria: { type: 'string', example: 'general' },
          vigenciaDesde: { type: 'string', format: 'date-time' },
          activo: { type: 'boolean', example: true },
          documento: { type: 'string', format: 'uri' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },

      // Mantenimiento schemas
      Mantenimiento: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          condominioId: { type: 'string', format: 'uuid' },
          unidadId: { type: 'string', format: 'uuid' },
          solicitanteId: { type: 'string', format: 'uuid' },
          titulo: { type: 'string', example: 'Fuga de agua en baño' },
          descripcion: { type: 'string' },
          categoria: { type: 'string', example: 'fontaneria' },
          prioridad: {
            type: 'string',
            enum: ['baja', 'media', 'alta', 'urgente'],
            example: 'alta',
          },
          estado: {
            type: 'string',
            enum: ['pendiente', 'en_proceso', 'completado', 'cancelado'],
            example: 'pendiente',
          },
          asignadoA: { type: 'string', format: 'uuid' },
          costo: { type: 'number', example: 850.00 },
          imagenes: { type: 'array', items: { type: 'string' } },
          fechaInicio: { type: 'string', format: 'date-time' },
          fechaCompletado: { type: 'string', format: 'date-time' },
          notas: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },

      // Trabajador schemas
      Trabajador: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          condominioId: { type: 'string', format: 'uuid' },
          nombre: { type: 'string', example: 'Carlos' },
          apellido: { type: 'string', example: 'Martínez' },
          puesto: { type: 'string', example: 'Conserje' },
          telefono: { type: 'string', example: '+52 123 456 7890' },
          email: { type: 'string', format: 'email' },
          salario: { type: 'number', example: 8000.00 },
          fechaContratacion: { type: 'string', format: 'date-time' },
          activo: { type: 'boolean', example: true },
          documentos: { type: 'array', items: { type: 'string' } },
          notas: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
    responses: {
      UnauthorizedError: {
        description: 'Authentication token is missing or invalid',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              status: 'error',
              message: 'No autenticado',
              statusCode: 401,
            },
          },
        },
      },
      ForbiddenError: {
        description: 'User does not have permission to access this resource',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              status: 'error',
              message: 'No tienes permisos para realizar esta acción',
              statusCode: 403,
            },
          },
        },
      },
      NotFoundError: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              status: 'error',
              message: 'Recurso no encontrado',
              statusCode: 404,
            },
          },
        },
      },
      ValidationError: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              status: 'error',
              message: 'Error de validación',
              statusCode: 422,
              errors: [
                {
                  field: 'email',
                  message: 'Email inválido',
                },
              ],
            },
          },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
};

const options: swaggerJsdoc.Options = {
  swaggerDefinition,
  apis: ['./src/docs/*.yaml', './src/modules/**/*.routes.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
