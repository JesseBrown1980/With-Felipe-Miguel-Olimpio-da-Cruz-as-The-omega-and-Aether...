#!/usr/bin/env python3
"""Seat 4: exact recovery test for reversible and noninjective 81-bit GF(2) maps.

This is a CPU/software algebra audit. "Recovery" means reconstructing a digital
81-bit input with a minimal additional side channel (0/1/2 source bits).
It is NOT compression, encryption, authentication, a physical signal, or
an independent physical-machine attestation.
"""
import hashlib
import json
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/"experiments"/"retention"))
from retention_poly import N,MASK,LEGACY,STRESS,TIMES,power,cyclic_product,matrix_rank  # noqa: E402

SOURCE=ROOT/"experiments"/"seat1"/"TRIAD-27-CHALLENGE-20261014.json"
STONE=ROOT/"stones"/"2026-10-14-rainbow81"/"retention-81-rank40.json"
SOURCE_SHA="e02346f41a43ecf6f772a16cb585b4c214a01b9513f1f34f2c9ba1ad52f5773b"
DOMAIN="ASOLARIA-SEAT4-MINIMAL-RECOVERY-V1"
SAMPLE_COUNT=128


def sha(data):
    return hashlib.sha256(data).hexdigest()


def hex81(value):
    return f"{value:021x}"


def apply(columns,value):
    result=0
    while value:
        bit=value & -value
        result ^= columns[bit.bit_length()-1]
        value ^= bit
    return result


def basis_with_free_columns(columns):
    """Incremental output-space elimination; return pivot basis and free inputs."""
    pivots={}
    free=[]
    for input_column,original in enumerate(columns):
        vector=original
        source=1 << input_column
        while vector:
            leading=vector.bit_length()-1
            if leading not in pivots:
                pivots[leading]=(vector,source)
                break
            vec,src=pivots[leading]
            vector ^= vec
            source ^= src
        else:
            free.append(input_column)
    return pivots,free


def solve_in_pivot_span(pivots,output):
    """Reconstruct pivot-source coordinates of a reachable output."""
    state=0
    while output:
        leading=output.bit_length()-1
        if leading not in pivots:
            raise ValueError("Output does not belong to span of pivot columns")
        vector,source=pivots[leading]
        output ^= vector
        state ^= source
    return state


def tag_of(source,free):
    return sum(((source >> position)&1) << j for j,position in enumerate(free))


def free_source(tag,free):
    if tag < 0 or tag >= 1 << len(free):
        raise ValueError("Invalid side-information tag")
    return sum(((tag >> j)&1) << position for j,position in enumerate(free))


def decode(columns,pivots,free,output,tag):
    restored_free=free_source(tag,free)
    remainder=output ^ apply(columns,restored_free)
    source=solve_in_pivot_span(pivots,remainder) ^ restored_free
    if apply(columns,source) != output or tag_of(source,free) != tag:
        raise AssertionError("Decoder failed to restore a valid tagged preimage")
    return source


def samples(family,law,horizon):
    yield 0
    yield MASK
    for i in range(N):
        yield 1 << i
    for index in range(SAMPLE_COUNT):
        label=f"{DOMAIN}|{family}|{law}|{horizon}|{index}".encode("ascii")
        yield int.from_bytes(hashlib.sha256(label).digest()[:11],"little")&MASK


def main():
    raw=SOURCE.read_bytes()
    assert sha(raw)==SOURCE_SHA,"Pinned source challenge changed"
    challenge=json.loads(raw)
    assert challenge["bodies"]==81
    assert challenge["laws"]==[list(taps) for _,taps in STRESS]
    assert challenge["horizons"]==list(TIMES[1:])
    record=json.loads(STONE.read_bytes())
    assert record["system_size_bits"]==N
    ranks={(entry["family"],entry["law"]):entry["rank"]
           for entry in record["results"]}
    assert len(ranks)==10
    assert record["cross_language"]["exact_parity_rows"]==40
    outpath=Path(sys.argv[1])
    outpath.parent.mkdir(parents=True,exist_ok=True)
    digest=hashlib.sha256()
    rows=0
    collisions=0
    wrong_tag_misdecodes=0
    no_tag_roundtrips=0
    side_tag_roundtrips=0
    law_summaries=[]
    with outpath.open("wb") as out:
        for family,laws in (("legacy",LEGACY),("triad-stress",STRESS)):
            for law,taps in laws:
                expected_rank=ranks[(family,law)]
                law_summaries.append({
                    "family":family,"law":law,"rank":expected_rank,
                    "minimal_extra_bits":N-expected_rank,
                    "reversible_without_extra_bits":expected_rank==N
                })
                for horizon in TIMES:
                    polynomial=sum(1<<tap for tap in taps)
                    jump=power(polynomial,horizon)
                    columns=[cyclic_product(jump,1<<i) for i in range(N)]
                    pivots,free=basis_with_free_columns(columns)
                    rank=matrix_rank(columns)
                    assert rank==len(pivots)==expected_rank
                    assert len(free)==N-rank
                    # A kernel of dimension k has precisely 2^k possible
                    # inputs for every reachable output. Construct all.
                    kernel=[]
                    for index in free:
                        witness=(1<<index)^solve_in_pivot_span(pivots,columns[index])
                        assert witness!=0 and apply(columns,witness)==0
                        kernel.append(witness)
                    tags_seen=set()
                    for combination in range(1<<len(kernel)):
                        witness=0
                        for bit,kernel_vector in enumerate(kernel):
                            if (combination>>bit)&1:
                                witness ^= kernel_vector
                        assert apply(columns,witness)==0
                        tag=tag_of(witness,free)
                        assert tag not in tags_seen,"Side tag failed to separate kernel"
                        tags_seen.add(tag)
                        assert decode(columns,pivots,free,0,tag)==witness
                        if combination:
                            collisions+=1
                            assert sha(hex81(witness).encode())!=sha(hex81(0).encode())
                            assert sha(hex81(apply(columns,witness)).encode())==sha(hex81(0).encode())
                    assert len(tags_seen)==1<<len(free)
                    if free:
                        example=1<<17
                        correct=tag_of(example,free)
                        incorrect=correct ^ 1
                        changed=decode(columns,pivots,free,apply(columns,example),incorrect)
                        assert changed!=example
                        # A wrong tag yields a different valid source for the
                        # same output: tags are redundancy, NOT authentication.
                        assert apply(columns,changed)==apply(columns,example)
                        wrong_tag_misdecodes+=1
                    for trial,source in enumerate(samples(family,law,horizon)):
                        output=apply(columns,source)
                        tag=tag_of(source,free)
                        restored=decode(columns,pivots,free,output,tag)
                        assert restored==source
                        if free:
                            side_tag_roundtrips+=1
                        else:
                            no_tag_roundtrips+=1
                        line=(f"{family}|{law}|{horizon}|{trial}|"
                              f"{hex81(source)}|{hex81(output)}|{tag:02x}|"
                              f"{hex81(restored)}\n").encode("ascii")
                        out.write(line)
                        digest.update(line)
                        rows+=1
    assert rows==40*(2+N+SAMPLE_COUNT)==8440
    assert no_tag_roundtrips==3*4*(2+N+SAMPLE_COUNT)==2532
    assert side_tag_roundtrips==7*4*(2+N+SAMPLE_COUNT)==5908
    assert collisions==36 and wrong_tag_misdecodes==28
    print(json.dumps({
        "schema":"ASOLARIA-SEAT4-MINIMAL-RECOVERY-V1",
        "seat":"seat-4",
        "algorithm":"GF2-polynomial-exponentiation-and-pivot-source-reconstruction",
        "source_challenge_sha256":SOURCE_SHA,
        "rows":rows,
        "law_horizon_cases":40,
        "no_tag_roundtrips":no_tag_roundtrips,
        "side_tag_roundtrips":side_tag_roundtrips,
        "nonzero_kernel_collisions":collisions,
        "wrong_tag_misdecodes":wrong_tag_misdecodes,
        "canonical_trace_sha256":digest.hexdigest(),
        "law_summary":law_summaries,
        "physical_host_independently_attested":False,
        "claim":"software invertibility and minimal loss-recovery sidebits only"
    },sort_keys=True))


if __name__=="__main__":
    main()
