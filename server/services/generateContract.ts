import axios from "axios";

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
    const API_KEY = process.env.PDFMONKEY_API_KEY;
    const TEMPLATE_ID = "DF24FD81-01C5-4054-BDCF-19ED1DFCD763";

    const payload = {
      document: {
        document_template_id: TEMPLATE_ID,
        payload: contract,
      },
    };

    const headers = {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    };
    const res = axios.post(
      "https://api.pdfmonkey.io/api/v1/documents",
      payload,
      { headers },
    );

    return {
      data: res.data,
      message: "Contract generated successfully",
    };
  } catch (error) {
    //@ts-expect-error
    throw new Error(`Failed to generate estimate: ${error.message}`);
  }
}

export default generateContract;
