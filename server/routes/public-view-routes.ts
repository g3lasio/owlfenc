/**
 * Public View Routes — Owl Fenc
 *
 * These routes render documents as standalone HTML pages.
 * NO authentication required — designed for sharing via link and embedding in LeadPrime.
 *
 * Routes:
 *   GET /view/estimate/:estimateId   → renders estimate from Firebase
 *   GET /view/invoice/:invoiceId     → renders invoice from Firebase
 *   GET /view/permit/:permitId       → renders permit search from Firebase
 *   GET /view/property/:propertyId   → renders property report from Firebase
 *   GET /view/contract/:contractId   → redirects to permanent_pdf_url or renders from Firebase
 */
import { Router, Request, Response } from "express";
import { db as firebaseDb } from "../firebase-admin";

const router = Router();

// ─── Shared HTML shell ────────────────────────────────────────────────────────
function htmlShell(title: string, body: string, paymentLink?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — Owl Fenc</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f7fa; color: #1a1a2e; }
    .page-wrapper { max-width: 900px; margin: 0 auto; padding: 24px 16px 60px; }
    .doc-card { background: #fff; border-radius: 12px; box-shadow: 0 2px 16px rgba(0,0,0,0.08); overflow: hidden; }
    .doc-header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #fff; padding: 28px 32px; }
    .doc-header .brand { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
    .doc-header .brand img { height: 32px; }
    .doc-header .brand span { font-size: 20px; font-weight: 700; letter-spacing: 1px; color: #00d4ff; }
    .doc-header h1 { font-size: 22px; font-weight: 600; margin-bottom: 4px; }
    .doc-header .subtitle { font-size: 13px; opacity: 0.7; }
    .doc-body { padding: 28px 32px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .info-block { background: #f8f9fc; border-radius: 8px; padding: 14px 16px; }
    .info-block label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; display: block; margin-bottom: 4px; }
    .info-block .value { font-size: 15px; font-weight: 500; color: #1a1a2e; }
    .section-title { font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; margin: 24px 0 12px; border-bottom: 1px solid #eee; padding-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: #f0f2f8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.4px; color: #666; padding: 10px 12px; text-align: left; }
    td { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
    tr:last-child td { border-bottom: none; }
    .amount-row { font-weight: 600; }
    .total-row td { font-size: 16px; font-weight: 700; color: #1a1a2e; border-top: 2px solid #eee; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .badge-pending { background: #fff3cd; color: #856404; }
    .badge-paid { background: #d1e7dd; color: #0a3622; }
    .badge-completed { background: #cfe2ff; color: #084298; }
    .badge-sent { background: #e2d9f3; color: #432874; }
    .content-block { background: #f8f9fc; border-radius: 8px; padding: 16px; margin-bottom: 16px; font-size: 14px; line-height: 1.7; white-space: pre-wrap; }
    .share-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1px solid #eee; padding: 12px 24px; display: flex; gap: 12px; justify-content: center; box-shadow: 0 -2px 12px rgba(0,0,0,0.08); }
    .btn { padding: 10px 22px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; border: none; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; }
    .btn-primary { background: #00d4ff; color: #1a1a2e; }
    .btn-secondary { background: #f0f2f8; color: #1a1a2e; }
    .btn:hover { opacity: 0.85; }
    .permit-section { margin-bottom: 20px; }
    .permit-section h3 { font-size: 15px; font-weight: 600; margin-bottom: 8px; color: #1a1a2e; }
    .permit-item { background: #f8f9fc; border-left: 3px solid #00d4ff; padding: 10px 14px; margin-bottom: 8px; border-radius: 0 6px 6px 0; font-size: 14px; }
    .error-state { text-align: center; padding: 60px 24px; color: #888; }
    .error-state h2 { font-size: 20px; margin-bottom: 8px; color: #444; }
    @media (max-width: 600px) { .info-grid { grid-template-columns: 1fr; } .doc-body { padding: 20px 16px; } }
  </style>
</head>
<body>
  <div class="page-wrapper">
    <div class="doc-card">
      ${body}
    </div>
  </div>
  <div class="share-bar">
    <button class="btn btn-secondary" onclick="window.print()">🖨️ Print</button>
    <button class="btn btn-primary" onclick="navigator.share ? navigator.share({title: document.title, url: window.location.href}) : navigator.clipboard.writeText(window.location.href).then(() => alert('Link copied!'))">🔗 Share Link</button>
    ${paymentLink ? `<a href="${paymentLink}" target="_blank" rel="noopener noreferrer" class="btn" style="background:#0891b2;color:white;">💳 Pay Now</a>` : ''}
  </div>
  <script>
    // Auto-resize for iframe embedding
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'owlfenc-doc-height', height: document.body.scrollHeight }, '*');
    }
  </script>
</body>
</html>`;
}

function errorPage(message: string): string {
  return htmlShell("Document Not Found", `
    <div class="doc-body">
      <div class="error-state">
        <h2>Document Not Found</h2>
        <p>${message}</p>
      </div>
    </div>
  `);
}

function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return dateStr;
  }
}

function badgeHtml(status: string): string {
  const cls = status === "paid" ? "badge-paid" : status === "completed" ? "badge-completed" : status === "sent" ? "badge-sent" : "badge-pending";
  return `<span class="badge ${cls}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>`;
}

// ─── GET /view/estimate/:estimateId ──────────────────────────────────────────
router.get("/estimate/:estimateId", async (req: Request, res: Response) => {
  const { estimateId } = req.params;
  try {
    const snap = await firebaseDb.collection("estimates").doc(estimateId).get();
    if (!snap.exists) {
      return res.status(404).send(errorPage("This estimate does not exist or has been deleted."));
    }
    const e = snap.data()!;
    const items: any[] = e.items || [];
    const itemRows = items.map((item: any) => `
      <tr>
        <td>${item.description || item.name || "—"}</td>
        <td style="text-align:center">${item.quantity || 1}</td>
        <td style="text-align:right">${formatCurrency(item.unitPrice || item.price)}</td>
        <td style="text-align:right">${formatCurrency((item.quantity || 1) * (item.unitPrice || item.price || 0))}</td>
      </tr>
    `).join("");

    const body = `
      <div class="doc-header">
        <div class="brand"><span>🦉 OWL FENC</span></div>
        <h1>Estimate #${e.estimateNumber || estimateId}</h1>
        <div class="subtitle">Created ${formatDate(e.createdAt?.toDate ? e.createdAt.toDate().toISOString() : e.createdAt)} &nbsp;•&nbsp; ${badgeHtml(e.status || "sent")}</div>
      </div>
      <div class="doc-body">
        <div class="info-grid">
          <div class="info-block"><label>Client</label><div class="value">${e.clientName || "—"}</div></div>
          <div class="info-block"><label>Email</label><div class="value">${e.clientEmail || "—"}</div></div>
          <div class="info-block"><label>Project Address</label><div class="value">${e.projectAddress || e.clientAddress || "—"}</div></div>
          <div class="info-block"><label>Project Type</label><div class="value">${e.projectType || "—"}</div></div>
        </div>
        ${items.length > 0 ? `
        <div class="section-title">Line Items</div>
        <table>
          <thead><tr><th>Description</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Total</th></tr></thead>
          <tbody>
            ${itemRows}
            ${e.discount ? `<tr class="amount-row"><td colspan="3" style="text-align:right">Discount</td><td style="text-align:right">-${formatCurrency(e.discount)}</td></tr>` : ""}
            ${e.tax ? `<tr class="amount-row"><td colspan="3" style="text-align:right">Tax</td><td style="text-align:right">${formatCurrency(e.tax)}</td></tr>` : ""}
            <tr class="total-row"><td colspan="3" style="text-align:right">TOTAL</td><td style="text-align:right">${formatCurrency(e.total)}</td></tr>
          </tbody>
        </table>
        ` : `<div class="info-block"><label>Total Amount</label><div class="value" style="font-size:22px;color:#00d4ff">${formatCurrency(e.total)}</div></div>`}
        ${e.notes ? `<div class="section-title">Notes</div><div class="content-block">${e.notes}</div>` : ""}
        ${e.scopeOfWork ? `<div class="section-title">Scope of Work</div><div class="content-block">${e.scopeOfWork}</div>` : ""}
      </div>
    `;
    res.send(htmlShell(`Estimate #${e.estimateNumber || estimateId} — ${e.clientName || ""}`, body));
  } catch (err: any) {
    console.error("[PUBLIC-VIEW] estimate error:", err.message);
    res.status(500).send(errorPage("An error occurred loading this document."));
  }
});

// ─── GET /view/invoice/:invoiceId ─────────────────────────────────────────────
router.get("/invoice/:invoiceId", async (req: Request, res: Response) => {
  const { invoiceId } = req.params;
  try {
    const snap = await firebaseDb.collection("invoices").doc(invoiceId).get();
    if (!snap.exists) {
      return res.status(404).send(errorPage("This invoice does not exist or has been deleted."));
    }
    const inv = snap.data()!;
    const estimateData = inv.estimateData || {};
    const items: any[] = estimateData.items || inv.items || [];

    const itemRows = items.map((item: any) => `
      <tr>
        <td>${item.description || item.name || "—"}</td>
        <td style="text-align:center">${item.quantity || 1}</td>
        <td style="text-align:right">${formatCurrency(item.unitPrice || item.price)}</td>
        <td style="text-align:right">${formatCurrency((item.quantity || 1) * (item.unitPrice || item.price || 0))}</td>
      </tr>
    `).join("");

    const body = `
      <div class="doc-header">
        <div class="brand"><span>🦉 OWL FENC</span></div>
        <h1>Invoice #${inv.invoiceNumber || invoiceId}</h1>
        <div class="subtitle">Issued ${formatDate(inv.createdAt)} &nbsp;•&nbsp; Due ${formatDate(inv.dueDate)} &nbsp;•&nbsp; ${badgeHtml(inv.paymentStatus || "pending")}</div>
      </div>
      <div class="doc-body">
        <div class="info-grid">
          <div class="info-block"><label>Bill To</label><div class="value">${inv.clientName || "—"}</div></div>
          <div class="info-block"><label>Email</label><div class="value">${inv.clientEmail || "—"}</div></div>
          <div class="info-block"><label>Project Address</label><div class="value">${estimateData.clientAddress || inv.projectAddress || "—"}</div></div>
          <div class="info-block"><label>Project Type</label><div class="value">${estimateData.projectType || inv.projectType || "—"}</div></div>
        </div>
        ${items.length > 0 ? `
        <div class="section-title">Line Items</div>
        <table>
          <thead><tr><th>Description</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Total</th></tr></thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>
        ` : ""}
        <div class="info-grid">
          <div class="info-block"><label>Subtotal</label><div class="value">${formatCurrency(estimateData.subtotal || inv.totalAmount)}</div></div>
          <div class="info-block"><label>Amount Paid</label><div class="value" style="color:#0a3622">${formatCurrency(inv.paidAmount || 0)}</div></div>
          <div class="info-block"><label>Balance Due</label><div class="value" style="font-size:20px;font-weight:700;color:#dc3545">${formatCurrency(inv.balanceAmount || inv.totalAmount)}</div></div>
          <div class="info-block"><label>Payment Terms</label><div class="value">Net ${inv.paymentTerms || 30} days</div></div>
        </div>
        ${inv.notes ? `<div class="section-title">Notes</div><div class="content-block">${inv.notes}</div>` : ""}
        ${(inv.paymentLink || inv.stripeCheckoutUrl) ? `
        <div style="margin:24px 0;padding:20px 24px;background:#ecfeff;border:2px solid #0891b2;border-radius:10px;text-align:center;">
          <div style="font-size:11px;font-weight:700;color:#0e7490;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Secure Online Payment</div>
          <a href="${inv.paymentLink || inv.stripeCheckoutUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#0891b2;color:white;padding:13px 36px;text-decoration:none;border-radius:8px;font-weight:800;font-size:15px;letter-spacing:-0.3px;margin-bottom:10px;">Pay Now — ${formatCurrency(inv.balanceAmount || inv.totalAmount)}</a>
          <div style="font-size:11px;color:#6b7280;word-break:break-all;margin-top:6px;">${inv.paymentLink || inv.stripeCheckoutUrl}</div>
        </div>` : ""}
      </div>
    `;
    res.send(htmlShell(`Invoice #${inv.invoiceNumber || invoiceId} — ${inv.clientName || ""}`, body, inv.paymentLink || inv.stripeCheckoutUrl));
  } catch (err: any) {
    console.error("[PUBLIC-VIEW] invoice error:", err.message);
    res.status(500).send(errorPage("An error occurred loading this document."));
  }
});

// ─── GET /view/permit/:permitId ───────────────────────────────────────────────
router.get("/permit/:permitId", async (req: Request, res: Response) => {
  const { permitId } = req.params;
  try {
    // Try both collections
    let snap = await firebaseDb.collection("permit_search_history").doc(permitId).get();
    if (!snap.exists) {
      snap = await firebaseDb.collection("permit_searches").doc(permitId).get();
    }
    if (!snap.exists) {
      return res.status(404).send(errorPage("This permit search does not exist or has been deleted."));
    }
    const p = snap.data()!;
    const results = p.results || {};

    // Render permit results sections
    const renderSection = (title: string, items: string[] | undefined) => {
      if (!items || items.length === 0) return "";
      return `
        <div class="permit-section">
          <h3>${title}</h3>
          ${items.map((item: string) => `<div class="permit-item">${item}</div>`).join("")}
        </div>
      `;
    };

    const requirementsHtml = results.requirements ? renderSection("Permit Requirements", Array.isArray(results.requirements) ? results.requirements : [results.requirements]) : "";
    const processHtml = results.process ? renderSection("Application Process", Array.isArray(results.process) ? results.process : [results.process]) : "";
    const timelineHtml = results.timeline ? renderSection("Timeline", Array.isArray(results.timeline) ? results.timeline : [results.timeline]) : "";
    const costsHtml = results.costs ? renderSection("Estimated Costs", Array.isArray(results.costs) ? results.costs : [results.costs]) : "";
    const notesHtml = results.notes || results.additionalInfo ? renderSection("Additional Notes", Array.isArray(results.notes || results.additionalInfo) ? (results.notes || results.additionalInfo) : [results.notes || results.additionalInfo]) : "";
    const summaryHtml = results.summary ? `<div class="section-title">Summary</div><div class="content-block">${results.summary}</div>` : "";
    const rawAnalysis = (typeof results === "string") ? `<div class="section-title">Analysis</div><div class="content-block">${results}</div>` :
      (results.analysis ? `<div class="section-title">Analysis</div><div class="content-block">${results.analysis}</div>` : "");

    const body = `
      <div class="doc-header">
        <div class="brand"><span>🦉 OWL FENC</span></div>
        <h1>Permit Search Report</h1>
        <div class="subtitle">${p.title || `${p.projectType || "Project"} at ${p.address || "Address"}`} &nbsp;•&nbsp; ${badgeHtml("completed")}</div>
      </div>
      <div class="doc-body">
        <div class="info-grid">
          <div class="info-block"><label>Property Address</label><div class="value">${p.address || "—"}</div></div>
          <div class="info-block"><label>Project Type</label><div class="value">${p.projectType || "—"}</div></div>
          <div class="info-block"><label>Search Date</label><div class="value">${formatDate(p.createdAt?.toDate ? p.createdAt.toDate().toISOString() : p.createdAt)}</div></div>
          ${p.projectDescription ? `<div class="info-block"><label>Description</label><div class="value">${p.projectDescription}</div></div>` : ""}
        </div>
        ${summaryHtml}
        ${rawAnalysis}
        ${requirementsHtml}
        ${processHtml}
        ${timelineHtml}
        ${costsHtml}
        ${notesHtml}
        ${!summaryHtml && !rawAnalysis && !requirementsHtml && !processHtml ? `<div class="content-block">Permit search completed for ${p.address}. No detailed results available for display.</div>` : ""}
      </div>
    `;
    res.send(htmlShell(`Permit Report — ${p.address || permitId}`, body));
  } catch (err: any) {
    console.error("[PUBLIC-VIEW] permit error:", err.message);
    res.status(500).send(errorPage("An error occurred loading this document."));
  }
});

// ─── GET /view/property/:propertyId ──────────────────────────────────────────
router.get("/property/:propertyId", async (req: Request, res: Response) => {
  const { propertyId } = req.params;
  try {
    const snap = await firebaseDb.collection("property_searches").doc(propertyId).get();
    if (!snap.exists) {
      return res.status(404).send(errorPage("This property report does not exist or has been deleted."));
    }
    const p = snap.data()!;
    const results = p.results || {};

    const ownerInfo = results.owner || results.ownerInfo || {};
    const propertyInfo = results.property || results.propertyInfo || results.details || {};

    const renderField = (label: string, value: any) => {
      if (!value) return "";
      return `<div class="info-block"><label>${label}</label><div class="value">${value}</div></div>`;
    };

    const body = `
      <div class="doc-header">
        <div class="brand"><span>🦉 OWL FENC</span></div>
        <h1>Property Ownership Report</h1>
        <div class="subtitle">${p.address || "Property Research"} &nbsp;•&nbsp; ${badgeHtml("completed")}</div>
      </div>
      <div class="doc-body">
        <div class="section-title">Property Information</div>
        <div class="info-grid">
          ${renderField("Address", p.address)}
          ${renderField("City", p.city)}
          ${renderField("State", p.state)}
          ${renderField("Parcel Number", results.parcelNumber || propertyInfo.parcelNumber)}
          ${renderField("Property Type", results.propertyType || propertyInfo.type)}
          ${renderField("Year Built", results.yearBuilt || propertyInfo.yearBuilt)}
          ${renderField("Lot Size", results.lotSize || propertyInfo.lotSize)}
          ${renderField("Living Area", results.livingArea || propertyInfo.livingArea)}
          ${renderField("Bedrooms", results.bedrooms || propertyInfo.bedrooms)}
          ${renderField("Bathrooms", results.bathrooms || propertyInfo.bathrooms)}
          ${renderField("Assessed Value", results.assessedValue || propertyInfo.assessedValue)}
          ${renderField("Market Value", results.marketValue || propertyInfo.marketValue)}
        </div>
        <div class="section-title">Owner Information</div>
        <div class="info-grid">
          ${renderField("Owner Name", p.ownerName || ownerInfo.name || results.ownerName)}
          ${renderField("Mailing Address", ownerInfo.mailingAddress || results.mailingAddress)}
          ${renderField("Ownership Type", ownerInfo.ownershipType || results.ownershipType)}
          ${renderField("Purchase Date", ownerInfo.purchaseDate || results.purchaseDate)}
          ${renderField("Purchase Price", ownerInfo.purchasePrice || results.purchasePrice)}
        </div>
        ${results.summary ? `<div class="section-title">Summary</div><div class="content-block">${results.summary}</div>` : ""}
        ${results.analysis ? `<div class="section-title">Analysis</div><div class="content-block">${results.analysis}</div>` : ""}
        ${typeof results === "string" ? `<div class="section-title">Report</div><div class="content-block">${results}</div>` : ""}
        <div style="margin-top:16px;font-size:12px;color:#aaa">Report generated ${formatDate(p.createdAt?.toDate ? p.createdAt.toDate().toISOString() : p.createdAt?.toString())}</div>
      </div>
    `;
    res.send(htmlShell(`Property Report — ${p.address || propertyId}`, body));
  } catch (err: any) {
    console.error("[PUBLIC-VIEW] property error:", err.message);
    res.status(500).send(errorPage("An error occurred loading this document."));
  }
});

// ─── GET /view/contract/:contractId ──────────────────────────────────────────
router.get("/contract/:contractId", async (req: Request, res: Response) => {
  const { contractId } = req.params;
  try {
    // Try PostgreSQL first (digital_contracts has permanent_pdf_url)
    const snap = await firebaseDb.collection("contracts").doc(contractId).get();
    if (snap.exists) {
      const c = snap.data()!;
      if (c.permanent_pdf_url || c.pdfUrl) {
        return res.redirect(c.permanent_pdf_url || c.pdfUrl);
      }
      // Render from Firebase data
      const body = `
        <div class="doc-header">
          <div class="brand"><span>🦉 OWL FENC</span></div>
          <h1>Contract</h1>
          <div class="subtitle">${c.clientName || ""} &nbsp;•&nbsp; ${badgeHtml(c.status || "pending")}</div>
        </div>
        <div class="doc-body">
          <div class="info-grid">
            <div class="info-block"><label>Client</label><div class="value">${c.clientName || "—"}</div></div>
            <div class="info-block"><label>Project Address</label><div class="value">${c.clientAddress || c.projectAddress || "—"}</div></div>
            <div class="info-block"><label>Total Amount</label><div class="value">${formatCurrency(c.totalAmount || c.total_amount)}</div></div>
            <div class="info-block"><label>Date</label><div class="value">${formatDate(c.createdAt?.toDate ? c.createdAt.toDate().toISOString() : c.createdAt)}</div></div>
          </div>
          ${c.contractContent || c.content ? `<div class="section-title">Contract Terms</div><div class="content-block">${c.contractContent || c.content}</div>` : ""}
        </div>
      `;
      return res.send(htmlShell(`Contract — ${c.clientName || contractId}`, body));
    }
    return res.status(404).send(errorPage("This contract does not exist or has been deleted."));
  } catch (err: any) {
    console.error("[PUBLIC-VIEW] contract error:", err.message);
    res.status(500).send(errorPage("An error occurred loading this document."));
  }
});

export default router;
