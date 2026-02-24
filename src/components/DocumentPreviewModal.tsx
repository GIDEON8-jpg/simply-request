import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { useState } from 'react';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
  onDownload?: () => void;
}

const getFileType = (fileName: string): 'image' | 'pdf' | 'other' => {
  const lower = fileName.toLowerCase();
  if (/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/.test(lower)) return 'image';
  if (/\.pdf$/.test(lower)) return 'pdf';
  return 'other';
};

export const DocumentPreviewModal = ({ 
  isOpen, 
  onClose, 
  fileUrl, 
  fileName,
  onDownload 
}: DocumentPreviewModalProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const fileType = getFileType(fileName);

  // For PDFs, use Google Docs viewer to avoid X-Frame-Options blocking
  const viewerUrl = fileType === 'pdf'
    ? `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`
    : fileUrl;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="truncate">{fileName}</DialogTitle>
            <DialogDescription>Preview of the document</DialogDescription>
          </div>
          <div className="flex gap-2">
            {onDownload && (
              <Button variant="outline" size="sm" onClick={onDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 relative bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-sm text-muted-foreground">Loading document...</p>
              </div>
            </div>
          )}

          {fileType === 'image' ? (
            <img
              src={fileUrl}
              alt={fileName}
              className="max-w-full max-h-full object-contain"
              onLoad={() => setIsLoading(false)}
              onError={() => setIsLoading(false)}
            />
          ) : fileType === 'pdf' ? (
            <iframe
              src={viewerUrl}
              className="w-full h-full border-0"
              title={fileName}
              onLoad={() => setIsLoading(false)}
            />
          ) : (
            <div className="text-center p-8">
              <p className="text-muted-foreground mb-4">Preview not available for this file type.</p>
              {onDownload && (
                <Button onClick={onDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download to view
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};