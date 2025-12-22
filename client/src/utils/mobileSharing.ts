/**
 * Mobile PDF Sharing Utility
 * Enables native mobile sharing capabilities for PDF files
 * Supports WhatsApp, Email, and all available device sharing options
 */

interface ShareOptions {
  title: string;
  text?: string;
  files?: File[];
  url?: string;
}

/**
 * Check if Web Share API is supported and available
 */
export const isNativeShareSupported = (): boolean => {
  return typeof navigator !== 'undefined' && 
         'share' in navigator && 
         'canShare' in navigator;
};

/**
 * Check if file sharing is specifically supported
 */
export const isFileShareSupported = (): boolean => {
  return isNativeShareSupported() && 
         navigator.canShare && 
         navigator.canShare({ files: [new File([], 'test')] });
};

/**
 * Detect if running on mobile device
 */
export const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

/**
 * Share PDF file using native mobile sharing
 * @param pdfBlob - The PDF blob to share
 * @param filename - Name for the PDF file
 * @param options - Additional sharing options
 */
export const sharePdfFile = async (
  pdfBlob: Blob,
  filename: string,
  options: {
    title?: string;
    text?: string;
    clientName?: string;
    estimateNumber?: string;
  } = {}
): Promise<boolean> => {
  try {
    // Create File object from blob
    const pdfFile = new File([pdfBlob], filename, {
      type: 'application/pdf',
      lastModified: Date.now(),
    });

    // Prepare sharing data
    const shareData: ShareOptions = {
      title: options.title || `Estimate PDF - ${options.clientName || 'Client'}`,
      text: options.text || `Professional estimate${options.estimateNumber ? ` #${options.estimateNumber}` : ''} ready for review`,
      files: [pdfFile]
    };

    // Check if this specific share is supported
    if (navigator.canShare && !navigator.canShare(shareData)) {
      console.log('📱 File sharing not supported, falling back to URL sharing');
      return false;
    }

    // Execute native share
    await navigator.share(shareData);
    console.log('✅ PDF shared successfully via native sharing');
    return true;

  } catch (error) {
    // User cancelled sharing or other error
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('📱 User cancelled sharing');
      return true; // Not an error, user just cancelled
    }
    
    console.error('❌ Error sharing PDF:', error);
    return false;
  }
};

/**
 * Fallback sharing method using URL sharing
 * @param pdfBlob - The PDF blob to share
 * @param filename - Name for the PDF file
 * @param options - Additional sharing options
 */
export const sharePdfUrl = async (
  pdfBlob: Blob,
  filename: string,
  options: {
    title?: string;
    text?: string;
  } = {}
): Promise<boolean> => {
  try {
    // Create temporary URL for the PDF
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    const shareData: ShareOptions = {
      title: options.title || 'Professional Estimate PDF',
      text: options.text || 'Please find the estimate PDF attached',
      url: pdfUrl
    };

    if (navigator.canShare && !navigator.canShare(shareData)) {
      console.log('📱 URL sharing not supported either');
      URL.revokeObjectURL(pdfUrl);
      return false;
    }

    await navigator.share(shareData);
    
    // Clean up URL after sharing
    setTimeout(() => {
      URL.revokeObjectURL(pdfUrl);
    }, 1000);

    console.log('✅ PDF URL shared successfully');
    return true;

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('📱 User cancelled URL sharing');
      return true;
    }
    
    console.error('❌ Error sharing PDF URL:', error);
    return false;
  }
};

/**
 * Main sharing function with automatic fallbacks
 * @param pdfBlob - The PDF blob to share
 * @param filename - Name for the PDF file
 * @param options - Sharing configuration
 */
export const shareOrDownloadPdf = async (
  pdfBlob: Blob,
  filename: string,
  options: {
    title?: string;
    text?: string;
    clientName?: string;
    estimateNumber?: string;
    forceDownload?: boolean;
  } = {}
): Promise<void> => {
  // Force download if requested or if not on mobile
  if (options.forceDownload || !isMobileDevice()) {
    console.log('💾 Triggering standard download...');
    downloadPdfFile(pdfBlob, filename);
    return;
  }

  // Check if native sharing is supported
  if (!isNativeShareSupported()) {
    console.log('📱 Native sharing not supported, downloading instead...');
    downloadPdfFile(pdfBlob, filename);
    return;
  }

  console.log('📱 Mobile device detected, attempting native sharing...');

  // Try file sharing first (preferred method)
  if (isFileShareSupported()) {
    const fileShared = await sharePdfFile(pdfBlob, filename, options);
    if (fileShared) {
      return; // Successfully shared
    }
  }

  // Try URL sharing as fallback
  const urlShared = await sharePdfUrl(pdfBlob, filename, options);
  if (urlShared) {
    return; // Successfully shared
  }

  // Final fallback: regular download
  console.log('📱 All sharing methods failed, falling back to download...');
  downloadPdfFile(pdfBlob, filename);
};

/**
 * Standard download function (non-sharing)
 * @param pdfBlob - The PDF blob to download
 * @param filename - Name for the PDF file
 */
export const downloadPdfFile = (pdfBlob: Blob, filename: string): void => {
  const downloadUrl = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL
  setTimeout(() => {
    URL.revokeObjectURL(downloadUrl);
  }, 100);
  
  console.log('💾 Standard PDF download completed');
};

/**
 * Get sharing status and capabilities for UI display
 */
export const getSharingCapabilities = () => {
  return {
    isMobile: isMobileDevice(),
    nativeShareSupported: isNativeShareSupported(),
    fileShareSupported: isFileShareSupported(),
    recommendedAction: isMobileDevice() && isNativeShareSupported() 
      ? 'share' 
      : 'download'
  };
};