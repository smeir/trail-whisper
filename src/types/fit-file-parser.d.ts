// fit-file-parser ships no type declarations. This describes only the surface
// used by src/lib/fit.ts (default export class, `new`, `.parse(buffer, cb)`).
declare module 'fit-file-parser' {
  export interface FitParserOptions {
    force?: boolean
    speedUnit?: 'km/h' | 'mph' | 'm/s' | string
    lengthUnit?: 'km' | 'mi' | 'm' | string
    temperatureUnit?: 'celsius' | 'fahrenheit' | 'kelvin' | string
    elapsedRecordField?: boolean
    mode?: 'cascade' | 'list' | 'both' | string
  }

  export type FitParserCallback = (
    error: Error | null,
    data: Record<string, unknown> & { records?: unknown[]; sessions?: unknown[] },
  ) => void

  export default class FitParser {
    constructor(options?: FitParserOptions)
    parse(content: ArrayBuffer | Uint8Array | Buffer, callback: FitParserCallback): void
  }
}
