/**
 * Servicio centralizado para gestionar los templates de la aplicación
 * Este enfoque elimina la necesidad de cargar archivos HTML externos
 */

// Contenido del template Premium incrustado directamente
const premiumTemplate = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Estimate Template (General Contractors - Neon Final)</title>
    <style>
      body {
        font-family: "Segoe UI", Arial, sans-serif;
        background: #f8f9fb;
        margin: 0;
        padding: 0;
        color: #181818;
      }
      .container {
        max-width: 800px;
        margin: 40px auto;
        background: #fff;
        box-shadow: 0 4px 24px rgba(20, 240, 248, 0.12);
        border-radius: 18px;
        padding: 34px 36px 20px 36px;
        border: 2px solid #14f0f8;
      }
      .header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        border-bottom: 2.5px solid #14f0f8;
        padding-bottom: 18px;
        margin-bottom: 18px;
      }
      .company-details {
        line-height: 1.7;
      }
      .logo {
        max-width: 108px;
        max-height: 60px;
        margin-bottom: 6px;
        background: #f5f7fa;
        border-radius: 8px;
        border: 1px solid #d7e0ee;
        display: block;
      }
      .company-name {
        font-size: 1.22rem;
        font-weight: 700;
        color: #181818;
        margin-bottom: 2px;
        letter-spacing: 0.5px;
      }
      .company-address {
        font-size: 1rem;
        color: #222;
        margin-bottom: 2px;
      }
      .estimate-title {
        text-align: right;
        font-size: 2rem;
        color: #181818;
        font-weight: 600;
        letter-spacing: 1px;
        text-shadow: 0 2px 12px #e0fcff30;
      }
      .estimate-meta {
        text-align: right;
        font-size: 1rem;
        color: #303030;
        line-height: 1.5;
      }
      .section {
        margin-bottom: 23px;
      }
      .section-title {
        font-size: 1.13rem;
        font-weight: bold;
        color: #181818;
        margin-bottom: 6px;
        letter-spacing: 0.5px;
        background: #e9fdff;
        padding: 4px 12px;
        border-left: 4px solid #14f0f8;
        border-radius: 6px 0 0 6px;
        display: inline-block;
        box-shadow: 0 1px 4px 0 #14f0f816;
      }
      .details-table {
        width: 100%;
        border-collapse: collapse;
        background: #e9fdff;
        border-radius: 7px;
        overflow: hidden;
        margin-bottom: 6px;
        box-shadow: 0 1.5px 6px 0 #10dbe222;
        border: 1.5px solid #14f0f8;
      }
      .details-table th,
      .details-table td {
        padding: 12px 9px;
        text-align: left;
        color: #181818;
      }
      .details-table th {
        background: #bafcff;
        color: #181818;
        font-size: 1.02rem;
        font-weight: 600;
        border-bottom: 1.5px solid #14f0f8;
      }
      .details-table td {
        border-bottom: 1px solid #e6fafd;
        font-size: 1rem;
      }
      .details-table tr:last-child td {
        border-bottom: none;
      }
      .totals-row {
        font-weight: 700;
        background: #bafcff;
        font-size: 1.09rem;
        color: #181818;
      }
      .project-details {
        font-size: 1.06rem;
        color: #233;
        margin: 16px 0 24px 0;
        padding: 18px 22px 13px 22px;
        background: #e1fbfc;
        border-radius: 8px;
        border-left: 4px solid #14f0f8;
        box-shadow: 0 2px 8px rgba(20, 240, 248, 0.07);
      }
      .client-contact a,
      .company-details a {
        display: inline-block;
        margin-right: 10px;
        padding: 4px 10px;
        color: #181818;
        background: #e6fcff;
        border-radius: 7px;
        text-decoration: none;
        font-weight: 500;
        font-size: 1.02rem;
        transition: background 0.2s;
        box-shadow: 0 0 7px 0 #10dbe225;
        border: 1px solid #14f0f8;
      }
      .client-contact a:hover,
      .company-details a:hover {
        background: #14f0f8;
        color: #181818;
      }
      .footer {
        text-align: right;
        margin-top: 16px;
        font-size: 0.89rem;
        color: #14f0f8;
        padding-top: 5px;
        border-top: 1.5px solid #bafcff;
        letter-spacing: 0.12px;
        font-family: "Segoe UI", Arial, sans-serif;
        text-shadow: 0 0 8px #10dbe233;
      }
      /* Responsive design mejorado */
      @media (max-width: 768px) {
        .container {
          padding: 20px 15px;
          margin: 10px;
          max-width: calc(100vw - 20px);
        }
        .header {
          flex-direction: column;
          align-items: flex-start;
        }
        .estimate-title {
          text-align: left;
          font-size: 1.5rem;
          margin-top: 15px;
        }
        .estimate-meta {
          text-align: left;
          margin-top: 10px;
        }
        .company-details {
          width: 100%;
        }
        .logo {
          margin-bottom: 12px;
        }

        /* Scrolling horizontal para tablas */
        .table-wrapper {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          margin-bottom: 15px;
          border-radius: 7px;
          box-shadow: 0 2px 8px rgba(20, 240, 248, 0.1);
        }

        .details-table {
          min-width: 600px;
          margin-bottom: 0;
        }

        .details-table th,
        .details-table td {
          padding: 8px 6px;
          font-size: 0.9rem;
          white-space: nowrap;
        }

        .section-title {
          font-size: 1rem;
          padding: 6px 10px;
        }

        .project-details {
          padding: 15px;
          font-size: 1rem;
        }

        .footer {
          text-align: center;
          font-size: 0.8rem;
        }
      }

      /* Tablet adjustments */
      @media (min-width: 769px) and (max-width: 1024px) {
        .container {
          max-width: 90%;
          padding: 30px;
        }

        .details-table th,
        .details-table td {
          padding: 10px 8px;
        }
      }

      /* Scrolling suave y optimizado */
      .table-wrapper {
        overflow-x: auto;
        overflow-y: hidden;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: thin;
        scrollbar-color: #14f0f8 #e9fdff;
      }

      .table-wrapper::-webkit-scrollbar {
        height: 8px;
      }

      .table-wrapper::-webkit-scrollbar-track {
        background: #e9fdff;
        border-radius: 4px;
      }

      .table-wrapper::-webkit-scrollbar-thumb {
        background: #14f0f8;
        border-radius: 4px;
      }

      .table-wrapper::-webkit-scrollbar-thumb:hover {
        background: #0bc5cc;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="company-details">
          <img src="[COMPANY_LOGO_URL]" alt="Company Logo" class="logo" />
          <div class="company-name">[Company Name]</div>
          <div class="company-address">[Company Address, City, State, ZIP]</div>
          <div>
            <a href="mailto:[COMPANY_EMAIL]">[COMPANY_EMAIL]</a>
            <a href="tel:[COMPANY_PHONE]">[COMPANY_PHONE]</a>
          </div>
        </div>
        <div>
          <div class="estimate-title">ESTIMATE</div>
          <div class="estimate-meta">
            <div><strong>Date:</strong> [Estimate Date]</div>
            <div><strong>Estimate #:</strong> [Estimate Number]</div>
            <div><strong>Valid Until:</strong> [Estimate Valid Until]</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Client</div>
        <div class="table-wrapper">
          <table class="details-table">
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Address</th>
            </tr>
            <tr>
              <td>[Client Name]</td>
              <td><a href="mailto:[Client Email]">[Client Email]</a></td>
              <td><a href="tel:[Client Phone]">[Client Phone]</a></td>
              <td>[Client Address]</td>
            </tr>
          </table>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Estimate Details</div>
        <div class="table-wrapper">
          <table class="details-table">
            <tr>
              <th>Item</th>
              <th>Description</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
            <!-- Repeat this row for each item -->
            <tr>
              <td>[Item Name]</td>
              <td>[Item Description]</td>
              <td>[Qty]</td>
              <td>[Unit Price]</td>
              <td>[Total]</td>
            </tr>
            <tr class="totals-row">
              <td colspan="4" style="text-align: right">Total</td>
              <td>[Grand Total]</td>
            </tr>
          </table>
        </div>
      </div>

      <div class="section project-details">
        <b>Scope:</b> [Scope of Work]<br />
        <b>Timeline:</b> [Estimated Completion Timeframe]<br />
        <b>Process:</b> [Work Process/Steps]<br />
        <b>Includes:</b> [Included Services or Materials]<br />
        <b>Excludes:</b> [Excluded Services or Materials]
      </div>

      <div class="section">
        <div class="section-title">Terms & Conditions</div>
        <div class="terms">
          <ul style="margin: 0 0 0 1.4em; padding: 0; color: #181818">
            <li>
              This estimate is valid for 30 days from the issue date. Prices may
              change after this period due to fluctuations in materials, labor,
              or market conditions.
            </li>
            <li>
              Project execution, specific terms, and additional conditions will
              be detailed in the formal contract to be signed by both parties.
            </li>
            <li>For questions, please contact us directly.</li>
          </ul>
        </div>
      </div>

      <div class="footer">
        &copy; [YEAR] [Your Company Name]. All Rights Reserved.
      </div>
    </div>
  </body>
</html>`;

/**
 * Obtiene el HTML del template premium, sin importar el estilo solicitado
 * @param templateStyle - Parámetro ignorado, siempre devuelve el template premium
 * @returns El HTML del template premium
 */
export function getTemplateHTML(templateStyle: string = 'standard'): string {
  console.log(`Solicitado template de estilo: ${templateStyle} - Retornando template Premium único`);
  return premiumTemplate;
}

/**
 * Agrega un nuevo template al almacén (función mantenida para compatibilidad)
 * @param name - Nombre/identificador del template (ignorado)
 * @param html - Contenido HTML del template (ignorado)
 */
export function addTemplate(name: string, html: string): void {
  console.log(`Solicitud de agregar template "${name}" ignorada - Usando únicamente template Premium`);
}