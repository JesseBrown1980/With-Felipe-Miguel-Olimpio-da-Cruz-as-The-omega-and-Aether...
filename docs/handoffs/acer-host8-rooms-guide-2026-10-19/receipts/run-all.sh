#!/bin/sh
# Make, verify and probe 12,500,000,000 Host8 rooms (125 sectors x 100,000,000) on D:, then seal each receipt.
cd /d/ASOLARIA-HOST8-ROOMS-100G || exit 1
B=./host8rooms.exe
$B make D:/ASOLARIA-HOST8-ROOMS-100G 125 100000000 > ROOMS-MAKE.hbp 2> ROOMS-MAKE.err || { echo "make_failed=$?" >> ROOMS-MAKE.err; exit 1; }
$B seal ROOMS-MAKE.hbp b6b64a02864356f9 > SEAL-MAKE.hbp
C1=$(grep -o 'cube=[0-9a-f]*' SEAL-MAKE.hbp | cut -d= -f2)
$B verify D:/ASOLARIA-HOST8-ROOMS-100G 125 100000000 > ROOMS-VERIFY.hbp 2> ROOMS-VERIFY.err; echo "verify_exit=$?" >> ROOMS-VERIFY.err
$B seal ROOMS-VERIFY.hbp "$C1" > SEAL-VERIFY.hbp
C2=$(grep -o 'cube=[0-9a-f]*' SEAL-VERIFY.hbp | cut -d= -f2)
$B probe D:/ASOLARIA-HOST8-ROOMS-100G 125 100000000 10000000 200000 300000 > ROOMS-PROBE.hbp 2> ROOMS-PROBE.err; echo "probe_exit=$?" >> ROOMS-PROBE.err
$B seal ROOMS-PROBE.hbp "$C2" > SEAL-PROBE.hbp
echo "ALLDONE|make_cube=$C1|verify_cube=$C2|probe_cube=$(grep -o 'cube=[0-9a-f]*' SEAL-PROBE.hbp | cut -d= -f2)|json=0"
