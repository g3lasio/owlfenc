// ─── Estimate Settings Panel — Option B ───────────────────────────────────────
// Simple mode (default for beginners) + Advanced mode (full cost control)
// Covers: overhead, markup, tax, labor rates, operational costs, profit simulator
import React from "react";
import {
  Settings, DollarSign, TrendingUp, CheckCircle, HelpCircle,
  ChevronDown, ChevronUp, Zap, Shield, AlertCircle, Users,
  Truck, Building2, Target,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface EstimateSettings {
  // Core (used by AI engine — always active)
  defaultOverheadPercent: number;
  defaultMarkupPercent: number;
  defaultTaxRate: number;
  defaultProfitMargin: number;
  taxOnMaterialsOnly: boolean;
  showProfitOnEstimate: boolean;
  currency: string;
  // Advanced labor defaults
  defaultLaborRatePerHour: number;
  defaultCrewSize: number;
  defaultEstimatorRate: number;
  // Advanced operational cost defaults
  defaultFuelCostPerProject: number;
  defaultMiscCostPercent: number;
  defaultDumpFeePerProject: number;
  // UI mode
  settingsMode: "simple" | "advanced";
}

const DEFAULTS: EstimateSettings = {
  defaultOverheadPercent: 15,
  defaultMarkupPercent: 20,
  defaultTaxRate: 8.5,
  defaultProfitMargin: 0,
  taxOnMaterialsOnly: true,
  showProfitOnEstimate: false,
  currency: "USD",
  defaultLaborRatePerHour: 25,
  defaultCrewSize: 3,
  defaultEstimatorRate: 35,
  defaultFuelCostPerProject: 150,
  defaultMiscCostPercent: 3,
  defaultDumpFeePerProject: 0,
  settingsMode: "simple",
};

// ─── Tooltip ──────────────────────────────────────────────────────────────────
function Tip({ text }: { text: string }) {
  const [show, setShow] = React.useState(false);
  return (
    <span className="relative inline-block ml-1 align-middle">
      <HelpCircle
        className="h-3.5 w-3.5 text-gray-500 cursor-pointer hover:text-cyan-400"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      />
      {show && (
        <span className="absolute z-50 left-5 top-0 w-60 bg-gray-800 border border-cyan-500/30 text-gray-300 text-xs rounded-lg p-2.5 shadow-2xl leading-relaxed">
          {text}
        </span>
      )}
    </span>
  );
}

// ─── Slider Row ───────────────────────────────────────────────────────────────
function SliderRow({
  label, tip, value, min, max, step, prefix = "", suffix = "%",
  accentClass = "accent-cyan-400", valueClass = "text-cyan-400",
  hint, onChange,
}: {
  label: string; tip?: string; value: number; min: number; max: number;
  step: number; prefix?: string; suffix?: string;
  accentClass?: string; valueClass?: string;
  hint?: string; onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="block text-sm text-gray-300 mb-2 leading-tight">
        {label}
        {tip && <Tip text={tip} />}
      </label>
      <div className="flex items-center gap-3">
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className={`flex-1 h-1.5 rounded-full ${accentClass}`}
        />
        <span className={`${valueClass} font-bold w-16 text-right text-sm tabular-nums`}>
          {prefix}{value}{suffix}
        </span>
      </div>
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

// ─── Toggle Row ───────────────────────────────────────────────────────────────
function ToggleRow({
  label, sub, value, onChange,
}: { label: string; sub?: string; value: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700">
      <div>
        <p className="text-sm text-gray-300 font-medium">{label}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
      <button
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          value ? "bg-cyan-500" : "bg-gray-600"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            value ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

// ─── Profit Health Badge ──────────────────────────────────────────────────────
function ProfitBadge({ margin }: { margin: number }) {
  if (margin >= 20)
    return <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs font-bold">🟢 Healthy ({margin.toFixed(1)}%)</span>;
  if (margin >= 10)
    return <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-bold">🟡 Thin ({margin.toFixed(1)}%)</span>;
  if (margin > 0)
    return <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-xs font-bold">🟠 Risky ({margin.toFixed(1)}%)</span>;
  return <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-bold">🔴 Losing Money ({margin.toFixed(1)}%)</span>;
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, label, color = "text-gray-300" }: {
  icon: React.ElementType; label: string; color?: string;
}) {
  return (
    <h4 className={`text-sm font-semibold ${color} flex items-center gap-2`}>
      <Icon className="h-4 w-4" />
      {label}
    </h4>
  );
}

// ─── Info Banner ──────────────────────────────────────────────────────────────
function InfoBanner({ color, children }: { color: "blue" | "purple" | "yellow"; children: React.ReactNode }) {
  const styles = {
    blue:   "bg-blue-500/10 border-blue-500/30 text-blue-300",
    purple: "bg-purple-500/10 border-purple-500/20 text-purple-300",
    yellow: "bg-yellow-500/10 border-yellow-500/20 text-yellow-300",
  };
  return (
    <div className={`border rounded-lg p-3 text-xs leading-relaxed ${styles[color]}`}>
      {children}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function EstimateSettingsPanel({
  settings,
  onSave,
}: {
  settings: any;
  onSave: (s: any) => void;
}) {
  const [local, setLocal] = React.useState<EstimateSettings>({
    ...DEFAULTS,
    ...settings,
  });
  const [saved, setSaved] = React.useState(false);
  const [showSimulator, setShowSimulator] = React.useState(false);

  const set = <K extends keyof EstimateSettings>(key: K, val: EstimateSettings[K]) =>
    setLocal(prev => ({ ...prev, [key]: val }));

  const handleSave = () => {
    onSave(local);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const isAdvanced = local.settingsMode === "advanced";

  // ── Live Simulator (90 LF wood fence @ $65/LF) ────────────────────────────
  const REV = 90 * 65; // $5,850
  const mat = REV * 0.50;
  const laborHrs = local.defaultCrewSize * 3 * 8;
  const laborCost = laborHrs * local.defaultLaborRatePerHour;
  const fuel = local.defaultFuelCostPerProject;
  const dump = local.defaultDumpFeePerProject;
  const misc = (REV * local.defaultMiscCostPercent) / 100;
  const overhead = (REV * local.defaultOverheadPercent) / 100;
  const tax = local.taxOnMaterialsOnly
    ? (mat * local.defaultTaxRate) / 100
    : (REV * local.defaultTaxRate) / 100;
  const totalCost = mat + laborCost + fuel + dump + misc + overhead + tax;
  const netProfit = REV - totalCost;
  const netMargin = REV > 0 ? (netProfit / REV) * 100 : 0;

  // ── AI Formula Preview (standard $10k COGS) ───────────────────────────────
  const COGS = 10000;
  const MAT_DEMO = 5000;
  const pOverhead = (COGS * local.defaultOverheadPercent) / 100;
  const pMarkup   = (COGS * local.defaultMarkupPercent) / 100;
  const pTax      = local.taxOnMaterialsOnly
    ? (MAT_DEMO * local.defaultTaxRate) / 100
    : (COGS * local.defaultTaxRate) / 100;
  const pTotal    = COGS + pOverhead + pMarkup + pTax;
  const pMargin   = ((pTotal - COGS) / pTotal) * 100;

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-10">

      {/* ── Header ── */}
      <div className="cyber-panel p-5">
        <h3 className="text-xl font-bold text-purple-400 mb-1 flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Estimate Settings
        </h3>
        <p className="text-gray-400 text-sm">
          Configure how Owl Fenc calculates costs and profits for every estimate.
          These settings are <strong className="text-gray-300">private</strong> — your clients never see them.
        </p>
      </div>

      {/* ── Mode Toggle ── */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
        <p className="text-xs text-gray-500 mb-3 font-semibold uppercase tracking-wider">
          Settings Mode
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => set("settingsMode", "simple")}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
              !isAdvanced
                ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                : "border-gray-700 text-gray-500 hover:border-gray-500"
            }`}
          >
            <Zap className="h-5 w-5" />
            <span className="text-sm font-bold">Simple</span>
            <span className="text-xs text-center opacity-70 leading-tight">
              Markup &amp; overhead — AI handles the rest
            </span>
          </button>
          <button
            onClick={() => set("settingsMode", "advanced")}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
              isAdvanced
                ? "border-purple-500 bg-purple-500/10 text-purple-400"
                : "border-gray-700 text-gray-500 hover:border-gray-500"
            }`}
          >
            <Shield className="h-5 w-5" />
            <span className="text-sm font-bold">Advanced</span>
            <span className="text-xs text-center opacity-70 leading-tight">
              Full cost control — labor, fuel, overhead, misc
            </span>
          </button>
        </div>
      </div>

      {/* ── Core Pricing (always visible) ── */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 space-y-5">
        <SectionHeader icon={DollarSign} label="Pricing & Profit Defaults" color="text-gray-300" />

        <InfoBanner color="blue">
          <strong className="text-blue-400">💡 Business Overhead</strong> — tus costos fijos que existen aunque no trabajes:
          seguro, licencias, renta de oficina, pagos de troca, teléfono, contabilidad.
          El AI los añade automáticamente a cada estimado para que nunca los olvides.
          Promedio de la industria: <strong>15–25%</strong>.
        </InfoBanner>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SliderRow
            label="Business Overhead %"
            tip="Tus costos fijos de negocio como porcentaje del proyecto. Incluye: seguro, licencias, renta, pagos de troca, teléfono. Existen aunque no trabajes."
            value={local.defaultOverheadPercent}
            min={0} max={50} step={1}
            hint="Industry average: 15–25%"
            onChange={v => set("defaultOverheadPercent", v)}
          />
          <SliderRow
            label="Default Markup % (Your Profit)"
            tip="Ganancia que añades encima de TODOS los costos (materiales + labor + overhead). Es tu margen bruto objetivo. Contratistas de fencing típicamente usan 20–35%."
            value={local.defaultMarkupPercent}
            min={0} max={100} step={1}
            accentClass="accent-purple-400"
            valueClass="text-purple-400"
            hint="Industry average: 20–35%"
            onChange={v => set("defaultMarkupPercent", v)}
          />
          <SliderRow
            label="Sales Tax Rate %"
            tip="Tu tasa de impuesto de ventas local. En la mayoría de estados de USA aplica solo a materiales. Varía de 0% (OR, MT) a 10.75% (MA)."
            value={local.defaultTaxRate}
            min={0} max={15} step={0.25}
            accentClass="accent-yellow-400"
            valueClass="text-yellow-400"
            hint="US range: 0% (OR, MT) to 10.75% (MA)"
            onChange={v => set("defaultTaxRate", v)}
          />
          <SliderRow
            label="Target Net Profit Margin %"
            tip="Tu ganancia neta objetivo después de TODOS los costos. 0% = deja que el markup lo maneje. Usa esto si quieres que el AI apunte a un margen neto específico por proyecto."
            value={local.defaultProfitMargin}
            min={0} max={50} step={1}
            accentClass="accent-green-400"
            valueClass="text-green-400"
            hint="0% = use markup only. Healthy target: 15–20%"
            onChange={v => set("defaultProfitMargin", v)}
          />
        </div>

        <div className="space-y-2">
          <ToggleRow
            label="Apply tax to materials only"
            sub="Most US states: sales tax applies to materials only, not labor"
            value={local.taxOnMaterialsOnly}
            onChange={() => set("taxOnMaterialsOnly", !local.taxOnMaterialsOnly)}
          />
        </div>
      </div>

      {/* ── Advanced: Labor Costs ── */}
      {isAdvanced && (
        <div className="bg-gray-900 border border-purple-500/30 rounded-xl p-5 space-y-5">
          <SectionHeader icon={Users} label="Labor Cost Defaults" color="text-purple-400" />

          <InfoBanner color="purple">
            <strong className="text-purple-400">💡 Labor Cost</strong> — el salario que le pagas a tu cuadrilla.
            Ejemplo real: 3 trabajadores × 3 días × 8 hrs = <strong>72 horas</strong> × $25/hr = <strong>$1,800 en labor</strong>.
            El AI usa estos defaults cuando no especificas labor en el estimado.
          </InfoBanner>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <SliderRow
              label="Labor Rate ($/hr per worker)"
              tip="Salario por hora que le pagas a cada trabajador de tu cuadrilla. No incluye tu propio tiempo — ese va en Estimator Rate."
              value={local.defaultLaborRatePerHour}
              min={10} max={100} step={1}
              prefix="$" suffix=""
              accentClass="accent-purple-400"
              valueClass="text-purple-400"
              hint="Typical fencing crew: $18–$35/hr"
              onChange={v => set("defaultLaborRatePerHour", v)}
            />
            <SliderRow
              label="Default Crew Size"
              tip="Cuántos trabajadores mandas típicamente a un proyecto. Se usa para calcular las horas totales de labor."
              value={local.defaultCrewSize}
              min={1} max={10} step={1}
              suffix=" workers"
              accentClass="accent-purple-400"
              valueClass="text-purple-400"
              hint="Typical fencing crew: 2–4 workers"
              onChange={v => set("defaultCrewSize", v)}
            />
            <SliderRow
              label="Estimator Rate ($/hr)"
              tip="Tu tiempo (o el de tu vendedor) para medir, cotizar y dar seguimiento. Típicamente 1–3 horas por estimado a $35–$75/hr. Tu tiempo tiene valor — no lo regales."
              value={local.defaultEstimatorRate}
              min={0} max={150} step={5}
              prefix="$" suffix=""
              accentClass="accent-cyan-400"
              valueClass="text-cyan-400"
              hint="Your time has value — don't give it away free"
              onChange={v => set("defaultEstimatorRate", v)}
            />
          </div>
        </div>
      )}

      {/* ── Advanced: Operational Costs ── */}
      {isAdvanced && (
        <div className="bg-gray-900 border border-yellow-500/30 rounded-xl p-5 space-y-5">
          <SectionHeader icon={Truck} label="Operational Cost Defaults (Per Project)" color="text-yellow-400" />

          <InfoBanner color="yellow">
            <strong className="text-yellow-400">💡 Costos Operativos Ocultos</strong> — estos son los costos que la mayoría
            de contratistas olvida cobrar y por eso terminan con menos dinero del esperado.
            Gasolina, dump fees y misceláneos se comen tu ganancia en cada proyecto.
          </InfoBanner>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <SliderRow
              label="Fuel / Transportation ($)"
              tip="Costo promedio de gasolina por proyecto — viajes al sitio, recoger materiales, múltiples viajes. Un proyecto de 90 LF puede costar $100–$200 en gasolina."
              value={local.defaultFuelCostPerProject}
              min={0} max={500} step={10}
              prefix="$" suffix=""
              accentClass="accent-yellow-400"
              valueClass="text-yellow-400"
              hint="Typical: $50–$250 per project"
              onChange={v => set("defaultFuelCostPerProject", v)}
            />
            <SliderRow
              label="Dump / Disposal Fee ($)"
              tip="Costo de tirar materiales viejos, tierra, concreto. Varía de $0 si el cliente lo maneja, hasta $300+ para trabajos grandes de remoción."
              value={local.defaultDumpFeePerProject}
              min={0} max={500} step={10}
              prefix="$" suffix=""
              accentClass="accent-yellow-400"
              valueClass="text-yellow-400"
              hint="$0 if no removal, $50–$300 with removal"
              onChange={v => set("defaultDumpFeePerProject", v)}
            />
            <SliderRow
              label="Misc / Contingency %"
              tip="Buffer para costos inesperados — brocas rotas, hardware extra, un trabajador que no llegó. 3–5% del costo del proyecto es estándar."
              value={local.defaultMiscCostPercent}
              min={0} max={15} step={0.5}
              accentClass="accent-yellow-400"
              valueClass="text-yellow-400"
              hint="Recommended: 3–5% of project cost"
              onChange={v => set("defaultMiscCostPercent", v)}
            />
          </div>
        </div>
      )}

      {/* ── Advanced: Real Project Simulator ── */}
      {isAdvanced && (
        <div className="bg-gray-900 border border-cyan-500/20 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowSimulator(!showSimulator)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-800/40 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-semibold text-cyan-400">
                Real Project Simulator
              </span>
              <span className="text-xs text-gray-500">
                (90 LF wood fence @ $65/LF = $5,850)
              </span>
            </div>
            <div className="flex items-center gap-3">
              <ProfitBadge margin={netMargin} />
              {showSimulator
                ? <ChevronUp className="h-4 w-4 text-gray-400" />
                : <ChevronDown className="h-4 w-4 text-gray-400" />}
            </div>
          </button>

          {showSimulator && (
            <div className="px-5 pb-5 border-t border-gray-800 space-y-1.5 text-sm font-mono">
              <p className="text-xs text-gray-500 pt-3 pb-1">
                Simulación con tus settings actuales aplicados a un proyecto real de 90 LF de cerca de madera:
              </p>

              <div className="flex justify-between text-white font-bold">
                <span>📋 Revenue (90 LF × $65)</span>
                <span>${REV.toLocaleString()}</span>
              </div>
              <div className="border-t border-gray-800 my-1" />

              <div className="flex justify-between text-red-400">
                <span>🪵 Materials (~50%)</span>
                <span>−${mat.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-red-400">
                <span>👷 Labor ({local.defaultCrewSize} workers × 3 days × 8h × ${local.defaultLaborRatePerHour}/hr)</span>
                <span>−${laborCost.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-yellow-400">
                <span>⛽ Fuel / Transportation</span>
                <span>−${fuel.toFixed(0)}</span>
              </div>
              {dump > 0 && (
                <div className="flex justify-between text-yellow-400">
                  <span>🗑️ Dump / Disposal</span>
                  <span>−${dump.toFixed(0)}</span>
                </div>
              )}
              <div className="flex justify-between text-yellow-400">
                <span>🔧 Misc / Contingency ({local.defaultMiscCostPercent}%)</span>
                <span>−${misc.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-orange-400">
                <span>🏢 Business Overhead ({local.defaultOverheadPercent}%)</span>
                <span>−${overhead.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-cyan-400">
                <span>🧾 Sales Tax ({local.defaultTaxRate}% on materials)</span>
                <span>−${tax.toFixed(0)}</span>
              </div>

              <div className="border-t border-gray-700 pt-2 flex justify-between font-bold">
                <span className="text-gray-300">Total Costs</span>
                <span className="text-red-400">−${totalCost.toFixed(0)}</span>
              </div>
              <div className={`flex justify-between font-bold text-lg pt-1 border-t border-gray-700 ${netProfit >= 0 ? "text-green-400" : "text-red-500"}`}>
                <span>💰 Net Profit</span>
                <span>${netProfit.toFixed(0)} <span className="text-sm">({netMargin.toFixed(1)}%)</span></span>
              </div>

              {netMargin < 10 && (
                <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-300">
                  <AlertCircle className="h-3.5 w-3.5 inline mr-1" />
                  <strong>Atención:</strong> Con estos settings, un proyecto de $5,850 solo deja ${netProfit.toFixed(0)}.
                  Considera aumentar tu markup o reducir costos. Los contratistas exitosos apuntan a 15–25% neto.
                </div>
              )}
              {netMargin >= 20 && (
                <div className="mt-3 bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-xs text-green-300">
                  <CheckCircle className="h-3.5 w-3.5 inline mr-1" />
                  <strong>Sólido.</strong> Te quedas ${netProfit.toFixed(0)} ({netMargin.toFixed(1)}%) de este proyecto. Ese es un margen saludable.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── AI Formula Preview (always visible) ── */}
      <div className="bg-gray-900 border border-green-500/30 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          AI Estimate Formula Preview
          <span className="text-xs text-gray-500 font-normal">
            (based on $10,000 direct costs, $5,000 materials)
          </span>
        </h4>
        <div className="space-y-1.5 text-sm font-mono">
          <div className="flex justify-between text-gray-400">
            <span>Direct Costs (materials + labor)</span><span>$10,000</span>
          </div>
          <div className="flex justify-between text-yellow-400">
            <span>+ Business Overhead ({local.defaultOverheadPercent}%)</span>
            <span>+${pOverhead.toFixed(0)}</span>
          </div>
          <div className="flex justify-between text-purple-400">
            <span>+ Markup / Profit ({local.defaultMarkupPercent}%)</span>
            <span>+${pMarkup.toFixed(0)}</span>
          </div>
          <div className="flex justify-between text-cyan-400">
            <span>+ Sales Tax ({local.defaultTaxRate}% on materials)</span>
            <span>+${pTax.toFixed(0)}</span>
          </div>
          <div className="border-t border-gray-700 pt-2 flex justify-between text-white font-bold text-base">
            <span>Client Pays</span>
            <span className="text-cyan-400">${pTotal.toFixed(0)}</span>
          </div>
          <div className="flex justify-between text-xs pt-1">
            <span className="text-gray-500">Your gross margin on this estimate</span>
            <ProfitBadge margin={pMargin} />
          </div>
        </div>
      </div>

      {/* ── Display Options ── */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 space-y-3">
        <SectionHeader icon={Building2} label="Display Options" />
        <ToggleRow
          label="Show profit line on client estimate"
          sub="When ON, clients can see your profit amount. Most contractors keep this OFF."
          value={local.showProfitOnEstimate}
          onChange={() => set("showProfitOnEstimate", !local.showProfitOnEstimate)}
        />
      </div>

      {/* ── Save ── */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all text-sm ${
            saved
              ? "bg-green-500 text-black"
              : "bg-purple-600 hover:bg-purple-500 text-white"
          }`}
        >
          {saved ? <CheckCircle className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
          {saved ? "Settings Saved!" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
