"""Package only the exact runtime verified in the isolated Obsidian vault."""
from pathlib import Path
import hashlib,json,re,zipfile
root=Path(__file__).resolve().parents[1]
out=root/'docs/releases/1.4.0'
version='1.4.0'
for name in ['package.json','package-lock.json','manifest.json']:
 assert json.loads((root/name).read_text())['version']==version
runtime=['main.js','manifest.json','styles.css']
checks=[]
for path,count in [('ui/results.json',8),('extended/results.json',7)]:
 qa=json.loads((out/path).read_text())
 assert len(qa['checks'])==count and all(x['passed'] for x in qa['checks']) and not qa['errors']
 for f in runtime:assert hashlib.sha256((root/f).read_bytes()).hexdigest()==qa['fingerprints'][f]
 checks+=qa['checks']
legacy=(out/'legacy.log').read_text()
assert legacy.count('PASS ')==26 and 'FAIL ' not in legacy and 'Error:' not in legacy
unit=(out/'tests.txt').read_text();assert 'fail 0' in unit
assert 'error TS' not in (out/'build.txt').read_text()
for f in runtime:assert (root/f).read_bytes()==(Path('/private/tmp/photo-field-qa-vault/.obsidian/plugins/photo-field-mobile')/f).read_bytes()
files=runtime+['LICENSE.txt','THIRD_PARTY_NOTICES.md','vendor/depth-of-field-LICENSE.txt']
expected={'photo-field-mobile/'+f:(root/f).read_bytes() for f in files}
expected['photo-field-mobile/INSTALL.md']=(out/'INSTALL.md').read_bytes()
archive=root/'dist/photo-field-mobile-1.4.0-candidate.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
 for name,data in expected.items():z.writestr(name,data)
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None and set(z.namelist())==set(expected)
 for name,data in expected.items():assert z.read(name)==data
 assert all('data.json' not in name for name in z.namelist())
hashes={name:hashlib.sha256(data).hexdigest() for name,data in expected.items()}
archive_hash=hashlib.sha256(archive.read_bytes()).hexdigest()
(root/'dist/SHA256SUMS-1.4.0-candidate.txt').write_text(f'{archive_hash}  {archive.name}\n'+''.join(f'{digest}  {name}\n' for name,digest in hashes.items()))
flows=json.loads((out/'ui/results.json').read_text())['flows']
summary={'version':version,'candidate':True,'unitTests':int(re.search(r'tests (\d+)',unit).group(1)),'newMobileGroups':len(checks),'legacyMobileGroups':26,'mobileGroupsTotal':len(checks)+26,'viewportCaptures':24,'flows':flows,'archive':archive.name,'archiveSha256':archive_hash,'runtimeMatchesTestedAndInstalled':True,'zipVerified':True,'userDataExcluded':True,'licensesIncluded':True,'files':hashes,'actualIOS':False,'actualAndroid':False,'publicRelease':False,'productionInstall':False}
(out/'package-verification.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in summary.items() if k not in ['files','flows']},ensure_ascii=False,indent=2))
