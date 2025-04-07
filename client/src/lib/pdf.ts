import { apiRequest } from "./queryClient";

export async function generatePDF(html: string, filename: string): Promise<Blob> {
  try {
    const response = await apiRequest("POST", "/api/generate-pdf", {
      html,
      filename
    });
    
    if (!response.ok) {
      throw new Error("Failed to generate PDF");
    }
    
    return await response.blob();
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
}

export function downloadPDF(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadEstimatePDF(html: string, projectId: string): Promise<void> {
  return generatePDF(html, `estimate-${projectId}.pdf`)
    .then(blob => {
      downloadPDF(blob, `estimate-${projectId}.pdf`);
    });
}

export function downloadContractPDF(html: string, projectId: string): Promise<void> {
  return generatePDF(html, `contract-${projectId}.pdf`)
    .then(blob => {
      downloadPDF(blob, `contract-${projectId}.pdf`);
    });
}
