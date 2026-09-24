import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Search, ShieldCheck, Wallet, PlusCircle, RefreshCw, AlertTriangle, CheckCircle2, LockKeyhole, Building2, UserRound } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface CreditAccount {
  firebaseUid: string;
  companyName: string;
  ownerName: string;
  email: string;
  balanceCredits: number;
  isLocked: boolean;
}

interface CreditAccountsResponse {
  success: boolean;
  accounts: CreditAccount[];
  error?: string;
}

interface CreditGrantResponse {
  success: boolean;
  creditsAdded?: number;
  balanceAfter?: number;
  transactionId?: number;
  error?: string;
}

function compactUid(uid: string): string {
  return `${uid.slice(0, 8)}…${uid.slice(-6)}`;
}

function createRequestKey(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function AdminCredits() {
  const { toast } = useToast();
  const [search, setSearch] = useState('Owl Fenc');
  const [selectedAccount, setSelectedAccount] = useState<CreditAccount | null>(null);
  const [credits, setCredits] = useState('100');
  const [description, setDescription] = useState('Administrative credit adjustment');
  const [requestKey, setRequestKey] = useState(createRequestKey);

  const accountQuery = useQuery({
    queryKey: ['/api/admin/credits/accounts', search],
    queryFn: async (): Promise<CreditAccount[]> => {
      const params = new URLSearchParams({ limit: '50' });
      if (search.trim()) params.set('search', search.trim());
      const response = await apiRequest('GET', `/api/admin/credits/accounts?${params.toString()}`);
      const payload = await response.json() as CreditAccountsResponse;
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'No se pudo cargar la lista de cuentas.');
      }
      return payload.accounts;
    },
    staleTime: 0,
    retry: false,
  });

  const parsedCredits = useMemo(() => Number(credits), [credits]);
  const canGrant = !!selectedAccount
    && Number.isInteger(parsedCredits)
    && parsedCredits > 0
    && description.trim().length >= 3
    && !selectedAccount.isLocked;

  const grantMutation = useMutation({
    mutationFn: async (): Promise<CreditGrantResponse> => {
      if (!selectedAccount || !canGrant) {
        throw new Error('Selecciona una cuenta válida, una cantidad positiva y un motivo.');
      }

      const response = await apiRequest('POST', '/api/admin/credits/grant', {
        firebaseUid: selectedAccount.firebaseUid,
        credits: parsedCredits,
        description: description.trim(),
        idempotencyKey: `${selectedAccount.firebaseUid}:${parsedCredits}:${requestKey}`,
      });
      const payload = await response.json() as CreditGrantResponse;
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'No se pudo conceder el crédito.');
      }
      return payload;
    },
    onSuccess: (result) => {
      const newBalance = result.balanceAfter ?? (selectedAccount?.balanceCredits || 0) + parsedCredits;
      setSelectedAccount((current) => current ? { ...current, balanceCredits: newBalance } : current);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/credits/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wallet/balance'] });
      setRequestKey(createRequestKey());
      toast({
        title: 'Créditos agregados',
        description: `${result.creditsAdded || parsedCredits} créditos se agregaron. Saldo actual: ${newBalance}.`,
      });
    },
    onError: (error: Error) => {
      toast({ title: 'No se pudo completar el ajuste', description: error.message, variant: 'destructive' });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-cyan-900/35 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-cyan-300">
              <ShieldCheck className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">Administración segura</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Administrar créditos</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Busca una cuenta, confirma el destinatario y registra un ajuste con trazabilidad en el ledger de la billetera.
            </p>
          </div>
          <Badge variant="outline" className="w-fit border-cyan-700/50 bg-cyan-950/30 px-3 py-1.5 text-cyan-200">
            <Wallet className="mr-1.5 h-3.5 w-3.5" />
            Ajustes auditados
          </Badge>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="border-border/50 bg-card/60 shadow-[0_0_35px_rgba(34,211,238,0.04)]">
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg">1. Seleccionar cuenta</CardTitle>
              <CardDescription>La búsqueda usa nombre de compañía, propietario, usuario o correo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    aria-label="Buscar cuenta"
                    className="pl-9"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setSelectedAccount(null);
                    }}
                    placeholder="Buscar por compañía, propietario o correo"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Actualizar resultados"
                  onClick={() => accountQuery.refetch()}
                  disabled={accountQuery.isFetching}
                >
                  <RefreshCw className={`h-4 w-4 ${accountQuery.isFetching ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              {accountQuery.isError && (
                <div role="alert" className="flex gap-2 rounded-lg border border-red-800/50 bg-red-950/25 p-3 text-sm text-red-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-semibold">No se pudo cargar la selección de cuentas</p>
                    <p className="mt-1 text-xs text-red-200/80">{(accountQuery.error as Error).message}</p>
                  </div>
                </div>
              )}

              <div className="max-h-[460px] space-y-2 overflow-y-auto pr-1">
                {accountQuery.isLoading && Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-24 animate-pulse rounded-xl border border-border/30 bg-muted/10" />
                ))}

                {!accountQuery.isLoading && !accountQuery.isError && accountQuery.data?.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border/50 p-8 text-center text-sm text-muted-foreground">
                    No se encontró ninguna cuenta. Prueba una búsqueda más amplia.
                  </div>
                )}

                {accountQuery.data?.map((account) => {
                  const isSelected = selectedAccount?.firebaseUid === account.firebaseUid;
                  return (
                    <button
                      key={account.firebaseUid}
                      type="button"
                      onClick={() => setSelectedAccount(account)}
                      className={`w-full rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                        isSelected
                          ? 'border-cyan-500/70 bg-cyan-950/30 shadow-[0_0_20px_rgba(34,211,238,0.08)]'
                          : 'border-border/45 bg-background/25 hover:border-cyan-800/60 hover:bg-cyan-950/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 shrink-0 text-cyan-400" />
                            <span className="truncate font-semibold text-foreground">{account.companyName}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <UserRound className="h-3.5 w-3.5" />
                            <span className="truncate">{account.ownerName}</span>
                            <span aria-hidden="true">·</span>
                            <span className="truncate">{account.email}</span>
                          </div>
                          <p className="font-mono text-[11px] text-muted-foreground">{compactUid(account.firebaseUid)}</p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <Badge variant="outline" className="border-cyan-800/50 bg-cyan-950/20 font-mono text-cyan-200">
                            {account.balanceCredits.toLocaleString()} cr
                          </Badge>
                          {account.isLocked && (
                            <Badge variant="destructive" className="gap-1 text-[10px]">
                              <LockKeyhole className="h-3 w-3" /> Bloqueada
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/60 shadow-[0_0_35px_rgba(34,211,238,0.04)]">
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg">2. Conceder créditos</CardTitle>
              <CardDescription>Verifica el destinatario antes de confirmar. El movimiento quedará auditado.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {selectedAccount ? (
                <div className="rounded-xl border border-cyan-800/45 bg-cyan-950/20 p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">{selectedAccount.companyName}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{selectedAccount.ownerName}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{selectedAccount.email}</p>
                      <p className="mt-3 font-mono text-sm text-cyan-200">Saldo actual: {selectedAccount.balanceCredits.toLocaleString()} créditos</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border/50 p-5 text-sm text-muted-foreground">
                  Selecciona una cuenta de la lista para habilitar el ajuste.
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="credit-amount">Créditos a agregar</Label>
                <Input
                  id="credit-amount"
                  type="number"
                  min="1"
                  step="1"
                  value={credits}
                  onChange={(event) => setCredits(event.target.value)}
                  disabled={!selectedAccount || grantMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="credit-description">Motivo para el ledger</Label>
                <Textarea
                  id="credit-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  disabled={!selectedAccount || grantMutation.isPending}
                  className="min-h-24 resize-y"
                  placeholder="Ej. Crédito administrativo por soporte"
                />
              </div>

              {selectedAccount?.isLocked && (
                <div role="alert" className="flex gap-2 rounded-lg border border-amber-800/50 bg-amber-950/25 p-3 text-sm text-amber-200">
                  <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
                  Esta wallet está bloqueada. Desbloquéala antes de aplicar un ajuste.
                </div>
              )}

              <Button
                type="button"
                className="w-full gap-2 bg-cyan-600 text-white hover:bg-cyan-500"
                disabled={!canGrant || grantMutation.isPending}
                onClick={() => grantMutation.mutate()}
              >
                {grantMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                {grantMutation.isPending ? 'Aplicando ajuste…' : `Agregar ${Number.isFinite(parsedCredits) ? parsedCredits : 0} créditos`}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
