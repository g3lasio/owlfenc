import React from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Activity,
} from "lucide-react";

// Helper function to convert polar coordinates to cartesian
function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

// Helper function to create SVG arc path
function createArcPath(
  x: number,
  y: number,
  radius: number,
  startAngle: number,
  endAngle: number
) {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    "M",
    start.x,
    start.y,
    "A",
    radius,
    radius,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
  ].join(" ");
}

// Segment data interface
interface Segment {
  label: string;
  value: number;
  color: string;
  glowColor: string;
}

// Unified Donut Chart Component
interface UnifiedPaymentDonutProps {
  segments: Segment[];
  totalValue: number;
  size?: number;
  innerRadius?: number;
  outerRadius?: number;
}

function UnifiedPaymentDonut({
  segments,
  totalValue,
  size = 700,
  innerRadius = 180,
  outerRadius = 280,
}: UnifiedPaymentDonutProps) {
  const centerX = size / 2;
  const centerY = size / 2;
  const ringThickness = outerRadius - innerRadius;

  // Calculate angles for each segment
  let currentAngle = 0;
  const segmentData = segments.map((segment) => {
    const percentage = totalValue > 0 ? (segment.value / totalValue) * 100 : 0;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    const midAngle = currentAngle + angle / 2;

    currentAngle = endAngle;

    return {
      ...segment,
      percentage,
      startAngle,
      endAngle,
      midAngle,
    };
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Label positions (outside the circle)
  const labelRadius = outerRadius + 80;

  return (
    <div className="relative flex items-center justify-center w-full">
      <svg
        width="100%"
        height="auto"
        viewBox={`0 0 ${size + 200} ${size + 120}`}
        className="mx-auto max-w-4xl"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Glow filters for each segment */}
          {segmentData.map((segment, index) => (
            <filter key={`glow-${index}`} id={`segment-glow-${index}`}>
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}

          {/* Gradients for segments */}
          {segmentData.map((segment, index) => (
            <linearGradient
              key={`gradient-${index}`}
              id={`segment-gradient-${index}`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" style={{ stopColor: segment.color, stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: segment.glowColor, stopOpacity: 0.7 }} />
            </linearGradient>
          ))}

          {/* Inner circle gradient */}
          <radialGradient id="inner-gradient">
            <stop offset="0%" style={{ stopColor: "#374151", stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: "#1f2937", stopOpacity: 1 }} />
          </radialGradient>

          {/* Starfield pattern */}
          <pattern id="starfield" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="0.5" fill="#ffffff" opacity="0.3" />
            <circle cx="50" cy="30" r="0.8" fill="#06b6d4" opacity="0.2" />
            <circle cx="80" cy="70" r="0.6" fill="#ffffff" opacity="0.4" />
            <circle cx="30" cy="85" r="0.4" fill="#10b981" opacity="0.3" />
          </pattern>
        </defs>

        {/* Background starfield */}
        <rect x="0" y="0" width={size + 200} height={size + 120} fill="url(#starfield)" opacity="0.3" />

        {/* Main group - centered */}
        <g transform={`translate(${(size + 200) / 2 - centerX}, ${(size + 120) / 2 - centerY})`}>
          {/* Outer ring segments */}
          {segmentData.map((segment, index) => {
            // Create donut segment path
            const outerArc = createArcPath(
              centerX,
              centerY,
              outerRadius,
              segment.startAngle,
              segment.endAngle
            );
            const innerArc = createArcPath(
              centerX,
              centerY,
              innerRadius,
              segment.endAngle,
              segment.startAngle
            );

            const outerStart = polarToCartesian(
              centerX,
              centerY,
              outerRadius,
              segment.endAngle
            );
            const innerStart = polarToCartesian(
              centerX,
              centerY,
              innerRadius,
              segment.endAngle
            );

            const donutPath = `
              ${outerArc}
              L ${innerStart.x} ${innerStart.y}
              ${innerArc}
              Z
            `;

            // Calculate label position
            const labelPos = polarToCartesian(
              centerX,
              centerY,
              labelRadius,
              segment.midAngle
            );

            // Calculate connector line start (just outside outer radius)
            const connectorStart = polarToCartesian(
              centerX,
              centerY,
              outerRadius + 5,
              segment.midAngle
            );

            // Determine text anchor based on position
            const textAnchor = labelPos.x > centerX ? "start" : "end";
            const textX = labelPos.x > centerX ? labelPos.x + 10 : labelPos.x - 10;

            return (
              <g key={index}>
                {/* Segment path */}
                <path
                  d={donutPath}
                  fill={`url(#segment-gradient-${index})`}
                  stroke={segment.glowColor}
                  strokeWidth="2"
                  filter={`url(#segment-glow-${index})`}
                  className="transition-all duration-500 hover:opacity-90 animate-in fade-in"
                  style={{
                    animationDelay: `${index * 0.1}s`,
                  }}
                />

                {/* Glowing dot at segment edge */}
                <circle
                  cx={connectorStart.x}
                  cy={connectorStart.y}
                  r="4"
                  fill={segment.color}
                  filter={`url(#segment-glow-${index})`}
                  className="animate-pulse"
                />

                {/* Connector line */}
                <line
                  x1={connectorStart.x}
                  y1={connectorStart.y}
                  x2={labelPos.x}
                  y2={labelPos.y}
                  stroke={segment.color}
                  strokeWidth="1.5"
                  opacity="0.6"
                  strokeDasharray="4,2"
                />

                {/* Label */}
                <g>
                  <text
                    x={textX}
                    y={labelPos.y - 12}
                    fill={segment.color}
                    fontSize="20"
                    fontWeight="700"
                    textAnchor={textAnchor}
                    className="font-sans uppercase tracking-wide"
                    filter={`url(#segment-glow-${index})`}
                  >
                    {segment.label}
                  </text>
                  <text
                    x={textX}
                    y={labelPos.y + 16}
                    fill="#ffffff"
                    fontSize="28"
                    fontWeight="800"
                    textAnchor={textAnchor}
                    className="font-sans"
                  >
                    {formatCurrency(segment.value)}
                  </text>
                  <text
                    x={textX}
                    y={labelPos.y + 38}
                    fill={segment.color}
                    fontSize="16"
                    fontWeight="600"
                    textAnchor={textAnchor}
                    className="font-sans"
                    opacity="0.8"
                  >
                    {segment.percentage.toFixed(1)}%
                  </text>
                </g>
              </g>
            );
          })}

          {/* Inner circle with gradient */}
          <circle
            cx={centerX}
            cy={centerY}
            r={innerRadius - 10}
            fill="url(#inner-gradient)"
            stroke="#4b5563"
            strokeWidth="3"
            opacity="0.9"
          />

          {/* Inner glow ring */}
          <circle
            cx={centerX}
            cy={centerY}
            r={innerRadius - 20}
            fill="none"
            stroke="#06b6d4"
            strokeWidth="1"
            opacity="0.3"
            className="animate-pulse"
          />

          {/* Total value in center */}
          <text
            x={centerX}
            y={centerY - 25}
            fill="#06b6d4"
            fontSize="22"
            fontWeight="700"
            textAnchor="middle"
            className="font-sans uppercase tracking-widest"
            filter="url(#segment-glow-0)"
          >
            Total
          </text>
          <text
            x={centerX}
            y={centerY + 20}
            fill="#ffffff"
            fontSize="48"
            fontWeight="900"
            textAnchor="middle"
            className="font-sans"
          >
            {formatCurrency(totalValue)}
          </text>
          <text
            x={centerX}
            y={centerY + 45}
            fill="#9ca3af"
            fontSize="16"
            fontWeight="500"
            textAnchor="middle"
            className="font-sans"
          >
            Payments
          </text>
        </g>
      </svg>
    </div>
  );
}

type PaymentSummary = {
  totalPending: number;
  totalPaid: number;
  totalOverdue: number;
  totalRevenue: number;
  pendingCount: number;
  paidCount: number;
};

interface FuturisticPaymentDashboardProps {
  paymentSummary: PaymentSummary;
  isLoading: boolean;
}

export default function FuturisticPaymentDashboard({
  paymentSummary,
  isLoading,
}: FuturisticPaymentDashboardProps) {
  const displaySummary = paymentSummary;

  if (isLoading) {
    return (
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-48">
            <div className="animate-pulse text-cyan-400">
              <Activity className="h-8 w-8 animate-spin" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate total for the unified chart
  const totalValue =
    displaySummary.totalRevenue +
    displaySummary.totalPending +
    displaySummary.totalPaid +
    displaySummary.totalOverdue;

  // Define segments with colors (matching reference image aesthetic)
  const segments: Segment[] = [
    {
      label: "Revenue",
      value: displaySummary.totalRevenue,
      color: "#06b6d4", // Cyan
      glowColor: "#22d3ee",
    },
    {
      label: "Pending",
      value: displaySummary.totalPending,
      color: "#fbbf24", // Yellow
      glowColor: "#fcd34d",
    },
    {
      label: "Paid",
      value: displaySummary.totalPaid,
      color: "#10b981", // Green
      glowColor: "#34d399",
    },
    {
      label: "Overdue",
      value: displaySummary.totalOverdue,
      color: "#ef4444", // Red
      glowColor: "#f87171",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Unified Futuristic Donut Chart */}
      <Card
        className="bg-gradient-to-br from-black via-gray-900 to-black border-gray-800/50 shadow-2xl overflow-hidden"
        data-testid="card-unified-payment-donut"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-purple-500/5 to-cyan-500/5 animate-pulse pointer-events-none" />
        <CardContent className="p-6 relative">
          <UnifiedPaymentDonut segments={segments} totalValue={totalValue} />
        </CardContent>
      </Card>
    </div>
  );
}
