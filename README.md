# Contabilizador de Comissões Dental Plus

Aplicação **web** (SPA) para processar planilhas de comissões da Dental Plus,
gerar relatórios em Excel/PDF e manter um histórico compartilhado entre a equipe.
O processamento de dados sensíveis é feito **no navegador do usuário**; a nuvem
(Firebase) recebe apenas metadados operacionais.

> **Privacidade:** planilhas, CPF, cliente, contrato e valores individuais são
> processados apenas localmente no navegador. O Firestore recebe somente contas,
> permissões, auditoria, totais agregados, versões e impressões SHA-256.

Acesse a versão em produção em **https://comissoesdp.web.app**.

## Recursos

- Revisão obrigatória de **duplicidades** (confirmadas e possíveis) antes de gerar,
  sem remover ou alterar linhas automaticamente.
- Geração de relatórios de comissão em **Excel** (ExcelJS) e resumos em **PDF** (PDFKit).
- Relatórios existentes **nunca são sobrescritos**: novas execuções recebem versões
  `_v2`, `_v3` etc.
- Histórico compartilhado com **perfis de acesso** (Administrador e Operador) e
  aprovação de novas contas via Firebase Auth.
- **Lixeira** com retenção de 30 dias.
- Auditoria de ações visível para administradores.
- Dashboard analítico com gráficos comparativos mensais.

## Stack

- **React 18** + **Vite** (SPA, sem backend próprio).
- **Firebase**: Auth (e-mail/senha), Firestore (Native, região `southamerica-east1`)
  e Hosting.
- Geração de arquivos no cliente: **ExcelJS**, **PDFKit**, **JSZip**, **file-saver**.

## Requisitos

- [Node.js](https://nodejs.org/) 18 ou superior (inclui o `npm`).

## Instalação

```bash
npm ci
```

## Desenvolvimento

Inicia o servidor de desenvolvimento do Vite com recarga automática:

```bash
npm run dev
```

## Testes

Executa a suíte completa (`node:test`) — regras de comissão, segurança e estrutura:

```bash
npm test
```

## Build e deploy

Gera os arquivos estáticos de produção em `dist/`:

```bash
npm run build
```

Deploy para o Firebase Hosting (requer login prévio via `firebase login`):

```bash
npx firebase-tools deploy --only hosting --project comissoesdp
```

## Configuração do Firebase

A aplicação depende do Firebase para autenticação e sincronização de dados.
Copie `.env.example` para `.env` e preencha as chaves públicas do seu aplicativo
Web do Firebase. O passo a passo completo está em
[`docs/CONFIGURACAO_FIREBASE.md`](docs/CONFIGURACAO_FIREBASE.md).

## Estrutura do projeto

```
src/
  App.jsx            Composição principal e roteamento das telas
  auth/               Autenticação e controle de sessão
  components/         Componentes de UI reutilizáveis (layout, gráficos etc.)
  pages/              Telas e fluxos de trabalho (Dashboard, Relatórios, Auditoria...)
  services/           Comunicação com Firebase e geração de relatórios (Excel/PDF)
  lib/                Utilitários compartilhados
  styles/             Estilos globais da interface
tests/                Regressões e validações
scripts/              Scripts de validação e apoio
```

Detalhes de arquitetura e limites de cada módulo estão em
[`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

## Manutenção

Alterações nas fórmulas de comissão, na identificação de totais ou na
consolidação exigem solicitação específica e novos testes de regressão.
Rode `npm test` antes de publicar.

## Licença

Software proprietário — todos os direitos reservados. Consulte
[`LICENSE`](LICENSE).
