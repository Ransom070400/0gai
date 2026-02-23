/**
 * Process polyfill shim.
 * 
 * Must be imported FIRST in main.tsx — before React, before ethers, before anything.
 * 
 * The 0G serving broker SDK internally uses `readable-stream` which calls
 * `process.version.slice(0, 5)` at module init time. The default browser
 * process polyfill from vite-plugin-node-polyfills does NOT include
 * `process.version`, causing:
 * 
 *   TypeError: Cannot read properties of undefined (reading 'slice')
 * 
 * This shim patches it.
 */

const g = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {}) as any;

// Ensure global exists
if (!g.global) g.global = g;

// Ensure process exists with all needed properties
if (!g.process) {
  g.process = {} as any;
}

const p = g.process;

if (!p.env) p.env = {};
if (!p.version) p.version = 'v18.0.0';
if (!p.versions) p.versions = { node: '18.0.0' };
if (p.browser === undefined) p.browser = true;
if (!p.platform) p.platform = 'browser';
if (!p.nextTick) {
  p.nextTick = (fn: Function, ...args: any[]) => {
    setTimeout(() => fn(...args), 0);
  };
}
if (!p.cwd) p.cwd = () => '/';
if (!p.stderr) p.stderr = { write: () => {} };
if (!p.stdout) p.stdout = { write: () => {} };

// Ensure Buffer exists (basic stub)
if (!g.Buffer) {
  g.Buffer = {
    isBuffer: () => false,
    from: (data: any) => new Uint8Array(typeof data === 'string' ? [...data].map(c => c.charCodeAt(0)) : data),
    alloc: (size: number) => new Uint8Array(size),
    allocUnsafe: (size: number) => new Uint8Array(size),
    concat: (list: Uint8Array[]) => {
      const total = list.reduce((acc, buf) => acc + buf.length, 0);
      const result = new Uint8Array(total);
      let offset = 0;
      for (const buf of list) {
        result.set(buf, offset);
        offset += buf.length;
      }
      return result;
    },
  };
}

export {};
