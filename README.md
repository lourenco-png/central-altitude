# Central Altitude — Sistema de Gestão

Sistema SaaS completo para gestão de empresa de topografia.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Backend | NestJS + Passport JWT |
| Banco | PostgreSQL + Prisma ORM |
| Auth | JWT + RBAC |
| PDF | pdfmake |

## Pré-requisitos

- Node.js 18+
- PostgreSQL 14+
- npm 9+

---

## Setup rápido

### 1. Instalar dependências

```bash
cd central-altitude
npm install
```

### 2. Configurar variáveis de ambiente da API

```bash
cd api
cp .env.example .env
# Edite .env com sua string de conexão PostgreSQL
```

```env
DATABASE_URL="postgresql://postgres:SUA_SENHA@localhost:5432/central_altitude"
JWT_SECRET="troque_isso_em_producao_use_algo_longo_e_aleatorio"
PORT=3001
```

### 3. Configurar variáveis de ambiente do frontend

```bash
cd ../web
cp .env.local.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 4. Criar banco e rodar migrations

```bash
# Na raiz do projeto:
npm run db:migrate
```

### 5. Popular banco com dados iniciais

```bash
npm run db:seed
```

Isso cria:
- Usuário admin: `admin@centralaltitude.com` / `admin123`
- 2 clientes de exemplo
- 2 engenheiros
- 2 obras
- 2 solicitações agendadas
- EPIs (um vencendo em 3 dias para testar alertas)
- Oportunidades no pipeline

### 6. Iniciar desenvolvimento

```bash
# Na raiz — inicia API + Web simultaneamente:
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- Swagger Docs: http://localhost:3001/api/docs

---

## Estrutura do projeto

```
central-altitude/
├── api/                    # Backend NestJS
│   ├── prisma/
│   │   ├── schema.prisma   # Schema completo do banco
│   │   └── seed.ts         # Dados iniciais
│   └── src/
│       ├── auth/           # JWT + Guards
│       ├── topografia/     # Obras, Engenheiros, Solicitações, RDO
│       ├── rh/             # Funcionários, EPIs, Férias, Empresa
│       ├── comercial/      # Clientes, Orçamentos, Propostas, Contratos, Pipeline
│       ├── notificacoes/   # Sistema de notificações
│       └── uploads/        # Upload de arquivos
│
└── web/                    # Frontend Next.js
    └── src/
        ├── app/
        │   ├── (auth)/login/           # Página de login
        │   └── (dashboard)/
        │       ├── dashboard/          # Dashboard principal
        │       ├── topografia/         # Calendário, Solicitações, RDO, Obras, Engenheiros
        │       ├── rh/                 # Funcionários, EPIs, Férias, Empresa
        │       └── comercial/          # Clientes, Orçamentos, Propostas, Contratos, Pipeline
        ├── components/
        │   ├── layout/                 # Header, Sidebar, DashboardLayout
        │   └── ui/                     # Modal, Table, KpiCard, StatusBadge, PageHeader
        ├── lib/                        # api.ts, utils.ts
        ├── store/                      # Zustand (auth)
        └── types/                      # TypeScript types
```

---

## Funcionalidades implementadas

### Autenticação
- Login JWT com persistência via Zustand
- Proteção de rotas (redirect automático)
- Troca de senha

### Topografia
- **Calendário** interativo mensal — clicar em dia abre modal de nova solicitação
- **Solicitações** — CRUD completo com filtros por status
- **RDO** — criação, visualização, assinatura digital, envio para assinatura
- **Obras** — CRUD com vínculo a clientes
- **Engenheiros** — CRUD completo

### RH / DP
- **Funcionários** — CRUD com drawer lateral (dados / documentos / EPIs)
- **EPIs** — gestão com alertas visuais de vencimento (verde/laranja/vermelho)
- **Férias** — agendamento e aprovação/rejeição
- **Empresa** — dados gerais + gestão de sócios

### Comercial
- **Clientes** — CRUD com busca
- **Orçamentos** — planilha editável inline, cálculo automático, geração de proposta
- **Propostas** — visualização estilo documento + geração de PDF (pdfmake)
- **Contratos** — CRUD com controle de status
- **Pipeline Kanban** — drag & drop entre estágios (Lead → Proposta → Fechado)

### Sistema
- **Notificações** — dropdown no header, marcação de lidas, auto-refresh 30s
- **Dashboard** — KPIs, próximos serviços, pipeline resumido, alertas de EPIs
- **PDF** — geração de propostas e RDOs via pdfmake

---

## Usuários padrão

| E-mail | Senha | Perfil |
|--------|-------|--------|
| admin@centralaltitude.com | admin123 | ADMIN |

---

## Próximos passos sugeridos

- [ ] Envio de e-mail para assinatura de RDO (Nodemailer/SendGrid)
- [ ] Autenticação 2FA
- [ ] Tour guiado com biblioteca Intro.js ou Shepherd.js
- [ ] PWA manifest + service worker
- [ ] Relatórios e exportação de dados
- [ ] Dashboard com gráficos Recharts avançados
- [ ] Multi-tenancy por empresa
