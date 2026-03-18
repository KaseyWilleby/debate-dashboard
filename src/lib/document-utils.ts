/**
 * Utilities for extracting text from document files (PDF, Word)
 * Browser-compatible versions using pdfjs-dist and mammoth
 */

/**
 * Extracts text from a PDF file using PDF.js
 * @param file - The PDF file to extract text from
 * @returns Promise resolving to the extracted text
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const pdfjsLib = await import('pdfjs-dist');

    // Set worker path for PDF.js
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    let fullText = '';

    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n\n';
    }

    return fullText.trim();
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF file');
  }
}

/**
 * Extracts text from a Word (.docx) file using Mammoth
 * @param file - The Word file to extract text from
 * @returns Promise resolving to the extracted text
 */
export async function extractTextFromWord(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (error) {
    console.error('Error extracting text from Word document:', error);
    throw new Error('Failed to extract text from Word document');
  }
}

/**
 * Extracts text from a document file (PDF or Word)
 * @param file - The document file to extract text from
 * @returns Promise resolving to the extracted text
 */
export async function extractTextFromDocument(file: File): Promise<string> {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return extractTextFromPDF(file);
  } else if (
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileName.endsWith('.docx')
  ) {
    return extractTextFromWord(file);
  } else if (fileType === 'application/msword' || fileName.endsWith('.doc')) {
    throw new Error('Legacy .doc format is not supported. Please convert to .docx format.');
  } else {
    throw new Error('Unsupported file type. Please upload a PDF or Word (.docx) document.');
  }
}
