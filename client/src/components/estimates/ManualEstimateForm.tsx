import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ClientValidator } from "@/components/client/ClientValidator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import TemplateSelector from "./TemplateSelector";
import EstimatePreview from "./EstimatePreview";

interface Client {
  id: number;
  clientId: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  notes: string | null;
}

interface Template {
  id: number;
  name: string;
  type: string;
  html: string;
  isDefault: boolean;
}

interface Material {
  id: number;
  category: string;
  name: string;
  description: string | null;
  price: number; // Cents
  unit: string;
  supplier: string | null;
  notes: string | null;
}

interface Contractor {
  id: number;
  name: string;
  company: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  license: string | null;
  logo?: string;
}

interface ManualEstimateFormProps {
  onEstimateGenerated?: (html: string) => void;
  onGenerate?: (html: string) => void;
}

// Definir esquema de validación para el formulario de estimación
const estimateFormSchema = z.object({
  // Datos del proyecto
  projectType: z.string({
    required_error: "Selecciona el tipo de proyecto",
  }),
  projectSubtype: z.string({
    required_error: "Selecciona el subtipo de proyecto",
  }),
  
  // Dimensiones según el tipo de proyecto
  dimensions: z.object({
    length: z.string().optional(),
    width: z.string().optional(),
    height: z.string().optional(),
    area: z.string().optional(),
  }),
  
  // Opciones adicionales
  additionalFeatures: z.object({
    demolition: z.boolean().default(false),
    painting: z.boolean().default(false),
    lattice: z.boolean().default(false),
    gates: z.array(
      z.object({
        type: z.string(),
        width: z.number(),
        quantity: z.number(),
      })
    ).default([]),
  }),
  
  notes: z.string().optional(),
  
  // Opciones de generación
  useAI: z.boolean().default(false),
  customPrompt: z.string().optional(),
  
  // Template
  templateId: z.number().optional(),
});

type EstimateFormValues = z.infer<typeof estimateFormSchema>;

export default function ManualEstimateForm({ onEstimateGenerated, onGenerate }: ManualEstimateFormProps) {
  // Usar el hook de perfil para obtener los datos del contratista
  const { profile, isLoading: isLoadingProfile } = useProfile();
  const [isLoadingContractor, setIsLoadingContractor] = useState(true);
  
  // Estado para clientes y cliente seleccionado
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  
  // Cliente validado
  const [validatedClient, setValidatedClient] = useState<any>(null);
  const [propertyDetails, setPropertyDetails] = useState<any>(null);
  
  // Datos del proyecto y formulario
  const form = useForm<EstimateFormValues>({
    resolver: zodResolver(estimateFormSchema),
    defaultValues: {
      projectType: "fence",
      projectSubtype: "wood",
      dimensions: {
        length: "",
        width: "",
        height: "",
        area: "",
      },
      additionalFeatures: {
        demolition: false,
        painting: false,
        lattice: false,
        gates: [],
      },
      notes: "",
      useAI: false,
      customPrompt: "",
    },
  });
  
  // Estado para materiales, templates y precios
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(true);
  
  // Opciones de generación
  const [useAI, setUseAI] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [estimateResult, setEstimateResult] = useState<any>(null);
  const [adjustedLaborRate, setAdjustedLaborRate] = useState<number | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  
  // Estado de navegación
  const [currentStep, setCurrentStep] = useState(1);
  const { toast } = useToast();
  
  // Función para cargar clientes
  useEffect(() => {
    async function fetchClients() {
      try {
        const response = await fetch('/api/clients');
        if (!response.ok) {
          throw new Error('Error al obtener clientes');
        }
        const data = await response.json();
        setClients(data);
        setIsLoadingClients(false);
      } catch (error) {
        console.error('Error cargando clientes:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los clientes. Por favor intenta de nuevo.",
          variant: "destructive"
        });
        setIsLoadingClients(false);
      }
    }
    
    fetchClients();
  }, [toast]);
  
  // Función para manejar la validación del cliente
  const handleClientValidated = (client: any, property?: any) => {
    setValidatedClient(client);
    if (property) {
      setPropertyDetails(property);
    }
    // Avanzar al siguiente paso
    setCurrentStep(currentStep + 1);
  };
  
  // Función para manejar la navegación de pasos
  const goToNextStep = () => {
    // Avanzar al siguiente paso
    setCurrentStep(currentStep + 1);
  };
  
  const goToPreviousStep = () => {
    setCurrentStep(currentStep - 1);
  };
  
  // Usar datos del contratista del profile hook
  useEffect(() => {
    // Al usar el hook useProfile, ya no necesitamos hacer una solicitud HTTP separada
    if (!isLoadingProfile) {
      setIsLoadingContractor(false);
      
      // Si no hay datos del perfil, mostrar una advertencia
      if (!profile || !profile.companyName) {
        toast({
          title: "Perfil incompleto",
          description: "La información de tu empresa está incompleta. Actualiza tu perfil para incluirla en los estimados.",
          variant: "destructive"
        });
      }
    }
  }, [isLoadingProfile, profile, toast]);
  
  // Cargar materiales
  useEffect(() => {
    async function fetchMaterials() {
      try {
        // Determinar la categoría de materiales basada en el tipo de proyecto
        const projectType = form.getValues('projectType');
        let category = "";
        if (projectType === "fence") {
          category = "fencing";
        } else if (projectType === "roof") {
          category = "roofing";
        } else {
          category = "general";
        }
        
        const response = await fetch(`/api/materials?category=${category}`);
        if (!response.ok) {
          throw new Error('Error al obtener materiales');
        }
        
        const data = await response.json();
        setMaterials(data);
        setIsLoadingMaterials(false);
      } catch (error) {
        console.error('Error cargando materiales:', error);
        setIsLoadingMaterials(false);
      }
    }
    
    fetchMaterials();
  }, [form]);
  
  // Cargar templates
  useEffect(() => {
    async function fetchTemplates() {
      try {
        const response = await fetch('/api/templates?type=estimate');
        if (!response.ok) {
          throw new Error('Error al obtener plantillas');
        }
        
        const data = await response.json();
        setTemplates(data);
        
        // Seleccionar la plantilla por defecto si existe
        const defaultTemplate = data.find((template: { isDefault: boolean, id: number }) => template.isDefault);
        if (defaultTemplate) {
          setSelectedTemplateId(defaultTemplate.id);
        } else if (data.length > 0) {
          setSelectedTemplateId(data[0].id);
        }
      } catch (error) {
        console.error('Error cargando templates:', error);
      }
    }
    
    fetchTemplates();
  }, []);
  
  // Función para preparar los datos del estimado
  const prepareEstimateData = (): any => {
    if (!validatedClient) {
      toast({
        title: "Error",
        description: "Datos del cliente incompletos",
        variant: "destructive"
      });
      return null;
    }
    
    const formValues = form.getValues();
    const additionalFeatures = formValues.additionalFeatures;
    const contractorId = profile?.id || 1; // ID por defecto para pruebas
    
    // Datos básicos del proyecto
    return {
      contractorId,
      contractorName: profile?.companyName || "",
      contractorCompany: profile?.companyName || "",
      contractorAddress: profile?.address || "",
      contractorPhone: profile?.phone || profile?.mobilePhone || "",
      contractorEmail: profile?.email || "",
      contractorLicense: profile?.license || "",
      contractorLogo: profile?.logo || "",
      
      // Datos del cliente
      clientName: validatedClient.name,
      clientEmail: validatedClient.email,
      clientPhone: validatedClient.phone,
      projectAddress: validatedClient.address,
      clientCity: validatedClient.city,
      clientState: validatedClient.state,
      clientZip: validatedClient.zip,
      
      // Detalles del proyecto
      projectType: formValues.projectType,
      projectSubtype: formValues.projectSubtype,
      projectDimensions: {
        length: formValues.dimensions.length ? parseFloat(formValues.dimensions.length) : undefined,
        height: formValues.dimensions.height ? parseFloat(formValues.dimensions.height) : undefined,
        width: formValues.dimensions.width ? parseFloat(formValues.dimensions.width) : undefined,
        area: formValues.dimensions.area ? parseFloat(formValues.dimensions.area) : undefined
      },
      additionalFeatures,
      notes: formValues.notes,
      
      // Opciones de generación
      useAI: formValues.useAI,
      customPrompt: formValues.customPrompt
    };
  };
  
  // Función para calcular el estimado
  const calculateEstimate = async () => {
    try {
      setIsCalculating(true);
      
      const estimateData = prepareEstimateData();
      if (!estimateData) {
        setIsCalculating(false);
        return;
      }
      
      // Validar dimensiones según el tipo de proyecto
      const projectType = form.getValues('projectType');
      if (projectType === "fence") {
        if (!estimateData.projectDimensions.length || !estimateData.projectDimensions.height) {
          toast({
            title: "Dimensiones incompletas",
            description: "Para proyectos de cerca se requiere longitud y altura",
            variant: "destructive"
          });
          setIsCalculating(false);
          return;
        }
      } else if (projectType === "roof") {
        if (!estimateData.projectDimensions.area) {
          toast({
            title: "Dimensiones incompletas",
            description: "Para proyectos de techo se requiere el área",
            variant: "destructive"
          });
          setIsCalculating(false);
          return;
        }
      }
      
      // Enviar datos al backend para cálculo
      const response = await fetch('/api/estimates/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(estimateData),
      });
      
      if (!response.ok) {
        throw new Error('Error calculando el estimado');
      }
      
      const result = await response.json();
      setEstimateResult(result);
      
      // Avanzar al siguiente paso (revisión)
      setCurrentStep(4);
      
    } catch (error) {
      console.error('Error calculando estimado:', error);
      toast({
        title: "Error en cálculo",
        description: "No se pudo generar el estimado. Por favor intenta de nuevo.",
        variant: "destructive"
      });
    } finally {
      setIsCalculating(false);
    }
  };
  
  // Función para ajustar la tasa de mano de obra
  const handleLaborRateAdjustment = (newRate: number) => {
    if (!estimateResult) return;
    
    setAdjustedLaborRate(newRate);
    
    // En una implementación completa, esto recalcularía todos los costos
    // basados en la nueva tasa de mano de obra
  };
  
  // Función para generar el HTML del estimado
  const generateEstimateHTML = async () => {
    try {
      // Si no hay estimado calculado, mostrar error
      if (!estimateResult) {
        toast({
          title: "Error",
          description: "Primero debes calcular un estimado",
          variant: "destructive"
        });
        return;
      }
      
      // Si hay una tasa de mano de obra ajustada, actualizarla en el resultado
      let finalEstimate = estimateResult;
      if (adjustedLaborRate !== null) {
        // Crear una copia del estimado con la tasa ajustada
        // En una implementación real, esto sería más complejo y
        // recalcularía todos los valores afectados
        finalEstimate = {
          ...estimateResult,
          adjustedLaborRate
        };
      }
      
      // Obtener HTML usando el template seleccionado
      const response = await fetch('/api/estimates/html', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          estimateData: finalEstimate,
          templateId: selectedTemplateId
        }),
      });
      
      if (!response.ok) {
        throw new Error('Error generando HTML del estimado');
      }
      
      const { html } = await response.json();
      
      // Enviar el HTML al componente padre a través de cualquiera de los callbacks disponibles
      if (onEstimateGenerated) {
        onEstimateGenerated(html);
      }
      
      if (onGenerate) {
        onGenerate(html);
      }
      
    } catch (error) {
      console.error('Error generando HTML del estimado:', error);
      toast({
        title: "Error",
        description: "No se pudo generar el HTML del estimado. Por favor intenta de nuevo.",
        variant: "destructive"
      });
    }
  };
  
  // Función para enviar el estimado por email
  const sendEstimateByEmail = async () => {
    try {
      if (!estimateResult || !validatedClient.email) {
        toast({
          title: "Error",
          description: "Se requiere un estimado calculado y email del cliente",
          variant: "destructive"
        });
        return;
      }
      
      // Verificar formato de email
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(validatedClient.email)) {
        toast({
          title: "Email inválido",
          description: "Por favor ingresa un email válido para el cliente",
          variant: "destructive"
        });
        return;
      }
      
      // Enviar email con el estimado
      const response = await fetch('/api/estimates/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          estimateData: estimateResult,
          templateId: selectedTemplateId,
          email: validatedClient.email,
          subject: `Estimado de proyecto para ${validatedClient.name}`,
          message: `Estimado ${validatedClient.name}, adjunto encontrará el estimado solicitado para su proyecto. Por favor no dude en contactarnos si tiene alguna pregunta.`
        }),
      });
      
      if (!response.ok) {
        throw new Error('Error enviando email');
      }
      
      toast({
        title: "Email enviado",
        description: `El estimado ha sido enviado a ${validatedClient.email}`,
      });
      
    } catch (error) {
      console.error('Error enviando email:', error);
      toast({
        title: "Error",
        description: "No se pudo enviar el email. Por favor intenta de nuevo.",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Step 1: Cliente */}
      {currentStep === 1 && (
        <ClientValidator
          onClientValidated={handleClientValidated}
          existingClients={clients}
        />
      )}
      
      {/* Step 2: Tipo de proyecto y dimensiones */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Detalles del Proyecto</CardTitle>
            <CardDescription>Ingresa las características del proyecto</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form className="space-y-6">
                <FormField
                  control={form.control}
                  name="projectType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Proyecto *</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fence">Cerca</SelectItem>
                          <SelectItem value="roof">Techo</SelectItem>
                          <SelectItem value="deck">Deck</SelectItem>
                          <SelectItem value="patio">Patio</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="projectSubtype"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subtipo *</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar subtipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {field.value === "fence" && (
                            <>
                              <SelectItem value="wood">Madera</SelectItem>
                              <SelectItem value="vinyl">Vinilo</SelectItem>
                              <SelectItem value="chain_link">Malla ciclónica</SelectItem>
                              <SelectItem value="wrought_iron">Hierro forjado</SelectItem>
                            </>
                          )}
                          {field.value === "roof" && (
                            <>
                              <SelectItem value="asphalt">Asfalto</SelectItem>
                              <SelectItem value="metal">Metal</SelectItem>
                              <SelectItem value="tile">Teja</SelectItem>
                              <SelectItem value="flat">Plano</SelectItem>
                            </>
                          )}
                          {field.value === "deck" && (
                            <>
                              <SelectItem value="wood">Madera</SelectItem>
                              <SelectItem value="composite">Compuesto</SelectItem>
                              <SelectItem value="pvc">PVC</SelectItem>
                            </>
                          )}
                          {field.value === "patio" && (
                            <>
                              <SelectItem value="concrete">Concreto</SelectItem>
                              <SelectItem value="pavers">Adoquines</SelectItem>
                              <SelectItem value="stone">Piedra</SelectItem>
                              <SelectItem value="brick">Ladrillo</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Dimensiones según el tipo de proyecto */}
                {form.watch("projectType") === "fence" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="dimensions.length"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Longitud (pies) *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="100"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="dimensions.height"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Altura (pies) *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="6"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
                
                {form.watch("projectType") === "roof" && (
                  <FormField
                    control={form.control}
                    name="dimensions.area"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Área (pies²) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="1500"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                {form.watch("projectType") === "deck" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="dimensions.length"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Longitud (pies) *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="20"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="dimensions.width"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ancho (pies) *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="12"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
                
                {form.watch("projectType") === "patio" && (
                  <FormField
                    control={form.control}
                    name="dimensions.area"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Área (pies²) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="400"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={goToPreviousStep}>Anterior</Button>
            <Button onClick={goToNextStep}>Siguiente</Button>
          </CardFooter>
        </Card>
      )}
      
      {/* Step 3: Características adicionales */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Características Adicionales</CardTitle>
            <CardDescription>Selecciona las características adicionales del proyecto</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form className="space-y-6">
                <div className="grid gap-4">
                  <FormField
                    control={form.control}
                    name="additionalFeatures.demolition"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Incluir demolición de estructura existente</FormLabel>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="additionalFeatures.painting"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Incluir pintura/acabado</FormLabel>
                      </FormItem>
                    )}
                  />
                  
                  {form.watch("projectType") === "fence" && (
                    <FormField
                      control={form.control}
                      name="additionalFeatures.lattice"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">Incluir celosía decorativa</FormLabel>
                        </FormItem>
                      )}
                    />
                  )}
                </div>
                
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas Adicionales</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Cualquier información adicional sobre el proyecto..."
                          className="min-h-24"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Opciones de IA */}
                <div className="bg-primary/5 p-4 rounded-md">
                  <FormField
                    control={form.control}
                    name="useAI"
                    render={({ field }) => (
                      <FormItem className="flex items-start space-x-2">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div>
                          <FormLabel className="!mt-0">Usar IA para mejorar el estimado</FormLabel>
                          <FormDescription>
                            La IA analizará los detalles del proyecto para sugerir materiales y costos más precisos
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  {form.watch("useAI") && (
                    <FormField
                      control={form.control}
                      name="customPrompt"
                      render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel>Prompt personalizado (opcional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Instrucciones específicas para la IA..."
                              className="min-h-20"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Incluye detalles o requisitos específicos para el cálculo con IA
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={goToPreviousStep}>Anterior</Button>
            <Button onClick={calculateEstimate} disabled={isCalculating}>
              {isCalculating ? "Calculando..." : "Calcular Estimado"}
            </Button>
          </CardFooter>
        </Card>
      )}
      
      {/* Step 4: Resultado y ajustes */}
      {currentStep === 4 && estimateResult && (
        <Card>
          <CardHeader>
            <CardTitle>Resultado del Estimado</CardTitle>
            <CardDescription>Revisa y ajusta el estimado generado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-primary/5 p-4 rounded-md">
              <h3 className="text-lg font-medium mb-2">Resumen del Proyecto</h3>
              
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
                <div className="text-sm">
                  <span className="font-medium">Cliente:</span> {validatedClient?.name}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Dirección:</span> {validatedClient?.address}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Tipo:</span> {form.getValues('projectType')} - {form.getValues('projectSubtype')}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Fecha:</span> {new Date().toLocaleDateString()}
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <h3 className="text-lg font-medium mb-2">Detalles del Estimado</h3>
              
              <div className="mb-4">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-primary/10">
                      <th className="border border-primary/20 p-2 text-left">Concepto</th>
                      <th className="border border-primary/20 p-2 text-right">Precio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estimateResult.materials && Object.entries(estimateResult.materials).map(([key, value]: [string, any]) => (
                      <tr key={key} className="even:bg-primary/5">
                        <td className="border border-primary/20 p-2">
                          {value.description || key}
                          {value.quantity && <span className="text-sm text-muted-foreground ml-2">({value.quantity} {value.unit || 'unidades'})</span>}
                        </td>
                        <td className="border border-primary/20 p-2 text-right">
                          ${typeof value.totalCost === 'number' ? value.totalCost.toFixed(2) : (value.price || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    
                    <tr className="bg-primary/5">
                      <td className="border border-primary/20 p-2 font-medium">Subtotal Materiales</td>
                      <td className="border border-primary/20 p-2 text-right font-medium">
                        ${estimateResult.materialCost ? parseFloat(estimateResult.materialCost).toFixed(2) : '0.00'}
                      </td>
                    </tr>
                    
                    <tr>
                      <td className="border border-primary/20 p-2">
                        Mano de Obra
                        {adjustedLaborRate !== null ? (
                          <span className="text-sm text-primary ml-2">(Tasa ajustada: ${adjustedLaborRate.toFixed(2)}/hr)</span>
                        ) : null}
                      </td>
                      <td className="border border-primary/20 p-2 text-right">
                        ${estimateResult.laborCost ? parseFloat(estimateResult.laborCost).toFixed(2) : '0.00'}
                      </td>
                    </tr>
                    
                    {estimateResult.demolitionCost && parseFloat(estimateResult.demolitionCost) > 0 && (
                      <tr>
                        <td className="border border-primary/20 p-2">Demolición</td>
                        <td className="border border-primary/20 p-2 text-right">
                          ${parseFloat(estimateResult.demolitionCost).toFixed(2)}
                        </td>
                      </tr>
                    )}
                    
                    {estimateResult.paintingCost && parseFloat(estimateResult.paintingCost) > 0 && (
                      <tr>
                        <td className="border border-primary/20 p-2">Pintura/Acabado</td>
                        <td className="border border-primary/20 p-2 text-right">
                          ${parseFloat(estimateResult.paintingCost).toFixed(2)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-primary/20">
                      <td className="border border-primary/20 p-2 font-bold">TOTAL</td>
                      <td className="border border-primary/20 p-2 text-right font-bold">
                        ${estimateResult.finalTotalCost ? parseFloat(estimateResult.finalTotalCost).toFixed(2) : '0.00'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              
              <div className="text-sm mb-4">
                <span className="font-medium">Tiempo estimado de finalización:</span> {estimateResult.completionTime || "No disponible"}
              </div>
              
              {form.getValues('notes') && (
                <div className="bg-muted/50 p-3 rounded-md mt-4">
                  <span className="font-medium text-sm">Notas:</span>
                  <p className="text-sm mt-1">{form.getValues('notes')}</p>
                </div>
              )}
            </div>
            
            <div className="flex flex-col space-y-4">
              <h3 className="text-lg font-medium">Ajustes</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="laborRate">Tasa de Mano de Obra ($/hr)</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Input
                      id="laborRate"
                      type="number"
                      value={adjustedLaborRate !== null ? adjustedLaborRate : (estimateResult.laborRate || '')}
                      onChange={(e) => handleLaborRateAdjustment(parseFloat(e.target.value))}
                      className="max-w-40"
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setAdjustedLaborRate(null)}
                      disabled={adjustedLaborRate === null}
                    >
                      Restablecer
                    </Button>
                  </div>
                </div>
                
                <div className="mt-4">
                  <h3 className="text-md font-medium mb-2">Estilo de Estimado</h3>
                  <TemplateSelector 
                    templates={templates}
                    selectedTemplateId={selectedTemplateId}
                    onTemplateSelect={(id) => setSelectedTemplateId(id)}
                  />
                </div>
              </div>
            </div>
            
            {/* Previsualización del estimado usando la plantilla seleccionada */}
            <div className="mt-8">
              <h3 className="text-lg font-medium mb-4">Vista Previa</h3>
              <div className="border rounded-lg shadow-sm ">
                <EstimatePreview 
                  estimateData={{
                    client: validatedClient,
                    contractor: profile,
                    project: {
                      type: form.getValues('projectType'),
                      subtype: form.getValues('projectSubtype'),
                      dimensions: form.getValues('dimensions'),
                      notes: form.getValues('notes')
                    },
                    rulesBasedEstimate: estimateResult,
                    projectId: estimateResult.projectId || 'NEW',
                  }}
                  templateId={selectedTemplateId || 999001}
                  className="w-full"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between flex-wrap gap-2">
            <Button variant="outline" onClick={goToPreviousStep}>Anterior</Button>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={sendEstimateByEmail} 
                disabled={!validatedClient?.email}
              >
                Enviar por Email
              </Button>
              <Button onClick={generateEstimateHTML}>Generar PDF</Button>
            </div>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}