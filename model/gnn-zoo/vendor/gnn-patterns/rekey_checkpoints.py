"""State-dict rekey for L1/L2/L4 checkpoints — torch GCNConv key drift.
   Old: conv1.bias / conv1.lin.weight (no conv1.lin.bias)
   New: conv1.lin.bias / conv1.lin.weight (no conv1.bias)
   Rename in-place — saves backup .pt.bak then writes rekeyed .pt"""
import torch, shutil, sys
from pathlib import Path

TARGETS = [
    ('contrastive_model.pt', None),
    ('prototype_model.pt',   None),
    ('gsl_model.pt',         None),
]

for fname, _ in TARGETS:
    p = Path(fname)
    if not p.exists():
        print(f'[SKIP] {fname} not present'); continue
    sd = torch.load(fname, map_location='cpu')
    bak = fname + '.bak'
    if not Path(bak).exists():
        shutil.copy(fname, bak)
    keys_to_rename = []
    for k in list(sd.keys()):
        # Pattern: convN.bias -> convN.lin.bias (or any convX/convX_orig.bias)
        if k.endswith('.bias') and not k.endswith('.lin.bias'):
            parts = k.rsplit('.', 1)
            prefix = parts[0]
            new_key = prefix + '.lin.bias'
            # Check if conv-style: prefix has corresponding .lin.weight in sd
            if (prefix + '.lin.weight') in sd:
                keys_to_rename.append((k, new_key))
    if not keys_to_rename:
        print(f'[OK] {fname} no rekey needed'); continue
    for old, new in keys_to_rename:
        sd[new] = sd.pop(old)
    torch.save(sd, fname)
    print(f'[REKEYED] {fname}: {len(keys_to_rename)} key(s) renamed: ' + ', '.join(f'{o}->{n}' for o,n in keys_to_rename))

print('--- DONE ---')
