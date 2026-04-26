import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Cpu, Shield, Zap, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * SharedEstimate — Unified view
 *
 * Instead of maintaining a separate React template that can drift from the PDF,
 * this page renders an <iframe> that loads the SAME HTML template used by the
 * Puppeteer PDF generator via GET /api/estimates/shared/:shareId/html.
 *
 * The only React UI around the iframe is:
 *  - Loading / error states
 *  - The "Approve Estimate" / "Approved" action bar at the bottom
 */
export default function SharedEstimate() {
  const { shareId } = useParams<{ shareId: string }>();
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const { toast } = useToast();

  // ─── Check approval state on mount ──────────────────────────────────────────
  useEffect(() => {
    if (!shareId) {
      setError("Invalid share link");
      setLoading(false);
      return;
    }
    // We only need to check approval status — the HTML iframe loads independently
    fetch(`/api/estimates/shared/${shareId}`)
      .then(r => r.json())
      .then(data => {
        if (!data.success) {
          setError(data.error || "Failed to load estimate");
        } else if (data.clientApproved) {
          setIsApproved(true);
        }
      })
      .catch(() => setError("Network error — please try again"))
      .finally(() => setLoading(false));
  }, [shareId]);

  // ─── Approve handler ─────────────────────────────────────────────────────────
  const handleApproveEstimate = async () => {
    if (!shareId) return;
    setIsApproving(true);
    try {
      const response = await fetch(`/api/estimates/shared/${shareId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setIsApproved(true);
        toast({
          title: "✅ Estimate Approved!",
          description: "Your approval has been recorded. The contractor will be notified.",
        });
      } else {
        throw new Error(result.error || "Failed to approve estimate");
      }
    } catch (err: any) {
      toast({
        title: "❌ Approval Failed",
        description: err.message || "Unable to approve estimate. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsApproving(false);
    }
  };

  // ─── Loading state ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-2 border-yellow-500 animate-pulse"></div>
            <div className="absolute inset-2 rounded-full border-2 border-red-500 animate-spin"></div>
            <div className="absolute inset-4 rounded-full border-2 border-blue-400 animate-ping"></div>
            <Cpu className="absolute inset-6 w-8 h-8 text-yellow-400 animate-pulse" />
          </div>
          <div className="text-yellow-400 font-bold text-xl tracking-wider mb-2">OWL FENC</div>
          <p className="text-gray-300 text-sm tracking-wider">Loading estimate…</p>
        </div>
      </div>
    );
  }

  // ─── Error state ──────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-red-900 flex items-center justify-center">
        <div className="relative max-w-md mx-4">
          <div className="absolute -inset-1 bg-gradient-to-r from-red-600 via-yellow-500 to-red-600 rounded-lg blur opacity-25 animate-pulse"></div>
          <div className="relative bg-black/90 backdrop-blur-sm border border-red-500/30 rounded-lg p-8 text-center">
            <div className="relative w-16 h-16 mx-auto mb-6">
              <div className="absolute inset-0 border-2 border-red-500 rounded-full animate-ping"></div>
              <div className="absolute inset-2 bg-red-500/20 rounded-full flex items-center justify-center">
                <Shield className="w-8 h-8 text-red-400 animate-pulse" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-red-400 mb-3 tracking-wider">ACCESS DENIED</h2>
            <p className="text-gray-300 text-sm leading-relaxed">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main view: unified HTML template in iframe + approve bar ────────────────
  const htmlUrl = `/api/estimates/shared/${shareId}/html`;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* ── Iframe: same HTML template as PDF ─────────────────────────────── */}
      <div className="flex-1 w-full">
        <iframe
          src={htmlUrl}
          title="Professional Estimate"
          className="w-full border-0"
          style={{ minHeight: "calc(100vh - 80px)", height: "100%" }}
          onLoad={() => {
            // Resize iframe to its content height once loaded
            const iframe = document.querySelector("iframe") as HTMLIFrameElement;
            if (iframe?.contentDocument?.body) {
              iframe.style.height =
                iframe.contentDocument.body.scrollHeight + "px";
            }
          }}
        />
      </div>

      {/* ── Approve bar ────────────────────────────────────────────────────── */}
      <div className="sticky bottom-0 w-full bg-gray-900 border-t border-gray-700 px-6 py-4 flex items-center justify-between gap-4 z-50">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Activity className="w-4 h-4 text-green-400 animate-pulse" />
          <span>Powered by Owl Fenc</span>
        </div>

        {!isApproved ? (
          <Button
            onClick={handleApproveEstimate}
            disabled={isApproving}
            className="bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-3 rounded-xl tracking-wide flex items-center gap-2"
          >
            {isApproving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing…</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>Approve Estimate</span>
              </>
            )}
          </Button>
        ) : (
          <div className="flex items-center gap-3 bg-green-900/60 border border-green-500/40 rounded-xl px-6 py-3">
            <CheckCircle className="w-6 h-6 text-green-400" />
            <span className="text-green-400 font-bold tracking-wide">Estimate Approved</span>
          </div>
        )}
      </div>
    </div>
  );
}
