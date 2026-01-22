#!/bin/bash

# =====================================================
# Script de Setup Automático
# Sistema de Administración de Condominios
# =====================================================

echo "🏢 Configurando Sistema de Administración de Condominios..."
echo ""

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir con color
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# 1. Crear estructura de carpetas
print_info "Creando estructura de carpetas..."

mkdir -p src/config
mkdir -p src/common/{entities,interfaces,constants}
mkdir -p src/middlewares
mkdir -p src/utils
mkdir -p src/migrations
mkdir -p logs
mkdir -p uploads

# Crear estructura de módulos
MODULES=("auth" "usuarios" "condominios" "unidades" "pagos" "reservaciones" "asambleas" "reglamentos" "finanzas" "mantenimiento" "trabajadores" "notificaciones")

for module in "${MODULES[@]}"; do
    mkdir -p "src/modules/$module"
    mkdir -p "src/modules/$module/entities"
    mkdir -p "src/modules/$module/dto"
done

print_success "Estructura de carpetas creada"

# 2. Crear archivos base
print_info "Creando archivos de configuración..."

# .gitignore
cat > .gitignore << 'EOF'
node_modules/
dist/
logs/
uploads/
.env
.DS_Store
*.log
.vscode/
.idea/
coverage/
EOF

# .env.example
cat > .env.example << 'EOF'
# Application
NODE_ENV=development
PORT=3000
API_PREFIX=/api/v1

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=condominio_management
DB_SYNCHRONIZE=true
DB_LOGGING=true

# JWT
JWT_SECRET=change-this-secret-in-production
JWT_EXPIRATION=7d
JWT_REFRESH_SECRET=change-this-refresh-secret
JWT_REFRESH_EXPIRATION=30d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=condominio-documents

# Email
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM=noreply@condominio.com

# CORS
CORS_ORIGIN=http://localhost:3001

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF

# Copiar .env.example a .env
cp .env.example .env

print_success "Archivos de configuración creados"

# 3. Crear README.md
print_info "Creando README.md..."

cat > README.md << 'EOF'
# 🏢 Sistema de Administración de Condominios

API REST para la gestión integral de condominios, residenciales y edificios habitacionales.

## 🚀 Instalación Rápida

```bash
# Instalar dependencias
npm install

# Configurar .env
cp .env.example .env
# Editar .env con tus configuraciones

# Ejecutar en desarrollo
npm run dev
```

## 📚 Documentación

Ver [INSTALLATION_GUIDE.md](./INSTALLATION_GUIDE.md) para instrucciones detalladas.

## 🔑 Características

- ✅ Gestión de condominios y unidades
- ✅ Sistema de pagos y adeudos
- ✅ Reservaciones de áreas comunes
- ✅ Órdenes de mantenimiento
- ✅ Control financiero
- ✅ Asambleas y reglamentos
- ✅ Autenticación JWT
- ✅ Roles y permisos

## 📝 Scripts

```bash
npm run dev      # Desarrollo con hot-reload
npm run build    # Compilar TypeScript
npm start        # Producción
npm run lint     # Linter
```

## 📧 Soporte

Para dudas: tu-email@example.com
EOF

print_success "README.md creado"

# 4. Inicializar npm si no existe package.json
if [ ! -f "package.json" ]; then
    print_info "Inicializando npm..."
    npm init -y
    print_success "npm inicializado"
fi

# 5. Instalar dependencias
print_info "¿Deseas instalar las dependencias ahora? (s/n)"
read -r install_deps

if [ "$install_deps" = "s" ] || [ "$install_deps" = "S" ]; then
    print_info "Instalando dependencias (esto puede tomar varios minutos)..."
    
    # Dependencias de producción
    npm install express typeorm pg reflect-metadata dotenv cors helmet morgan \
                compression bcrypt jsonwebtoken joi multer aws-sdk nodemailer \
                bull ioredis moment uuid express-validator winston express-async-errors \
                express-rate-limit
    
    # Dependencias de desarrollo
    npm install -D typescript @types/node @types/express @types/cors @types/morgan \
                   @types/bcrypt @types/jsonwebtoken @types/multer @types/nodemailer \
                   @types/uuid @types/compression nodemon ts-node rimraf eslint \
                   @typescript-eslint/eslint-plugin @typescript-eslint/parser \
                   jest @types/jest ts-jest supertest @types/supertest
    
    print_success "Dependencias instaladas"
else
    print_warning "Instalación de dependencias omitida"
    echo "Ejecuta 'npm install' manualmente cuando estés listo"
fi

# 6. Información final
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
print_success "Setup completado exitosamente!"
echo ""
echo "📁 Estructura de carpetas creada"
echo "⚙️  Archivos de configuración listos"
echo "📄 README.md generado"
echo ""
echo "Próximos pasos:"
echo ""
echo "1. Configura tu base de datos PostgreSQL"
echo "   ${BLUE}createdb condominio_management${NC}"
echo ""
echo "2. Edita el archivo .env con tus credenciales"
echo "   ${BLUE}nano .env${NC}"
echo ""
echo "3. Copia los archivos TypeScript de los artifacts a las carpetas correspondientes"
echo ""
echo "4. Ejecuta el proyecto en desarrollo"
echo "   ${BLUE}npm run dev${NC}"
echo ""
echo "5. La API estará disponible en: ${GREEN}http://localhost:3000/api/v1${NC}"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
print_info "Para más información, consulta README.md"
echo ""