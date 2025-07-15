import puppeteer from "puppeteer";
import path from "path";
import ReactDOMServer from "react-dom/server";
import EstimatePreviewWidget from "@/components/estimates/EstimatePreviewWidget";
import React from "react";

interface EstimateData {
  company: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    logo?: string;
  };
  estimate: {
    number?: string;
    date?: string;
    valid_until?: string;
    project_description?: string;
    items: Array<{
      code: string;
      description: string;
      qty: number | string;
      unit_price: string;
      total: string;
    }>;
    subtotal?: string;
    discounts?: string;
    tax_rate?: number;
    tax_amount?: string;
    total?: string;
  };
  client: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
}

export class PuppeteerPdfService {
  constructor() {}

  async generatePdf(data: EstimateData): Promise<Buffer> {
    console.log("🔄 Starting PDF generation with Puppeteer...");

    let browser;
    try {
      const executablePath =
        "/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium";

      browser = await puppeteer.launch({
        headless: true,
        executablePath,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--single-process",
          "--disable-gpu",
          "--disable-extensions",
          "--disable-plugins",
        ],
      });

      const page = await browser.newPage();
      await page.setViewport({
        width: 1200,
        height: 1600,
        deviceScaleFactor: 2,
      });

      const html = this.renderReactToHtml(data);

      await page.setContent(html, {
        waitUntil: ["networkidle0", "domcontentloaded"],
        timeout: 30000,
      });

      const pdfBuffer = await page.pdf({
        format: "Letter",
        margin: {
          top: "0.75in",
          right: "0.75in",
          bottom: "0.75in",
          left: "0.75in",
        },
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: false,
      });

      console.log(`✅ PDF generated successfully - Size: ${pdfBuffer.length} bytes`);
      return pdfBuffer;
    } catch (error) {
      console.error("❌ PDF generation failed:", error);
      throw new Error(`PDF generation failed: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  private renderReactToHtml(data: EstimateData): string {
    const html = ReactDOMServer.renderToStaticMarkup(
      <EstimatePreviewWidget
        estimate={{
          id: data.estimate.number || `EST-${Date.now()}`,
          number: data.estimate.number || `EST-${Date.now()}`,
          date: data.estimate.date || new Date().toLocaleDateString(),
          validUntil:
            data.estimate.valid_until ||
            new Date(Date.now() + 30 * 86400000).toLocaleDateString(),
          client: {
            name: data.client.name || "",
            address: data.client.address || "",
            phone: data.client.phone || "",
            email: data.client.email || "",
          },
          contractorInfo: {
            name: data.company.name || "",
            address: data.company.address || "",
            phone: data.company.phone || "",
            email: data.company.email || "",
            license: "", // Optional
            logo: data.company.logo || "",
          },
          project: {
            description: data.estimate.project_description || "",
          },
          items: data.estimate.items.map((item, i) => ({
            id: item.code || `item-${i}`,
            name: item.code,
            description: item.description,
            quantity: Number(item.qty),
            unit: "pcs",
            unitPrice: item.unit_price,
            total: item.total,
          })),
          subtotal: data.estimate.subtotal || "0.00",
          taxRate: data.estimate.tax_rate || 0,
          taxAmount: data.estimate.tax_amount || "0.00",
          total: data.estimate.total || "0.00",
          discount: data.estimate.discounts || "0.00",
          terms: [
            "Payment due in 30 days.",
            "This estimate is valid for 30 days from issue date.",
          ],
        }}
      />
    );

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Estimate PDF</title>
  <style>
    * { font-family: 'Arial', sans-serif; margin: 0; padding: 0; box-sizing: border-box; }
    body { padding: 20px; background: white; }
  </style>
</head>
<body>
  ${html}
</body>
</html>`;
  }
}

export const puppeteerPdfService = new PuppeteerPdfService();
