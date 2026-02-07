import React, { useEffect, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  fileUrl: string;
  title: string;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ fileUrl, title }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [pageInput, setPageInput] = useState<string>('1');

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  useEffect(() => {
    setPageInput(pageNumber.toString());
  }, [pageNumber]);

  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages));
  };

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 2.0));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.5));
  };

  const jumpToPage = () => {
    const parsed = Number(pageInput);
    if (!Number.isFinite(parsed) || numPages === 0) return;
    const nextPage = Math.min(Math.max(parsed, 1), numPages);
    setPageNumber(nextPage);
  };

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-200" />
          </button>
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
            <span>Page</span>
            <input
              type="number"
              min={1}
              max={numPages || 1}
              value={pageInput}
              onChange={(event) => setPageInput(event.target.value)}
              onBlur={jumpToPage}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  jumpToPage();
                }
              }}
              className="w-16 px-2 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-md text-center text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <span>of {numPages || '--'}</span>
          </div>
          <button
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-200" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={zoomOut}
            disabled={scale <= 0.5}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-50"
          >
            <ZoomOut className="w-5 h-5 text-gray-700 dark:text-gray-200" />
          </button>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200 min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={zoomIn}
            disabled={scale >= 2.0}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-50"
          >
            <ZoomIn className="w-5 h-5 text-gray-700 dark:text-gray-200" />
          </button>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2"></div>

          <a
            href={fileUrl}
            download={title}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Download
          </a>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 flex justify-center bg-gray-100 dark:bg-gray-900">
        <Document
          file={fileUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          }
          error={
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              Failed to load PDF. Please try again.
            </div>
          }
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            className="shadow-lg"
          />
        </Document>
      </div>
    </div>
  );
};
