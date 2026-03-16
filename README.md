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
npm run automations:run # Ejecuta el sweep de automatizaciones manualmente
```

## 🤖 Automatizaciones en producción

La API ya incluye un runner dedicado para automatizaciones. La guía recomendada de despliegue y cron está en [docs/automation-runner.md](./docs/automation-runner.md).

## 📧 Soporte

Para dudas: tu-email@example.com
