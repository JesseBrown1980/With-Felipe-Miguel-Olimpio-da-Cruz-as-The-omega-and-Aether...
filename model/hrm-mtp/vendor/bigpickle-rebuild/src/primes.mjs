// First N primes via sieve of Eratosthenes. Used by the PID minter and AoT
// runner for branch labeling. Pre-computed at module load for the first
// 1000 primes (cheap, ~30 KB heap).

const FIRST_N = 1000;

function sieveFirstNPrimes(n) {
  const out = [];
  // Upper bound for the n-th prime via Rosser's theorem: p_n < n*(ln n + ln ln n) for n >= 6.
  const limit = Math.max(20, Math.ceil(n * (Math.log(n) + Math.log(Math.log(n) || 1)) + n));
  const composite = new Uint8Array(limit + 1);
  for (let i = 2; i <= limit; i++) {
    if (!composite[i]) {
      out.push(i);
      if (out.length === n) break;
      for (let j = i * i; j <= limit; j += i) composite[j] = 1;
    }
  }
  return out;
}

export const PRIMES = sieveFirstNPrimes(FIRST_N);

export function primeAt(i) {
  if (!Number.isInteger(i) || i < 0 || i >= PRIMES.length) {
    throw new RangeError(`primeAt: index ${i} out of [0, ${PRIMES.length})`);
  }
  return PRIMES[i];
}
