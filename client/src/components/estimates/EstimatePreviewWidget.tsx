import { Building2, CheckCircle } from "lucide-react";
import { z } from "zod";

const estimateItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  quantity: z.number(),
  unit: z.string(),
  unitPrice: z.number(),
  total: z.number(),
});

const clientSchema = z.object({
  name: z.string(),
  phone: z.string(),
  email: z.string(),
  address: z.string(),
});

const contractorSchema = z.object({
  name: z.string(),
  address: z.string(),
  phone: z.string(),
  email: z.string(),
  license: z.string(),
  logo: z.string().optional(),
});

const projectSchema = z.object({
  description: z.string(),
});

const estimateSchema = z.object({
  id: z.string(),
  number: z.string(),
  date: z.string(),
  validUntil: z.string(),
  client: clientSchema,
  contractorInfo: contractorSchema,
  project: projectSchema,
  items: z.array(estimateItemSchema),
  subtotal: z.number(),
  taxRate: z.number(),
  taxAmount: z.number(),
  discount: z.number(),
  total: z.number(),
  terms: z.array(z.string()),
});

type Estimate = z.infer<typeof estimateSchema>;

interface EstimatePreviewWidgetProps {
  estimate: Estimate;
}

export default function EstimatePreviewWidget({
  estimate,
}: EstimatePreviewWidgetProps) {
  return (
    <div className="max-w-5xl mx-auto my-8 bg-white rounded-xl shadow-2xl overflow-auto">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 to-cyan-500/10"></div>
        <div className="relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div className="flex items-center space-x-6">
              <div className="logo-placeholder w-32 h-32 text-lg">
                <img src={estimate.contractorInfo.logo} alt="Logo" />
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-2 tracking-wide uppercase">
                  {estimate.contractorInfo.name}
                </h1>

                <div className="space-y-1 text-gray-300">
                  <p className="text-sm">{estimate.contractorInfo.address}</p>
                  <p className="text-sm">
                    Phone: {estimate.contractorInfo.phone}
                  </p>
                  <p className="text-sm">
                    Email: {estimate.contractorInfo.email}
                  </p>
                  <p className="text-sm">
                    License #: {estimate.contractorInfo.license}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-white/20">
              <h2 className="text-2xl font-light mb-6 text-center tracking-wider">
                ESTIMATE
              </h2>
              <div className="space-y-3 text-center">
                <p className="text-sm">
                  <span className="font-medium">Estimate #:</span>{" "}
                  {estimate.number}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Date:</span> {estimate.date}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Valid Until:</span>{" "}
                  {estimate.validUntil}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-10 space-y-10">
        {/* Project Information */}
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-6 border-b-3 border-cyan-400 pb-3 relative">
            PROJECT INFORMATION
            <div className="absolute bottom-0 left-0 w-16 h-1 bg-cyan-500"></div>
          </h3>
          <div className="grid grid-cols-1 gap-8">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-8 border-l-4 border-cyan-400 shadow-lg template-hover">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                Client Details
              </h4>
              <div className="space-y-2">
                <p className="text-gray-900 text-sm">
                  Name:
                  <span className="">
                    {" "}
                    {estimate.client.name.toUpperCase()}
                  </span>
                </p>
                <p className="text-gray-700 text-sm">
                  Phone: {estimate.client.phone}
                </p>
                <p className="text-gray-700 text-sm">
                  Email: {estimate.client.email}
                </p>
                <p className="text-gray-700 text-sm">
                  Address: {estimate.client.address}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl p-8 mt-8 border-l-4 border-cyan-500 shadow-lg relative">
            <div className="absolute top-4 left-4 text-6xl text-cyan-500/20">
              "
            </div>
            <p className="text-sm text-gray-800 leading-relaxed ml-8">
              {estimate.project.description}
            </p>
          </div>
        </div>

        {/* Detailed Cost Breakdown */}
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-6 border-b-3 border-cyan-400 pb-3 relative">
            DETAILED COST BREAKDOWN
            <div className="absolute bottom-0 left-0 w-16 h-1 bg-cyan-500"></div>
          </h3>
          <div>
            <table className="w-full bg-white rounded-xl shadow-lg overflow-hidden">
              <thead className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold">Item</th>
                  <th className="px-6 py-4 text-left font-semibold">
                    Description
                  </th>
                  <th className="px-6 py-4 text-center font-semibold">Qty</th>
                  <th className="px-6 py-4 text-right font-semibold">
                    Unit Price
                  </th>
                  <th className="px-6 py-4 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {estimate.items.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {item.description}
                    </td>
                    <td className="px-6 py-4 text-center text-gray-700">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-700">
                      $
                      {item.unitPrice.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      $
                      {item.total.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Enhanced Totals */}
          <div className="bg-gradient-to-br text-gray-800 from-gray-50 to-gray-100 rounded-xl p-8 mt-8 shadow-lg border border-gray-200">
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm border-t border-gray-300 pt-4">
                <span className="font-semibold">Subtotal:</span>
                <span className="font-semibold">
                  $
                  {estimate.subtotal.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold">
                  Tax ({estimate.taxRate.toFixed(1)}%):
                </span>
                <span className="font-semibold">
                  $
                  {estimate.taxAmount.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold">Discount:</span>
                <span className="font-semibold">
                  $
                  {estimate.discount.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center text-xl font-bold text-construction-blue pt-4 border-t-2 border-construction-green">
                <span>TOTAL ESTIMATE:</span>
                <span>
                  $
                  {estimate.total.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Terms & Conditions */}
        <div className="bg-gradient-to-br from-yellow-50 to-amber-100 border border-yellow-300 rounded-xl p-8 shadow-lg">
          <h3 className="text-xl font-bold text-yellow-800 mb-6">
            Terms & Conditions
          </h3>
          <ul className="space-y-3 text-yellow-700">
            {estimate.terms.map((term, index) => (
              <li key={index} className="flex items-start">
                <CheckCircle className="h-6 w-6 text-construction-green mr-3 mt-0.5 flex-shrink-0" />
                <span className="font-medium">{term}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Signature Section */}
        {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-gray-200">
          <div className="bg-gray-50 rounded-xl p-6 text-center">
            <div className="border-b-2 border-gray-400 mb-4 h-12"></div>
            <p className="font-semibold text-gray-700">Contractor Signature</p>
            <p className="text-sm text-gray-600">{estimate.contractor.name}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-6 text-center">
            <div className="border-b-2 border-gray-400 mb-4 h-12"></div>
            <p className="font-semibold text-gray-700">Client Signature</p>
            <p className="text-sm text-gray-600">{estimate.client.name}</p>
          </div>
        </div> */}
      </div>

      {/* Footer */}
      <div className="bg-slate-800 text-white p-6 text-center">
        <p className="text-sm">
          Powered by{" "}
          <span className="font-semibold" style={{ color: "#44eaf4" }}>
            Mervin AI
          </span>{" "}
          - Professional Construction Management Solutions
        </p>
      </div>
    </div>
  );
}
