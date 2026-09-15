declare module "pdfjs-dist/build/pdf.min.mjs" {
  export const GlobalWorkerOptions: {
    workerSrc: string;
  };
  export function getDocument(src: any): {
    promise: Promise<{
      numPages: number;
      getPage: (pageNumber: number) => Promise<{
        getViewport: (options: { scale: number }) => {
          width: number;
          height: number;
        };
        render: (options: {
          canvasContext: CanvasRenderingContext2D;
          viewport: any;
        }) => {
          promise: Promise<void>;
        };
      }>;
      destroy: () => Promise<void>;
    }>;
  };
}
