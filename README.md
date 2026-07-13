# Contatodo Web

Frontend para el sistema de registro de compras y ventas. Aplicación Angular 17 con Material UI, servida a través de Nginx en Docker.

## Tecnologías

- **Angular 17.3.0**
- **Angular Material 17.3.10**
- **Angular CDK 17.3.10**
- **Node.js 22**
- **Nginx 1.28**
- **TypeScript 5.4.2**

## Estructura del Proyecto

```
contatodo_web/
├── src/
│   ├── app/
│   │   ├── components/
│   │   ├── services/
│   │   └── ...
│   ├── assets/
│   └── ...
├── deploy/
│   ├── deploy-ec2.sh
│   └── docker-compose.ec2.yml
├── nginx/
│   └── default.conf
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── Dockerfile
├── angular.json
└── package.json
```

## Desarrollo

### Prerrequisitos

- Node.js 22
- npm o yarn

### Instalación

```bash
cd contatodo_web
npm install
```

### Servidor de Desarrollo

```bash
ng serve
```

Navega a `http://localhost:4200/`. La aplicación se recargará automáticamente si cambias cualquier archivo fuente.

### Build

```bash
ng build
```

Los artefactos de build se almacenarán en el directorio `dist/`.

### Code Scaffolding

```bash
ng generate component component-name
```

También puedes usar `ng generate directive|pipe|service|class|guard|interface|enum|module`.

### Tests

```bash
# Unit tests
ng test

# End-to-end tests
ng e2e
```

## Docker

### Construir Imagen

```bash
docker build -t contatodo-web .
```

### Ejecutar Localmente

```bash
docker run -d -p 80:80 contatodo-web
```

La aplicación estará disponible en `http://localhost:80`

## Configuración de Nginx

El archivo `nginx/default.conf` configura:

- Servidor en puerto 80
- Angular SPA con fallback a index.html
- Proxy de `/api/` hacia el backend en `http://backend:8080/`
- Cache de archivos estáticos (1 año)
- Compresión gzip habilitada

## Variables de Entorno

El frontend usa las siguientes variables de entorno:

| Variable | Descripción |
|----------|-------------|
| `CONTATODO_WEB_IMAGE` | Imagen Docker usada por el compose de EC2 |

## CI/CD

### Pipeline de Frontend

El workflow `.github/workflows/ci.yml` ejecuta:

1. **CI** (todas las ramas):
   - Setup de Node.js 22
   - Instalación de dependencias con `npm ci`
   - Build de Angular con `npm run build`
   - Build de imagen Docker (sin publicar)

2. **CD** (solo master):
   - Login a GitHub Container Registry
   - Build y push de imagen Docker
   - Tagging: `{branch}-{sha}` y `latest` para master
   - Publicación de imagen como pública

### Despliegue Automático

El workflow `.github/workflows/deploy.yml` se ejecuta después del CI exitoso en master:

- Resuelve la referencia de la imagen Docker
- Genera archivo de configuración para docker-compose
- Valida configuración SSH
- Sube archivos a EC2 via SSH
- Ejecuta script de despliegue remoto
- Reinicia contenedores con la nueva imagen

## Despliegue a Producción

### GitHub Secrets Requeridos

Configura estos en el entorno `master` de GitHub:

**Secrets:**
- `SSH_PRIVATE_KEY` - Clave privada SSH para EC2

**Variables de entorno (opcionales):**
- `SSH_HOST` - Host/IP de EC2
- `SSH_USER` - Usuario SSH
- `SSH_PORT` - Puerto SSH (default: 22)
- `EC2_APP_DIR` - Directorio en EC2 (default: `/opt/contatodo-web`)

### Imagen Docker en Producción

La imagen se publica en GitHub Container Registry:

```text
ghcr.io/davichus1303/contatodo_frontend/contatodo-web:master-<short-sha>
ghcr.io/davichus1303/contatodo_frontend/contatodo-web:latest
```

### Red Docker

El frontend se conecta a la red Docker `contatodo-network` para comunicación con el backend. El proxy de Nginx redirige las peticiones `/api/` al servicio `backend:8080`.

## Comunicación con Backend

El frontend se comunica con el backend API a través del proxy de Nginx:

- Frontend: `http://localhost/`
- Backend API: `http://localhost/api/` → `http://backend:8080/`

## Ayuda Adicional

Para obtener más ayuda sobre Angular CLI:

```bash
ng help
```

O visita la [Angular CLI Overview and Command Reference](https://angular.io/cli).

## Contribución

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT.
