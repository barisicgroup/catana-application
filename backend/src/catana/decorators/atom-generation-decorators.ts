import CgStructure from "../data_model/cg-structure";

/**
 * This function decorator sets coarse-grained structure's dirty flag to true every time
 * it is executed.
 * 
 * @param getStructure callback describing how to access the CgStructure reference from the instance of caller
 * @returns property descriptor function
 */
export function MethodInfluencesAtomData(getStructure: (target: any) => CgStructure | undefined) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const targetMethod = descriptor.value;

        descriptor.value = function (...args: any[]) {
            const structure = getStructure(this);
            if (structure) {
                structure.isAtomDataDirty = true;
            }

            return targetMethod.apply(this, args);
        }

        return descriptor;
    };
}

/**
 * This accessor decorator sets coarse-grained structure's dirty flag to true every time
 * the property setter is used.
 * 
 * @param getStructure callback describing how to access the CgStructure reference from the instance of caller
 * @returns property descriptor function
 */
export function AccessorInfluencesAtomData(getStructure: (target: any) => CgStructure | undefined) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const targetMethod = descriptor.set;

        if (targetMethod) {
            descriptor.set = function (...args: any[]) {
                const structure = getStructure(this);
                if (structure) {
                    structure.isAtomDataDirty = true;
                }

                return targetMethod.apply(this, args);
            }
        }

        return descriptor;
    };
}