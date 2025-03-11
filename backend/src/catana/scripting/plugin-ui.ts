/**
 * Defines supported plugin UI element types and
 * their required object properties.
 */
export const PluginUIElemDefinitions = {
    /**
     * Text element (non-editable).
     * Content defines the textual content.
     */
    "text": ["content"] as string[],
    /**
     * Input field enabling the user to provide textual input.
     */
    "input-text": [] as string[],
    /**
     * Input field enabling the user to provide numeric input.
     */
    "input-number": [] as string[],
    /**
     * Select element enabling the user to select one or more of the predefined options. 
     */
    "select": ["options", "allowMultiple"] as string[],
    /**
     * Select that enables the user to select one or more loaded structural components. 
     */
    "component-select": ["allowMultiple"] as string[],
    /**
     * Color picker enabling to select desired color.
     */
    "color": [] as string[],
    /**
     * Button enabling to execute some action/script.
     * The first argument of the callback script will be a dictionary of form [element name -> value] for every value-returning UI element.
     */
    "button": ["content", "callback"] as string[]
}

/**
 * Defines supported types of plugin UI elements
 */
export type PluginUIElemType = keyof typeof PluginUIElemDefinitions;

/**
 * Defines a particular plugin UI element.
 * This interface defines a "core" of the element record,
 * since additional properties might be required ({@link PluginUIElemDefinitions}), based on the element type.
 */
export interface PluginUIElemTypeRecord {
    /**
     * Element type
     */
    type: PluginUIElemType;
    /**
     * Element name (ID used later to retrieve element's value)
     */
    name: string;
}

/**
 * Defines properties of the modal box / window corresponding to the plugin
 */
export interface PluginUIModal {
    title: string;
    elements: PluginUIElemTypeRecord[];
}

/**
 * Checks if the given plugin record has all the required fields defined.
 * 
 * @param rec record to check
 * @returns true if it seems correctly defined, false otherwise
 */
export function isValidPluginUIElemTypeRecord(rec: PluginUIElemTypeRecord): boolean {
    if (rec.type !== undefined && rec.name !== undefined) {
        const props = PluginUIElemDefinitions[rec.type];

        if (props !== undefined) {
            for (let i = 0; i < props.length; ++i) {
                if (!(props[i] in rec)) {
                    return false;
                }
            }

            return true;
        }
    }
    return false;
}