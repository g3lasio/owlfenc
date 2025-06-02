
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Shield, AlertTriangle, FileText, Scale } from "lucide-react";

interface LegalDefenseProfile {
  // Información Corporativa
  businessStructure: string;
  einNumber: string;
  licenses: Array<{
    type: string;
    number: string;
    issuer: string;
    expirationDate: string;
    jurisdiction: string;
  }>;
  insurance: Array<{
    type: string;
    carrier: string;
    policyNumber: string;
    coverage: string;
    limits: string;
    expirationDate: string;
  }>;
  bonding: {
    available: boolean;
    capacity: string;
    bondingCompany: string;
  };

  // Preferencias de Defensa Legal
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  preferredClauses: string[];
  pastLegalIssues: string[];
  specialtyVulnerabilities: string[];
  
  // Contexto Jurisdiccional
  operatingStates: string[];
  localCodes: string[];
  knownPrecedents: string[];
  
  // Experiencia y Lecciones
  contractSuccesses: string[];
  lessonsLearned: string[];
  clientRedFlags: string[];
}

export default function LegalDefenseProfile() {
  const [profile, setProfile] = useState<LegalDefenseProfile>({
    businessStructure: '',
    einNumber: '',
    licenses: [],
    insurance: [],
    bonding: { available: false, capacity: '', bondingCompany: '' },
    riskTolerance: 'moderate',
    preferredClauses: [],
    pastLegalIssues: [],
    specialtyVulnerabilities: [],
    operatingStates: [],
    localCodes: [],
    knownPrecedents: [],
    contractSuccesses: [],
    lessonsLearned: [],
    clientRedFlags: []
  });

  const [newLicense, setNewLicense] = useState({
    type: '', number: '', issuer: '', expirationDate: '', jurisdiction: ''
  });
  
  const [newInsurance, setNewInsurance] = useState({
    type: '', carrier: '', policyNumber: '', coverage: '', limits: '', expirationDate: ''
  });

  const { toast } = useToast();

  useEffect(() => {
    loadLegalProfile();
  }, []);

  const loadLegalProfile = async () => {
    try {
      const response = await fetch('/api/legal-defense-profile');
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      }
    } catch (error) {
      console.error('Error loading legal profile:', error);
    }
  };

  const saveLegalProfile = async () => {
    try {
      const response = await fetch('/api/legal-defense-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });

      if (response.ok) {
        toast({
          title: "Perfil Legal Guardado",
          description: "Tu perfil de defensa legal ha sido actualizado exitosamente."
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar el perfil legal.",
        variant: "destructive"
      });
    }
  };

  const addLicense = () => {
    if (newLicense.type && newLicense.number) {
      setProfile(prev => ({
        ...prev,
        licenses: [...prev.licenses, newLicense]
      }));
      setNewLicense({ type: '', number: '', issuer: '', expirationDate: '', jurisdiction: '' });
    }
  };

  const addInsurance = () => {
    if (newInsurance.type && newInsurance.carrier) {
      setProfile(prev => ({
        ...prev,
        insurance: [...prev.insurance, newInsurance]
      }));
      setNewInsurance({ type: '', carrier: '', policyNumber: '', coverage: '', limits: '', expirationDate: '' });
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="text-blue-600" />
            Perfil de Defensa Legal
          </h1>
          <p className="text-muted-foreground mt-2">
            Configura tu información legal para que Mervin AI pueda defenderte mejor en cada contrato
          </p>
        </div>
        <Button onClick={saveLegalProfile} size="lg">
          Guardar Perfil
        </Button>
      </div>

      <Tabs defaultValue="corporate" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="corporate">Datos Corporativos</TabsTrigger>
          <TabsTrigger value="licenses">Licencias & Seguros</TabsTrigger>
          <TabsTrigger value="preferences">Preferencias Legales</TabsTrigger>
          <TabsTrigger value="jurisdiction">Jurisdicción</TabsTrigger>
          <TabsTrigger value="experience">Experiencia</TabsTrigger>
        </TabsList>

        {/* DATOS CORPORATIVOS */}
        <TabsContent value="corporate">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Estructura Legal de tu Empresa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="businessStructure">Estructura Legal</Label>
                  <Select value={profile.businessStructure} onValueChange={(value) => 
                    setProfile(prev => ({ ...prev, businessStructure: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona estructura" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LLC">LLC (Limited Liability Company)</SelectItem>
                      <SelectItem value="Corp">Corporation</SelectItem>
                      <SelectItem value="S-Corp">S-Corporation</SelectItem>
                      <SelectItem value="Sole">Sole Proprietorship</SelectItem>
                      <SelectItem value="Partnership">Partnership</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="einNumber">EIN / Tax ID</Label>
                  <Input
                    id="einNumber"
                    value={profile.einNumber}
                    onChange={(e) => setProfile(prev => ({ ...prev, einNumber: e.target.value }))}
                    placeholder="12-3456789"
                  />
                </div>
              </div>

              <div>
                <Label>Capacidad de Bonding</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                  <Select value={profile.bonding.available ? 'yes' : 'no'} onValueChange={(value) =>
                    setProfile(prev => ({ 
                      ...prev, 
                      bonding: { ...prev.bonding, available: value === 'yes' } 
                    }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="¿Tienes bonding?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Sí, tengo bonding</SelectItem>
                      <SelectItem value="no">No tengo bonding</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Capacidad ($500K, $1M, etc.)"
                    value={profile.bonding.capacity}
                    onChange={(e) => setProfile(prev => ({ 
                      ...prev, 
                      bonding: { ...prev.bonding, capacity: e.target.value } 
                    }))}
                  />
                  <Input
                    placeholder="Compañía de Bonding"
                    value={profile.bonding.bondingCompany}
                    onChange={(e) => setProfile(prev => ({ 
                      ...prev, 
                      bonding: { ...prev.bonding, bondingCompany: e.target.value } 
                    }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LICENCIAS Y SEGUROS */}
        <TabsContent value="licenses">
          <div className="space-y-6">
            {/* Licencias */}
            <Card>
              <CardHeader>
                <CardTitle>Licencias de Contratista</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                    <Input placeholder="Tipo de Licencia" value={newLicense.type} 
                      onChange={(e) => setNewLicense(prev => ({ ...prev, type: e.target.value }))} />
                    <Input placeholder="Número" value={newLicense.number}
                      onChange={(e) => setNewLicense(prev => ({ ...prev, number: e.target.value }))} />
                    <Input placeholder="Emisor" value={newLicense.issuer}
                      onChange={(e) => setNewLicense(prev => ({ ...prev, issuer: e.target.value }))} />
                    <Input type="date" value={newLicense.expirationDate}
                      onChange={(e) => setNewLicense(prev => ({ ...prev, expirationDate: e.target.value }))} />
                    <Button onClick={addLicense}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {profile.licenses.map((license, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <Badge variant="outline">{license.type}</Badge>
                            <span className="ml-2 font-mono">{license.number}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Vence: {license.expirationDate}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Seguros */}
            <Card>
              <CardHeader>
                <CardTitle>Pólizas de Seguro</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                    <Select value={newInsurance.type} onValueChange={(value) => 
                      setNewInsurance(prev => ({ ...prev, type: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="General Liability">General Liability</SelectItem>
                        <SelectItem value="Workers Comp">Workers Compensation</SelectItem>
                        <SelectItem value="Professional">Professional Liability</SelectItem>
                        <SelectItem value="Commercial Auto">Commercial Auto</SelectItem>
                        <SelectItem value="Umbrella">Umbrella Policy</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input placeholder="Aseguradora" value={newInsurance.carrier}
                      onChange={(e) => setNewInsurance(prev => ({ ...prev, carrier: e.target.value }))} />
                    <Input placeholder="# Póliza" value={newInsurance.policyNumber}
                      onChange={(e) => setNewInsurance(prev => ({ ...prev, policyNumber: e.target.value }))} />
                    <Input placeholder="Cobertura" value={newInsurance.coverage}
                      onChange={(e) => setNewInsurance(prev => ({ ...prev, coverage: e.target.value }))} />
                    <Input placeholder="Límites" value={newInsurance.limits}
                      onChange={(e) => setNewInsurance(prev => ({ ...prev, limits: e.target.value }))} />
                    <Button onClick={addInsurance}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {profile.insurance.map((insurance, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <Badge>{insurance.type}</Badge>
                            <span className="ml-2">{insurance.carrier}</span>
                          </div>
                          <div className="text-sm">
                            Límites: {insurance.limits}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* PREFERENCIAS LEGALES */}
        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="w-5 h-5" />
                Preferencias de Defensa Legal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Tolerancia al Riesgo Legal</Label>
                <Select value={profile.riskTolerance} onValueChange={(value: any) =>
                  setProfile(prev => ({ ...prev, riskTolerance: value }))
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conservative">Conservador - Máxima protección</SelectItem>
                    <SelectItem value="moderate">Moderado - Balance riesgo/oportunidad</SelectItem>
                    <SelectItem value="aggressive">Agresivo - Acepto más riesgo por mejores términos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Cláusulas que Han Funcionado Bien</Label>
                <Textarea
                  placeholder="Describe cláusulas específicas que te han protegido bien en el pasado..."
                  value={profile.contractSuccesses.join('\n')}
                  onChange={(e) => setProfile(prev => ({ 
                    ...prev, 
                    contractSuccesses: e.target.value.split('\n').filter(item => item.trim()) 
                  }))}
                  rows={4}
                />
              </div>

              <div>
                <Label>Vulnerabilidades por Especialidad</Label>
                <Textarea
                  placeholder="¿En qué tipos de trabajo eres más vulnerable? (ej: trabajos de altura, proyectos con HOAs, etc.)"
                  value={profile.specialtyVulnerabilities.join('\n')}
                  onChange={(e) => setProfile(prev => ({ 
                    ...prev, 
                    specialtyVulnerabilities: e.target.value.split('\n').filter(item => item.trim()) 
                  }))}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* JURISDICCIÓN */}
        <TabsContent value="jurisdiction">
          <Card>
            <CardHeader>
              <CardTitle>Contexto Jurisdiccional</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Estados donde Operas</Label>
                <Textarea
                  placeholder="Lista los estados donde haces trabajos (uno por línea)"
                  value={profile.operatingStates.join('\n')}
                  onChange={(e) => setProfile(prev => ({ 
                    ...prev, 
                    operatingStates: e.target.value.split('\n').filter(item => item.trim()) 
                  }))}
                  rows={3}
                />
              </div>

              <div>
                <Label>Códigos Locales Relevantes</Label>
                <Textarea
                  placeholder="Códigos de construcción o regulaciones locales que afectan tu trabajo"
                  value={profile.localCodes.join('\n')}
                  onChange={(e) => setProfile(prev => ({ 
                    ...prev, 
                    localCodes: e.target.value.split('\n').filter(item => item.trim()) 
                  }))}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* EXPERIENCIA */}
        <TabsContent value="experience">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Experiencia y Lecciones Aprendidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Problemas Legales Pasados</Label>
                <Textarea
                  placeholder="Describe disputas, problemas o situaciones legales que has enfrentado..."
                  value={profile.pastLegalIssues.join('\n')}
                  onChange={(e) => setProfile(prev => ({ 
                    ...prev, 
                    pastLegalIssues: e.target.value.split('\n').filter(item => item.trim()) 
                  }))}
                  rows={4}
                />
              </div>

              <div>
                <Label>Lecciones Aprendidas</Label>
                <Textarea
                  placeholder="¿Qué has aprendido de experiencias pasadas que debería incluir en futuros contratos?"
                  value={profile.lessonsLearned.join('\n')}
                  onChange={(e) => setProfile(prev => ({ 
                    ...prev, 
                    lessonsLearned: e.target.value.split('\n').filter(item => item.trim()) 
                  }))}
                  rows={4}
                />
              </div>

              <div>
                <Label>Red Flags de Clientes</Label>
                <Textarea
                  placeholder="Señales de alerta sobre clientes que indican mayor riesgo legal"
                  value={profile.clientRedFlags.join('\n')}
                  onChange={(e) => setProfile(prev => ({ 
                    ...prev, 
                    clientRedFlags: e.target.value.split('\n').filter(item => item.trim()) 
                  }))}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
