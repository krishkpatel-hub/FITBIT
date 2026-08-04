import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const trackedFiles = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .filter((file) => !file.includes('package-lock.json'));

const failures = [];
const forbiddenSecretPatterns = [
  { label: 'MongoDB Atlas URI', pattern: /mongodb\+srv:\/\//i },
  { label: 'private key block', pattern: /-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/i },
  { label: 'old development JWT secret', pattern: new RegExp('fitbitstrength' + '_jwt_secret', 'i') },
];

for (const file of trackedFiles) {
  if (!existsSync(file)) {
    continue;
  }

  const content = readFileSync(file, 'utf8');

  if (file.endsWith('.env') && !file.endsWith('.env.example')) {
    failures.push(`${file}: tracked environment file`);
  }

  for (const { label, pattern } of forbiddenSecretPatterns) {
    if (pattern.test(content)) {
      failures.push(`${file}: possible ${label}`);
    }
  }

  if (file === 'frontend/src/pages/Home/Home.jsx' && /REAL SCREENSHOT NEEDED|ProductPlaceholder|Replace with screenshot/i.test(content)) {
    failures.push(`${file}: landing page placeholder copy remains`);
  }
}

if (failures.length > 0) {
  console.error('Repository lint failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Repository lint checks passed.');
