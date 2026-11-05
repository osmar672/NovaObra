"""Desde la raíz: python3 scripts/package.py. Requiere solo Python 3."""
from pathlib import Path
import zipfile
root=Path(__file__).resolve().parents[1]
out=root/'artifacts'/'NovaObra_Dia2_Seguridad.zip'
out.parent.mkdir(exist_ok=True)
exclude={'.certs','.git','node_modules','dist','artifacts','__pycache__','.cache','test-results','playwright-report','backups','respaldos'}
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(root.rglob('*')):
  rel=p.relative_to(root)
  if not p.is_file() or any(part in exclude for part in rel.parts):continue
  if p.name.startswith('.env') and p.name!='.env.example':continue
  if p.suffix in {'.log','.zip','.pyc','.key','.pem','.p12','.pfx'}:continue
  z.write(p,Path('mini-proyecto-1')/rel)
with zipfile.ZipFile(out) as z:
 assert z.testzip() is None
 assert 'mini-proyecto-1/package-lock.json' in z.namelist()
 assert 'mini-proyecto-1/patches/newman+6.2.3.patch' in z.namelist()
 assert 'mini-proyecto-1/patches/postman-collection+4.4.0.patch' in z.namelist()
 assert 'mini-proyecto-1/tests/apply-security-patches.cjs' in z.namelist()
 assert 'mini-proyecto-1/INICIAR.bat' in z.namelist()
 assert 'mini-proyecto-1/iniciar.mjs' in z.namelist()
 assert 'mini-proyecto-1/backend/src/server.js' in z.namelist()
 assert not any('/node_modules/' in n or n.endswith('/.env') for n in z.namelist())
print(out)
