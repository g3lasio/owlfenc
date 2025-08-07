import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { FeatureButton } from "@/components/permissions/FeatureButton";
import { UpgradePrompt } from "@/components/permissions/UpgradePrompt";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Calculator, 
  TrendingUp, 
  FileText, 
  DollarSign, 
  BarChart3,
  Crown,
  Lock,
  Zap
} from "lucide-react";
import { UserPlanSwitcher } from "@/components/dev/UserPlanSwitcher";

export default function OwlFunding() {
  const { toast } = useToast();
  const { 
    userPlan, 
    canUse, 
    incrementUsage,
    userUsage 
  } = usePermissions();
  
  const [contactFormData, setContactFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const [showCalculator, setShowCalculator] = useState(false);
  const [loanAmount, setLoanAmount] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [termMonths, setTermMonths] = useState("");

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setContactFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);

      // Validación básica
      if (
        !contactFormData.name ||
        !contactFormData.email ||
        !contactFormData.message
      ) {
        toast({
          title: "Error en el formulario",
          description: "Por favor completa todos los campos.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Enviar los datos al servidor
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(contactFormData),
      });

      const data = await response.json();

      if (response.ok) {
        // Mostrar confirmación de éxito
        toast({
          title: "Mensaje enviado",
          description: "Nos pondremos en contacto contigo pronto.",
        });

        // Limpiar el formulario
        setContactFormData({
          name: "",
          email: "",
          message: "",
        });
      } else {
        // Mostrar error
        toast({
          title: "Error al enviar",
          description:
            data.message ||
            "Ha ocurrido un error. Por favor intenta más tarde.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error enviando formulario:", error);
      toast({
        title: "Error de conexión",
        description:
          "No pudimos procesar tu solicitud. Comprueba tu conexión e intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateLoan = () => {
    if (!loanAmount || !interestRate || !termMonths) {
      toast({
        title: "Campos incompletos",
        description: "Por favor completa todos los campos del calculador.",
        variant: "destructive",
      });
      return;
    }

    const principal = parseFloat(loanAmount);
    const rate = parseFloat(interestRate) / 100 / 12;
    const term = parseInt(termMonths);

    const monthlyPayment = (principal * rate * Math.pow(1 + rate, term)) / (Math.pow(1 + rate, term) - 1);
    const totalPayment = monthlyPayment * term;
    const totalInterest = totalPayment - principal;

    return {
      monthlyPayment: monthlyPayment.toFixed(2),
      totalPayment: totalPayment.toFixed(2),
      totalInterest: totalInterest.toFixed(2)
    };
  };

  const handleCalculatorSubmit = async () => {
    const canUseCalculator = canUse('financialTools');
    if (!canUseCalculator) {
      toast({
        title: "Límite alcanzado",
        description: "Actualiza tu plan para usar la calculadora financiera ilimitadamente.",
        variant: "destructive",
      });
      return;
    }

    const result = calculateLoan();
    if (result) {
      await incrementUsage('financialTools');
      toast({
        title: "Cálculo completado",
        description: `Pago mensual: $${result.monthlyPayment}`,
      });
    }
  };

  return (
    <div className="container pb-40 mx-auto p-6 flex flex-col items-center">
      {/* Panel de testing solo en desarrollo */}
      <div className="w-full max-w-4xl">
        <UserPlanSwitcher />
      </div>
      
      <div className="flex flex-col items-center justify-center mb-8 text-center">
        <img
          src="/images/owl-funding-logo-white.png"
          alt="Owl Funding Logo"
          className="h-32 mb-4"
        />
        <p className="text-muted-foreground max-w-2xl">
          Soluciones de financiamiento exclusivas para contratistas
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
        <Card>
          <CardHeader>
            <CardTitle>Financiamiento para Contratistas</CardTitle>
            <CardDescription>
              Opciones financieras diseñadas específicamente para tu negocio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-6">
              Owl Funding ofrece soluciones de financiamiento flexibles y
              accesibles para contratistas que buscan expandir su negocio,
              adquirir maquinaria o financiar proyectos específicos. Nuestros
              productos financieros están diseñados para las necesidades únicas
              de la industria de la construcción.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="flex flex-col items-center p-4 bg-primary/5 rounded-lg">
                <div className="text-primary text-xl mb-2">
                  <i className="ri-building-line"></i>
                </div>
                <h3 className="font-medium text-center">
                  Financiamiento Empresarial
                </h3>
                <p className="text-sm text-center text-muted-foreground">
                  Expande tu negocio
                </p>
              </div>

              <div className="flex flex-col items-center p-4 bg-primary/5 rounded-lg">
                <div className="text-primary text-xl mb-2">
                  <i className="ri-tools-line"></i>
                </div>
                <h3 className="font-medium text-center">
                  Equipos y Maquinaria
                </h3>
                <p className="text-sm text-center text-muted-foreground">
                  Moderniza tu operación
                </p>
              </div>

              <div className="flex flex-col items-center p-4 bg-primary/5 rounded-lg">
                <div className="text-primary text-xl mb-2">
                  <i className="ri-building-4-line"></i>
                </div>
                <h3 className="font-medium text-center">Proyectos</h3>
                <p className="text-sm text-center text-muted-foreground">
                  Financiamiento por proyecto
                </p>
              </div>

              <div className="flex flex-col items-center p-4 bg-primary/5 rounded-lg">
                <div className="text-primary text-xl mb-2">
                  <i className="ri-money-dollar-circle-line"></i>
                </div>
                <h3 className="font-medium text-center">Capital de Trabajo</h3>
                <p className="text-sm text-center text-muted-foreground">
                  Flujo de efectivo flexible
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => window.open("https://0wlfunding.com/", "_blank")}
              >
                <i className="ri-information-line"></i>
                Learn More
              </Button>

              <Button
                className="flex items-center gap-2"
                onClick={() =>
                  window.open("https://apply.0wlfunding.com/", "_blank")
                }
              >
                <i className="ri-check-double-line"></i>
                Apply Now
              </Button>

              <FeatureButton
                feature="financialTools"
                onClick={() => setShowCalculator(!showCalculator)}
                variant="secondary"
                className="flex items-center gap-2"
                upgradeMessage="Accede a herramientas financieras avanzadas para contratistas"
              >
                <Calculator className="h-4 w-4" />
                Calculadora Premium
              </FeatureButton>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contacta con Nuestro Equipo</CardTitle>
            <CardDescription>
              ¿Tienes preguntas específicas? Nuestro equipo está aquí para
              ayudarte
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Nombre
                </label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Tu nombre"
                  value={contactFormData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={contactFormData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="message" className="text-sm font-medium">
                  Mensaje
                </label>
                <Textarea
                  id="message"
                  name="message"
                  placeholder="Describe tu necesidad de financiamiento..."
                  rows={4}
                  value={contactFormData.message}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <Button type="submit" className="w-full">
                Enviar Consulta
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-border">
              <h3 className="font-medium mb-2">
                También puedes contactarnos directamente:
              </h3>
              <div className="space-y-2">
                <p className="text-sm flex items-center gap-2">
                  <i className="ri-mail-line text-primary"></i>
                  <a
                    href="mailto:info@0wlfunding.com"
                    className="hover:underline"
                  >
                    info@0wlfunding.com
                  </a>
                </p>
                <p className="text-sm flex items-center gap-2">
                  <i className="ri-phone-line text-primary"></i>
                  <a href="tel:+12025493519" className="hover:underline">
                    (202) 549-3519
                  </a>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calculadora Financiera Premium */}
      {showCalculator && (
        <Card className="max-w-4xl w-full mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Calculadora Financiera Avanzada
              <Badge variant="secondary" className="ml-2">
                <Crown className="h-3 w-3 mr-1" />
                Premium
              </Badge>
            </CardTitle>
            <CardDescription>
              Calcula pagos de préstamos y analiza opciones de financiamiento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PermissionGate 
              feature="financialTools" 
              showDemo={true}
              demoMessage="Vista demo de la calculadora financiera avanzada"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Monto del préstamo ($)</label>
                    <Input
                      type="number"
                      placeholder="100,000"
                      value={loanAmount}
                      onChange={(e) => setLoanAmount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tasa de interés anual (%)</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="5.5"
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Plazo (meses)</label>
                    <Input
                      type="number"
                      placeholder="60"
                      value={termMonths}
                      onChange={(e) => setTermMonths(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleCalculatorSubmit} className="w-full">
                    <Zap className="h-4 w-4 mr-2" />
                    Calcular Pago
                  </Button>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Resultados del Análisis</h3>
                  {loanAmount && interestRate && termMonths ? (
                    <div className="space-y-3">
                      {(() => {
                        const result = calculateLoan();
                        if (!result) return null;
                        return (
                          <>
                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                              <div className="flex justify-between">
                                <span className="text-sm font-medium">Pago mensual:</span>
                                <span className="font-bold text-green-700">${result.monthlyPayment}</span>
                              </div>
                            </div>
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="flex justify-between">
                                <span className="text-sm font-medium">Total a pagar:</span>
                                <span className="font-bold text-blue-700">${result.totalPayment}</span>
                              </div>
                            </div>
                            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                              <div className="flex justify-between">
                                <span className="text-sm font-medium">Total intereses:</span>
                                <span className="font-bold text-orange-700">${result.totalInterest}</span>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Completa los campos para ver los resultados</p>
                  )}
                </div>
              </div>
            </PermissionGate>
          </CardContent>
        </Card>
      )}

      {/* Panel de Herramientas Financieras Premium */}
      <div className="max-w-4xl w-full mt-6">
        <h2 className="text-2xl font-bold text-center mb-6">Herramientas Financieras Avanzadas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5" />
                Análisis de Flujo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PermissionGate 
                feature="financialAnalysis" 
                showDemo={true}
                demoMessage="Vista demo del análisis de flujo de efectivo"
              >
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Ingresos proyectados:</span>
                    <span className="font-medium text-green-600">$45,000</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Gastos operativos:</span>
                    <span className="font-medium text-red-600">$32,000</span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-2">
                    <span>Flujo neto:</span>
                    <span className="font-bold text-blue-600">$13,000</span>
                  </div>
                  <Progress value={75} className="mt-2" />
                  <FeatureButton
                    feature="financialAnalysis"
                    onClick={() => {}}
                    size="sm"
                    className="w-full"
                    upgradeMessage="Accede a análisis detallados de flujo de efectivo"
                  >
                    Ver Análisis Completo
                  </FeatureButton>
                </div>
              </PermissionGate>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5" />
                Proyección ROI
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PermissionGate 
                feature="roiProjections" 
                showDemo={true}
                demoMessage="Vista demo de proyecciones de ROI"
              >
                <div className="space-y-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">18.5%</div>
                    <div className="text-sm text-gray-600">ROI Proyectado</div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Año 1:</span>
                      <span>12.3%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Año 2:</span>
                      <span>15.8%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Año 3:</span>
                      <span>18.5%</span>
                    </div>
                  </div>
                  <FeatureButton
                    feature="roiProjections"
                    onClick={() => {}}
                    size="sm"
                    className="w-full"
                    upgradeMessage="Genera proyecciones ROI detalladas para tus inversiones"
                  >
                    Generar Proyección
                  </FeatureButton>
                </div>
              </PermissionGate>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" />
                Reportes Financieros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PermissionGate feature="financialReports">
                <div className="space-y-3">
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Reportes disponibles:</span>
                      <Badge variant="secondary">12</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Última actualización:</span>
                      <span className="text-xs text-gray-600">Hoy</span>
                    </div>
                  </div>
                  <Button size="sm" className="w-full">
                    <FileText className="h-3 w-3 mr-2" />
                    Generar Reporte
                  </Button>
                </div>
              </PermissionGate>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Prompts de upgrade */}
      <div className="max-w-4xl w-full mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UpgradePrompt 
            feature="financialTools" 
            size="large"
          />
          <UpgradePrompt 
            feature="financialAnalysis" 
            size="large"
          />
        </div>
      </div>
    </div>
  );
}
