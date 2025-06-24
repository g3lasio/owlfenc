import React from 'react';

interface ContractPreviewProps {
  html: string;
}

const ContractPreview: React.FC<ContractPreviewProps> = ({ html }) => {
  return (
    <div className="contract-preview">
      <div className="w-full bg-card border rounded-lg shadow-sm ">
        <div className="p-4 bg-muted/20 border-b flex items-center justify-between">
          <h3 className="text-md font-semibold">Vista previa del contrato</h3>
          <span className="text-xs text-muted-foreground">Contrato oficial</span>
        </div>
        <div 
          className="contract-content p-4 max-h-[500px] " 
          dangerouslySetInnerHTML={{ __html: html }}
        ></div>
      </div>
    </div>
  );
};

export default ContractPreview;