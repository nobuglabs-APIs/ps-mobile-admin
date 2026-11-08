# PS-Mobile Admin

Interface independente para administração global da plataforma PS-Mobile. Utiliza a API PS-Mobile existente e não partilha código de aplicação, variáveis de ambiente ou repositório com a interface normal.

## Desenvolvimento local

1. Copie `.env.example` para `.env.local` e configure a URL da API.
2. Execute `npm ci`.
3. Execute `npm run dev`.

A interface fica disponível em `http://localhost:3001`. A API deve permitir esta origem em `CORS_ORIGINS`.

## Produção

Configure `VITE_PS_MOBILE_API_BASE_URL` para a URL HTTPS da API antes de executar `npm run build`.
Inclua a origem HTTPS do painel em `CORS_ORIGINS` na API. O token de acesso é validado pela API; o frontend só permite entrar no painel a contas com papel de administrador da plataforma.

## Repositório

Repositório privado: [`nobuglabs-APIs/ps-mobile-admin`](https://github.com/nobuglabs-APIs/ps-mobile-admin).
