interface EstimatePreviewProps {
  html: string;
}

export default function EstimatePreview({ html }: EstimatePreviewProps) {
  return (
    <div className="template-preview" dangerouslySetInnerHTML={{ __html: html }}></div>
  );
}
