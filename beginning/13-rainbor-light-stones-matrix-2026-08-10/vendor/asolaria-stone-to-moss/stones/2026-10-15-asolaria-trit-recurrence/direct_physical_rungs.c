#define _POSIX_C_SOURCE 200809L
#include <stdint.h>
#include <stdio.h>
#include <inttypes.h>
#include <time.h>
#include <stdlib.h>
#include <string.h>
#define N 81
static uint64_t ns(clockid_t clock) {struct timespec t;if(clock_gettime(clock,&t))exit(2);return (uint64_t)t.tv_sec*1000000000ULL+t.tv_nsec;}
static void one(const uint8_t* a,uint8_t*b,int q,int r){for(int i=0;i<N;i++)b[i]=(uint8_t)((a[i]+a[(i+N-q)%N]+a[(i+N-r)%N])%3);}
static uint64_t hstate(const uint8_t x[N]){uint64_t h=1469598103934665603ULL;for(int j=0;j<N;j++){h^=x[j];h*=1099511628211ULL;}return h;}
static int testlaw(uint64_t count,int q,int r){uint8_t a[N],b[N],*s=a,*d=b;for(int i=0;i<N;i++)a[i]=(uint8_t)(((i*37+11)^((i*i+17)*19))%3);uint64_t t0=ns(CLOCK_MONOTONIC),c0=ns(CLOCK_PROCESS_CPUTIME_ID),initial=hstate(a),at81=0,check=0;
for(uint64_t i=0;i<count;i++){one(s,d,q,r);uint8_t* tmp=s;s=d;d=tmp;if(i==80)at81=hstate(s);if((i&1048575ULL)==0)check^=hstate(s)+(i>>6);}
int nonzero=0;for(int i=0;i<N;i++)nonzero+=s[i]!=0;uint64_t elapsed=ns(CLOCK_MONOTONIC)-t0,cpu=ns(CLOCK_PROCESS_CPUTIME_ID)-c0;
printf("{\"kind\":\"GF3_ACTUAL_CPU_DIRECT\",\"logical_steps\":%" PRIu64 ",\"taps\":[0,%d,%d],\"initial_fingerprint\":\"%016" PRIx64 "\",\"fingerprint_at_81\":\"%016" PRIx64 "\",\"final_fingerprint\":\"%016" PRIx64 "\",\"final_nonzero\":%d,\"rolling_checksum\":\"%016" PRIx64 "\",\"cpu_ms\":%.3f,\"wall_ms\":%.3f}\n",count,q,r,initial,at81,hstate(s),nonzero,check,cpu/1e6,elapsed/1e6);fflush(stdout);return nonzero!=0;}
static int phases(uint64_t count,int exponent){uint64_t periods[16];int n=exponent-5;if(n<1 || n>16)return 3;uint64_t p=243;for(int j=0;j<n;j++){periods[j]=p;p*=3;}uint64_t phase[16]={0};uint64_t check=0,t0=ns(CLOCK_MONOTONIC),c0=ns(CLOCK_PROCESS_CPUTIME_ID);
for(uint64_t i=0;i<count;i++){for(int k=0;k<n;k++)if(++phase[k]==periods[k])phase[k]=0;if((i&1048575ULL)==0)for(int k=0;k<n;k++)check^=phase[k]*(0x9e3779b97f4a7c15ULL+(k<<2));}
int returns=0;for(int k=0;k<n;k++){if(phase[k]!=count%periods[k])return 4;returns+=phase[k]==0;}uint64_t elapsed=ns(CLOCK_MONOTONIC)-t0,cpu=ns(CLOCK_PROCESS_CPUTIME_ID)-c0;
printf("{\"kind\":\"EXPANDED_PHASE_ACTUAL_CPU_DIRECT\",\"logical_steps\":%" PRIu64 ",\"exponent\":%d,\"phase_registers\":%d,\"return_count\":%d,\"cpu_ms\":%.3f,\"wall_ms\":%.3f,\"rolling_checksum\":\"%016" PRIx64 "\"}\n",count,exponent,n,returns,cpu/1e6,elapsed/1e6,check);fflush(stdout);return returns!=n;}
int main(int argc,char**argv){if(argc!=2){fprintf(stderr,"usage: %s POWER_OF_THREE_EXPONENT\n",argv[0]);return 2;}int exp=atoi(argv[1]);if(exp<5 || exp>18)return 3;uint64_t count=1;for(int j=0;j<exp;j++)count*=3;int rc=testlaw(count,1,3);rc|=testlaw(count,4,7);rc|=phases(count,exp);return rc;}
