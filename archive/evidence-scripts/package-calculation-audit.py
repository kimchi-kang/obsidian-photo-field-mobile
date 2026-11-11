"""Package the tested calculation audit candidate and exact pre-audit binary recovery."""
from pathlib import Path
import hashlib,json,zipfile
root=Path(__file__).resolve().parents[1]
out=root/'docs/calculation-audit'
ui=json.loads((out/'ui/results.json').read_text())
assert len(ui['checks'])==8 and all(c['passed'] for c in ui['checks']) and not ui['errors']
assert json.loads((out/'relaunch/results.json').read_text())['passed']
assert 'pass 79' in (out/'all-tests.txt').read_text()
assert 'error TS' not in (out/'build.txt').read_text()
files=['main.js','manifest.json','styles.css','LICENSE.txt','THIRD_PARTY_NOTICES.md','vendor/depth-of-field-LICENSE.txt']
for f in files[:3]:
 assert hashlib.sha256((root/f).read_bytes()).hexdigest()==ui['fingerprints'][f],f
 assert (root/f).read_bytes()==(Path('/private/tmp/photo-field-qa-vault/.obsidian/plugins/photo-field-mobile')/f).read_bytes(),f
entries=[]
for recovery in [False,True]:
 name='photo-field-mobile-1.3.0-pre-calculation-audit-recovery.zip' if recovery else 'photo-field-mobile-1.3.0-calculation-audit-candidate.zip'
 expected={}
 for f in files:
  src=out/'before'/f if recovery and f in files[:3] else root/f
  expected['photo-field-mobile/'+f]=src.read_bytes()
 if not recovery:
  expected['photo-field-mobile/CALCULATION-AUDIT.md']=('''# Calculation audit candidate · 2026-10-31
Manifest remains 1.3.0. Identify this local candidate by its ZIP name and published local SHA256SUMS.txt.
Verified: independent flash energy, thin-lens ray blur, continuous zone minimax, actual aperture stages,
angles/frames/equivalence, invalid/extreme inputs, Markdown and persistence. 79 automated tests;
2,000 valid fixed-seed samples, 250 invalid samples; 8 actual Obsidian mobile-emulation groups;
normal isolated app quit and fresh process relaunch. Not real iOS/Android or equipment calibration.
Full local evidence: project docs/calculation-audit/REPORT.md and representative-table.md.

Install: back up the existing plugin folder including data.json. Disable the plugin and replace only
main.js, manifest.json and styles.css. Keep data.json. Re-enable. No live vault was installed by this audit.
Recovery ZIP holds the exact pre-audit main.js/manifest.json/styles.css bytes.

Model: manual direct flash at ordinary sync; point-source inverse square approximation.
GN100 full power normalized to metres: Geff=G sqrt(p) sqrt(ISO/100) 2^(-loss/2).
Distance=Geff/N; exposure EV=2 log2(distance/subjectDistance).
Optics uses actual focal length in mm, actual N and CoC in mm. Focus distance is measured from
an ideal thin-lens principal plane, not the sensor. Rectilinear frames use infinity-focus approximation.
CoC diagonal/1500 is a viewing assumption. Finite zone focus is harmonic mean of target endpoints;
infinite zone uses H. Equivalent aperture is a DOF approximation, never exposure aperture.
Near the hyperfocal pole, far distances are ill-conditioned at machine precision.

Sources:
https://download.nikonimglib.com/archive2/rOYAB007rd7k028ePIg11W7lyc97/SB-500_CH%28En%2904.pdf
https://people.csail.mit.edu/fredo/comp-photo-book/02-fundamentals-03-lens-image-formation.html
https://www.edmundoptics.com/knowledge-center/application-notes/imaging/understanding-focal-length-and-field-of-view/
https://www.edmundoptics.com/knowledge-center/application-notes/imaging/limitations-on-resolution-and-contrast-the-airy-disk/
''').encode()
 archive=root/'dist'/name
 with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
  for f,data in expected.items():z.writestr(f,data)
 with zipfile.ZipFile(archive) as z:
  assert z.testzip() is None
  assert set(z.namelist())==set(expected)
  for f,data in expected.items():assert z.read(f)==data
  assert not any('data.json' in n or n.endswith('.obsidian') for n in z.namelist())
  assert json.loads(z.read('photo-field-mobile/manifest.json'))['version']=='1.3.0'
  assert expected['photo-field-mobile/vendor/depth-of-field-LICENSE.txt'] in expected['photo-field-mobile/main.js']
 entries.append({'archive':str(archive.relative_to(root)),'recovery':recovery,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'files':{f:hashlib.sha256(d).hexdigest() for f,d in expected.items()},'dataExcluded':True,'licensesVerified':True,'testedFilesMatch':not recovery})
(out/'package-verification.json').write_text(json.dumps(entries,ensure_ascii=False,indent=2)+'\n')
(out/'SHA256SUMS.txt').write_text(''.join(e['sha256']+'  '+e['archive']+'\n' for e in entries))
print('PASS ZIP integrity, tested/installed byte identity, exact recovery, licenses, data exclusion')
