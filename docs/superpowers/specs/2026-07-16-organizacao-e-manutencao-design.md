# Organização e Manutenção do Contabilizador — Design

## Objetivo

Reduzir o custo de manutenção do projeto e deixar a pasta compartilhada compreensível para outra pessoa, sem alterar cálculos, agrupamentos, totais, arquivos gerados, permissões ou fluxo de uso. A refatoração é pragmática para o horizonte de aproximadamente seis meses do sistema.

## Restrições

- Preservar integralmente as regras atuais de comissão.
- Manter `Iniciar.bat`, `Compilar.bat`, `LEIA-ME.txt` e `release/` acessíveis na raiz.
- Manter o funcionamento local, offline e em Windows 10/11 x86 e x64.
- Manter todos os canais IPC já expostos pelo `preload`.
- Não introduzir TypeScript, framework novo, banco novo ou camada abstrata sem uso concreto.
- Regenerar e testar os portáteis após a refatoração.

## Abordagem escolhida

Será aplicada a refatoração equilibrada: limpeza de resíduos, organização física e divisão dos arquivos monolíticos por responsabilidade. Uma migração profunda para TypeScript foi descartada porque aumentaria o risco e não se pagaria durante a vida útil prevista. Uma limpeza apenas visual foi descartada porque deixaria `main.js`, `Dashboard.jsx` e `index.css` difíceis de manter.

## Estrutura de pastas

```text
CONTABILIZADOR DE COMISSÕES/
├── assets/                         # identidade visual original
├── config/
│   └── corretoras.default.json     # configuração inicial versionada
├── docs/                           # configuração, decisões e planos
├── release/                        # executáveis portáteis para usuários
├── scripts/                        # testes e apoio à compilação
├── src/
│   ├── auth/                       # autenticação e perfis
│   ├── components/layout/          # barra lateral, topo e console
│   ├── features/dashboard/         # gráficos e cartões do dashboard
│   ├── main/
│   │   ├── app/                    # criação e proteção da janela Electron
│   │   ├── config/                 # configurações do aplicativo/corretoras
│   │   ├── core/                   # funções puras já testadas
│   │   ├── ipc/                    # registro dos canais IPC por domínio
│   │   └── reports/                # leitura e geração de Excel/PDF
│   ├── pages/                      # composição das páginas
│   ├── services/                   # Firebase e sincronização segura
│   └── styles/                     # tokens, base, layout e páginas
├── tests/                          # regressão, contratos, segurança e nuvem
├── main.js                         # inicializador Electron mínimo
├── preload.js                      # ponte IPC restrita
├── package.json
└── vite.config.js
```

Os atalhos de uso permanecem na raiz. Arquivos internos passam a residir no diretório correspondente à sua responsabilidade.

## Organização do processo principal

O `main.js` atual mistura inicialização, armazenamento, seleção de arquivos, leitura HTML/XLSX, estilização Excel, PDF e seis grupos de IPC. Ele será reduzido a um inicializador que carrega `src/main/index.cjs`.

`src/main/index.cjs` terá somente composição: cria dependências compartilhadas, registra os módulos IPC e inicializa a janela. Cada registrador receberá dependências explicitamente, por exemplo `registerHistoryIpc({ ipcMain, app, historyStore })`. Isso permite testar o módulo sem iniciar o Electron e deixa claro o que cada unidade consome.

Divisão prevista:

- `app/create-window.cjs`: criação, CSP de processo, bloqueio de navegação e carregamento da interface.
- `config/app-settings.cjs`: pasta padrão e persistência de configurações.
- `config/corretoras.cjs`: leitura, validação e normalização de corretoras.
- `ipc/dialogs.cjs`: seletores nativos de arquivo e pasta.
- `ipc/history.cjs`: histórico, lixeira e restauração.
- `ipc/duplicates.cjs`: leitura local do lote e resposta de duplicidades.
- `ipc/reports.cjs`: relatório por corretora e importação pronta.
- `ipc/summary.cjs`: resumo PDF.
- `ipc/general.cjs`: relatório geral.
- `reports/input-reader.cjs`: HTML/XLSX e extração de linhas.
- `reports/workbook-format.cjs`: cópia, conversão numérica e estilos Excel.
- `reports/commission-report.cjs`: orquestração do relatório por corretora.
- `reports/summary-pdf.cjs` e `reports/general-report.cjs`: geradores específicos.

Funções puras existentes em `src/main/core` continuam sem dependência do Electron.

## Organização da interface

`App.jsx` continuará responsável por estado global leve, navegação e sincronização, mas os elementos visuais da moldura serão extraídos para `components/layout`. `Dashboard.jsx` permanecerá como página de composição; gráficos, comparação mensal e cartão de relatório irão para `features/dashboard`.

O CSS será separado mantendo a ordem atual de cascata:

1. `styles/tokens.css` — variáveis claras/escuras;
2. `styles/base.css` — reset, tipografia e controles básicos;
3. `styles/layout.css` — sidebar, topo, conteúdo e responsividade;
4. `styles/components.css` — painéis, botões, tabelas, formulários e estados;
5. `styles/pages.css` — dashboard, duplicidades, autenticação, usuários, auditoria e lixeira.

`src/index.css` importará esses arquivos nessa ordem. Nenhum nome de classe ou comportamento visual será deliberadamente alterado.

## Limpeza segura

Após confirmar os caminhos absolutos dentro do projeto, serão removidos:

- `.worktrees/` criado durante o desenvolvimento e não usado pelo aplicativo;
- `node_modules_incomplete/`, instalação interrompida e ignorada pelo Git;
- `dist/` antigo, pois os portáteis usam uma compilação nova e o diretório é regenerável;
- `backend_backup.zip`, legado ignorado que contém configuração sensível e não participa da aplicação atual.

Serão preservados `.git/`, `release/`, testes, documentação, fontes, arquivos de configuração pública e os atalhos da raiz. A remoção não ocorrerá até que cada destino resolvido seja verificado como descendente da pasta do projeto.

## Fluxo de dados e compatibilidade

Os nomes dos canais IPC, formatos dos parâmetros e formatos das respostas não mudam. O `preload.js` continua sendo a única superfície disponível ao renderer. O processamento continua local; o Firestore continua recebendo apenas metadados sanitizados.

A configuração inicial de corretoras muda fisicamente para `config/corretoras.default.json`, mas o caminho operacional gravável continua sendo criado ao lado do portátil ou em `userData`, conforme o ambiente. O empacotamento incluirá o novo arquivo padrão.

## Erros e estabilidade

- Registradores IPC validam dependências ao serem carregados e mantêm erros amigáveis já existentes.
- Escritas de relatórios e histórico continuam atômicas e sem sobrescrita.
- Cancelamento e versionamento permanecem inalterados.
- Uma falha em um módulo de relatório não impede a inicialização silenciosamente; o erro será propagado para o processo principal e registrado pelo Electron.

## Testes e verificação

1. Manter o teste dourado que comprova o total consolidado `1.773,81` e a saída atual.
2. Criar testes de contrato para os registradores IPC, comprovando os mesmos canais antes de mover a implementação.
3. Mover uma unidade por ciclo TDD e executar os testes do domínio após cada extração.
4. Executar a suíte completa após a reorganização.
5. Compilar o frontend e abrir o Electron em produção.
6. Regenerar os portáteis x64, ia32 e combinado, abrir os dois binários específicos e substituir `release/` somente depois da validação.
7. Repetir a análise do arquivo real mostrando apenas contagens, sem expor dados sensíveis.

## Critério de conclusão

- Pasta raiz contém apenas entradas de uso, configuração do projeto e diretórios permanentes.
- `main.js` é um inicializador pequeno e nenhum módulo novo concentra múltiplos domínios.
- `App.jsx`, `Dashboard.jsx` e `index.css` deixam de ser arquivos monolíticos.
- Todos os 25 testes atuais e os novos testes de contrato passam.
- O total e a estrutura do relatório de regressão permanecem idênticos.
- Os executáveis atualizados abrem em x86 e x64 e estão disponíveis em `release/`.
