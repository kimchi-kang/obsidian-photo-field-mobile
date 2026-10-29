"""Create candidate and exact pre-task binary recovery, excluding vault data."""
from pathlib import Path
import json,hashlib,zipfile
root=Path(__file__).resolve().parents[1]
out=root/'docs/zone-focus'
(root/'dist').mkdir(exist_ok=True)
files=['main.js','manifest.json','styles.css','LICENSE.txt','THIRD_PARTY_NOTICES.md','vendor/depth-of-field-LICENSE.txt']
entries=[]
for recovery in [False,True]:
 name='photo-field-mobile-1.2.0-pre-zone-recovery.zip' if recovery else 'photo-field-mobile-1.3.0-zone-candidate.zip'
 archive=root/'dist'/name
 expected={}
 for f in files:
  source=out/'before'/f if recovery and f in ['main.js','manifest.json','styles.css'] else root/f
  expected['photo-field-mobile/'+f]=source.read_bytes()
 if not recovery:
  expected['photo-field-mobile/ZONE-MODEL.md']=(out/'MODEL.md').read_bytes()
  expected['photo-field-mobile/CANDIDATE.md']=(out/'REPORT.md').read_bytes()
 with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED)as z:
  for f,data in expected.items():z.writestr(f,data)
 with zipfile.ZipFile(archive)as z:
  assert z.testzip()is None
  assert set(z.namelist())==set(expected)
  for f,data in expected.items():assert z.read(f)==data
  assert not any('data.json' in f for f in z.namelist())
  assert expected['photo-field-mobile/vendor/depth-of-field-LICENSE.txt'] in expected['photo-field-mobile/main.js']
  manifest=json.loads(z.read('photo-field-mobile/manifest.json'))
  assert manifest['version']==('1.2.0' if recovery else '1.3.0')
 entries.append({'archive':str(archive.relative_to(root)),'recovery':recovery,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'fileMatch':{f:hashlib.sha256(data).hexdigest()for f,data in expected.items()},'dataExcluded':True,'licensesVerified':True})
(out/'package-verification.json').write_text(json.dumps(entries,indent=2)+'\n')
(out/'SHA256SUMS.txt').write_text(''.join(e['sha256']+'  '+e['archive']+'\n' for e in entries))
print('PASS candidate/recovery ZIP integrity, exact files, hashes, version and licenses; vault data excluded')
