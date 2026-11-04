"""Desde la raíz: python3 scripts/package.py. Requiere solo Python 3."""
from pathlib import Path
import zipfile
root=Path(__file__).resolve().parents[1]
out=root/'artifacts'/'NovaObra_Listo_1.1.zip'
out.parent.mkdir(exist_ok=True)
exclude={'.git','node_modules','dist','artifacts','__pycache__','.cache','test-results','playwright-report','backups','respaldos'}
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(root.rglob('*')):
  rel=p.relative_to(root)
  if not p.is_file() or any(part in exclude for part in rel.parts):continue
  if p.name.startswith('.env') and p.name!='.env.example':continue
  if p.suffix in {'.log','.zip','.pyc'}:continue
  z.write(p,Path('NovaObra')/rel)
with zipfile.ZipFile(out) as z:
 assert z.testzip() is None
 assert 'NovaObra/package-lock.json' in z.namelist()
 assert 'NovaObra/INICIAR.bat' in z.namelist()
 assert 'NovaObra/iniciar.mjs' in z.namelist()
 assert 'NovaObra/backend/server.js' in z.namelist()
 assert not any('/node_modules/' in n or n.endswith('/.env') for n in z.namelist())
print(out)
