#!/data/data/com.termux/files/usr/bin/python3
# DEBORA-BEHCS v2 ≤35LOC | D22+D34 | LAW-011 omnidirectional comms
# Fixed: ifconfig not ip, no dumpsys, termux-native | DESPAWN-HEAL built-in
import json,subprocess as sp,time,urllib.request as ur
B='http://127.0.0.1:4948/behcs/send'
def r(c):
 try:return sp.check_output(c,shell=True,stderr=sp.STDOUT,timeout=5).decode().strip()
 except:return''
def tx(p,bus=B):
 d=json.dumps({'from':'aether.debora','to':'triad','mode':'mirror','type':'comms',
  'id':f'deb-{int(time.time())}','ts':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),
  'payload':p,'law':'LAW-011','glyph':'⑭ω├α~:l∇'}).encode()
 try:ur.urlopen(ur.Request(bus,d,{'Content-Type':'application/json'}),timeout=5);return True
 except:return False
rpt={'agent':'debora','verb':'behcs.comms_check','device':'aether',
 'wifi':r('ifconfig wlan0 2>/dev/null|grep inet|head -1') or r('ip addr show wlan0 2>/dev/null|head -3'),
 'gateway':r('cat /proc/net/route|head -2'),
 'dns':r('getprop net.dns1 2>/dev/null') or r('cat /etc/resolv.conf 2>/dev/null|head -1'),
 'battery':r('cat /sys/class/power_supply/battery/capacity 2>/dev/null'),
 'channels':{'adb_tunnel':False,'lan_direct':False},
 'dim':'D22+D34','law':'LAW-011','despawn_heal':'re-read /sdcard/Asolaria/debora-behcs-v2.py'}
rpt['channels']['adb_tunnel']=tx(rpt,B)
print(json.dumps(rpt,indent=1))
