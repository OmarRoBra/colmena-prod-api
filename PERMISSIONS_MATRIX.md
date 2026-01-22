# Permission Matrix - Colmena API

This document defines the permissions for each user role in the system.

## User Roles

### 1. admin (Super Administrator)
**Description**: System-wide administrator with full access to all features and data.

**Permissions**:
- **usuarios**: Full CRUD access to all users
- **condominios**: Full CRUD access to all condominiums
- **unidades**: Full CRUD access to all units
- **pagos**: Full CRUD access to all payments
- **reservaciones**: Full CRUD access to all reservations
- **asambleas**: Full CRUD access to all assemblies
- **reglamentos**: Full CRUD access to all regulations
- **mantenimiento**: Full CRUD access to all maintenance requests
- **trabajadores**: Full CRUD access to all workers
- Can assign and modify all user roles

---

### 2. condoAdmin (Condominium Administrator)
**Description**: Administrator for a specific condominium. Manages day-to-day operations, residents, and maintenance.

**Permissions**:
- **usuarios**:
  - Read: All users in their condominium
  - Create: New owners, tenants, workers for their condominium
  - Update: Owner, tenant, worker profiles in their condominium
  - Delete: Cannot delete users (only deactivate)

- **condominios**:
  - Read: Their assigned condominium(s)
  - Update: Their assigned condominium configuration
  - Cannot create or delete condominiums

- **unidades**:
  - Full CRUD for units in their condominium
  - Can assign/unassign owners and tenants

- **pagos**:
  - Full CRUD for payments in their condominium
  - Can mark payments as completed/rejected

- **reservaciones**:
  - Full CRUD for reservations in their condominium
  - Can approve/reject reservations

- **asambleas**:
  - Full CRUD for assemblies in their condominium

- **reglamentos**:
  - Full CRUD for regulations in their condominium

- **mantenimiento**:
  - Full CRUD for maintenance requests in their condominium
  - Can assign workers to maintenance tasks

- **trabajadores**:
  - Full CRUD for workers in their condominium

---

### 3. owner (Property Owner)
**Description**: Owner of one or more units in a condominium. Can manage their properties and make payments.

**Permissions**:
- **usuarios**:
  - Read: Their own profile
  - Update: Their own profile (name, phone, password)
  - Cannot modify their own role

- **condominios**:
  - Read: Their condominium information (read-only)

- **unidades**:
  - Read: Their owned units
  - Update: Limited info on their units (can suggest tenant, notes)
  - Cannot create or delete units

- **pagos**:
  - Read: Payment history for their units
  - Create: Make payments for their units
  - Cannot modify or delete payments

- **reservaciones**:
  - Read: Their own reservations
  - Create: Reserve common areas for their units
  - Update/Delete: Their own pending reservations only

- **asambleas**:
  - Read: Assemblies for their condominium
  - Cannot create, update, or delete

- **reglamentos**:
  - Read: Regulations for their condominium
  - Cannot create, update, or delete

- **mantenimiento**:
  - Read: Maintenance requests for their units
  - Create: Submit maintenance requests for their units
  - Update: Add comments to their requests
  - Cannot delete or assign workers

- **trabajadores**:
  - Read: Worker contact information (read-only)

---

### 4. tenant (Renter/Tenant)
**Description**: Person renting a unit. Similar permissions to owners but cannot make certain decisions about the property.

**Permissions**:
- **usuarios**:
  - Read: Their own profile
  - Update: Their own profile (name, phone, password)
  - Cannot modify their own role

- **condominios**:
  - Read: Their condominium information (read-only)

- **unidades**:
  - Read: Their rented unit (read-only)
  - Cannot create, update, or delete units

- **pagos**:
  - Read: Payment history for their rented unit
  - Create: Make payments for their rented unit (rent, utilities)
  - Cannot modify or delete payments

- **reservaciones**:
  - Read: Their own reservations
  - Create: Reserve common areas for their unit
  - Update/Delete: Their own pending reservations only

- **asambleas**:
  - Read: Assemblies for their condominium
  - Cannot vote or create assemblies (unless specified by condominium rules)

- **reglamentos**:
  - Read: Regulations for their condominium
  - Cannot create, update, or delete

- **mantenimiento**:
  - Read: Maintenance requests for their rented unit
  - Create: Submit maintenance requests for urgent issues
  - Update: Add comments to their requests
  - Cannot delete or assign workers

- **trabajadores**:
  - Read: Worker contact information for emergencies (read-only)

---

### 5. worker (Maintenance Worker/Staff)
**Description**: Staff member responsible for maintenance and repairs. Assigned to maintenance tasks.

**Permissions**:
- **usuarios**:
  - Read: Their own profile
  - Update: Their own profile (name, phone, password)

- **condominios**:
  - Read: Condominium(s) where they work (read-only)

- **unidades**:
  - Read: Unit information related to their assigned tasks
  - Cannot create, update, or delete units

- **pagos**:
  - No access

- **reservaciones**:
  - Read: Reservations that might affect their work schedule
  - Cannot create, update, or delete

- **asambleas**:
  - No access (unless invited)

- **reglamentos**:
  - Read: Regulations relevant to their work

- **mantenimiento**:
  - Read: All maintenance requests assigned to them
  - Update: Status, notes, completion date, cost for their assigned tasks
  - Cannot create or delete maintenance requests
  - Cannot assign tasks to others

- **trabajadores**:
  - Read: Their own worker record
  - Update: Contact information

---

### 6. serviceProvider (External Service Provider)
**Description**: External contractors or service providers hired for specific jobs.

**Permissions**:
- **usuarios**:
  - Read: Their own profile
  - Update: Their own profile (name, phone, password, company info)

- **condominios**:
  - Read: Condominium(s) where they have active contracts (read-only)

- **unidades**:
  - Read: Unit information related to their assigned service jobs
  - Cannot create, update, or delete units

- **pagos**:
  - Read: Their own service payment status
  - Cannot modify payments

- **reservaciones**:
  - Read: Reservations that might affect their service schedule
  - Create: Reserve areas for service work (if needed)

- **asambleas**:
  - No access

- **reglamentos**:
  - Read: Regulations relevant to their service work

- **mantenimiento**:
  - Read: Service requests assigned to them
  - Update: Status, notes, completion date, cost for their assigned jobs
  - Cannot create, delete, or reassign maintenance requests

- **trabajadores**:
  - No access

---

## Permission Summary Table

| Resource | admin | condoAdmin | owner | tenant | worker | serviceProvider |
|----------|-------|------------|-------|--------|--------|-----------------|
| **usuarios** | Full CRUD | CRUD (condo) | Read/Update (self) | Read/Update (self) | Read/Update (self) | Read/Update (self) |
| **condominios** | Full CRUD | Read/Update (assigned) | Read only | Read only | Read only | Read only |
| **unidades** | Full CRUD | Full CRUD (condo) | Read (own) | Read (rented) | Read (assigned) | Read (assigned) |
| **pagos** | Full CRUD | Full CRUD (condo) | Read/Create (own) | Read/Create (own) | No access | Read (own) |
| **reservaciones** | Full CRUD | Full CRUD (condo) | CRUD (own) | CRUD (own) | Read only | Read/Create |
| **asambleas** | Full CRUD | Full CRUD (condo) | Read only | Read only | No access | No access |
| **reglamentos** | Full CRUD | Full CRUD (condo) | Read only | Read only | Read only | Read only |
| **mantenimiento** | Full CRUD | Full CRUD (condo) | Read/Create (own) | Read/Create (own) | Read/Update (assigned) | Read/Update (assigned) |
| **trabajadores** | Full CRUD | Full CRUD (condo) | Read only | Read only | Read (self) | No access |

---

## Role Assignment Rules

1. **admin**: Can only be assigned by another admin
2. **condoAdmin**: Can be assigned by admin or promoted by another condoAdmin (if enabled)
3. **owner**: Can be assigned by admin or condoAdmin when creating/updating unit ownership
4. **tenant**: Can be assigned by admin or condoAdmin when creating/updating unit rental
5. **worker**: Can be assigned by admin or condoAdmin when adding staff
6. **serviceProvider**: Can be assigned by admin or condoAdmin when contracting services

---

## Special Cases

### Owner who is also a Tenant
- When a user is marked as both owner (propietarioId) and tenant (inquilinoId) for different units, they have combined permissions for all their units.
- Example: User owns Unit A and rents Unit B → has owner permissions for Unit A and tenant permissions for Unit B

### Multiple Role Inheritance
- A user can only have ONE role at a time in the system
- If a user needs access to multiple condominiums as condoAdmin, this should be configured in the condominium assignment, not through multiple user accounts

### Permission Hierarchy
```
admin > condoAdmin > owner >= tenant > worker >= serviceProvider
```

---

## Implementation Notes

### Middleware Usage
The authorization middleware should be updated as follows:

```typescript
// Public routes - no authentication
POST /api/v1/auth/register
POST /api/v1/auth/login

// Admin only
DELETE /api/v1/usuarios/:id
POST /api/v1/usuarios (create users)

// Admin + condoAdmin
GET /api/v1/usuarios (list users)
GET /api/v1/condominios/:id
PUT /api/v1/condominios/:id

// Admin + condoAdmin + owner + tenant
GET /api/v1/pagos (filtered by access)
POST /api/v1/pagos (for own units)

// Admin + condoAdmin + owner + tenant + worker
GET /api/v1/mantenimiento (filtered by access)

// All authenticated users
GET /api/v1/auth/profile
PUT /api/v1/auth/change-password
GET /api/v1/reglamentos (filtered by condominium)
```

### Data Filtering
- When non-admin users query resources, results should be automatically filtered based on their role and associated condominium/units
- Example: condoAdmin querying payments should only see payments for units in their condominium

### Future Enhancements
- Fine-grained permissions table for more flexibility
- Permission groups/templates
- Custom permissions per condominium
- Temporary permission grants
- Audit logging for sensitive operations

---

**Last Updated**: 2025-12-30
**Version**: 1.0
