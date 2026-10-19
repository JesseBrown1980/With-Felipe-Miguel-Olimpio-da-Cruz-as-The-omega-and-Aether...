#!/usr/bin/env python3
"""Audit Seat 4 published readiness (not a cross-host/physics proof).
Requires Python 3.10+, Node.js 18+, and cryptography for Ed25519 verification.
"""
import base64
import hashlib
import json
import pathlib
import subprocess
import sys
import tempfile
from collections import Counter
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

ROOT = pathlib.Path(__file__).resolve().parents[2]
EX = ROOT / 'experiments' / 'seat4'
CHALLENGE = EX / 'B-CHALLENGE.json'
CHECKIN = ROOT / 'tracking' / 'checkins' / 'seat-4' / '20261014T161859Z.json'
RECEIPT = ROOT / 'stones' / '2026-10-14-rainbow81' / 'seat-4-20261014-readiness.json'


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def main():
    r = json.loads(RECEIPT.read_bytes())
    assert sha(CHALLENGE) == '58e962036aa9033f00a54eea12ebadfb006293ce91014a3be9936df9010f28f2'
    assert sha(EX/'seat4_poly.py') == r['implementations']['python']['source_sha256']
    assert sha(EX/'seat4_matrix.js') == r['implementations']['node']['source_sha256']
    ck = json.loads(CHECKIN.read_bytes())
    p = ck['payload']
    canonical=(json.dumps(p, sort_keys=True,separators=(',', ':'),ensure_ascii=False)+'\n').encode()
    assert hashlib.sha256(canonical).hexdigest() == ck['signed_canonical_payload_sha256']
    pub=base64.b64decode(ck['public_key_ed25519_b64'])
    assert hashlib.sha256(pub).hexdigest() == p['public_key_fingerprint_sha256']
    Ed25519PublicKey.from_public_bytes(pub).verify(base64.b64decode(ck['signature_ed25519_b64']), canonical)
    assert p['secret_revealed'] is False
    assert p['physical_separation_verified'] is False
    sigpath=RECEIPT.with_name(RECEIPT.stem+'.sig.json')
    detached=json.loads(sigpath.read_bytes())
    assert detached['signed_file_sha256']==sha(RECEIPT)
    assert detached['public_key_ed25519_b64']==ck['public_key_ed25519_b64']
    Ed25519PublicKey.from_public_bytes(pub).verify(base64.b64decode(detached['signature_ed25519_b64']), RECEIPT.read_bytes())
    for signedpath in (RECEIPT,sigpath,CHECKIN,CHECKIN.with_suffix('.hbp')):
        sidecar=signedpath.with_name(signedpath.name+'.sha256')
        asserted_hash=sidecar.read_text().split()[0]
        assert sha(signedpath)==asserted_hash
    with tempfile.TemporaryDirectory() as folder:
        d=pathlib.Path(folder)
        outputs=[]
        for command, path in (([sys.executable,str(EX/'seat4_poly.py'),str(CHALLENGE),str(d/'python.csv')],d/'python.csv'),
                              (['node',str(EX/'seat4_matrix.js'),str(CHALLENGE),str(d/'node.csv')],d/'node.csv')):
            res=subprocess.run(command,capture_output=True,text=True,check=True)
            metadata=json.loads(res.stdout)
            assert metadata['cases']==729
            assert metadata['sha256_csv']==r['result']['csv_sha256']
            outputs.append(path.read_bytes())
        assert outputs[0]==outputs[1]
        lines=outputs[0].decode('ascii').splitlines()
        assert len(lines)==729
        assert len(set(line.split(',')[3] for line in lines)) == 729
        assert len(set(line.split(',')[4] for line in lines)) == 729
        assert dict(Counter(line.split(',')[2] for line in lines)) == {'CA150':162,'CA90':162,'CA60':162,'CA102':162,'SHIFT':81}
        modified=json.loads(CHALLENGE.read_bytes())
        seed=modified['seed_hex']
        modified['seed_hex']=('0' if seed[0]!='0' else '1')+seed[1:]
        (d/'wrong.json').write_text(json.dumps(modified))
        subprocess.run([sys.executable,str(EX/'seat4_poly.py'),str(d/'wrong.json'),str(d/'wrong.csv')],capture_output=True,text=True,check=True)
        assert (d/'wrong.csv').read_bytes() != outputs[0]
    print(json.dumps({'seat':'seat-4','signed_checkin':'PASS','cross_language_729':'PASS','small_step':'PASS',
          'negative_control_wrong_seed':'PASS','sha256_csv':r['result']['csv_sha256'],
          'physical_host_independence':'UNVERIFIED','new_coordinator_challenge':'NOT_ISSUED'},indent=2))


if __name__=='__main__':main()
