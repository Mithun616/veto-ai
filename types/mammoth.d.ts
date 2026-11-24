declare module "mammoth" {
  export interface MammothResult {
    value: string;
    messages: unknown[];
  }
  export function extractRawText(options: { buffer: Buffer }): Promise<MammothResult>;
}
