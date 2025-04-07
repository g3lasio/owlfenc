interface ContractPreviewProps {
  html: string;
}

export default function ContractPreview({ html }: ContractPreviewProps) {
  return (
    <div className="template-preview" dangerouslySetInnerHTML={{ __html: html }}></div>
  );
}
