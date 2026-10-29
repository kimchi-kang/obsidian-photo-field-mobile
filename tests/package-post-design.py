"""Package whitelisted plugin files; never include vault data or screenshots."""
from pathlib import Path
import hashlib
import json
import zipfile

root = Path(__file__).resolve().parents[1]
out = root / 'docs/post-design-validation'
start = json.loads((out / 'start.json').read_text())
version = json.loads((root / 'manifest.json').read_text())['version']
base = start['commit'][:7]
files = ['main.js', 'manifest.json', 'styles.css', 'LICENSE.txt',
         'THIRD_PARTY_NOTICES.md', 'vendor/depth-of-field-LICENSE.txt']
(root / 'dist').mkdir(exist_ok=True)
proof = {'version': version, 'base': base, 'entries': []}
archives = []
for recovery in [False, True]:
    name = (f'photo-field-mobile-{version}-{base}-recovery.zip' if recovery else
            f'photo-field-mobile-{version}-post-design-qa-{base}.zip')
    archive = root / 'dist' / name
    expected = {}
    for file in files:
        original = out / 'baseline' / file
        expected['photo-field-mobile/' + file] = (original if recovery and original.exists() else root / file).read_bytes()
    if not recovery:
        expected['photo-field-mobile/CANDIDATE.md'] = (
            '# 코드 검증 후보\n\n'
            '자동53개와 실제 번들 코드 통합15개 통과. 실제 앱/화면/제스처/실기 재검증은 접근 제한으로 미수행.\n'
            '바우하우스 방향 유지, 조작부 경계 대비만 수정. 공개 버전/스키마 변경 없음. 자동 설치하지 않음.\n'
            '설치 전 별도 테스트 보관함에서 실제 화면을 확인하세요. data.json·장비·노트는 덮어쓰지 마세요.\n'
        ).encode()
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
        for file, content in expected.items():
            z.writestr(file, content)
    with zipfile.ZipFile(archive) as z:
        assert z.testzip() is None
        assert set(z.namelist()) == set(expected)
        for file, content in expected.items():
            assert z.read(file) == content, file
        assert not any('data.json' in file or 'backups/' in file or 'screenshots/' in file for file in z.namelist())
        assert b'Copyright (c) 2026 Jack Herrington' in z.read('photo-field-mobile/vendor/depth-of-field-LICENSE.txt')
        assert z.read('photo-field-mobile/vendor/depth-of-field-LICENSE.txt') in z.read('photo-field-mobile/main.js')
    proof['entries'].append({'archive': str(archive.relative_to(root)), 'recovery': recovery,
        'sha256': hashlib.sha256(archive.read_bytes()).hexdigest(),
        'fileMatch': {file: hashlib.sha256(content).hexdigest() for file, content in expected.items()},
        'dataExcluded': True, 'licensesVerified': True})
    archives.append(archive)
current = [root / name for name in ['main.js', 'manifest.json', 'styles.css']]
(out / 'SHA256SUMS.txt').write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest() + '  ' + str(p.relative_to(root)) + '\n' for p in archives + current))
(out / 'package-verification.json').write_text(json.dumps(proof, ensure_ascii=False, indent=2) + '\n')
print('PASS ZIP integrity, exact file whitelist, source artifact byte equality, checksums, full MIT notices and data exclusion')
