/**
* Parameters below are based on the rigidbody base pair parameters
* as defined, for example, in 3DNA 2003 NAR paper:
* "Lu et al., 3DNA: a software package for the analysis, rebuilding and visualization of three‐dimensional nucleic acid structures"
* https://academic.oup.com/nar/article/31/17/5108/1192167
*
* The actual interpretation of the parameters may have differences when compared to 3DNA, 
* for example, due to the XYZ base axis being computed slightly differently.
*/

/**
 * Inter-base params are applied onto individual bases when assembling
 * the nucleic acid single strand
 */
export type InterBaseRigidbodyParams = {
    /**
     * X-axis translation
     * @remark Not currently used when generating DNA geometry.
     */
    baseShift: number,
    /**
     * Y-axis translation
     */
    baseSlide: number,
    /**
     * Z-axis translation
     */
    baseRise: number,
    /**
     * X-axis rotation
     * @remark Not currently used when generating DNA geometry.
     */
    baseTilt: number,
    /**
     * Y-axis rotation
     */
    baseRoll: number,
    /**
     * Z-axis rotation
     */
    baseTwist: number
}

/**
 * Intra-base params are applied on complementary bases only, 
 * after the locations of nucleotides in the source single strand
 * are generated. In other words, these parameters are used to
 * adjust orientation of complementary bases without influencing
 * the geometry of the whole strand.
 */
export type IntraBaseRigidbodyParams = {
    /**
     * X-axis translation
     * @remark Not currently used when generating DNA geometry.
     */
    shear: number,
    /**
     * Y-axis translation
     * @remark Not currently used when generating DNA geometry.
     */
    stretch: number,
    /**
     * Z-axis translation
     * @remark Not currently used when generating DNA geometry.
     */
    stagger: number,
    /**
     * X-axis rotation
     * @remark Not currently used when generating DNA geometry.
     */
    buckle: number,
    /**
     * Y-axis rotation
     */
    propeller: number,
    /**
     * Z-axis rotation
     * @remark Not currently used when generating DNA geometry.
     */
    opening: number
}

/**
 * DNA form defines properties of a particular type of DNA.
 */
export interface DnaForm {
    /**
     * Double helix diameter
     */
    doubleHelixDiameter: number,
    /**
     * Inter-base parameters
     */
    defaultBaseParams: InterBaseRigidbodyParams,
    /**
     * Intra-base parameters
     */
    defaultComplBaseParams: IntraBaseRigidbodyParams
}

/**
* B-DNA form with parameters (except twist) extracted from 
* the standard ref. frame paper for nb description by Olson et al., 2001:
* https://doi.org/10.1006/jmbi.2001.4987
*/
export const BDnaForm: DnaForm = {
    doubleHelixDiameter: 20,
    defaultBaseParams: {
        baseShift: -0.02,
        baseSlide: 1.23, // Modified from 0.23 to gain more significant grooves
        baseRise: 3.32,
        baseTilt: -0.1,
        baseRoll: 0.0, // Was 0.6 but modified to zero as it behaved better in our case
        baseTwist: 360 / 10.5
    },
    defaultComplBaseParams: {
        shear: 0,
        stretch: -0.15,
        stagger: 0.09,
        buckle: 0.5,
        propeller: -11.4,
        opening: 0.6
    }
}

/**
* B-DNA "idealistic" form ignores some of the parameters
* to have a nicely parallel and regular DNA strand
*/
export const BDnaIdealisticForm: DnaForm = {
    doubleHelixDiameter: 20,
    defaultBaseParams: {
        baseShift: 0,
        baseSlide: 0,
        baseRise: 3.32,
        baseTilt: 0,
        baseRoll: 0,
        baseTwist: 360 / 10.5
    },
    defaultComplBaseParams: {
        shear: 0,
        stretch: 0,
        stagger: 0,
        buckle: 0,
        propeller: 0,
        opening: 0
    }
}

/**
* A-DNA form defined by parameters extracted from 
* the standard ref. frame paper for nb description by Olson et al., 2001:
* https://doi.org/10.1006/jmbi.2001.4987
*/
export const ADnaForm: DnaForm = {
    doubleHelixDiameter: 23,
    defaultBaseParams: {
        baseShift: 0,
        baseSlide: -1.53,
        baseRise: 3.32,
        baseTilt: 0.1,
        baseRoll: 8.0,
        baseTwist: 31.1
    },
    defaultComplBaseParams: {
        shear: 0.01,
        stretch: -0.18,
        stagger: 0.02,
        buckle: -0.1,
        propeller: -11.8,
        opening: 0.6
    }
}