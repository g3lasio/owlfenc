import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

interface SimplePdfOptions {
  title?: string;
  contractId?: string;
}

/**
 * Creates a simple PDF from text content
 * Used as a fallback when Puppeteer is not available
 */
export async function createSimplePdfFromText(
  textContent: string,
  options: SimplePdfOptions = {},
): Promise<Buffer> {
  console.log("📄 [SIMPLE-PDF] Creating simple PDF from text content");

  try {
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();

    // Add a page
    const page = pdfDoc.addPage([612, 792]); // Letter size (8.5" x 11")
    const { width, height } = page.getSize();

    // Embed Times New Roman fonts
    const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

    // Starting position
    let yPosition = height - 80;

    // Add title
    const title = options.title || "SIGNED CONTRACT";
    page.drawText(title.toUpperCase(), {
      x: width / 2 - title.length * 4, // Rough centering
      y: yPosition,
      size: 16,
      font: timesRomanBold,
      color: rgb(0, 0, 0),
    });
    yPosition -= 30;

    // Add contract ID if provided
    if (options.contractId) {
      const contractIdText = `Contract ID: ${options.contractId}`;
      page.drawText(contractIdText, {
        x: width / 2 - contractIdText.length * 3,
        y: yPosition,
        size: 10,
        font: timesRoman,
        color: rgb(0.4, 0.4, 0.4),
      });
      yPosition -= 40;
    }

    // Add a separator line
    page.drawLine({
      start: { x: 50, y: yPosition },
      end: { x: width - 50, y: yPosition },
      thickness: 1,
      color: rgb(0.2, 0.2, 0.2),
    });
    yPosition -= 30;

    // Process text content
    const words = textContent.split(/\s+/);
    const lines: string[] = [];
    let currentLine = "";
    const maxCharsPerLine = 75;

    // Break text into lines
    for (const word of words) {
      if ((currentLine + " " + word).length > maxCharsPerLine) {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          // Word is too long, force break
          lines.push(word.substring(0, maxCharsPerLine));
          currentLine = word.substring(maxCharsPerLine);
        }
      } else {
        currentLine = currentLine ? currentLine + " " + word : word;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }

    // Add text lines to PDF
    const lineHeight = 14;
    const fontSize = 11;
    let currentPage = page;

    for (const line of lines) {
      // Check if we need a new page
      if (yPosition < 80) {
        currentPage = pdfDoc.addPage([612, 792]);
        yPosition = height - 80;
      }

      // Draw the line
      currentPage.drawText(line, {
        x: 50,
        y: yPosition,
        size: fontSize,
        font: timesRoman,
        color: rgb(0, 0, 0),
        maxWidth: width - 100,
      });

      yPosition -= lineHeight;
    }

    // Add footer on last page
    const footerText = "*** DIGITALLY SIGNED CONTRACT ***";
    currentPage.drawText(footerText, {
      x: width / 2 - footerText.length * 3,
      y: 50,
      size: 10,
      font: timesRomanBold,
      color: rgb(0.3, 0.3, 0.7),
    });

    // Save the PDF
    const pdfBytes = await pdfDoc.save();

    console.log("✅ [SIMPLE-PDF] Simple PDF generated successfully");
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error("❌ [SIMPLE-PDF] Error generating simple PDF:", error);
    throw new Error(`Failed to generate simple PDF: ${error.message}`);
  }
}
