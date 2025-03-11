declare module '*.json' {
  const value: any
  export default value
}

declare module '*.glsl' {
  const value: string
  export default value
}

declare module '*.vert' {
  const value: string
  export default value
}

declare module '*.frag' {
  const value: string
  export default value
}

/**
 * Allows *.wgsl files to be directly imported
 */
declare module "*.wgsl" {
  const value: string;
  export default value;
}

/**
 * Allows *.pdb files to  be directly imported
 */
declare module "*.pdb" {
  const value: string;
  export default value;
}