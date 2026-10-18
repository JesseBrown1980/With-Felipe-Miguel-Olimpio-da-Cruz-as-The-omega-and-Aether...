//! Reed-Solomon decoding over GF(256) as jsQR does it: `GenericGF` (index.html:249-305),
//! `GenericGFPoly` (index.html:315-442) and `decode(bytes, twoS)` with the Euclidean algorithm,
//! Chien search and Forney's formula (index.html:8280-8398). Primitive 0x11D, generator base 0.
//! Where jsQR throws (`inverse(0)`, `log(0)`), this returns `Err(Thrown)`.

use crate::Thrown;

const PRIMITIVE: u32 = 0x011d;
const SIZE: usize = 256;

/// The field's exp and log tables (index.html:250-269).
struct Field {
    exp: [u8; SIZE],
    log: [u8; SIZE],
}

impl Field {
    fn new() -> Field {
        let mut exp = [0u8; SIZE];
        let mut log = [0u8; SIZE];
        let mut x: u32 = 1;
        for e in exp.iter_mut() {
            *e = u8::try_from(x).unwrap_or(0);
            x *= 2;
            if x >= 256 {
                x = (x ^ PRIMITIVE) & 0xff;
            }
        }
        for i in 0..SIZE - 1 {
            log[usize::from(exp[i])] = u8::try_from(i).unwrap_or(0);
        }
        Field { exp, log }
    }

    fn multiply(&self, a: u8, b: u8) -> u8 {
        if a == 0 || b == 0 {
            return 0;
        }
        let i = (usize::from(self.log[usize::from(a)]) + usize::from(self.log[usize::from(b)]))
            % (SIZE - 1);
        self.exp[i]
    }

    fn inverse(&self, a: u8) -> Result<u8, Thrown> {
        if a == 0 {
            return Err(Thrown);
        }
        Ok(self.exp[SIZE - usize::from(self.log[usize::from(a)]) - 1])
    }

    fn log(&self, a: u8) -> Result<usize, Thrown> {
        if a == 0 {
            return Err(Thrown);
        }
        Ok(usize::from(self.log[usize::from(a)]))
    }
}

/// `GenericGFPoly`: coefficients from the highest degree down, leading zeros stripped
/// (index.html:316-341).
#[derive(Clone, Debug, PartialEq, Eq)]
struct Poly(Vec<u8>);

impl Poly {
    fn new(coefficients: &[u8]) -> Poly {
        match coefficients.iter().position(|&c| c != 0) {
            _ if coefficients.len() <= 1 => Poly(coefficients.to_vec()),
            None => Poly(vec![0]),
            Some(first) => Poly(coefficients[first..].to_vec()),
        }
    }

    fn zero() -> Poly {
        Poly(vec![0])
    }

    fn one() -> Poly {
        Poly(vec![1])
    }

    fn monomial(degree: usize, coefficient: u8) -> Poly {
        if coefficient == 0 {
            return Poly::zero();
        }
        let mut c = vec![0u8; degree + 1];
        c[0] = coefficient;
        Poly(c)
    }

    fn degree(&self) -> usize {
        self.0.len() - 1
    }

    fn is_zero(&self) -> bool {
        self.0[0] == 0
    }

    fn coefficient(&self, degree: usize) -> u8 {
        self.0[self.0.len() - 1 - degree]
    }

    fn add_or_subtract(&self, other: &Poly) -> Poly {
        if self.is_zero() {
            return other.clone();
        }
        if other.is_zero() {
            return self.clone();
        }
        let (small, large) = if self.0.len() > other.0.len() {
            (&other.0, &self.0)
        } else {
            (&self.0, &other.0)
        };
        let diff = large.len() - small.len();
        let mut sum = large.clone();
        for i in diff..large.len() {
            sum[i] ^= small[i - diff];
        }
        Poly::new(&sum)
    }

    fn multiply_scalar(&self, f: &Field, scalar: u8) -> Poly {
        match scalar {
            0 => Poly::zero(),
            1 => self.clone(),
            _ => Poly::new(
                &self
                    .0
                    .iter()
                    .map(|&c| f.multiply(c, scalar))
                    .collect::<Vec<_>>(),
            ),
        }
    }

    fn multiply_poly(&self, f: &Field, other: &Poly) -> Poly {
        if self.is_zero() || other.is_zero() {
            return Poly::zero();
        }
        let mut product = vec![0u8; self.0.len() + other.0.len() - 1];
        for (i, &a) in self.0.iter().enumerate() {
            for (j, &b) in other.0.iter().enumerate() {
                product[i + j] ^= f.multiply(a, b);
            }
        }
        Poly::new(&product)
    }

    fn multiply_by_monomial(&self, f: &Field, degree: usize, coefficient: u8) -> Poly {
        if coefficient == 0 {
            return Poly::zero();
        }
        let mut product = vec![0u8; self.0.len() + degree];
        for (i, &c) in self.0.iter().enumerate() {
            product[i] = f.multiply(c, coefficient);
        }
        Poly::new(&product)
    }

    fn evaluate_at(&self, f: &Field, a: u8) -> u8 {
        if a == 0 {
            return self.coefficient(0);
        }
        if a == 1 {
            return self.0.iter().fold(0, |r, &c| r ^ c);
        }
        let mut result = self.0[0];
        for &c in &self.0[1..] {
            result = f.multiply(a, result) ^ c;
        }
        result
    }
}

/// `runEuclideanAlgorithm(field, a, b, R)` (index.html:8280-8322): `(sigma, omega)`.
fn run_euclidean_algorithm(
    f: &Field,
    a: Poly,
    b: Poly,
    r_big: usize,
) -> Result<Option<(Poly, Poly)>, Thrown> {
    let (a, b) = if a.degree() < b.degree() {
        (b, a)
    } else {
        (a, b)
    };
    let mut r_last = a;
    let mut r = b;
    let mut t_last = Poly::zero();
    let mut t = Poly::one();
    while 2 * r.degree() >= r_big {
        let r_last_last = r_last;
        let t_last_last = t_last;
        r_last = r;
        t_last = t;
        if r_last.is_zero() {
            return Ok(None);
        }
        r = r_last_last;
        let mut q = Poly::zero();
        let dlt_inverse = f.inverse(r_last.coefficient(r_last.degree()))?;
        while r.degree() >= r_last.degree() && !r.is_zero() {
            let degree_diff = r.degree() - r_last.degree();
            let scale = f.multiply(r.coefficient(r.degree()), dlt_inverse);
            q = q.add_or_subtract(&Poly::monomial(degree_diff, scale));
            r = r.add_or_subtract(&r_last.multiply_by_monomial(f, degree_diff, scale));
        }
        t = q.multiply_poly(f, &t_last).add_or_subtract(&t_last_last);
        if r.degree() >= r_last.degree() {
            return Ok(None);
        }
    }
    let sigma_tilde_at_zero = t.coefficient(0);
    if sigma_tilde_at_zero == 0 {
        return Ok(None);
    }
    let inverse = f.inverse(sigma_tilde_at_zero)?;
    Ok(Some((
        t.multiply_scalar(f, inverse),
        r.multiply_scalar(f, inverse),
    )))
}

/// `findErrorLocations(field, errorLocator)` (index.html:8323-8341): Chien search.
fn find_error_locations(f: &Field, locator: &Poly) -> Result<Option<Vec<u8>>, Thrown> {
    let num_errors = locator.degree();
    if num_errors == 1 {
        return Ok(Some(vec![locator.coefficient(1)]));
    }
    let mut result = Vec::with_capacity(num_errors);
    let mut i = 1usize;
    while i < SIZE && result.len() < num_errors {
        let x = u8::try_from(i).unwrap_or(0);
        if locator.evaluate_at(f, x) == 0 {
            result.push(f.inverse(x)?);
        }
        i += 1;
    }
    Ok((result.len() == num_errors).then_some(result))
}

/// `findErrorMagnitudes(field, errorEvaluator, errorLocations)` (index.html:8342-8360):
/// Forney's formula; generator base 0 adds no extra factor.
fn find_error_magnitudes(f: &Field, evaluator: &Poly, locations: &[u8]) -> Result<Vec<u8>, Thrown> {
    let mut out = Vec::with_capacity(locations.len());
    for (i, &loc) in locations.iter().enumerate() {
        let xi_inverse = f.inverse(loc)?;
        let mut denominator = 1u8;
        for (j, &other) in locations.iter().enumerate() {
            if i != j {
                denominator = f.multiply(denominator, 1 ^ f.multiply(other, xi_inverse));
            }
        }
        out.push(f.multiply(
            evaluator.evaluate_at(f, xi_inverse),
            f.inverse(denominator)?,
        ));
    }
    Ok(out)
}

/// `decode(bytes, twoS)` (index.html:8361-8398): the corrected codewords, `None` where jsQR
/// returns `null`.
pub fn decode(bytes: &[u8], two_s: usize) -> Result<Option<Vec<u8>>, Thrown> {
    let f = Field::new();
    let mut output = bytes.to_vec();
    let poly = Poly::new(&output);
    let mut syndrome = vec![0u8; two_s];
    let mut error = false;
    for s in 0..two_s {
        let evaluation = poly.evaluate_at(&f, f.exp[s]);
        syndrome[two_s - 1 - s] = evaluation;
        if evaluation != 0 {
            error = true;
        }
    }
    if !error {
        return Ok(Some(output));
    }
    let Some((sigma, omega)) =
        run_euclidean_algorithm(&f, Poly::monomial(two_s, 1), Poly::new(&syndrome), two_s)?
    else {
        return Ok(None);
    };
    let Some(locations) = find_error_locations(&f, &sigma)? else {
        return Ok(None);
    };
    let magnitudes = find_error_magnitudes(&f, &omega, &locations)?;
    for (&loc, &mag) in locations.iter().zip(&magnitudes) {
        let log = f.log(loc)?;
        if log + 1 > output.len() {
            return Ok(None);
        }
        let position = output.len() - 1 - log;
        output[position] ^= mag;
    }
    Ok(Some(output))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn field_tables_close_the_cycle() {
        let f = Field::new();
        assert_eq!(f.exp[0], 1);
        assert_eq!(f.exp[255], 1);
        for a in 1..=255u8 {
            assert_eq!(f.multiply(a, f.inverse(a).unwrap()), 1);
        }
        assert!(f.inverse(0).is_err());
    }
}
