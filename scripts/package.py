"""Desde la raíz: python3 scripts/package.py. Requiere solo Python 3."""
from pathlib import Path
import zipfile
root=Path(__file__).resolve().parents[1]
out=root/'artifacts'/'NovaObra_Control_Completo.zip'
out.parent.mkdir(exist_ok=True)
exclude={'.git','node_modules','dist','artifacts','__pycache__','.cache','test-results','playwright-report','backups','respaldos'}
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(root.rglob('*')):
  rel=p.relative_to(root)
  if not p.is_file() or any(part in exclude for part in rel.parts):continue
  if p.name.startswith('.env') and p.name!='.env.example':continue
  if p.suffix in {'.log','.zip','.pyc'}:continue
  z.write(p,Path('NovaObra_Control')/rel)
with zipfile.ZipFile(out) as z:
 assert z.testzip() is None
 assert 'NovaObra_Control/backend/package-lock.json' in z.namelist()
 assert not any('/node_modules/' in n or n.endswith('/.env') for n in z.namelist())
print(out)
