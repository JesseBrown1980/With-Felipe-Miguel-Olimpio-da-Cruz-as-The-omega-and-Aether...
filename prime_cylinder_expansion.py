"""
prime_cylinder_expansion.py -- Brown-Hilbert prime-cylinder branch expansion, and the
density <-> fluidity relation across levels.

Prime cylinders: the address branches by primes (a spinner per prime factor, prime^n
nesting). At level n over the first k primes, the number of addressable branches is
    density(n) = prod(p_i ^ n)                    # the pixel density at that level
and the language fluidity needed to address them is
    fluidity(n) = density(n).bit_length()         # glyph-alphabet bits at that level

Density explodes as prod(p^n); fluidity (bits) grows ~linearly -- so denser levels
REQUIRE more fluid language. That is the prism effect at different levels (doc section 3):
density and fluidity are two readings of the same level.

Which primes relate (co-address) sets which pixels can relate -- inter-pixel relationships
that unlock at higher levels. Pure stdlib. E=0.
"""
from math import gcd


def branches(primes, n):
    """Prime-cylinder branch count at level n: prod(p^n) = addressable pixel density."""
    prod = 1
    for p in primes:
        prod *= p ** n
    return prod


def inter_prime_relationships(primes):
    """Coprime prime pairs -- illustrative of which pixels can relate (unlock links)."""
    return sum(1 for i, a in enumerate(primes) for b in primes[i + 1:] if gcd(a, b) == 1)


if __name__ == "__main__":
    primes = [2, 3, 5, 7, 11]   # the first prime-cylinder spinners
    print("prime cylinders:", primes,
          "| inter-prime (coprime) relationships:", inter_prime_relationships(primes))
    print("\n level | density = prod(p^n)                      | fluidity (glyph bits) | x prev")
    print(" ------+------------------------------------------+-----------------------+-------")
    prev = 1
    for n in range(1, 7):
        d = branches(primes, n)
        f = d.bit_length()
        print(" %5d | %-40d | %-21d | x%d" % (n, d, f, d // prev))
        prev = d
    print("\nDensity explodes as prod(p^n); fluidity (bits) grows ~linearly.")
    print("=> denser levels REQUIRE more fluid language -- the prism effect at each level.")
