/**
 * LeadPrime Network Integration Page
 * Owl Fenc → LeadPrime Network connection
 * Allows contractors to link their Owl Fenc account with LeadPrime
 * and sync documents automatically.
 */
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getAuthHeaders } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Link2,
  Link2Off,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
  Zap,
  FileText,
  Receipt,
  Shield,
  ClipboardList,
  AlertCircle,
  Copy,
  Eye,
  EyeOff,
  ArrowRight,
  Globe,
  Info,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface LeadPrimeConnection {
  connected: boolean;
  handle?: string;
  connectedAt?: string;
  lastSync?: string;
  syncedDocs?: number;
  token?: string; // masked
}

interface SyncStatus {
  estimates: number;
  invoices: number;
  contracts: number;
  permits: number;
  lastSyncAt: string | null;
}

// ─── LEADPRIME_BASE_URL ───────────────────────────────────────────────────────
const LEADPRIME_BASE = "https://leadprime.chyrris.com";

// ─── Component ───────────────────────────────────────────────────────────────

export default function LeadPrimeNetwork() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [apiToken, setApiToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // ── Fetch connection status ────────────────────────────────────────────────
  const { data: connection, isLoading: loadingConnection } = useQuery<LeadPrimeConnection>({
    queryKey: ["leadprime-connection"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/leadprime-network/connection", undefined, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return { connected: false };
      return res.json();
    },
    refetchInterval: 30000,
  });

  // ── Fetch sync status ──────────────────────────────────────────────────────
  const { data: syncStatus } = useQuery<SyncStatus>({
    queryKey: ["leadprime-sync-status"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/leadprime-network/sync-status", undefined, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return { estimates: 0, invoices: 0, contracts: 0, permits: 0, lastSyncAt: null };
      return res.json();
    },
    enabled: connection?.connected === true,
    refetchInterval: 60000,
  });

  // ── Connect mutation ───────────────────────────────────────────────────────
  const connectMutation = useMutation({
    mutationFn: async (token: string) => {
      const res = await apiRequest("POST", "/api/leadprime-network/connect", { token }, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to connect");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "✅ Connected to LeadPrime Network!",
        description: `Your account is now linked as @${data.handle}. Documents will sync automatically.`,
      });
      setApiToken("");
      queryClient.invalidateQueries({ queryKey: ["leadprime-connection"] });
      queryClient.invalidateQueries({ queryKey: ["leadprime-sync-status"] });
    },
    onError: (err: Error) => {
      toast({
        title: "Connection failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // ── Disconnect mutation ────────────────────────────────────────────────────
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/leadprime-network/connection", undefined, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to disconnect");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Disconnected",
        description: "Your Owl Fenc account has been unlinked from LeadPrime Network.",
      });
      queryClient.invalidateQueries({ queryKey: ["leadprime-connection"] });
      queryClient.invalidateQueries({ queryKey: ["leadprime-sync-status"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not disconnect. Try again.", variant: "destructive" });
    },
  });

  // ── Manual sync ───────────────────────────────────────────────────────────
  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const res = await apiRequest("POST", "/api/leadprime-network/sync", undefined, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Sync failed");
      const data = await res.json();
      toast({
        title: "Sync complete",
        description: `${data.synced || 0} documents synced to LeadPrime.`,
      });
      queryClient.invalidateQueries({ queryKey: ["leadprime-sync-status"] });
    } catch {
      toast({ title: "Sync failed", description: "Could not sync documents.", variant: "destructive" });
    } finally {
      setIsSyncing(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  const syncItems = [
    { icon: FileText, label: "Estimates", count: syncStatus?.estimates ?? 0, color: "text-blue-400" },
    { icon: Receipt, label: "Invoices", count: syncStatus?.invoices ?? 0, color: "text-green-400" },
    { icon: Shield, label: "Contracts", count: syncStatus?.contracts ?? 0, color: "text-purple-400" },
    { icon: ClipboardList, label: "Permits", count: syncStatus?.permits ?? 0, color: "text-amber-400" },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
          <Globe className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">LeadPrime Network</h1>
          <p className="text-sm text-gray-400">Connect your Owl Fenc account to the LeadPrime ecosystem</p>
        </div>
        {connection?.connected && (
          <Badge className="ml-auto bg-green-500/20 text-green-400 border-green-500/30 gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Connected
          </Badge>
        )}
      </div>

      {/* ── How it works ── */}
      {!connection?.connected && (
        <Card className="bg-gray-900/60 border-gray-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-300 flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-400" />
              How it works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { step: "1", icon: ExternalLink, text: "Go to LeadPrime → Settings → Integrations → Owl Fenc" },
              { step: "2", icon: Copy, text: "Generate your API token and copy it" },
              { step: "3", icon: Link2, text: "Paste the token below to link your accounts" },
              { step: "4", icon: Zap, text: "Your documents sync automatically to LeadPrime My Projects" },
            ].map(({ step, icon: Icon, text }) => (
              <div key={step} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-cyan-400">{step}</span>
                </div>
                <Icon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <p className="text-sm text-gray-300">{text}</p>
              </div>
            ))}
            <div className="pt-2">
              <a
                href={`${LEADPRIME_BASE}/settings/integrations/owlfenc`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Open LeadPrime Integrations
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Connect form ── */}
      {!connection?.connected ? (
        <Card className="bg-gray-900/60 border-gray-700/50">
          <CardHeader>
            <CardTitle className="text-white text-base">Connect your account</CardTitle>
            <CardDescription className="text-gray-400 text-sm">
              Paste your LeadPrime API token to link both platforms
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm">LeadPrime API Token</Label>
              <div className="relative">
                <Input
                  type={showToken ? "text" : "password"}
                  placeholder="lpn_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Token starts with <code className="text-cyan-400">lpn_</code> and is 40+ characters long
              </p>
            </div>
            <Button
              onClick={() => connectMutation.mutate(apiToken)}
              disabled={!apiToken.startsWith("lpn_") || apiToken.length < 20 || connectMutation.isPending}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white"
            >
              {connectMutation.isPending ? (
                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Connecting...</>
              ) : (
                <><Link2 className="w-4 h-4 mr-2" /> Connect to LeadPrime Network</>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* ── Connected state ── */
        <div className="space-y-4">
          {/* Connection info */}
          <Card className="bg-gray-900/60 border-green-500/30">
            <CardContent className="pt-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-sm font-semibold text-white">
                      @{connection.handle}
                    </p>
                    <p className="text-xs text-gray-400">
                      Connected {connection.connectedAt
                        ? new Date(connection.connectedAt).toLocaleDateString()
                        : "recently"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleManualSync}
                    disabled={isSyncing}
                    className="border-gray-600 text-gray-300 hover:text-white text-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? "animate-spin" : ""}`} />
                    Sync Now
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-500/40 text-red-400 hover:text-red-300 hover:border-red-400 text-xs"
                      >
                        <Link2Off className="w-3.5 h-3.5 mr-1.5" />
                        Disconnect
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-gray-900 border-gray-700">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">Disconnect from LeadPrime?</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-400">
                          Your documents will no longer sync automatically. Existing synced documents in LeadPrime will remain.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-gray-800 border-gray-600 text-gray-300">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => disconnectMutation.mutate()}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          Disconnect
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {connection.lastSync && (
                <p className="text-xs text-gray-500">
                  Last sync: {new Date(connection.lastSync).toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Sync stats */}
          <Card className="bg-gray-900/60 border-gray-700/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-300">Synced Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {syncItems.map(({ icon: Icon, label, count, color }) => (
                  <div
                    key={label}
                    className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 border border-gray-700/50"
                  >
                    <Icon className={`w-5 h-5 ${color}`} />
                    <div>
                      <p className="text-xs text-gray-400">{label}</p>
                      <p className="text-lg font-bold text-white">{count}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* What syncs */}
          <Card className="bg-gray-900/60 border-gray-700/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-300 flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                Auto-sync enabled for
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: "New Estimates", desc: "Synced when created or updated" },
                { label: "Invoices", desc: "Synced with payment status" },
                { label: "Signed Contracts", desc: "Synced with PDF link" },
                { label: "Permit Reports", desc: "Synced with permit details" },
              ].map(({ label, desc }) => (
                <div key={label} className="flex items-center gap-3 py-1.5">
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-white font-medium">{label}</p>
                    <p className="text-xs text-gray-400">{desc}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Open LeadPrime */}
          <a
            href={`${LEADPRIME_BASE}/network/projects`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors text-sm font-semibold"
          >
            <Globe className="w-4 h-4" />
            View My Projects in LeadPrime
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      )}
    </div>
  );
}
