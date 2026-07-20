# Modernização do Contabilizador — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar um contabilizador portátil, compartilhado, seguro e estável para operação entre julho de 2026 e janeiro de 2027, sem alterar as regras existentes de comissão.

**Architecture:** Refatoração incremental protegida por testes de caracterização. O cálculo continua local; workers isolam tarefas pesadas; Firebase Authentication e Firestore guardam somente metadados sanitizados, com cache offline e regras por perfil.

**Tech Stack:** Electron 43.1.1, React 18.3.1, Vite 5.4.x, ExcelJS 4.4.0, PDFKit 0.15.x, Firebase 12.16.0, Node test runner, Vitest 2.x, Firebase Emulator Suite, electron-builder 26.15.3.

## Global Constraints

- Horizonte operacional: julho de 2026 a janeiro de 2027.
- Windows 10/11 x86 e x64; x86 termina em janeiro de 2027.
- Regras atuais de comissão, agrupamento e consolidação são imutáveis.
- Nenhuma linha duplicada será removida ou desconsiderada automaticamente.
- CPF, contrato, cliente, planilha, célula e caminho completo nunca serão gravados no Firestore.
- Processamento local deve funcionar sem internet.
- Firestore usa plano gratuito e região de São Paulo.
- Nunca sobrescrever relatório; toda repetição confirmada cria versão.
- Usuários: Administrador e Operador; novos cadastros começam pendentes.
- Lixeira: 30 dias; restauração e exclusão definitiva somente por Administrador.
- Não criar backend próprio, multi-tenant ou extensão para uso plurianual.

---

### Task 1: Baseline versionado e harness de testes

**Files:**
- Modify: `.gitignore`
- Modify: `package.json`
- Create: `tests/helpers/electron-main-harness.cjs`
- Create: `tests/fixtures/sample-export.xls`
- Create: `tests/baseline/current-behavior.test.cjs`

**Interfaces:**
- Produces: `loadCurrentMain(): { handlers: Map<string, Function> }`
- Produces: fixture HTML `.xls` sintética com PF e PJ, sem dados reais.

- [ ] **Step 1: Write the failing baseline test**

```js
test('generate-reports preserves current totals and output structure', async () => {
  const { handlers } = loadCurrentMain();
  const result = await handlers.get('generate-reports')(fakeEvent, {
    files: [fixturePath], outputFolder: tempDir, sortAlpha: true,
    convertNumbers: true, reportMonth: '2026-06'
  });
  assert.equal(result.summary.length, 1);
  assert.equal(result.summary[0].totalConsolidado, 1773.81);
  assert.equal(result.totalFiles, 1);
});
```

- [ ] **Step 2: Run the test before changing production code**

Run: `npm test -- tests/baseline/current-behavior.test.cjs`
Expected: PASS against the existing `main.js`; any failure must be understood before refactoring.

- [ ] **Step 3: Add deterministic test scripts and ignores**

```json
{
  "scripts": {
    "test": "node --test tests/**/*.test.cjs",
    "test:ui": "vitest run",
    "test:all": "npm test && npm run test:ui"
  }
}
```

Add `.env`, `.env.*`, `coverage/`, `test-results/`, `*.tmp`, `*.partial`, and Firebase debug logs to `.gitignore` while retaining `!.env.example`.

- [ ] **Step 4: Run baseline and inspect generated workbook**

Run: `npm test`
Expected: all baseline tests PASS and temp files are removed by test cleanup.

- [ ] **Step 5: Commit**

```bash
git add .gitignore package.json tests
git commit -m "test: capture current commission behavior"
```

### Task 2: Extrair o núcleo legado sem mudar resultados

**Files:**
- Create: `src/main/core/text.cjs`
- Create: `src/main/core/input-reader.cjs`
- Create: `src/main/core/commission-engine.cjs`
- Create: `src/main/core/report-writer.cjs`
- Create: `src/main/core/pdf-writer.cjs`
- Create: `src/main/core/general-report.cjs`
- Modify: `main.js`
- Test: `tests/core/*.test.cjs`

**Interfaces:**
- Produces: `readInput(filePath): Promise<InputItem>`
- Produces: `generateBrokerReports(options, progress, signal): Promise<GenerationResult>`
- Produces: `generateSummaryPdf(options, progress, signal): Promise<SummaryResult>`
- Produces: `generateGeneralReport(options, signal): Promise<GeneralResult>`
- Consumes: existing functions moved byte-for-byte before cleanup.

- [ ] **Step 1: Write failing unit tests for Brazilian parsing and title recognition**

```js
assert.equal(parseBrazilNumber('1.773,81'), 1773.81);
assert.equal(parseBrazilNumber('40%'), 0.4);
assert.deepEqual(parseVendedorCorretora('VENDEDOR - CORRETORA'), {
  vendedor: 'VENDEDOR', corretora: 'CORRETORA',
  titulo: 'VENDEDOR - CORRETORA', isPrincipalCorretora: false
});
```

- [ ] **Step 2: Run focused tests and observe missing modules**

Run: `node --test tests/core/text.test.cjs tests/core/input-reader.test.cjs`
Expected: FAIL with module-not-found.

- [ ] **Step 3: Move functions into focused CommonJS modules**

Each module exports only the signatures listed above. Do not change regexes, formulas, column mappings, sorting, totals, or workbook labels during the move.

- [ ] **Step 4: Replace handler bodies with calls to extracted modules**

```js
ipcMain.handle('generate-reports', async (event, payload) =>
  generateBrokerReports(payload, data => event.sender.send('progress-update', data))
);
```

- [ ] **Step 5: Run regression suite**

Run: `npm test`
Expected: baseline and focused tests PASS with identical sanitized output snapshots.

- [ ] **Step 6: Commit**

```bash
git add main.js src/main/core tests/core
git commit -m "refactor: isolate legacy commission engine"
```

### Task 3: Segurança Electron e validação IPC

**Files:**
- Create: `src/main/security/ipc-validation.cjs`
- Create: `src/main/security/file-validation.cjs`
- Create: `src/main/security/redaction.cjs`
- Modify: `main.js`
- Modify: `preload.js`
- Modify: `index.html`
- Test: `tests/security/*.test.cjs`

**Interfaces:**
- Produces: `validatePayload(channel, payload): Readonly<object>`
- Produces: `validateInputPath(path, allowedExtensions): string`
- Produces: `redactMessage(message): string`

- [ ] **Step 1: Write failing traversal, double-extension and redaction tests**

```js
assert.throws(() => validateInputPath('relatorio.xlsx.exe', ['.xlsx']), /extensão/i);
assert.equal(redactMessage('CPF 123.456.789-00 em C:\\Clientes\\Maria.xls'),
  'CPF ***.***.***-** em [CAMINHO_REMOVIDO]');
```

- [ ] **Step 2: Run security tests**

Run: `node --test tests/security/*.test.cjs`
Expected: FAIL until validators exist.

- [ ] **Step 3: Harden BrowserWindow and navigation**

Set `sandbox: true`, `webSecurity: true`, `allowRunningInsecureContent: false`; deny `will-navigate`, `setWindowOpenHandler`, permission requests, and production DevTools.

- [ ] **Step 4: Add production CSP and narrow preload methods**

Use `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com`.

- [ ] **Step 5: Validate every IPC payload and sanitize errors**

No handler may accept an arbitrary path, unbounded array, unknown key, invalid month, or raw error string without validation/redaction.

- [ ] **Step 6: Run all tests and commit**

Run: `npm test`
Expected: PASS.

```bash
git add main.js preload.js index.html src/main/security tests/security
git commit -m "security: harden electron and ipc boundaries"
```

### Task 4: Workers, cancelamento e gravação atômica

**Files:**
- Create: `src/main/jobs/job-manager.cjs`
- Create: `src/main/jobs/commission-worker.cjs`
- Create: `src/main/files/atomic-output.cjs`
- Modify: `main.js`
- Modify: `preload.js`
- Test: `tests/jobs/*.test.cjs`

**Interfaces:**
- Produces: `startJob(type, payload): { id: string }`
- Produces: `cancelJob(id): boolean`
- Produces: `writeAtomically(finalPath, writer, signal): Promise<void>`
- Emits: `{ jobId, phase, current, total, percent, message }`

- [ ] **Step 1: Write failing cancel and partial-file cleanup tests**

```js
await assert.rejects(writeAtomically(out, async temp => {
  await fs.writeFile(temp, 'partial');
  throw new Error('falha');
}), /falha/);
assert.equal(existsSync(out), false);
assert.equal(globSync(`${out}*.partial`).length, 0);
```

- [ ] **Step 2: Implement atomic writer and job manager**

Workers receive serializable payloads only. Cancellation uses `AbortController`; writers check `signal.aborted` between files and before rename.

- [ ] **Step 3: Wire IPC**

Expose `startProcessing`, `cancelProcessing`, `retryFailed`, and one progress subscription that returns an unsubscribe function.

- [ ] **Step 4: Run job and regression tests**

Run: `node --test tests/jobs/*.test.cjs tests/baseline/*.test.cjs`
Expected: PASS; UI process remains responsive in manual smoke test.

- [ ] **Step 5: Commit**

```bash
git add main.js preload.js src/main/jobs src/main/files tests/jobs
git commit -m "feat: isolate processing jobs and safe outputs"
```

### Task 5: Análise local de duplicidades

**Files:**
- Create: `src/main/duplicates/normalize.cjs`
- Create: `src/main/duplicates/analyze-batch.cjs`
- Create: `tests/duplicates/analyze-batch.test.cjs`
- Modify: `main.js`
- Modify: `preload.js`

**Interfaces:**
- Produces: `analyzeBatch(files, signal): Promise<DuplicateAnalysis>`
- `DuplicateAnalysis`: `{ confirmedGroups, possibleGroups, counts, batchFingerprint }`
- Each occurrence: `{ fileToken, rowNumber, kind, maskedCpf, revealedFields }`; raw fields never enter logs or cloud DTOs.

- [ ] **Step 1: Write PF and PJ batch tests**

```js
assert.equal(result.counts.confirmed, 1);
assert.equal(result.counts.possible, 1);
assert.equal(result.confirmedGroups[0].occurrences.length, 2);
assert.match(result.confirmedGroups[0].occurrences[0].maskedCpf, /^\*{3}\.\*{3}\.\*{3}-\d{2}$/);
```

- [ ] **Step 2: Implement normalization and in-memory maps**

PF exact key: CPF + contrato + parcela + pagamento + comissão. PF possible key: CPF or contrato. PJ exact key: código/empresa + parcela + pagamento + comissão. Values are discarded after returning the review model.

- [ ] **Step 3: Add IPC analysis and reveal operation**

Reveal data only for the active analysis session; never persist reveal payloads.

- [ ] **Step 4: Run tests and commit**

Run: `node --test tests/duplicates/*.test.cjs`
Expected: PASS for duplicates across different files and reordered rows.

```bash
git add main.js preload.js src/main/duplicates tests/duplicates
git commit -m "feat: detect duplicate clients locally"
```

### Task 6: Firebase, regras e autenticação

**Files:**
- Modify: `package.json`
- Create: `.env.example`
- Create: `firebase.json`
- Create: `.firebaserc.example`
- Create: `firestore.rules`
- Create: `firestore.indexes.json`
- Create: `src/services/firebase/client.js`
- Create: `src/services/firebase/auth.js`
- Create: `src/services/firebase/dto.js`
- Create: `tests/firebase/rules.test.js`

**Interfaces:**
- Produces: `signIn(email, password)`, `signUpPending(email, password)`, `signOutUser()`
- Produces: `toReportDto(result, context)` that rejects prohibited keys.
- Produces roles: `pending | operator | admin`.

- [ ] **Step 1: Add Firebase 12.16.0 and emulator test dependencies**

Run: `npm install firebase@12.16.0` and `npm install -D @firebase/rules-unit-testing vitest@2 jsdom@25 @testing-library/react@16`.

- [ ] **Step 2: Write failing DTO and rules tests**

```js
expect(() => toReportDto({ cpf: '123' }, context)).toThrow(/campo proibido/i);
await assertFails(setDoc(operatorRef, { role: 'admin' }));
await assertSucceeds(setDoc(adminBrokerConfigRef, safeConfig));
```

- [ ] **Step 3: Implement client config and offline cache**

Initialize only when all `VITE_FIREBASE_*` variables exist. Use persistent local cache. Missing config returns a visible `not-configured` state without blocking local processing.

- [ ] **Step 4: Implement rules and indexes**

Rules deny by default, allow a user to create only their pending profile, and require active operator/admin for operational reads. Only admin changes roles/config/trash. Audit is create-only with `actorId == request.auth.uid`.

- [ ] **Step 5: Run emulator and DTO tests**

Run: `npx firebase emulators:exec --only firestore,auth "npm run test:ui -- tests/firebase"`
Expected: all allow/deny cases PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .env.example firebase.json .firebaserc.example firestore.rules firestore.indexes.json src/services/firebase tests/firebase
git commit -m "feat: add firebase auth and secure metadata schema"
```

### Task 7: Histórico compartilhado, versões, auditoria, lixeira e offline

**Files:**
- Create: `src/services/reports/report-repository.js`
- Create: `src/services/reports/audit-repository.js`
- Create: `src/services/reports/config-repository.js`
- Create: `src/services/reports/backup.js`
- Create: `src/services/reports/types.js`
- Test: `tests/repositories/*.test.js`
- Modify: `src/App.jsx`

**Interfaces:**
- Produces: `createVersion(reportDto): Promise<Report>`
- Produces: `subscribeReports(callback): () => void`
- Produces: `moveToTrash(id)`, `restoreFromTrash(id)`, `purgeExpiredTrash(now)`
- Produces: `appendAudit(event)` and encrypted sanitized snapshot export/import.

- [ ] **Step 1: Write repository tests with Firestore emulator**

Verify simultaneous reservations create versions 1 and 2, operator cannot purge, admin can restore, and offline operation IDs remain idempotent.

- [ ] **Step 2: Implement report and fingerprint transactions**

Use deterministic operation IDs and Firestore transactions. Store relative output token only; resolve the configured local root at runtime.

- [ ] **Step 3: Implement append-only audit and 30-day trash**

Expiration runs on admin startup/sync. No paid scheduled function is used.

- [ ] **Step 4: Implement AES-256-GCM sanitized snapshots**

Derive a key with PBKDF2-SHA-256 using 210,000 iterations and a random 16-byte salt. Store header, salt, IV, tag, and ciphertext; never store the recovery password.

- [ ] **Step 5: Replace local JSON history reads in App**

When Firebase is configured and authenticated, subscribe to Firestore. When offline, show cached data and pending-sync count.

- [ ] **Step 6: Run tests and commit**

Run: `npm run test:all`
Expected: PASS.

```bash
git add src/services/reports src/App.jsx tests/repositories
git commit -m "feat: share versioned report history offline"
```

### Task 8: Componentes visuais e shell autenticado

**Files:**
- Create: `src/components/ui/Button.jsx`
- Create: `src/components/ui/Field.jsx`
- Create: `src/components/ui/StatusBanner.jsx`
- Create: `src/components/ui/Modal.jsx`
- Create: `src/components/ui/DataTable.jsx`
- Create: `src/components/layout/AppShell.jsx`
- Create: `src/components/auth/LoginPage.jsx`
- Create: `src/components/auth/PendingPage.jsx`
- Create: `src/styles/tokens.css`
- Create: `src/styles/components.css`
- Modify: `src/App.jsx`
- Modify: `src/index.css`
- Test: `tests/ui/app-shell.test.jsx`

**Interfaces:**
- Produces accessible UI primitives with consistent `disabled`, `loading`, `error`, focus and keyboard behavior.

- [ ] **Step 1: Write failing auth shell and keyboard tests**

```jsx
render(<AppShell user={operator} syncState="offline" />);
expect(screen.getByText('Modo offline')).toBeVisible();
await user.keyboard('{Tab}{Enter}');
expect(onNavigate).toHaveBeenCalled();
```

- [ ] **Step 2: Implement tokens and primitives**

Preserve Dental Plus blue/white/logo and dark theme. Remove repeated inline styles from shell first; pages migrate as touched.

- [ ] **Step 3: Add Login, Pending and role-aware navigation**

Hide admin configuration from Operators and enforce the same permission in rules/handlers.

- [ ] **Step 4: Run UI tests and commit**

Run: `npm run test:ui`
Expected: PASS in light and dark class contexts.

```bash
git add src/components src/styles src/App.jsx src/index.css tests/ui
git commit -m "feat: modernize authenticated application shell"
```

### Task 9: Dashboard, ações rápidas e administração

**Files:**
- Modify: `src/pages/Dashboard.jsx`
- Modify: `src/pages/SavedReports.jsx`
- Modify: `src/pages/ConfigCorretoras.jsx`
- Create: `src/pages/AdminUsers.jsx`
- Create: `src/pages/Trash.jsx`
- Create: `src/pages/Audit.jsx`
- Test: `tests/ui/admin-pages.test.jsx`

**Interfaces:**
- Consumes repositories from Task 7 and role state from Task 8.

- [ ] **Step 1: Write role and quick-action tests**

Operator sees report actions but not user approval, purge, restore, or broker editing. Admin sees all admin actions.

- [ ] **Step 2: Add quick actions and sync state to Dashboard**

Actions navigate to Novo Relatório, Relatório Geral, PDF e Histórico. Existing KPI formulas remain unchanged.

- [ ] **Step 3: Migrate history deletion to trash**

Replace permanent delete buttons with move-to-trash. Add version labels and duplicate warnings.

- [ ] **Step 4: Add admin users, audit and trash pages**

Admin can approve pending profiles, assign operator/admin, restore items, and purge only expired items after explicit confirmation.

- [ ] **Step 5: Run tests and commit**

Run: `npm run test:ui`
Expected: PASS.

```bash
git add src/pages tests/ui
git commit -m "feat: add shared dashboard and admin operations"
```

### Task 10: Integrar revisão de duplicidades aos fluxos

**Files:**
- Create: `src/components/duplicates/DuplicateReview.jsx`
- Modify: `src/pages/NewReport.jsx`
- Modify: `src/pages/PdfSummary.jsx`
- Modify: `src/pages/GeneralReport.jsx`
- Test: `tests/ui/duplicate-review.test.jsx`

**Interfaces:**
- Consumes: `window.api.analyzeBatch`, `window.api.revealDuplicate`, `window.api.startProcessing`.
- Produces: sanitized decision `{ confirmedCount, possibleCount, reviewed: true, decision: 'continue' }`.

- [ ] **Step 1: Write review gate tests**

Generation remains disabled until analysis completes and the user confirms. Cancelling review leaves files untouched.

- [ ] **Step 2: Implement masked grouped review**

Show group classification, file token, row, differing fields, masked CPF, explicit reveal, and counts. Never log row data.

- [ ] **Step 3: Wire cancel and retry-failed controls**

Pages show active job, cancel safely, and resubmit only failed file tokens.

- [ ] **Step 4: Verify regression and UI**

Run: `npm run test:all`
Expected: all business regression and review tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/duplicates src/pages tests/ui
git commit -m "feat: require local duplicate review before processing"
```

### Task 11: Modernizar páginas restantes sem alterar regras

**Files:**
- Modify: `src/pages/NewReport.jsx`
- Modify: `src/pages/PdfSummary.jsx`
- Modify: `src/pages/GeneralReport.jsx`
- Modify: `src/pages/ConfigCorretoras.jsx`
- Modify: `src/index.css`
- Test: `tests/ui/workflows.test.jsx`

**Interfaces:**
- Uses the same IPC payload fields currently consumed by the legacy engine plus `jobId` and duplicate decision metadata.

- [ ] **Step 1: Capture workflow tests for required fields and success/error states**

Test month, default destination override, file list, progress, cancel, result summary, and sanitized errors.

- [ ] **Step 2: Replace alerts/confirm with accessible modals and banners**

Keep all labels and calculations that affect generated content. Remove broken emoji and inconsistent encodings from visible UI copy.

- [ ] **Step 3: Add configured default destination with per-run override**

Destination is resolved locally; Firestore stores only a relative token/config label.

- [ ] **Step 4: Run full test suite and commit**

Run: `npm run test:all`
Expected: PASS.

```bash
git add src/pages src/index.css tests/ui
git commit -m "feat: streamline commission workflows"
```

### Task 12: Builds portáteis, documentação e encerramento

**Files:**
- Modify: `package.json`
- Modify: `vite.config.js`
- Modify: `LEIA-ME.txt`
- Create: `docs/ADMINISTRACAO.md`
- Create: `docs/SEGURANCA-E-DADOS.md`
- Create: `docs/BACKUP-E-RESTAURACAO.md`
- Create: `docs/ENCERRAMENTO-JANEIRO-2027.md`
- Delete after verified backup/credential rotation: `backend_backup.zip`

**Interfaces:**
- Produces: `release/Juntador-de-Comissoes-x64.exe`
- Produces: `release/Juntador-de-Comissoes-x86.exe`

- [ ] **Step 1: Pin release versions and scripts**

```json
{
  "scripts": {
    "build:x64": "npm run test:all && npm run build:frontend && electron-builder --win portable --x64",
    "build:x86": "npm run test:all && npm run build:frontend && electron-builder --win portable --ia32"
  }
}
```

Set Electron 43.1.1 and electron-builder 26.15.3. Keep native dependencies out of the runtime so ia32 requires no compilation.

- [ ] **Step 2: Add runtime configuration validation**

On startup, display a clear admin-only setup state when Firebase variables or default network destination are missing. Local processing remains available.

- [ ] **Step 3: Write operating, security, recovery and sunset docs**

Include first-admin bootstrap, Firebase São Paulo setup, Security Rules deployment, recovery password custody, 30-snapshot rotation, Firestore export, x86 end-of-support and January 2027 archival.

- [ ] **Step 4: Remove the secret-bearing archive safely**

Verify the absolute target equals the workspace `backend_backup.zip`, confirm its useful non-secret patterns are represented by tests, delete it, and document that the old API key must be rotated if it was ever deployed.

- [ ] **Step 5: Run release verification**

Run: `npm run test:all`, `npm run build:x64`, `npm run build:x86`.
Expected: tests PASS; two portable executables exist; no `.env`, source ZIP, sample input, or sensitive path is packaged.

- [ ] **Step 6: Manual smoke checklist**

Run x64 from the shared network on Windows 10/11; validate offline processing, reconnect sync, two-user version conflict, cancellation, duplicate review, trash restore, admin/operator permissions and output comparison. Run x86 on a physical 32-bit machine before production use.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vite.config.js LEIA-ME.txt docs
git add -u backend_backup.zip
git commit -m "build: prepare six-month portable release"
```

### Task 13: Final security and regression gate

**Files:**
- Modify only files required by failures found in this gate.

**Interfaces:**
- Consumes all previous deliverables; produces release acceptance evidence.

- [ ] **Step 1: Scan repository and package output for prohibited data**

Run regex scans for CPF patterns, `.env`, service-account keys, `private_key`, raw sample filename, absolute user paths, and `backend_backup.zip`. Expected: no prohibited match outside documented synthetic fixtures.

- [ ] **Step 2: Compare current and refactored results**

Run both engines on the provided external sample and compare sanitized workbook cells/formulas and PDF extracted totals. Expected: zero business-result differences.

- [ ] **Step 3: Run all automated and build checks**

Run: `npm run test:all && npm run build:x64 && npm run build:x86`.
Expected: exit code 0.

- [ ] **Step 4: Record known limitation**

Document that cloud creation/deployment requires the user's Firebase project credentials and that x86 production acceptance requires a real Windows 32-bit machine.

- [ ] **Step 5: Commit final verified state**

```bash
git add -A
git commit -m "chore: complete release verification"
```
