declare module 'pdf-parse' {
  interface PDFOptions {
    // No page range, use all pages.
    pagerender?: (pageData: any) => string;
    max?: number;
    firstPage?: number; // Default: 1
    lastPage?: number;  // Default: infinity
  }

  interface PDFData {
    numpages: number;
    numrender: number;
    info: {
      PDFFormatVersion: string;
      IsAcroFormPresent: boolean;
      IsXFAPresent: boolean;
      [key: string]: any;
    };
    metadata: any;
    text: string;
    version: string;
  }

  function parse(dataBuffer: Buffer, options?: PDFOptions): Promise<PDFData>;
  
  export = parse;
}