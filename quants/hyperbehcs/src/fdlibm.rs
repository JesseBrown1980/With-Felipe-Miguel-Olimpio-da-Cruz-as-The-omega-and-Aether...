//! `Math.atan2`, `Math.acos`, `Math.sin` and `Math.cos` exactly as V8 computes them.
//!
//! V8 implements these in `src/base/ieee754.cc`, its port of fdlibm (v8 12.4.254.21, the V8 in
//! Node 22; Node 22 and Node 24 build without `V8_USE_LIBM_TRIG_FUNCTIONS`, so `sin`/`cos` are
//! the fdlibm versions). Each function below follows that file statement by statement on
//! [`Number`] arithmetic; line numbers cite it as `ieee754:<line>`.

use crate::number::Number;

const fn c(bits: u64) -> Number {
    Number::from_bits(bits)
}

const ONE: Number = c(0x3FF0_0000_0000_0000);
const TWO: Number = c(0x4000_0000_0000_0000);
const HALF: Number = c(0x3FE0_0000_0000_0000);
const TWO24: Number = c(0x4170_0000_0000_0000);
const TWON24: Number = c(0x3E70_0000_0000_0000);

/// ieee754:1116-1200.
pub fn atan(x: Number) -> Number {
    const ATANHI: [Number; 4] = [
        c(0x3FDD_AC67_0561_BB4F),
        c(0x3FE9_21FB_5444_2D18),
        c(0x3FEF_730B_D281_F69B),
        c(0x3FF9_21FB_5444_2D18),
    ];
    const ATANLO: [Number; 4] = [
        c(0x3C7A_2B7F_222F_65E2),
        c(0x3C81_A626_3314_5C07),
        c(0x3C70_0788_7AF0_CBBD),
        c(0x3C91_A626_3314_5C07),
    ];
    const AT: [Number; 11] = [
        c(0x3FD5_5555_5555_550D),
        c(0xBFC9_9999_9998_EBC4),
        c(0x3FC2_4924_9200_83FF),
        c(0xBFBC_71C6_FE23_1671),
        c(0x3FB7_45CD_C54C_206E),
        c(0xBFB3_B0F2_AF74_9A6D),
        c(0x3FB1_0D66_A0D0_3D51),
        c(0xBFAD_DE2D_52DE_FD9A),
        c(0x3FA9_7B4B_2476_0DEB),
        c(0xBFA2_B444_2C6A_6C2F),
        c(0x3F90_AD3A_E322_DA11),
    ];
    const HUGE: Number = c(0x7E37_E43C_8800_759C); // 1.0e300
    const ONE_HALF: Number = c(0x3FF8_0000_0000_0000); // 1.5

    let hx = x.high_word();
    let ix = hx & 0x7FFF_FFFF;
    let mut x = x;
    let id: i32;
    if ix >= 0x4410_0000 {
        // |x| >= 2^66
        let low = x.low_word();
        if ix > 0x7FF0_0000 || (ix == 0x7FF0_0000 && low != 0) {
            return x + x; // NaN
        }
        return if hx > 0 {
            ATANHI[3] + ATANLO[3]
        } else {
            -ATANHI[3] - ATANLO[3]
        };
    }
    if ix < 0x3FDC_0000 {
        // |x| < 0.4375
        if ix < 0x3E40_0000 && (HUGE + x).gt(ONE) {
            return x; // |x| < 2^-27
        }
        id = -1;
    } else {
        x = x.abs();
        if ix < 0x3FF3_0000 {
            if ix < 0x3FE6_0000 {
                id = 0;
                x = (TWO * x - ONE) / (TWO + x);
            } else {
                id = 1;
                x = (x - ONE) / (x + ONE);
            }
        } else if ix < 0x4003_8000 {
            id = 2;
            x = (x - ONE_HALF) / (ONE + ONE_HALF * x);
        } else {
            id = 3;
            x = -ONE / x;
        }
    }
    let z = x * x;
    let w = z * z;
    let s1 = z * (AT[0] + w * (AT[2] + w * (AT[4] + w * (AT[6] + w * (AT[8] + w * AT[10])))));
    let s2 = w * (AT[1] + w * (AT[3] + w * (AT[5] + w * (AT[7] + w * AT[9]))));
    if id < 0 {
        return x - x * (s1 + s2);
    }
    let id = id as usize;
    let z = ATANHI[id] - ((x * (s1 + s2) - ATANLO[id]) - x);
    if hx < 0 {
        -z
    } else {
        z
    }
}

/// ieee754:1228-1319.
pub fn atan2(y: Number, x: Number) -> Number {
    const TINY: Number = c(0x01A5_6E1F_C2F8_F359); // 1.0e-300
    const PI_O_4: Number = c(0x3FE9_21FB_5444_2D18);
    const PI_O_2: Number = c(0x3FF9_21FB_5444_2D18);
    const PI: Number = c(0x4009_21FB_5444_2D18);
    const PI_LO: Number = c(0x3CA1_A626_3314_5C07);
    const THREE: Number = c(0x4008_0000_0000_0000);

    let hx = x.high_word();
    let lx = x.low_word();
    let ix = hx & 0x7FFF_FFFF;
    let hy = y.high_word();
    let ly = y.low_word();
    let iy = hy & 0x7FFF_FFFF;
    if (ix | i32::from(lx != 0)) > 0x7FF0_0000 || (iy | i32::from(ly != 0)) > 0x7FF0_0000 {
        return x + y; // x or y is NaN
    }
    if (hx.wrapping_sub(0x3FF0_0000) as u32 | lx) == 0 {
        return atan(y); // x = 1.0
    }
    let mut m = ((hy >> 31) & 1) | ((hx >> 30) & 2); // 2*sign(x)+sign(y)
    if (iy as u32 | ly) == 0 {
        return match m {
            0 | 1 => y,
            2 => PI + TINY,
            _ => -PI - TINY,
        };
    }
    if (ix as u32 | lx) == 0 {
        return if hy < 0 {
            -PI_O_2 - TINY
        } else {
            PI_O_2 + TINY
        };
    }
    if ix == 0x7FF0_0000 {
        if iy == 0x7FF0_0000 {
            return match m {
                0 => PI_O_4 + TINY,
                1 => -PI_O_4 - TINY,
                2 => THREE * PI_O_4 + TINY,
                _ => -THREE * PI_O_4 - TINY,
            };
        }
        return match m {
            0 => Number::ZERO,
            1 => Number::NEG_ZERO,
            2 => PI + TINY,
            _ => -PI - TINY,
        };
    }
    if iy == 0x7FF0_0000 {
        return if hy < 0 {
            -PI_O_2 - TINY
        } else {
            PI_O_2 + TINY
        };
    }
    let k = (iy - ix) >> 20;
    let z = if k > 60 {
        m &= 1;
        PI_O_2 + HALF * PI_LO
    } else if hx < 0 && k < -60 {
        Number::ZERO
    } else {
        atan((y / x).abs())
    };
    match m {
        0 => z,
        1 => -z,
        2 => PI - (z - PI_LO),
        _ => (z - PI_LO) - PI,
    }
}

/// ieee754:862-921.
pub fn acos(x: Number) -> Number {
    const PI: Number = c(0x4009_21FB_5444_2D18);
    const PIO2_HI: Number = c(0x3FF9_21FB_5444_2D18);
    const PIO2_LO: Number = c(0x3C91_A626_3314_5C07);
    const PS0: Number = c(0x3FC5_5555_5555_5555);
    const PS1: Number = c(0xBFD4_D612_03EB_6F7D);
    const PS2: Number = c(0x3FC9_C155_0E88_4455);
    const PS3: Number = c(0xBFA4_8228_B568_8F3B);
    const PS4: Number = c(0x3F49_EFE0_7501_B288);
    const PS5: Number = c(0x3F02_3DE1_0DFD_F709);
    const QS1: Number = c(0xC003_3A27_1C8A_2D4B);
    const QS2: Number = c(0x4000_2AE5_9C59_8AC8);
    const QS3: Number = c(0xBFE6_066C_1B8D_0159);
    const QS4: Number = c(0x3FB3_B8C5_B12E_9282);

    let hx = x.high_word();
    let ix = hx & 0x7FFF_FFFF;
    if ix >= 0x3FF0_0000 {
        // |x| >= 1
        let lx = x.low_word();
        if ((ix - 0x3FF0_0000) as u32 | lx) == 0 {
            return if hx > 0 {
                Number::ZERO
            } else {
                PI + TWO * PIO2_LO
            };
        }
        return Number::NAN;
    }
    let p_of = |z: Number| z * (PS0 + z * (PS1 + z * (PS2 + z * (PS3 + z * (PS4 + z * PS5)))));
    let q_of = |z: Number| ONE + z * (QS1 + z * (QS2 + z * (QS3 + z * QS4)));
    if ix < 0x3FE0_0000 {
        // |x| < 0.5
        if ix <= 0x3C60_0000 {
            return PIO2_HI + PIO2_LO;
        }
        let z = x * x;
        let r = p_of(z) / q_of(z);
        return PIO2_HI - (x - (PIO2_LO - x * r));
    }
    if hx < 0 {
        // x < -0.5
        let z = (ONE + x) * HALF;
        let p = p_of(z);
        let q = q_of(z);
        let s = z.sqrt();
        let r = p / q;
        let w = r * s - PIO2_LO;
        return PI - TWO * (s + w);
    }
    // x > 0.5
    let z = (ONE - x) * HALF;
    let s = z.sqrt();
    let df = s.with_low_word(0);
    let cc = (z - df * df) / (s + df);
    let r = p_of(z) / q_of(z);
    let w = r * s + cc;
    TWO * (df + w)
}

const TWO_OVER_PI: [i32; 66] = [
    0xA2F983, 0x6E4E44, 0x1529FC, 0x2757D1, 0xF534DD, 0xC0DB62, 0x95993C, 0x439041, 0xFE5163,
    0xABDEBB, 0xC561B7, 0x246E3A, 0x424DD2, 0xE00649, 0x2EEA09, 0xD1921C, 0xFE1DEB, 0x1CB129,
    0xA73EE8, 0x8235F5, 0x2EBB44, 0x84E99C, 0x7026B4, 0x5F7E41, 0x3991D6, 0x398353, 0x39F49C,
    0x845F8B, 0xBDF928, 0x3B1FF8, 0x97FFDE, 0x05980F, 0xEF2F11, 0x8B5A0A, 0x6D1F6D, 0x367ECF,
    0x27CB09, 0xB74F46, 0x3F669E, 0x5FEA2D, 0x7527BA, 0xC7EBE5, 0xF17B3D, 0x0739F7, 0x8A5292,
    0xEA6BFB, 0x5FB11F, 0x8D5D08, 0x560330, 0x46FC7B, 0x6BABF0, 0xCFBC20, 0x9AF436, 0x1DA9E3,
    0x91615E, 0xE61B08, 0x659985, 0x5F14A0, 0x68408D, 0xFFD880, 0x4D7327, 0x310606, 0x1556CA,
    0x73A8C9, 0x60E27B, 0xC08C6B,
];

const NPIO2_HW: [i32; 32] = [
    0x3FF921FB, 0x400921FB, 0x4012D97C, 0x401921FB, 0x401F6A7A, 0x4022D97C, 0x4025FDBB, 0x402921FB,
    0x402C463A, 0x402F6A7A, 0x4031475C, 0x4032D97C, 0x40346B9C, 0x4035FDBB, 0x40378FDB, 0x403921FB,
    0x403AB41B, 0x403C463A, 0x403DD85A, 0x403F6A7A, 0x40407E4C, 0x4041475C, 0x4042106C, 0x4042D97C,
    0x4043A28C, 0x40446B9C, 0x404534AC, 0x4045FDBB, 0x4046C6CB, 0x40478FDB, 0x404858EB, 0x404921FB,
];

fn to_i32(x: Number) -> i32 {
    x.trunc_i64() as i32
}

fn from_i32(n: i32) -> Number {
    Number::from_i64(i64::from(n))
}

/// ieee754:443-644 (`__kernel_rem_pio2`) with `prec = 2` and `ipio2 = two_over_pi`, the only
/// arguments `__ieee754_rem_pio2` passes (ieee754:263).
fn kernel_rem_pio2(x: &[Number; 3], e0: i32, nx: usize) -> (i32, [Number; 2]) {
    const PIO2: [Number; 8] = [
        c(0x3FF9_21FB_4000_0000),
        c(0x3E74_442D_0000_0000),
        c(0x3CF8_4698_8000_0000),
        c(0x3B78_CC51_6000_0000),
        c(0x39F0_1B83_8000_0000),
        c(0x387A_2520_4000_0000),
        c(0x36E3_8222_8000_0000),
        c(0x3569_F31D_0000_0000),
    ];
    const EIGHT: Number = c(0x4020_0000_0000_0000);
    const EIGHTH: Number = c(0x3FC0_0000_0000_0000);

    let mut iq = [0i32; 20];
    let mut f = [Number::ZERO; 20];
    let mut fq = [Number::ZERO; 20];
    let mut q = [Number::ZERO; 20];
    let jk: i32 = 4; // init_jk[2]
    let jp = jk;
    let jx = nx as i32 - 1;
    let jv = ((e0 - 3) / 24).max(0); // Rust `/` truncates toward zero, as C does
    let mut q0 = e0 - 24 * (jv + 1);
    let mut j = jv - jx;
    let m = jx + jk;
    for slot in f.iter_mut().take(m as usize + 1) {
        *slot = if j < 0 {
            Number::ZERO
        } else {
            from_i32(TWO_OVER_PI[j as usize])
        };
        j += 1;
    }
    for i in 0..=jk {
        let mut fw = Number::ZERO;
        for j in 0..=jx {
            fw = fw + x[j as usize] * f[(jx + i - j) as usize];
        }
        q[i as usize] = fw;
    }
    let mut jz = jk;
    let (mut z, mut n, ih) = loop {
        // recompute:
        let mut i = 0usize;
        let mut j = jz;
        let mut z = q[jz as usize];
        while j > 0 {
            let fw = from_i32(to_i32(TWON24 * z));
            iq[i] = to_i32(z - TWO24 * fw);
            z = q[(j - 1) as usize] + fw;
            i += 1;
            j -= 1;
        }
        z = z.scalbn(q0);
        z = z - EIGHT * (z * EIGHTH).floor();
        let mut n = to_i32(z);
        z = z - from_i32(n);
        let mut ih = 0;
        let top = (jz - 1) as usize;
        if q0 > 0 {
            let i = iq[top] >> (24 - q0);
            n += i;
            iq[top] -= i << (24 - q0);
            ih = iq[top] >> (23 - q0);
        } else if q0 == 0 {
            ih = iq[top] >> 23;
        } else if z.ge(HALF) {
            ih = 2;
        }
        if ih > 0 {
            n += 1;
            let mut carry = 0;
            for slot in iq.iter_mut().take(jz as usize) {
                let j = *slot;
                if carry == 0 {
                    if j != 0 {
                        carry = 1;
                        *slot = 0x100_0000 - j;
                    }
                } else {
                    *slot = 0xFF_FFFF - j;
                }
            }
            if q0 == 1 {
                iq[top] &= 0x7F_FFFF;
            } else if q0 == 2 {
                iq[top] &= 0x3F_FFFF;
            }
            if ih == 2 {
                z = ONE - z;
                if carry != 0 {
                    z = z - ONE.scalbn(q0);
                }
            }
        }
        if z.is_zero() {
            let mut j = 0;
            let mut i = jz - 1;
            while i >= jk {
                j |= iq[i as usize];
                i -= 1;
            }
            if j == 0 {
                // need recomputation
                let mut k = 1;
                while jk >= k && iq[(jk - k) as usize] == 0 {
                    k += 1;
                }
                for i in (jz + 1)..=(jz + k) {
                    f[(jx + i) as usize] = from_i32(TWO_OVER_PI[(jv + i) as usize]);
                    let mut fw = Number::ZERO;
                    for j in 0..=jx {
                        fw = fw + x[j as usize] * f[(jx + i - j) as usize];
                    }
                    q[i as usize] = fw;
                }
                jz += k;
                continue;
            }
        }
        break (z, n, ih);
    };
    if z.is_zero() {
        jz -= 1;
        q0 -= 24;
        while iq[jz as usize] == 0 {
            jz -= 1;
            q0 -= 24;
        }
    } else {
        z = z.scalbn(-q0);
        if z.ge(TWO24) {
            let fw = from_i32(to_i32(TWON24 * z));
            iq[jz as usize] = to_i32(z - TWO24 * fw);
            jz += 1;
            q0 += 24;
            iq[jz as usize] = to_i32(fw);
        } else {
            iq[jz as usize] = to_i32(z);
        }
    }
    let mut fw = ONE.scalbn(q0);
    let mut i = jz;
    while i >= 0 {
        q[i as usize] = fw * from_i32(iq[i as usize]);
        fw = fw * TWON24;
        i -= 1;
    }
    let mut i = jz;
    while i >= 0 {
        let mut fw = Number::ZERO;
        let mut k = 0;
        while k <= jp && k <= jz - i {
            fw = fw + PIO2[k as usize] * q[(i + k) as usize];
            k += 1;
        }
        fq[(jz - i) as usize] = fw;
        i -= 1;
    }
    let mut fw = Number::ZERO;
    let mut i = jz;
    while i >= 0 {
        fw = fw + fq[i as usize];
        i -= 1;
    }
    let y0 = if ih == 0 { fw } else { -fw };
    let mut fw = fq[0] - fw;
    for value in fq.iter().take(jz as usize + 1).skip(1) {
        fw = fw + *value;
    }
    let y1 = if ih == 0 { fw } else { -fw };
    n &= 7;
    (n, [y0, y1])
}

/// ieee754:118-270 (`__ieee754_rem_pio2`): `x` reduced by the nearest multiple `n` of pi/2,
/// returned as `(n, [y0, y1])` with the remainder `y0 + y1`.
fn rem_pio2(x: Number) -> (i32, [Number; 2]) {
    const INVPIO2: Number = c(0x3FE4_5F30_6DC9_C883);
    const PIO2_1: Number = c(0x3FF9_21FB_5440_0000);
    const PIO2_1T: Number = c(0x3DD0_B461_1A62_6331);
    const PIO2_2: Number = c(0x3DD0_B461_1A60_0000);
    const PIO2_2T: Number = c(0x3BA3_198A_2E03_7073);
    const PIO2_3: Number = c(0x3BA3_198A_2E00_0000);
    const PIO2_3T: Number = c(0x397B_839A_2520_49C1);

    let hx = x.high_word();
    let ix = hx & 0x7FFF_FFFF;
    if ix <= 0x3FE9_21FB {
        return (0, [x, Number::ZERO]);
    }
    if ix < 0x4002_D97C {
        // |x| < 3pi/4, special case with n = +-1
        if hx > 0 {
            let mut z = x - PIO2_1;
            let (y0, y1);
            if ix != 0x3FF9_21FB {
                y0 = z - PIO2_1T;
                y1 = (z - y0) - PIO2_1T;
            } else {
                z = z - PIO2_2;
                y0 = z - PIO2_2T;
                y1 = (z - y0) - PIO2_2T;
            }
            return (1, [y0, y1]);
        }
        let mut z = x + PIO2_1;
        let (y0, y1);
        if ix != 0x3FF9_21FB {
            y0 = z + PIO2_1T;
            y1 = (z - y0) + PIO2_1T;
        } else {
            z = z + PIO2_2;
            y0 = z + PIO2_2T;
            y1 = (z - y0) + PIO2_2T;
        }
        return (-1, [y0, y1]);
    }
    if ix <= 0x4139_21FB {
        // |x| ~<= 2^19*(pi/2), medium size
        let mut t = x.abs();
        let n = to_i32(t * INVPIO2 + HALF);
        let fnum = from_i32(n);
        let mut r = t - fnum * PIO2_1;
        let mut w = fnum * PIO2_1T;
        let mut y0;
        if n < 32 && ix != NPIO2_HW[(n - 1) as usize] {
            y0 = r - w;
        } else {
            let j = ix >> 20;
            y0 = r - w;
            let high = y0.high_word() as u32;
            let mut i = j - ((high >> 20) & 0x7FF) as i32;
            if i > 16 {
                // 2nd iteration needed, good to 118
                t = r;
                w = fnum * PIO2_2;
                r = t - w;
                w = fnum * PIO2_2T - ((t - r) - w);
                y0 = r - w;
                let high = y0.high_word() as u32;
                i = j - ((high >> 20) & 0x7FF) as i32;
                if i > 49 {
                    // 3rd iteration need, 151 bits acc
                    t = r;
                    w = fnum * PIO2_3;
                    r = t - w;
                    w = fnum * PIO2_3T - ((t - r) - w);
                    y0 = r - w;
                }
            }
        }
        let y1 = (r - y0) - w;
        if hx < 0 {
            return (-n, [-y0, -y1]);
        }
        return (n, [y0, y1]);
    }
    if ix >= 0x7FF0_0000 {
        // x is inf or NaN: `x - x` is NaN
        return (0, [Number::NAN, Number::NAN]);
    }
    // set z = scalbn(|x|, ilogb(x) - 23)
    let low = x.low_word();
    let e0 = (ix >> 20) - 1046;
    let mut z = Number::from_words(ix - ((e0 as u32) << 20) as i32, low);
    let mut tx = [Number::ZERO; 3];
    for slot in tx.iter_mut().take(2) {
        *slot = from_i32(to_i32(z));
        z = (z - *slot) * TWO24;
    }
    tx[2] = z;
    let mut nx = 3;
    while tx[nx - 1].is_zero() {
        nx -= 1;
    }
    let (n, y) = kernel_rem_pio2(&tx, e0, nx);
    if hx < 0 {
        return (-n, [-y[0], -y[1]]);
    }
    (n, y)
}

/// ieee754:305-336.
fn kernel_cos(x: Number, y: Number) -> Number {
    const C1: Number = c(0x3FA5_5555_5555_554C);
    const C2: Number = c(0xBF56_C16C_16C1_5177);
    const C3: Number = c(0x3EFA_01A0_19CB_1590);
    const C4: Number = c(0xBE92_7E4F_809C_52AD);
    const C5: Number = c(0x3E21_EE9E_BDB4_B1C4);
    const C6: Number = c(0xBDA8_FAE9_BE88_38D4);
    const QX_MAX: Number = c(0x3FD2_0000_0000_0000); // 0.28125

    let ix = x.high_word() & 0x7FFF_FFFF;
    if ix < 0x3E40_0000 && x.trunc_i64() == 0 {
        return ONE; // |x| < 2^-27
    }
    let z = x * x;
    let r = z * (C1 + z * (C2 + z * (C3 + z * (C4 + z * (C5 + z * C6)))));
    if ix < 0x3FD3_3333 {
        // |x| < 0.3
        return ONE - (HALF * z - (z * r - x * y));
    }
    let qx = if ix > 0x3FE9_0000 {
        QX_MAX
    } else {
        Number::from_words(ix - 0x0020_0000, 0)
    };
    let iz = HALF * z - qx;
    let a = ONE - qx;
    a - (iz - (z * r - x * y))
}

/// ieee754:673-698.
fn kernel_sin(x: Number, y: Number, iy: i32) -> Number {
    const S1: Number = c(0xBFC5_5555_5555_5549);
    const S2: Number = c(0x3F81_1111_1110_F8A6);
    const S3: Number = c(0xBF2A_01A0_19C1_61D5);
    const S4: Number = c(0x3EC7_1DE3_57B1_FE7D);
    const S5: Number = c(0xBE5A_E5E6_8A2B_9CEB);
    const S6: Number = c(0x3DE5_D93A_5ACF_D57C);

    let ix = x.high_word() & 0x7FFF_FFFF;
    if ix < 0x3E40_0000 && x.trunc_i64() == 0 {
        return x; // |x| < 2^-27
    }
    let z = x * x;
    let v = z * x;
    let r = S2 + z * (S3 + z * (S4 + z * (S5 + z * S6)));
    if iy == 0 {
        x + v * (S1 + z * r)
    } else {
        x - ((z * (HALF * y - v * r) - y) - v * S1)
    }
}

/// ieee754:1352-1383.
pub fn cos(x: Number) -> Number {
    let ix = x.high_word() & 0x7FFF_FFFF;
    if ix <= 0x3FE9_21FB {
        return kernel_cos(x, Number::ZERO);
    }
    if ix >= 0x7FF0_0000 {
        return Number::NAN; // `x - x` of Infinity or NaN
    }
    let (n, [y0, y1]) = rem_pio2(x);
    match n & 3 {
        0 => kernel_cos(y0, y1),
        1 => -kernel_sin(y0, y1, 1),
        2 => -kernel_cos(y0, y1),
        _ => kernel_sin(y0, y1, 1),
    }
}

/// ieee754:2448-2479.
pub fn sin(x: Number) -> Number {
    let ix = x.high_word() & 0x7FFF_FFFF;
    if ix <= 0x3FE9_21FB {
        return kernel_sin(x, Number::ZERO, 0);
    }
    if ix >= 0x7FF0_0000 {
        return Number::NAN; // `x - x` of Infinity or NaN
    }
    let (n, [y0, y1]) = rem_pio2(x);
    match n & 3 {
        0 => kernel_sin(y0, y1, 1),
        1 => kernel_cos(y0, y1),
        2 => -kernel_sin(y0, y1, 1),
        _ => -kernel_cos(y0, y1),
    }
}
