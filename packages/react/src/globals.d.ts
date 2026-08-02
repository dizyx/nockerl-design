// Minimal ambient for the dev-only compose guard (assertComposeChildren): bundlers
// (Vite / webpack / esbuild) statically replace the literal `process.env.NODE_ENV`, so
// this only needs to TYPE it for the standalone tsc build - without pulling @types/node
// into a browser-only package. It is an input .d.ts (not re-emitted to dist) and is not
// imported/exported, so it never reaches consumers or conflicts with their @types/node.
declare const process: { env: { readonly NODE_ENV?: string } };
