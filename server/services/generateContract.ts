import puppeteer from "puppeteer";
import Handlebars from "handlebars";
import path from "path";
import fs from "fs";

// types/contract.ts

export interface ClientInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
}

export interface ContractorInfo {
  companyName: string;
  contactName: string;
  address: string;
  phone: string;
  email: string;
}

export interface Background {
  description: string;
}

export interface Dates {
  startDate: string;
  endDate: string;
}

export interface Scope {
  description: string;
}

export interface Payment {
  totalAmount: string;
  initialPayment: string;
  finalPayment: string;
  lateFee: string; // or `number` if you prefer
}

export interface Expenses {
  description: string;
}

export interface Equipment {
  description: string;
}

export interface Legal {
  noticeTerms: string;
}

export interface AdditionalTerms {
  terms: string;
}

export interface ContractDTO {
  date: string;
  client: ClientInfo;
  contractor: ContractorInfo;
  background: Background;
  dates: Dates;
  scope: Scope;
  payment: Payment;
  expenses: Expenses;
  equipment: Equipment;
  legal: Legal;
  additional: AdditionalTerms;
}

async function generateContract(contract: ContractDTO) {
  try {
    const browser = await puppeteer.launch({ headless: true });

    const page = await browser.newPage();
    const templatePath = path.join(__dirname, "../templates/contract.hbs");
    const templateSource = fs.readFileSync(templatePath, "utf-8");

    // Compile the Handlebars template
    const compileTemplate = Handlebars.compile(templateSource);

    const html = compileTemplate(contract);
    await page.setContent(html);

    // Generate PDF
    const pdfBuffer = await page.pdf({ format: "A4" });

    await browser.close();

    const outputPath = path.join(__dirname, "../output/contract.pdf");
    fs.writeFileSync(outputPath, pdfBuffer);
    return { success: true, filePath: outputPath };
  } catch (error) {
    //@ts-expect-error
    throw new Error(`Failed to generate estimate: ${error.message}`);
  }
}

export default generateContract;
