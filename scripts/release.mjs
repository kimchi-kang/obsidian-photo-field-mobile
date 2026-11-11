// One-command local release packaging: `npm run release`.
// Checks versions, builds, runs the unit tests, then writes the release ZIP and checksums into dist/.
// It never publishes: uploading to GitHub stays a separate, deliberate step (the command is printed at the end).
//   --force   overwrite an existing ZIP for this version
//   --dry-run run every check and print what would be written, without touching dist/
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, utimesSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const force = process.argv.includes('--force'), dryRun = process.argv.includes('--dry-run');
const read = name => readFileSync(join(root, name), 'utf8');
const json = name => JSON.parse(read(name));
const sha256 = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const fail = message => {console.error(`release: ${message}`); process.exit(1);};
const run = (command, args) => execFileSync(command, args, {cwd: root, stdio: 'inherit'});
const step = text => console.log(`\n▸ ${text}`);

// 1. Versions must agree everywhere before anything is built.
step('버전 일치 확인');
const manifest = json('manifest.json'), version = manifest.version;
const lock = json('package-lock.json'), versions = json('versions.json');
if (json('package.json').version !== version) fail(`package.json 버전이 manifest.json(${version})과 다릅니다.`);
if (lock.version !== version || lock.packages?.['']?.version !== version) fail(`package-lock.json 버전이 ${version}이 아닙니다.`);
if (versions[version] !== manifest.minAppVersion) fail(`versions.json에 "${version}": "${manifest.minAppVersion}" 항목이 없습니다.`);
const changelog = read('CHANGELOG.md');
const heading = changelog.split('\n').findIndex(line => /^#{1,2} /.test(line) && line.replace(/^#+ /, '').startsWith(version));
if (heading < 0) fail(`CHANGELOG.md에 ${version} 항목이 없습니다.`);
const zipName = `photo-field-mobile-${version}.zip`, dist = join(root, 'dist'), zipPath = join(dist, zipName);
if (existsSync(zipPath) && !force && !dryRun) fail(`dist/${zipName}이 이미 있습니다. 이미 배포한 버전이면 버전을 올리고, 다시 만들려면 --force를 붙이세요.`);
console.log(`  ${version} (Obsidian ${manifest.minAppVersion} 이상)`);

// 2. Build and test. The ZIP is made from exactly the files these produce.
step('빌드'); run('npm', ['run', 'build']);
step('단위 테스트'); run('npm', ['test']);

// 3. Release notes and install notes: hand-written files win, otherwise they are generated.
const lines = changelog.split('\n');
let end = lines.findIndex((line, n) => n > heading && /^#{1,2} /.test(line)); if (end < 0) end = lines.length;
const title = lines[heading].replace(/^#+ /, '').replace(/\s*\(\d{4}-\d{2}-\d{2}\)\s*$/, '');
const override = name => {const file = join(root, 'docs/releases', version, name); return existsSync(file) ? readFileSync(file, 'utf8') : undefined;};
const releaseNotes = override('RELEASE.md') ?? `# ${manifest.name} ${title}\n\n${lines.slice(heading + 1, end).join('\n').trim()}\n`;
const previous = Object.keys(versions).filter(v => v !== version).sort((a, b) => a.localeCompare(b, undefined, {numeric: true})).pop();
const previousZip = previous && existsSync(join(dist, `photo-field-mobile-${previous}.zip`)) ? `photo-field-mobile-${previous}.zip` : undefined;
const installNotes = override('INSTALL.md') ?? [
  `# ${manifest.name} ${version} 설치·복구`, '', '## 업데이트', '',
  'BRAT에서 kimchi-kang/obsidian-photo-field-mobile의 latest 업데이트를 확인하세요. 수동 설치는 기존 플러그인 폴더 전체를 백업하고 플러그인을 끈 뒤 ZIP의 프로그램·라이선스 파일을 기존 폴더에 복사합니다. **data.json을 지우거나 덮어쓰지 마세요.**',
  '', '데이터 형식 변경 여부는 RELEASE.md를 확인하세요.',
  ...(previousZip ? ['', `## ${previous} 복구`, '', `플러그인을 끄고 함께 첨부한 ${previousZip}의 프로그램·라이선스 파일로 교체하세요.`] : []),
  '', 'ZIP에는 사용자 data.json과 테스트 데이터가 없습니다. 라이선스와 서드파티 고지(내장 글꼴 라이선스 포함)를 함께 보관하세요.', ''
].join('\n');

// 4. Stage the plugin folder and zip it with fixed timestamps so the same inputs give the same ZIP.
step('ZIP 만들기');
const program = ['main.js', 'manifest.json', 'styles.css'], notices = ['LICENSE.txt', 'THIRD_PARTY_NOTICES.md'];
const vendor = readdirSync(join(root, 'vendor')).filter(name => name.endsWith('.txt')).sort().map(name => `vendor/${name}`);
const stage = mkdtempSync(join(tmpdir(), 'pfm-release-')), folder = join(stage, 'photo-field-mobile');
try {
  mkdirSync(join(folder, 'vendor'), {recursive: true});
  for (const name of [...program, ...notices, ...vendor]) cpSync(join(root, name), join(folder, name));
  writeFileSync(join(folder, 'RELEASE.md'), releaseNotes); writeFileSync(join(folder, 'INSTALL.md'), installNotes);
  const entries = [...program, ...notices, ...vendor, 'RELEASE.md', 'INSTALL.md'].map(name => `photo-field-mobile/${name}`);
  const stamp = new Date('2020-01-01T00:00:00Z');
  for (const entry of entries) utimesSync(join(stage, entry), stamp, stamp);
  const staged = join(stage, zipName);
  execFileSync('zip', ['-X', '-q', staged, ...entries], {cwd: stage, env: {...process.env, TZ: 'UTC'}});

  // 5. Verify the ZIP: exact file list, bytes identical to the built files, no user data.
  const listed = execFileSync('unzip', ['-Z1', staged], {encoding: 'utf8'}).trim().split('\n').sort();
  if (JSON.stringify(listed) !== JSON.stringify([...entries].sort())) fail(`ZIP 파일 목록이 예상과 다릅니다: ${listed.join(', ')}`);
  if (listed.some(name => name.includes('data.json'))) fail('ZIP에 data.json이 들어 있습니다.');
  for (const name of [...program, ...notices, ...vendor]) {
    const inside = execFileSync('unzip', ['-p', staged, `photo-field-mobile/${name}`], {maxBuffer: 64 * 1024 * 1024});
    if (!inside.equals(readFileSync(join(root, name)))) fail(`ZIP 안의 ${name}이 빌드 결과와 다릅니다.`);
  }

  // 6. Checksums for every asset attached to the GitHub release.
  const assets = [...[...program, ...notices].map(name => [name, join(root, name)]), [zipName, staged], ...(previousZip ? [[previousZip, join(dist, previousZip)]] : [])];
  const sums = assets.map(([name, file]) => `${sha256(file)}  ${name}\n`).join('');
  const sumsName = `SHA256SUMS-${version}.txt`, notesName = `release-notes-${version}.md`;
  if (dryRun) {console.log(`  (dry-run) dist/${zipName}, dist/${sumsName}, dist/${notesName}은 쓰지 않았습니다.\n${sums}`);}
  else {
    mkdirSync(dist, {recursive: true});
    cpSync(staged, zipPath); writeFileSync(join(dist, sumsName), sums); writeFileSync(join(dist, notesName), releaseNotes);
    console.log(sums);
    console.log(`완료: dist/${zipName}, dist/${sumsName}, dist/${notesName}`);
    console.log('\n아직 공개되지 않았습니다. 모바일 QA(npm run qa)와 커밋·태그를 마친 뒤 직접 올리세요:');
    console.log(`  gh release create ${version} ${[...program, ...notices].join(' ')} dist/${zipName} dist/${sumsName}${previousZip ? ` dist/${previousZip}` : ''} --title "${title}" --notes-file dist/${notesName}`);
  }
} finally {rmSync(stage, {recursive: true, force: true});}
