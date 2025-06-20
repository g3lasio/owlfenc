// Copia temporal para restaurar la funcionalidad básica
import React, { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Package,
  Search,
  ChevronDown,
  ChevronRight,
  Wrench,
} from "lucide-react";

// Estado mínimo para el nuevo botón
const MaterialsAISearchButton = ({ 
  projectDetails, 
  isAIProcessing, 
  onSearch 
}: {
  projectDetails: string;
  isAIProcessing: boolean;
  onSearch: (type: "materials" | "labor" | "full") => void;
}) => {
  const [showDropdown, setShowDropdown] = useState(false);

  const isDisabled = !projectDetails.trim() || projectDetails.length < 3 || isAIProcessing;

  return (
    <div className="relative">
      {/* Botón principal - Estilo comprimido */}
      <button
        disabled={isDisabled}
        className="px-3 py-2 text-sm font-medium bg-purple-800 border border-purple-400/30 rounded-lg hover:border-purple-400/60 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <div className="flex items-center gap-2 text-white">
          <Search className="h-4 w-4 text-purple-400" />
          <span>AI SEARCH</span>
          <ChevronDown className={`h-3 w-3 text-purple-400 transition-transform ${showDropdown ? "rotate-180" : ""}`} />
        </div>
      </button>

      {/* Modal dropdown */}
      {showDropdown && !isAIProcessing && (
        <>
          {/* Overlay para cerrar */}
          <div 
            className="fixed inset-0 z-[998]"
            onClick={() => setShowDropdown(false)}
          />
          
          {/* Dropdown modal */}
          <div className="fixed inset-0 z-[999] flex items-start justify-center pt-20">
            <div 
              className="bg-purple-900/95 backdrop-blur-xl border border-purple-400/30 rounded-xl shadow-2xl max-w-sm w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="border-b border-purple-400/20 p-4">
                <div className="text-xs font-mono text-purple-400 mb-1 tracking-wider">
                  SELECT AI SEARCH TYPE
                </div>
              </div>

              {/* Opciones */}
              <div className="p-3 space-y-2">
                {/* Only Materials */}
                <button
                  onClick={() => {
                    onSearch("materials");
                    setShowDropdown(false);
                  }}
                  className="group w-full p-3 rounded-lg border border-blue-400/20 bg-blue-500/5 hover:border-blue-400/50 hover:bg-blue-500/15 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-blue-400" />
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium text-white">ONLY MATERIALS</div>
                      <div className="text-xs text-slate-400">Materials database only</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-blue-400" />
                  </div>
                </button>

                {/* Labor Costs */}
                <button
                  onClick={() => {
                    onSearch("labor");
                    setShowDropdown(false);
                  }}
                  className="group w-full p-3 rounded-lg border border-orange-400/20 bg-orange-500/5 hover:border-orange-400/50 hover:bg-orange-500/15 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Wrench className="h-5 w-5 text-orange-400" />
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium text-white">LABOR COSTS</div>
                      <div className="text-xs text-slate-400">Labor service items</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-orange-400" />
                  </div>
                </button>

                {/* Full Costs */}
                <button
                  onClick={() => {
                    onSearch("full");
                    setShowDropdown(false);
                  }}
                  className="group w-full p-3 rounded-lg border border-emerald-400/40 bg-emerald-500/10 hover:border-emerald-400/70 hover:bg-emerald-500/20 transition-all ring-1 ring-emerald-400/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full border-2 border-emerald-400 relative">
                      <div className="absolute inset-1 rounded-full bg-emerald-400/40" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium text-white">FULL COSTS</div>
                      <div className="text-xs text-slate-400">Complete analysis</div>
                      <div className="text-xs text-emerald-400/80">★ RECOMMENDED</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-emerald-400" />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MaterialsAISearchButton;