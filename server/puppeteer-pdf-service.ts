import puppeteer from "puppeteer";
import path from "path";
import handlebars from "handlebars";
import fs from "fs/promises";
import { fileURLToPath } from "url";

interface EstimateData {
  company: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    logo?: string;
    license?: string;
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
  isMembership?:boolean;
}

export class PuppeteerPdfService {
  async generatePdf(data: EstimateData): Promise<Uint8Array> {
    console.log("🔄 Starting PDF generation...");

    let browser;

    try {
      const executablePath =
        "/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium";

      const html = await this.renderHtmlFromTemplate(data);

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

      await page.setContent(html, {
        waitUntil: ["networkidle0", "domcontentloaded"],
        timeout: 30000,
      });

      const pdfBuffer = await page.pdf({
        width: "1200",
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

      console.log(`✅ PDF generated - Size: ${pdfBuffer.length} bytes`);
      return pdfBuffer;
    } catch (error) {
      console.error("❌ PDF generation failed:", error);
      throw new Error(`PDF generation failed: ${(error as Error).message}`);
    } finally {
      if (browser) await browser.close();
    }
  }

  private async renderHtmlFromTemplate(data: EstimateData): Promise<string> {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const templatePath =data.isMembership? path.join(
        __dirname,
        "../client/src/components/templates/estimate-template.html",
      ): path.join(
        __dirname,
        "../client/src/components/templates/estimate-template-free.html",
      );
    const html = await fs.readFile(templatePath, "utf-8");

    const template = handlebars.compile(html);

    const mappedData = {
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
        license: data.company.license || "",
        logo: data.company.logo || "",
      },
      project: {
        description: data.estimate.project_description || "",
      },
      items: data.estimate.items.map((item) => ({
        name: item.code,
        description: item.description,
        quantity: item.qty,
        unitPrice: item.unit_price,
        total: item.total,
      })),
      subtotal: data.estimate.subtotal || "0",
      discount: data.estimate.discounts || "0",
      taxRate: data.estimate.tax_rate || 0,
      taxAmount: data.estimate.tax_amount || "0",
      total: data.estimate.total || "0",
      terms: [
        "Payment is due within 30 days of receipt of invoice.",
        "Late payments are subject to a 1.5% monthly interest charge.",
        "This estimate is valid for 30 days from the date of issue.",
      ],
    };

    return template(mappedData);
  }

  async generatePdfFromHtml(html: string): Promise<Uint8Array> {
    console.log("🔄 Starting PDF generation from HTML...");

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

      await page.setContent(html, {
        waitUntil: ["networkidle0", "domcontentloaded"],
        timeout: 30000,
      });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
          top: "0.5in",
          right: "0.5in",
          bottom: "0.5in",
          left: "0.5in",
        },
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: false,
      });

      console.log(`✅ PDF generated from HTML - Size: ${pdfBuffer.length} bytes`);
      return pdfBuffer;
    } catch (error) {
      console.error("❌ PDF generation from HTML failed:", error);
      throw new Error(`PDF generation from HTML failed: ${(error as Error).message}`);
    } finally {
      if (browser) await browser.close();
    }
  }
}

export const puppeteerPdfService = new PuppeteerPdfService();
