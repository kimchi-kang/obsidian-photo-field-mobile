"""Package a release only when its exact runtime files passed isolated Obsidian QA."""
from pathlib import Path
import hashlib,json,zipfile
root=Path(__file__).resolve().parents[1]
version=json.loads((root/'manifest.json').read_text())['version']
out=root/'docs/releases'/version
qa=json.loads((out/'ui/results.json').read_text())
assert all(c['passed'] for c in qa['checks']) and not qa['errors']
assert 'fail 0' in (out/'tests.txt').read_text()
assert 'error TS' not in (out/'build.txt').read_text()
for name in ['package.json','package-lock.json']:
 assert json.loads((root/name).read_text())['version']==version
for name in ['main.js','styles.css','manifest.json']:
 assert hashlib.sha256((root/name).read_bytes()).hexdigest()==qa['fingerprints'][name]
 assert (root/name).read_bytes()==(Path('/private/tmp/photo-field-qa-vault/.obsidian/plugins/photo-field-mobile')/name).read_bytes()
files=['main.js','manifest.json','styles.css','LICENSE.txt','THIRD_PARTY_NOTICES.md','vendor/depth-of-field-LICENSE.txt']
expected={'photo-field-mobile/'+f:(root/f).read_bytes() for f in files}
expected['photo-field-mobile/RELEASE.md']=(out/'RELEASE.md').read_bytes()
archive=root/'dist'/f'photo-field-mobile-{version}.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
 for name,data in expected.items():z.writestr(name,data)
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None and set(z.namelist())==set(expected)
 for name,data in expected.items():assert z.read(name)==data
 assert not any('data.json' in name for name in z.namelist())
assets=[root/f for f in files[:5]]+[archive,root/'dist/photo-field-mobile-1.3.0-pre-calculation-audit-recovery.zip',root/'docs/calculation-audit/REPORT.md',root/'docs/calculation-audit/representative-table.md']
hashes={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in assets}
sha=root/'dist'/f'SHA256SUMS-{version}.txt';sha.write_text(''.join(f'{value}  {name}\n' for name,value in hashes.items()))
(out/'package-verification.json').write_text(json.dumps({'version':version,'assets':hashes,'files':{n:hashlib.sha256(d).hexdigest() for n,d in expected.items()},'zipVerified':True,'dataExcluded':True,'testedFilesMatch':True},ensure_ascii=False,indent=2)+'\n')
print(f'PASS {version}: ZIP contents, tested/installed bytes, versions, licenses and SHA256')
