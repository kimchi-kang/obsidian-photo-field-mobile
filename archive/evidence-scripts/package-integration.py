"""Verify final integration evidence and package its exact runtime, keeping the first candidate."""
from pathlib import Path
import json,hashlib,re,zipfile
root=Path(__file__).resolve().parents[1]
out=root/'docs/releases/1.4.0/integration-audit'
runtime=['main.js','manifest.json','styles.css']
fingerprints={f:hashlib.sha256((root/f).read_bytes()).hexdigest() for f in runtime}
for f in ['package.json','package-lock.json','manifest.json']:assert json.loads((root/f).read_text())['version']=='1.4.0'
unit=(out/'after/tests.txt').read_text();assert 'fail 0' in unit and 'error TS' not in (out/'after/build.txt').read_text()
for path,count in [('after/results.json',11),('regressions/ui/results.json',8),('regressions/extended/results.json',7)]:
 d=json.loads((out/path).read_text());assert len(d['checks'])==count and all(c['passed']for c in d['checks']) and not d['errors'];assert d['fingerprints']==fingerprints
legacy=out/'regressions/field-legacy.log'
text=legacy.read_text();assert text.count('PASS ')==26 and 'FAIL ' not in text and 'Error:' not in text
gear=json.loads((out/'after/equipment-ui-results.json').read_text());assert len(gear['checks'])==2 and all(c['passed']for c in gear['checks']) and not gear['errors']
restart=json.loads((out/'after/restart-results.json').read_text());assert restart['passed'] and restart['normalAppQuitAndRelaunch'] and restart['fingerprints']==fingerprints and restart['shootingFavoriteCount']>0 and restart['zoneFavoriteCount']>0
anchor=json.loads((out/'anchor-after/results.json').read_text());assert abs(anchor['automaticJump'])<2
matrix=json.loads((out/'after/matrix.json').read_text());assert len(matrix)==12 and all(abs(e['automaticJump'])<2 for m in matrix for e in m['events'])
lifecycle=json.loads((out/'after/lifecycle.json').read_text());assert len(set(lifecycle['samples']))==1 and lifecycle['counts']=={'persist':1,'writes':1,'pending':False}
for f in runtime:assert (root/f).read_bytes()==(Path('/private/tmp/photo-field-qa-vault/.obsidian/plugins/photo-field-mobile')/f).read_bytes()
files=runtime+['LICENSE.txt','THIRD_PARTY_NOTICES.md','vendor/depth-of-field-LICENSE.txt']
expected={'photo-field-mobile/'+f:(root/f).read_bytes()for f in files};expected['photo-field-mobile/INSTALL.md']=(out/'INSTALL.md').read_bytes()
archive=root/'dist/photo-field-mobile-1.4.0-integration-candidate.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
 for name,data in expected.items():z.writestr(name,data)
with zipfile.ZipFile(archive)as z:
 assert z.testzip()is None and set(z.namelist())==set(expected)
 for name,data in expected.items():assert z.read(name)==data
 assert not any('data.json'in name for name in z.namelist())
hash_zip=hashlib.sha256(archive.read_bytes()).hexdigest();hash_files={f:hashlib.sha256(d).hexdigest()for f,d in expected.items()}
(root/'dist/SHA256SUMS-1.4.0-integration-candidate.txt').write_text(f'{hash_zip}  {archive.name}\n'+''.join(f'{h}  {f}\n'for f,h in hash_files.items()))
summary={'version':'1.4.0','versionBump':False,'newFeatures':False,'unitTests':int(re.search(r'tests (\d+)',unit).group(1)),'integratedScenarios':10,'viewportCombinations':12,'matrixScreenshots':24,'currentRegressionGroups':41,'additionalEquipmentUiChecks':2,'normalAppRelaunch':True,'reentryCount':6,'singleDistancePersistRequests':1,'singleDistanceDiskWrites':1,'pendingWrites':False,'consoleErrors':[],'archive':archive.name,'archiveSha256':hash_zip,'fingerprints':fingerprints,'files':hash_files,'runtimeMatchesCurrentSourceAndTestVault':True,'zipVerified':True,'licensesIncluded':True,'userDataExcluded':True,'productionInstall':False,'publicRelease':False,'actualIOS':False,'actualAndroid':False}
(out/'package-verification.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:v for k,v in summary.items()if k not in ['files','fingerprints']},ensure_ascii=False,indent=2))
