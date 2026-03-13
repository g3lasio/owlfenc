/**
 * Universal PDF Download Utility
 *
 * Handles PDF downloads across all platforms:
 * - Desktop (Chrome, Firefox, Safari): anchor click with blob URL
 * - iOS Safari / iPad: opens in new tab (iOS blocks programmatic downloads)
 * - Android Chrome: anchor click with blob URL (works natively)
 * - PWA / WebView: Web Share API when available, fallback to new tab
 *
 * The `a.click()` + `URL.createObjectURL()` pattern FAILS on:
 * - iOS Safari (any version): silently ignored
 * - iPad Safari: silently ignored
 * - Some Android WebViews: silently ignored
 */

/**
 * Detects if the current device is iOS (iPhone or iPad)
 */
function isIOS(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPad on iOS 13+ reports as MacIntel but has touch
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/**
 * Detects if the current device is a mobile or tablet
 */
function isMobileOrTablet(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/**
 * Downloads a PDF blob with the correct strategy for the current platform.
 *
 * @param blob - The PDF blob to download
 * @param filename - The desired filename (e.g., "invoice-john-2026-03-12.pdf")
 */
export async function downloadPdf(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);

  try {
    // Strategy 1: Web Share API (best for mobile when available)
    // Available on iOS 15+, Android Chrome, some desktop browsers
    if (
      isMobileOrTablet() &&
      navigator.canShare &&
      navigator.share
    ) {
      try {
        const file = new File([blob], filename, { type: "application/pdf" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: filename.replace(".pdf", "").replace(/-/g, " "),
          });
          URL.revokeObjectURL(url);
          return;
        }
      } catch (shareError: any) {
        // User cancelled share or share failed — fall through to next strategy
        if (shareError?.name !== "AbortError") {
          console.warn("[PDF-DOWNLOAD] Web Share API failed, trying fallback:", shareError);
        }
      }
    }

    // Strategy 2: iOS / iPad — open in new tab
    // iOS Safari does not support programmatic downloads via anchor click.
    // Opening in a new tab allows the user to use the share sheet to save the PDF.
    if (isIOS()) {
      const newTab = window.open(url, "_blank");
      if (!newTab) {
        // Pop-up blocked — show instructions
        console.warn("[PDF-DOWNLOAD] Pop-up blocked on iOS, trying location.href");
        window.location.href = url;
      }
      // Note: We cannot revoke the URL immediately on iOS as the tab needs it
      // The browser will clean it up when the tab is closed
      return;
    }

    // Strategy 3: Desktop and Android — standard anchor click
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Revoke after a short delay to ensure the download starts
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch (error) {
    // Final fallback: open in new tab
    console.error("[PDF-DOWNLOAD] All strategies failed, opening in new tab:", error);
    window.open(url, "_blank");
  }
}

/**
 * Downloads a PDF from an axios response (responseType: 'blob')
 * or from a fetch response.
 *
 * @param responseData - The blob data (from axios.data or response.blob())
 * @param filename - The desired filename
 */
export async function downloadPdfFromResponse(
  responseData: Blob | ArrayBuffer | BlobPart,
  filename: string
): Promise<void> {
  let blob: Blob;

  if (responseData instanceof Blob) {
    blob = responseData;
  } else {
    blob = new Blob([responseData], { type: "application/pdf" });
  }

  await downloadPdf(blob, filename);
}
