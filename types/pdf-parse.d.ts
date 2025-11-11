declare module 'pdf-parse' {
    interface PDFInfo {
        PDFFormatVersion: string;
        IsAcroFormPresent: boolean;
        IsXFAPresent: boolean;
        Creator: string;
        Producer: string;
        CreationDate: string;
        ModDate: string;
    }

    interface PDFMetadata {
        _metadata: {
            [key: string]: any;
        };
    }

    interface PDFPage {
        // Define properties of a PDF page if needed
    }

    interface PDFRenderOptions {
        // Define render options if needed
    }

    interface PDFData {
        numpages: number;
        numrender: number;
        info: PDFInfo;
        metadata: PDFMetadata;
        text: string;
        version: string;
        pages: PDFPage[];
    }

    interface Options {
        pagerender?: (pageData: any) => string;
        max?: number;
        version?: 'v1.10.100' | 'v1.9.426' | 'v2.0.550' | 'default';
    }

    function pdf(dataBuffer: Buffer, options?: Options): Promise<PDFData>;

    export default pdf;
}
