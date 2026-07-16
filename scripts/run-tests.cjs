const { readdirSync } = require('node:fs');
const { run } = require('node:test');
const { spec } = require('node:test/reporters');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const testsRoot = path.join(root, 'tests');

function collectTests(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectTests(absolutePath);
    return entry.name.endsWith('.test.cjs') ? [absolutePath] : [];
  });
}

const testFiles = collectTests(testsRoot);
if (testFiles.length === 0) {
  console.error('Nenhum teste .test.cjs foi encontrado.');
  process.exit(1);
}

const testStream = run({ files: testFiles, concurrency: 1 });
let failed = 0;
testStream.on('test:fail', () => { failed += 1; });
testStream.compose(spec).pipe(process.stdout);
testStream.on('end', () => { process.exitCode = failed > 0 ? 1 : 0; });
