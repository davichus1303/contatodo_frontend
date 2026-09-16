# Contatodo Web

Frontend for the purchases and sales registration system. Angular 17 application with Material UI, served through Nginx in Docker.

## Technologies

- **Angular 17.3.0**
- **Angular Material 17.3.10**
- **Angular CDK 17.3.10**
- **Node.js 22**
- **Nginx 1.28**
- **TypeScript 5.4.2**

## Project Structure

Layered architecture: `core` (domain/application/adapters), `features` and `shared`. The full map is in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and the working rules in [`AGENTS.md`](AGENTS.md).

```
contatodo_web/
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── domain/         # readonly models + validated factories + Result (pure)
│   │   │   ├── application/    # HTTP services, DTOs, mappers, notifications
│   │   │   ├── adapters/       # http/storage behind ports
│   │   │   └── auth|config|guards|i18n|interceptors/
│   │   ├── features/           # login, sales, products, acquisitions, roles...
│   │   ├── layout/             # modules-navigation
│   │   └── shared/             # components, constants, validators
│   ├── assets/i18n/es.json
│   └── ...
├── docs/
│   └── ARCHITECTURE.md         # architecture map
├── AGENTS.md                   # working guidelines
├── deploy/
│   ├── deploy-ec2.sh
│   └── docker-compose.ec2.yml
├── nginx/
│   └── default.conf
├── .github/workflows/          # ci.yml, deploy.yml
├── Dockerfile
├── angular.json
└── package.json
```

## Development

### Prerequisites

- Node.js 22
- npm or yarn

### Installation

```bash
cd contatodo_web
npm install
```

### Development Server

```bash
ng serve
```

Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

### Build

```bash
ng build
```

The build artifacts will be stored in the `dist/` directory.

### Code Scaffolding

```bash
ng generate component component-name
```

You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

### Tests

```bash
# Unit tests (watch mode)
ng test

# Unit tests CI (Chrome headless-shell)
CHROME="$HOME/.cache/puppeteer-browsers/chrome-headless-shell/linux-152.0.7977.54/chrome-headless-shell-linux64/chrome-headless-shell" \
CHROME_BIN="$CHROME" npm test -- --watch=false
```

## Docker

### Build Image

```bash
docker build -t contatodo-web .
```

### Run Locally

```bash
docker run -d -p 80:80 contatodo-web
```

The application will be available at `http://localhost:80`

## Nginx Configuration

The `nginx/default.conf` file configures:

- Server on port 80
- Angular SPA with fallback to index.html
- Proxy of `/api/` to the backend at `http://backend:8080/`
- Static file caching (1 year)
- gzip compression enabled

## Environment Variables

The frontend uses the following environment variables:

| Variable | Description |
|----------|-------------|
| `CONTATODO_WEB_IMAGE` | Docker image used by the EC2 compose |

## CI/CD

### Frontend Pipeline

The `.github/workflows/ci.yml` workflow runs:

1. **CI** (all branches):
   - Node.js 22 setup
   - Dependency install with `npm ci`
   - Angular build with `npm run build`
   - Docker image build (without publishing)

2. **CD** (master only):
   - GitHub Container Registry login
   - Docker image build and push
   - Tagging: `{branch}-{sha}` and `latest` for master
   - Image published as public

### Automatic Deployment

The `.github/workflows/deploy.yml` workflow runs after a successful CI on master:

- Resolves the Docker image reference
- Generates the docker-compose configuration file
- Validates SSH configuration
- Uploads files to EC2 via SSH
- Runs the remote deployment script
- Restarts containers with the new image

## Production Deployment

### Required GitHub Secrets

Configure these in the `master` GitHub environment:

**Secrets:**
- `SSH_PRIVATE_KEY` - SSH private key for EC2

**Optional environment variables:**
- `SSH_HOST` - EC2 host/IP
- `SSH_USER` - SSH user
- `SSH_PORT` - SSH port (default: 22)
- `EC2_APP_DIR` - EC2 directory (default: `/opt/contatodo-web`)

### Production Docker Image

The image is published to GitHub Container Registry:

```text
ghcr.io/davichus1303/contatodo_frontend/contatodo-web:master-<short-sha>
ghcr.io/davichus1303/contatodo_frontend/contatodo-web:latest
```

### Docker Network

The frontend connects to the `contatodo-network` Docker network to talk to the backend. The Nginx proxy routes `/api/` requests to the `backend:8080` service.

## Backend Communication

The frontend talks to the backend API through the Nginx proxy:

- Frontend: `http://localhost/`
- Backend API: `http://localhost/api/` → `http://backend:8080/`

## Additional Help

For more help on the Angular CLI:

```bash
ng help
```

Or visit the [Angular CLI Overview and Command Reference](https://angular.io/cli).

## Contribution

1. Fork the repository
2. Create a branch for your feature (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.