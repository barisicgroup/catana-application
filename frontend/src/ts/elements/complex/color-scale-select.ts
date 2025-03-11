import {Representation} from "catana-backend";

import CustomSelect from "./custom-select";
import CATANA from "../../catana-instance";
import Panel from "../panel";
import TextElement from "../text-element";
import {ColorBarSize, ColorSequence} from "../specialized/color";

// TODO make it so that mode is variable
class ColorScaleSelect extends CustomSelect<string> {

    public constructor(representation: Representation, colorCount: number) {
        super(
            Object.keys(CATANA.ColormakerRegistry.getScales()),
            representation.getColorParams().scale as string,
            (key) => {
                const panel = new Panel().addClass("ColorScaleSelectOption");
                const text = new TextElement(CATANA.ColormakerRegistry.getScales()[key])
                try {
                    panel.add(new ColorSequence(ColorBarSize.MINIMAL, ColorScaleSelect.getColors(representation, colorCount, key)));
                    panel.add(text);
                    return panel;
                } catch (err) {
                    //console.error(err);
                    console.error("Unable to use scale: " + key);
                    return panel.add(text);
                }
            },
            (key) => {
                return new ColorSequence(ColorBarSize.MINIMAL, ColorScaleSelect.getColors(representation, colorCount, key))
                    .addClass("ColorScaleSelectHeader");
            });
    }

    private static getColors(repr: Representation, colorCount: number, key: string) {
        const colormaker = CATANA.ColormakerRegistry.getScheme(repr.getColorParams());
        const colors: string[] = colormaker.generateColors(colorCount, { scale: key });
        return colors;
    }
}

export default ColorScaleSelect;