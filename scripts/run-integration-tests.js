import { spawn } from 'node:child_process';

const testDatabase = process.env.DB_NAME_TEST;

if (!testDatabase || !/(^|[_-])test([_-]|$)/i.test(testDatabase)) {
  console.error('Refusing to run integration tests: DB_NAME_TEST must be set to a database name containing "test".');
  process.exit(1);
}

const child = spawn(process.execPath, ['--test', 'tests/integration/*.test.js'], {
  stdio: 'inherit',
  env: { ...process.env, DB_NAME: testDatabase, NODE_ENV: 'test' },
  shell: true
});

child.on('exit', (code) => process.exit(code ?? 1));
