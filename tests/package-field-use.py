"""Package only the runtime actually exercised in the isolated field walkthrough."""
from pathlib import Path
import hashlib
import json
import re
import zipfile

root = Path(__file__).resolve().parents[1]
evidence = root / 'docs/field-use-2026-11-03'
load = lambda name: json.loads((evidence / name).read_text())
sha = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
run = load('after/results.json')
assert all(s['passed'] for s in run['stories']) and len(run['stories']) == 4
assert not run['errors'] and not run['findings']
for filename, expected in run['fingerprints'].items():
    assert sha(root / filename) == expected, filename
    assert sha(Path('/private/tmp/photo-field-qa-vault/.obsidian/plugins/photo-field-mobile') / filename) == expected, filename
for name in ['after/interruption-flow.json', 'after/restart-results.json']:
    assert load(name)['passed'], name
edges = load('after/edges.json')
assert len(edges['checks']) == 5 and all(c['passed'] for c in edges['checks'])
assert not edges['errors'] and len(edges['consoleErrors']) == 1
assert '저장 파일을 다시 읽을 수 없습니다' in edges['consoleErrors'][0]
matrix = load('after/matrix.json')
assert len(matrix['records']) == 13 and not matrix['errors'] and matrix['continuedWithoutReset']
undo = load('after/undo-continuation.json')
assert undo['newRecommendationHasValidUndo'] and not undo['obsoleteExpiryVisible']
assert undo['explicitUndoRestoresPreviousOutput'] and undo['apertureAdjustedWithoutKeyboard'] and undo['keyboard'] == 0
assert re.search(r'tests 95\b', (evidence/'after/tests.txt').read_text())
assert re.search(r'fail 0\b', (evidence/'after/tests.txt').read_text())
assert not re.search(r'error TS\d', (evidence/'after/build.txt').read_text())
assert json.loads((root/'manifest.json').read_text())['version'] == '1.4.1'
assert json.loads((root/'package.json').read_text())['version'] == '1.4.1'
rollback = root/'dist/photo-field-mobile-1.4.0.zip'
assert sha(rollback) == 'd8964b5f1bd52ae3814665cc71db088d3da19eea2582b072666f2514a1fdfb19'
files = ['main.js', 'manifest.json', 'styles.css', 'LICENSE.txt', 'THIRD_PARTY_NOTICES.md', 'vendor/depth-of-field-LICENSE.txt']
archive = root/'dist/photo-field-mobile-1.4.1-field-use-candidate.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
    for name in files:
        z.write(root/name, 'photo-field-mobile/'+name)
    z.write(evidence/'INSTALL.md', 'photo-field-mobile/INSTALL.md')
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    assert len(z.namelist()) == 7 and all('data.json' not in n for n in z.namelist())
    for name in files:
        assert z.read('photo-field-mobile/'+name) == (root/name).read_bytes()
result = {'version': '1.4.1', 'candidateOnly': True, 'sourceCommitBeforeChanges': 'df1a6fb',
          'archive': str(archive.relative_to(root)), 'sha256': sha(archive),
          'runtime': run['fingerprints'], 'allArchiveFiles': {},
          'rollbackSha256': sha(rollback), 'sourceAndQARuntimeMatch': True, 'tests': 95,
          'chainedStories': 4, 'interruptionAndNormalRestart': True, 'screenCombinations': 12,
          'edgeChecks': 5, 'expectedInjectedStorageConsoleErrors': 1,
          'productionVaultModified': False, 'publicReleaseModified': False}
with zipfile.ZipFile(archive) as z:
    result['allArchiveFiles'] = {n: hashlib.sha256(z.read(n)).hexdigest() for n in z.namelist()}
(evidence/'package-verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
(root/'dist/SHA256SUMS-1.4.1-field-use-candidate.txt').write_text(result['sha256']+'  '+archive.name+'\n')
print(json.dumps(result,ensure_ascii=False,indent=2))
