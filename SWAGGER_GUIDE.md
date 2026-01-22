# Swagger API Documentation Guide

This guide explains how to use and access the Swagger/OpenAPI documentation for the Colmena API.

## Accessing the Documentation

Once the server is running, you can access the Swagger documentation at:

### Interactive UI
```
http://localhost:3000/api-docs
```

The Swagger UI provides an interactive interface where you can:
- Browse all available endpoints
- View request/response schemas
- Test API endpoints directly from the browser
- See authentication requirements
- View example requests and responses

### JSON Specification
```
http://localhost:3000/api-docs.json
```

This endpoint returns the raw OpenAPI 3.0 specification in JSON format, which can be:
- Imported into API testing tools (Postman, Insomnia, etc.)
- Used to generate client SDKs
- Shared with frontend developers
- Used for automated testing

## Using the Swagger UI

### 1. Authentication

Most endpoints require authentication. To test authenticated endpoints:

1. **Get a Token**:
   - Navigate to **Auth** section
   - Expand the `POST /api/v1/auth/login` endpoint
   - Click "Try it out"
   - Enter credentials:
     ```json
     {
       "email": "test@example.com",
       "password": "password123"
     }
     ```
   - Click "Execute"
   - Copy the token from the response

2. **Authorize**:
   - Click the "Authorize" button at the top of the page
   - Enter: `Bearer {your-token}` (replace {your-token} with the token you copied)
   - Click "Authorize"
   - Click "Close"

Now you can test all authenticated endpoints!

### 2. Testing Endpoints

To test any endpoint:

1. Find the endpoint in the appropriate section (Auth, Usuarios, Condominios, etc.)
2. Click to expand the endpoint
3. Click "Try it out"
4. Fill in the required parameters and request body
5. Click "Execute"
6. View the response below

### 3. Understanding Response Codes

- **200/201**: Success
- **400**: Bad Request (validation error)
- **401**: Unauthorized (missing or invalid token)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found
- **422**: Unprocessable Entity (validation failed)
- **500**: Internal Server Error

## API Structure

### Base URL
```
http://localhost:3000/api/v1
```

### Available Modules

1. **Auth** (`/auth`)
   - User registration
   - Login
   - Profile management
   - Password change

2. **Usuarios** (`/usuarios`)
   - User management (CRUD)
   - Access: admin, condoAdmin

3. **Condominios** (`/condominios`)
   - Condominium management (CRUD)
   - Access: admin, condoAdmin

4. **Unidades** (`/unidades`)
   - Unit/apartment management (CRUD)
   - Access: admin, condoAdmin, owner, tenant (limited)

5. **Pagos** (`/pagos`)
   - Payment management
   - Access: admin, condoAdmin, owner, tenant

6. **Reservaciones** (`/reservaciones`)
   - Common area reservations
   - Access: All authenticated users

7. **Asambleas** (`/asambleas`)
   - Assembly meeting management
   - Access: admin, condoAdmin (write), all users (read)

8. **Reglamentos** (`/reglamentos`)
   - Rules and regulations
   - Access: admin, condoAdmin (write), all users (read)

9. **Mantenimiento** (`/mantenimiento`)
   - Maintenance request management
   - Access: Varies by role

10. **Trabajadores** (`/trabajadores`)
    - Worker/staff management
    - Access: admin, condoAdmin (write), all users (read)

## User Roles and Permissions

The API implements role-based access control with 6 roles:

| Role | Description | Access Level |
|------|-------------|--------------|
| **admin** | System administrator | Full access to all resources |
| **condoAdmin** | Condominium administrator | Manage specific condominium |
| **owner** | Property owner | Manage own properties and payments |
| **tenant** | Renter/tenant | View rented unit, make payments |
| **worker** | Maintenance worker | Update assigned maintenance tasks |
| **serviceProvider** | External service provider | Update assigned service jobs |

For detailed permissions, see `PERMISSIONS_MATRIX.md`.

## Example Workflows

### 1. Register and Login

```bash
# 1. Register a new user
POST /api/v1/auth/register
{
  "nombre": "Juan",
  "apellido": "Pérez",
  "email": "juan.perez@example.com",
  "password": "password123",
  "rol": "owner"
}

# 2. Login
POST /api/v1/auth/login
{
  "email": "juan.perez@example.com",
  "password": "password123"
}

# Response includes token:
{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { ... }
  }
}
```

### 2. Create a Condominium (Admin)

```bash
POST /api/v1/condominios
Authorization: Bearer {token}

{
  "nombre": "Residencial Las Palmas",
  "direccion": "Av. Principal 123",
  "ciudad": "Ciudad de México",
  "estado": "CDMX",
  "codigoPostal": "01000",
  "telefono": "+52 55 1234 5678",
  "email": "info@laspalmas.com",
  "totalUnidades": 50,
  "gerenteId": "uuid-of-condo-admin"
}
```

### 3. Create a Unit (Admin/CondoAdmin)

```bash
POST /api/v1/unidades
Authorization: Bearer {token}

{
  "condominioId": "condominio-uuid",
  "numero": "A-101",
  "propietarioId": "owner-user-uuid",
  "inquilinoId": "tenant-user-uuid",
  "tipo": "departamento",
  "metrosCuadrados": 85.5,
  "habitaciones": 2,
  "banos": 2,
  "estacionamientos": 1,
  "cuotaMantenimiento": 1500.00,
  "estadoPago": "al_corriente"
}
```

### 4. Make a Payment (Owner/Tenant)

```bash
POST /api/v1/pagos
Authorization: Bearer {token}

{
  "unidadId": "unit-uuid",
  "usuarioId": "user-uuid",
  "monto": 1500.00,
  "concepto": "Cuota de mantenimiento - Enero 2025",
  "metodoPago": "transferencia",
  "referencia": "REF123456789"
}
```

### 5. Create Maintenance Request

```bash
POST /api/v1/mantenimiento
Authorization: Bearer {token}

{
  "condominioId": "condominio-uuid",
  "unidadId": "unit-uuid",
  "solicitanteId": "user-uuid",
  "titulo": "Fuga de agua en baño",
  "descripcion": "Hay una fuga considerable en la tubería del baño principal",
  "categoria": "fontaneria",
  "prioridad": "alta"
}
```

## Importing to Other Tools

### Postman

1. Open Postman
2. Click "Import"
3. Select "Link"
4. Enter: `http://localhost:3000/api-docs.json`
5. Click "Continue" and "Import"

### Insomnia

1. Open Insomnia
2. Click "Import/Export"
3. Click "Import Data"
4. Select "From URL"
5. Enter: `http://localhost:3000/api-docs.json`
6. Click "Fetch and Import"

### VS Code REST Client

Create a `.http` file:

```http
@baseUrl = http://localhost:3000/api/v1
@token = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

### Login
POST {{baseUrl}}/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}

### Get Profile
GET {{baseUrl}}/auth/profile
Authorization: Bearer {{token}}

### Get All Units
GET {{baseUrl}}/unidades
Authorization: Bearer {{token}}
```

## Customization

### Updating Documentation

The Swagger documentation is defined in two places:

1. **Configuration**: `/src/config/swagger.ts`
   - OpenAPI metadata
   - Schema definitions
   - Common responses
   - Security schemes

2. **Endpoint Documentation**: `/src/docs/*.yaml`
   - Individual endpoint documentation
   - Request/response examples
   - Parameter definitions

To update documentation:

1. Edit the relevant YAML file in `/src/docs/`
2. Rebuild the project: `npm run build`
3. Restart the server: `npm run dev`
4. Refresh the Swagger UI

### Adding New Endpoints

When adding new endpoints:

1. Create the route in the appropriate module
2. Add documentation in `/src/docs/{module}.yaml`
3. Follow the existing pattern for consistency
4. Include examples for request bodies
5. Document all possible responses

## Troubleshooting

### Swagger UI not loading

1. Check that the server is running
2. Verify the URL: `http://localhost:3000/api-docs`
3. Check browser console for errors
4. Try clearing browser cache

### Authentication not working

1. Make sure you're using the correct format: `Bearer {token}`
2. Verify the token hasn't expired (default: 7 days)
3. Check that you clicked "Authorize" button
4. Try logging in again to get a fresh token

### Endpoints returning 404

1. Verify the base URL is correct: `/api/v1`
2. Check that the endpoint path matches the documentation
3. Ensure the server is running
4. Check for typos in the endpoint path

### Can't test endpoints

1. Make sure you're authenticated (for protected routes)
2. Click "Try it out" button first
3. Fill in all required parameters
4. Check request validation errors in response

## Additional Resources

- [OpenAPI 3.0 Specification](https://swagger.io/specification/)
- [Swagger UI Documentation](https://swagger.io/tools/swagger-ui/)
- [API Permissions Matrix](./PERMISSIONS_MATRIX.md)
- [Database Migration Guide](./drizzle/migrations/README.md)

## Support

For issues or questions:
- Create an issue in the repository
- Check the API logs for error details
- Review the permissions matrix for access requirements
- Consult the main README.md for setup instructions
