function seqScan(inputArray) {
    const outputArray = new Uint32Array(inputArray.length);
    outputArray[0] = 0;
    for (let i = 0; i < outputArray.length; ++i) {
        outputArray[i] = outputArray[i - 1] + inputArray[i - 1];
    }
    return outputArray;
}

function seqCountingSort(atoms, perAtom_binId, perBin_atomCount) {
    const perBin_atomCount_scanned = seqScan(perBin_atomCount);
    const result = new Array(atoms.length).fill(null);
    for (let atomId = 0; atomId < atoms.length; ++atomId) {
        const atom_binId = perAtom_binId[atomId];
        let atom_dst = perBin_atomCount_scanned[atom_binId]; // Atom destination in the sorted array
        while (result[atom_dst] !== null) {
            ++atom_dst;
        }
        result[atom_dst] = atoms[atomId];
    }
    return result;
}