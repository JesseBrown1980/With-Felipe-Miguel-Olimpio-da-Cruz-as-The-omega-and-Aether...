/* seedscan.c - scan PYTHONHASHSEED values for a set iteration order consistent with the stored
 * key's tie choices (chosen candidate precedes every other tied candidate at each tied step).
 *
 * usage: seedscan ALG(13|24) SEED_LO SEED_HI cands.txt cons.txt      (scans [LO, HI) )
 *        seedscan test                                                (SipHash-2-4 reference vectors)
 *        seedscan hash ALG SEED cands.txt                             (print hashes, for checking)
 * Prefilter only, conservative: a seed is rejected only when, for some constraint, both home slots
 * (hash & 511) are <= 502 and home(chosen) > home(other) + 9. Linear probing (9 extra slots) cannot
 * then put the chosen candidate first, unless one of the two was displaced by perturbation.
 * Survivors are printed and must be checked exactly (pyset_sim.py).
 */
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define ROTL(x, b) (uint64_t)(((x) << (b)) | ((x) >> (64 - (b))))
#define HALF_ROUND(a, b, c, d, s, t) \
    a += b; c += d; b = ROTL(b, s) ^ a; d = ROTL(d, t) ^ c; a = ROTL(a, 32);
#define SINGLE_ROUND(v0, v1, v2, v3) \
    HALF_ROUND(v0, v1, v2, v3, 13, 16); HALF_ROUND(v2, v1, v0, v3, 17, 21);

static uint64_t siphash(uint64_t k0, uint64_t k1, const uint8_t *in, size_t n, int cr, int dr) {
    uint64_t b = (uint64_t)n << 56;
    uint64_t v0 = k0 ^ 0x736f6d6570736575ULL, v1 = k1 ^ 0x646f72616e646f6dULL;
    uint64_t v2 = k0 ^ 0x6c7967656e657261ULL, v3 = k1 ^ 0x7465646279746573ULL;
    size_t left = n;
    while (left >= 8) {
        uint64_t mi;
        memcpy(&mi, in, 8);
        in += 8; left -= 8;
        v3 ^= mi;
        for (int r = 0; r < cr; r++) { SINGLE_ROUND(v0, v1, v2, v3); }
        v0 ^= mi;
    }
    uint64_t t = 0;
    for (size_t i = 0; i < left; i++) t |= (uint64_t)in[i] << (8 * i);
    b |= t;
    v3 ^= b;
    for (int r = 0; r < cr; r++) { SINGLE_ROUND(v0, v1, v2, v3); }
    v0 ^= b;
    v2 ^= 0xff;
    for (int r = 0; r < dr; r++) { SINGLE_ROUND(v0, v1, v2, v3); }
    return (v0 ^ v1) ^ (v2 ^ v3);
}

static void secret(uint32_t seed, uint64_t *k0, uint64_t *k1) {
    uint8_t buf[24];
    if (seed == 0) {
        memset(buf, 0, 24);
    } else {
        uint32_t x = seed;
        for (int i = 0; i < 24; i++) { x = x * 214013u + 2531011u; buf[i] = (x >> 16) & 0xff; }
    }
    memcpy(k0, buf, 8);
    memcpy(k1, buf + 8, 8);
}

#define MAXC 256
static uint8_t cand[MAXC][128];
static size_t clen[MAXC];
static int nc;
static int ncons, cchosen[64], cn[64], coth[64][32];

static int hexval(int c) { return c <= '9' ? c - '0' : (c | 32) - 'a' + 10; }

static void load(const char *cf, const char *kf) {
    FILE *f = fopen(cf, "r");
    char line[1024];
    if (!f) { perror(cf); exit(2); }
    while (fgets(line, sizeof line, f)) {
        size_t L = strcspn(line, "\r\n");
        if (!L) continue;
        clen[nc] = L / 2;
        for (size_t i = 0; i < L / 2; i++) cand[nc][i] = hexval(line[2 * i]) * 16 + hexval(line[2 * i + 1]);
        nc++;
    }
    fclose(f);
    if (!kf) return;
    f = fopen(kf, "r");
    if (!f) { perror(kf); exit(2); }
    int step;
    while (fscanf(f, "%d %d %d", &step, &cchosen[ncons], &cn[ncons]) == 3) {
        for (int j = 0; j < cn[ncons]; j++) fscanf(f, "%d", &coth[ncons][j]);
        ncons++;
    }
    fclose(f);
}

int main(int argc, char **argv) {
    if (argc >= 2 && !strcmp(argv[1], "test")) {
        uint8_t key[16], msg[64];
        for (int i = 0; i < 16; i++) key[i] = i;
        for (int i = 0; i < 64; i++) msg[i] = i;
        uint64_t k0, k1;
        memcpy(&k0, key, 8); memcpy(&k1, key + 8, 8);
        printf("siphash24 len0 %016llx (ref 726fdb47dd0e0e31)\n", (unsigned long long)siphash(k0, k1, msg, 0, 2, 4));
        printf("siphash24 len1 %016llx (ref 74f839c593dc67fd)\n", (unsigned long long)siphash(k0, k1, msg, 1, 2, 4));
        printf("siphash24 len15 %016llx (ref a129ca6149be45e5)\n", (unsigned long long)siphash(k0, k1, msg, 15, 2, 4));
        return 0;
    }
    if (argc >= 2 && !strcmp(argv[1], "hash")) {
        int cr = atoi(argv[2]) == 13 ? 1 : 2, dr = cr == 1 ? 3 : 4;
        uint32_t seed = (uint32_t)strtoull(argv[3], 0, 10);
        load(argv[4], NULL);
        uint64_t k0, k1;
        secret(seed, &k0, &k1);
        for (int i = 0; i < nc; i++) {
            uint64_t h = siphash(k0, k1, cand[i], clen[i], cr, dr);
            if (h == UINT64_MAX) h--;
            printf("%llu\n", (unsigned long long)h);
        }
        return 0;
    }
    if (argc < 6) { fprintf(stderr, "usage\n"); return 2; }
    int cr = atoi(argv[1]) == 13 ? 1 : 2, dr = cr == 1 ? 3 : 4;
    uint64_t lo = strtoull(argv[2], 0, 10), hi = strtoull(argv[3], 0, 10);
    load(argv[4], argv[5]);
    static uint32_t gen[MAXC];
    static uint32_t home[MAXC];
    uint32_t g = 0;
    uint64_t survivors = 0, scanned = 0;
    for (uint64_t s = lo; s < hi; s++) {
        uint64_t k0, k1;
        secret((uint32_t)s, &k0, &k1);
        g++;
        if (g == 0) { memset(gen, 0, sizeof gen); g = 1; }
        int ok = 1;
        for (int c = 0; c < ncons && ok; c++) {
            int a = cchosen[c];
            if (gen[a] != g) {
                uint64_t h = siphash(k0, k1, cand[a], clen[a], cr, dr);
                if (h == UINT64_MAX) h--;
                home[a] = (uint32_t)(h & 511); gen[a] = g;
            }
            if (home[a] > 502) continue;
            for (int j = 0; j < cn[c]; j++) {
                int b = coth[c][j];
                if (gen[b] != g) {
                    uint64_t h = siphash(k0, k1, cand[b], clen[b], cr, dr);
                    if (h == UINT64_MAX) h--;
                    home[b] = (uint32_t)(h & 511); gen[b] = g;
                }
                if (home[b] <= 502 && home[a] > home[b] + 9) { ok = 0; break; }
            }
        }
        scanned++;
        if (ok) { survivors++; printf("SURVIVOR %llu\n", (unsigned long long)s); fflush(stdout); }
    }
    fprintf(stderr, "alg=%s lo=%llu hi=%llu scanned=%llu survivors=%llu\n", cr == 1 ? "siphash13" : "siphash24",
            (unsigned long long)lo, (unsigned long long)hi, (unsigned long long)scanned,
            (unsigned long long)survivors);
    return 0;
}
