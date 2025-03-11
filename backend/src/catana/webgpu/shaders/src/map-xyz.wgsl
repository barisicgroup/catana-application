// Map XYZ
// Maps the XYZ coordinates by the given indices

@group(0) @binding(0) var<storage, read> indices: array<u32>;

@group(0) @binding(1) var<storage, read> in_xyzcr: array< vec4<f32> >;
@group(0) @binding(2) var<storage, read_write> out_xyzcr: array< vec4<f32> >;

@group(0) @binding(3) var<storage, read> in_bonds: array< array<u32, 4> >;
@group(0) @binding(4) var<storage, read_write> out_bonds: array< array<u32, 4> >;

const U32_MAX: u32 = 0xffffffffu;

fn branchlessCompareReturn(_cmp: bool, v_true: u32, v_false: u32) -> u32 {
    let cmp: u32 = u32(_cmp);
    let t: u32 = cmp;       // TRUE  multiplier -> gives 1u if cmp, 0u otherwise
    let f: u32 = 1u >> cmp; // FALSE multiplier -> gives 0u if cmp, 1u otherwise
    return (t * v_true) | (f * v_false);
}

// MAIN CODE -----------------------------------------------------------------------------------------------------------

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>, @builtin(local_invocation_id) local_id: vec3<u32>) {
    let numElems = u32(arrayLength(&indices));
    let tid = global_id.x; // Thread ID
    if (tid >= numElems) {
        return;
    }

    // Index of the IN-element to be put in this (tid) OUT-element
    let i = indices[tid];

    // Map XYZCR
    out_xyzcr[tid] = in_xyzcr[i];

    // Map bonds
    out_bonds[tid] = in_bonds[i];
    /*var bonds: array<u32, 4> = in_bonds[i];
    for (var bondi: i32 = 0; bondi < 4; bondi = bondi + 1) {
        let bond: u32 = bonds[bondi]; // Get a bond of this element ('i')

        // Follow 'bond', get the element on the other side, and get its bonds
        var bonds2: array<u32, 4> = in_bonds[bond]; // Bonds of the other element ('bond') bonded to this one ('i')
        for (var bondi2: i32 = 0; bondi2 < 4; bondi2 = bondi2 + 1) { // For each bond of the other element ('bond')...
            var bond2: u32 = bonds2[bondi2];                         // ...get the element 'bond2' bonded to it
            bond2 = branchlessCompareReturn(bond2 == i, tid, bond2);
            bonds2[bondi2] = bond2;
        }


    }
    out_bonds[tid] = bonds;*/
}