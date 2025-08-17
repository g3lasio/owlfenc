import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { Client } from "../../services/clientService";
import { useToast } from "@/hooks/use-toast";

interface ExportClientsButtonProps {
  clients: Client[];
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}

export function ExportClientsButton({ 
  clients, 
  variant = "outline", 
  size = "default" 
}: ExportClientsButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const exportToCSV = async () => {
    if (clients.length === 0) {
      toast({
        variant: "destructive",
        title: "Sin datos",
        description: "No hay clientes para exportar."
      });
      return;
    }

    setIsExporting(true);

    try {
      // Headers for CSV
      const headers = [
        "Nombre",
        "Email", 
        "Teléfono",
        "Teléfono Móvil",
        "Dirección",
        "Ciudad",
        "Estado", 
        "Código Postal",
        "Clasificación",
        "Origen",
        "Etiquetas",
        "Notas",
        "Fecha de Creación",
        "Última Actualización"
      ];

      // Convert clients to CSV rows
      const rows = clients.map(client => [
        client.name || "",
        client.email || "",
        client.phone || "",
        client.mobilePhone || "",
        client.address || "",
        client.city || "",
        client.state || "",
        client.zipCode || "",
        client.classification || "",
        client.source || "",
        client.tags ? client.tags.join("; ") : "",
        client.notes || "",
        client.createdAt ? new Date(client.createdAt).toLocaleDateString('es-ES') : "",
        client.updatedAt ? new Date(client.updatedAt).toLocaleDateString('es-ES') : ""
      ]);

      // Escape CSV fields that contain commas, quotes, or newlines
      const escapeCsvField = (field: string) => {
        if (field.includes(",") || field.includes('"') || field.includes("\n")) {
          return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
      };

      // Build CSV content
      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(escapeCsvField).join(","))
      ].join("\n");

      // Create and download file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `clientes_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      toast({
        title: "Exportación exitosa",
        description: `Se exportaron ${clients.length} clientes a CSV.`
      });

    } catch (error) {
      console.error("Error exporting clients:", error);
      toast({
        variant: "destructive", 
        title: "Error de exportación",
        description: "No se pudo exportar el archivo CSV."
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={exportToCSV}
      disabled={isExporting || clients.length === 0}
      className="flex items-center gap-2"
    >
      <Download className="h-4 w-4" />
      {isExporting ? "Exportando..." : "Exportar CSV"}
    </Button>
  );
}