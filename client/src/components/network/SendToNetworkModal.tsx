/**
 * SendToNetworkModal
 * Modal to send a document (estimate, invoice, contract, permit) to a specific
 * LeadPrime Network user by @handle.
 * 
 * Usage:
 *   <SendToNetworkModal
 *     open={open}
 *     onClose={() => setOpen(false)}
 *     document={{ type: "estimate", reference: "EST-042", title: "Bathroom Reno", amount: 2400 }}
 *   />
 */
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getAuthHeaders } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Send,
  CheckCircle2,
  XCircle,
  Loader2,
  Globe,
  FileText,
  Receipt,
  Shield,
  ClipboardList,
  AtSign,
} from "lucide-react";
import { LeadPrimeDocType } from "@/hooks/use-leadprime-sync";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DocumentInfo {
  type: LeadPrimeDocType;
  reference: string;
  title: string;
  amount?: number;
  pdfUrl?: string;
  projectAddress?: string;
  docData?: {
    scope_of_work?: string;
    project_details?: string;
    line_items?: Array<{
      name: string;
      description?: string;
      quantity: number;
      unit?: string;
      price: number;
      total: number;
    }>;
    subtotal?: number;
    tax?: number;
    tax_rate?: number;
    discount_amount?: number;
    discount_name?: string;
    overhead_amount?: number;
    markup_amount?: number;
    operational_costs_amount?: number;
    total?: number;
    notes?: string;
    [key: string]: any;
  };
}

interface SendToNetworkModalProps {
  open: boolean;
  onClose: () => void;
  document: DocumentInfo;
}

type HandleStatus = "idle" | "checking" | "valid" | "invalid";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DOC_ICONS: Record<LeadPrimeDocType, React.ElementType> = {
  estimate: FileText,
  invoice: Receipt,
  contract: Shield,
  permit: ClipboardList,
  certificate: CheckCircle2,
  property_report: Globe,
};

const DOC_COLORS: Record<LeadPrimeDocType, string> = {
  estimate: "text-blue-400",
  invoice: "text-green-400",
  contract: "text-purple-400",
  permit: "text-amber-400",
  certificate: "text-teal-400",
  property_report: "text-cyan-400",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function SendToNetworkModal({ open, onClose, document }: SendToNetworkModalProps) {
  const { toast } = useToast();
  const [handle, setHandle] = useState("");
  const [handleStatus, setHandleStatus] = useState<HandleStatus>("idle");
  const [recipientName, setRecipientName] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const DocIcon = DOC_ICONS[document.type] ?? FileText;
  const docColor = DOC_COLORS[document.type] ?? "text-gray-400";

  // Reset on open
  useEffect(() => {
    if (open) {
      setHandle("");
      setHandleStatus("idle");
      setRecipientName("");
      setSent(false);
    }
  }, [open]);

  // Validate handle with debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const clean = handle.replace(/^@/, "").trim();
    if (clean.length < 3) {
      setHandleStatus("idle");
      setRecipientName("");
      return;
    }

    setHandleStatus("checking");
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await apiRequest(
          "GET",
          `/api/leadprime-network/validate-handle/${encodeURIComponent(clean)}`,
          undefined,
          { headers: getAuthHeaders() }
        );
        if (res.ok) {
          const data = await res.json();
          if (data.exists) {
            setHandleStatus("valid");
            setRecipientName(data.name || clean);
          } else {
            setHandleStatus("invalid");
            setRecipientName("");
          }
        } else {
          setHandleStatus("invalid");
          setRecipientName("");
        }
      } catch {
        setHandleStatus("idle");
      }
    }, 600);
  }, [handle]);

  const handleSend = async () => {
    const clean = handle.replace(/^@/, "").trim();
    if (!clean || handleStatus !== "valid") return;

    setIsSending(true);
    try {
      const res = await apiRequest(
        "POST",
        "/api/leadprime-network/send-document",
        {
          recipient_handle: clean,
          doc_type: document.type,
          doc_reference: document.reference,
          doc_title: document.title,
          amount: document.amount,
          pdf_url: document.pdfUrl,
          project_address: document.projectAddress,
          preview_text: `${document.type.charAt(0).toUpperCase() + document.type.slice(1)} · ${document.reference}${document.amount ? ` · $${document.amount.toLocaleString()}` : ""}`,
          ...(document.docData ? { doc_data: document.docData } : {}),
        },
        { headers: getAuthHeaders() }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to send");
      }

      setSent(true);
      toast({
        title: "✅ Sent via LeadPrime Network",
        description: `${document.reference} delivered to @${clean}'s inbox.`,
      });

      setTimeout(() => {
        onClose();
      }, 2500);
    } catch (err: any) {
      toast({
        title: "Send failed",
        description: err.message || "Could not send document.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-gray-900 border-gray-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-cyan-400" />
            Send via LeadPrime Network
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Deliver this document directly to a LeadPrime user's inbox
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          /* ── Success state ── */
          <div className="flex flex-col items-center py-8 gap-3">
            <CheckCircle2 className="w-14 h-14 text-green-400" />
            <p className="text-white font-semibold text-lg">Document Sent!</p>
            <p className="text-gray-400 text-sm text-center">
              @{handle.replace(/^@/, "")} will receive a notification in their LeadPrime inbox.
            </p>
          </div>
        ) : (
          <div className="space-y-5 pt-2">
            {/* Document preview */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/60 border border-gray-700/50">
              <div className="w-10 h-10 rounded-lg bg-gray-700/60 flex items-center justify-center">
                <DocIcon className={`w-5 h-5 ${docColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{document.title}</p>
                <p className="text-xs text-gray-400">
                  {document.reference}
                  {document.amount ? ` · $${document.amount.toLocaleString()}` : ""}
                </p>
              </div>
            </div>

            {/* Handle input */}
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm">Recipient @handle</Label>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  placeholder="gabriel_grpm"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white pl-9 pr-10"
                  autoComplete="off"
                  autoCapitalize="none"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {handleStatus === "checking" && (
                    <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                  )}
                  {handleStatus === "valid" && (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  )}
                  {handleStatus === "invalid" && (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                </div>
              </div>

              {/* Status messages */}
              {handleStatus === "valid" && recipientName && (
                <p className="text-xs text-green-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Found: <span className="font-semibold">{recipientName}</span>
                </p>
              )}
              {handleStatus === "invalid" && (
                <p className="text-xs text-red-400 flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5" />
                  User not found in LeadPrime Network
                </p>
              )}
              {handleStatus === "idle" && handle.length === 0 && (
                <p className="text-xs text-gray-500">
                  Enter the LeadPrime @handle of the recipient (e.g. <code className="text-cyan-400">gabriel_grpm</code>)
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1 border-gray-600 text-gray-300 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                disabled={handleStatus !== "valid" || isSending}
                className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white"
              >
                {isSending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" /> Send</>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
