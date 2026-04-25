import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/lib/queryClient";
import {
  Key,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw,
  Plus,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
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

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt?: string;
  usageCount: number;
}

interface NewKeyResult {
  id: string;
  name: string;
  key: string; // full key — only shown once
  createdAt: string;
}

export function ApiKeyManager() {
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyResult, setNewKeyResult] = useState<NewKeyResult | null>(null);
  const [showNewKey, setShowNewKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  const fetchKeys = async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      const res = await fetch("/api/external/keys", { headers });
      if (!res.ok) throw new Error("Failed to load keys");
      const data = await res.json();
      setKeys(data.keys || []);
    } catch (err) {
      toast({
        title: "Error loading API keys",
        description: "Could not load your API keys. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleGenerate = async () => {
    if (!newKeyName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for your API key (e.g. 'LeadPrime Agent').",
        variant: "destructive",
      });
      return;
    }
    try {
      setGenerating(true);
      const headers = await getAuthHeaders();
      const res = await fetch("/api/external/keys", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate key");
      }
      const data = await res.json();
      setNewKeyResult(data);
      setShowNewKey(true);
      setNewKeyName("");
      await fetchKeys();
      toast({
        title: "API key generated",
        description: "Copy your key now — it won't be shown again.",
      });
    } catch (err: any) {
      toast({
        title: "Error generating key",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Copied to clipboard" });
    } catch {
      toast({ title: "Copy failed", description: "Please copy manually.", variant: "destructive" });
    }
  };

  const handleRevoke = async (keyId: string, keyName: string) => {
    try {
      setRevoking(keyId);
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/external/keys/${keyId}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) throw new Error("Failed to revoke key");
      await fetchKeys();
      toast({ title: `Key "${keyName}" revoked` });
    } catch (err: any) {
      toast({
        title: "Error revoking key",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setRevoking(null);
    }
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Generate new key */}
      <div className="space-y-3">
        <Label className="text-gray-300 text-sm font-medium">Create New API Key</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Key name (e.g. LeadPrime Agent)"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            className="bg-gray-800 border-gray-600 text-white placeholder-gray-500 flex-1"
            maxLength={50}
          />
          <Button
            onClick={handleGenerate}
            disabled={generating || !newKeyName.trim()}
            className="bg-cyan-400 text-black hover:bg-cyan-300 font-semibold whitespace-nowrap"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Plus className="w-4 h-4 mr-1" />
                Generate
              </>
            )}
          </Button>
        </div>
      </div>

      {/* New key reveal — shown only once */}
      {newKeyResult && (
        <div className="p-4 rounded-lg bg-green-900/20 border border-green-500/40 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-green-400 font-semibold text-sm">Key generated — copy it now!</span>
          </div>
          <p className="text-gray-400 text-xs">
            This is the only time you'll see the full key. Store it securely.
          </p>
          <div className="flex gap-2 items-center">
            <div className="flex-1 bg-gray-900 border border-gray-600 rounded-md px-3 py-2 font-mono text-sm text-cyan-300 overflow-x-auto whitespace-nowrap">
              {showNewKey ? newKeyResult.key : newKeyResult.key.replace(/./g, "•")}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowNewKey(!showNewKey)}
              className="text-gray-400 hover:text-white shrink-0"
              title={showNewKey ? "Hide key" : "Show key"}
            >
              {showNewKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleCopy(newKeyResult.key)}
              className="text-gray-400 hover:text-cyan-400 shrink-0"
              title="Copy key"
            >
              {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setNewKeyResult(null)}
            className="text-gray-500 hover:text-gray-300 text-xs p-0 h-auto"
          >
            I've saved my key, dismiss this
          </Button>
        </div>
      )}

      {/* Existing keys list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-gray-300 text-sm font-medium">Active Keys</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchKeys}
            disabled={loading}
            className="text-gray-400 hover:text-white h-7 px-2"
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
          </div>
        ) : keys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Key className="w-8 h-8 text-gray-600 mb-2" />
            <p className="text-gray-400 text-sm">No API keys yet.</p>
            <p className="text-gray-500 text-xs mt-1">Generate one above to connect external agents.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {keys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-800 border border-gray-700"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-1.5 rounded bg-cyan-400/10">
                    <Key className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-medium truncate">{key.name}</span>
                      <Badge variant="outline" className="border-gray-600 text-gray-400 text-xs font-mono shrink-0">
                        {key.prefix}...
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-gray-500 text-xs">Created {formatDate(key.createdAt)}</span>
                      {key.lastUsedAt && (
                        <span className="text-gray-500 text-xs">Last used {formatDate(key.lastUsedAt)}</span>
                      )}
                      {key.usageCount > 0 && (
                        <span className="text-gray-500 text-xs">{key.usageCount} calls</span>
                      )}
                    </div>
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={revoking === key.id}
                      className="text-gray-500 hover:text-red-400 shrink-0 ml-2"
                      title="Revoke key"
                    >
                      {revoking === key.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-gray-900 border-gray-700">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-white">Revoke API Key</AlertDialogTitle>
                      <AlertDialogDescription className="text-gray-400">
                        Are you sure you want to revoke <strong className="text-white">"{key.name}"</strong>?
                        Any agent using this key will immediately lose access. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleRevoke(key.id, key.name)}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Revoke Key
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Security note */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-900/10 border border-yellow-600/20">
        <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
        <p className="text-gray-400 text-xs leading-relaxed">
          <strong className="text-yellow-400">Keep your API keys secure.</strong> Never share them publicly or commit them to version control. Each key is tied to your account and will deduct credits from your balance when used.
        </p>
      </div>
    </div>
  );
}
