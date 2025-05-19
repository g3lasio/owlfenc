import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Edit, Save, FileDown, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface EstimatePreviewEditableProps {
  html: string;
  onSave: (newHtml: string) => void;
  onClose: () => void;
  onDownload: () => void;
}

export default function EstimatePreviewEditable({ 
  html, 
  onSave, 
  onClose,
  onDownload
}: EstimatePreviewEditableProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editableContent, setEditableContent] = useState(html);
  const previewRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // When html prop changes and we're not in edit mode, update editableContent
    if (!isEditing) {
      setEditableContent(html);
    }
    
    // Process images in the preview to ensure they load correctly
    if (previewRef.current && !isEditing) {
      setTimeout(() => {
        const images = previewRef.current?.querySelectorAll('img') || [];
        console.log(`Found ${images.length} images in preview`);
        
        images.forEach(img => {
          // Add crossorigin attribute to all images
          img.setAttribute('crossorigin', 'anonymous');
          
          // Handle image loading errors
          img.onerror = () => {
            console.error('Error loading image in preview:', img.src);
            if (img.alt === 'Logo') {
              console.log('Attempting to load fallback logo');
              img.src = '/owl-logo.png';
            } else {
              // For non-logo images, hide them on error
              img.style.display = 'none';
            }
          };
        });
      }, 100);
    }
  }, [html, isEditing]);
  
  const handleEditToggle = () => {
    if (isEditing) {
      // Save changes
      onSave(editableContent);
      setIsEditing(false);
    } else {
      // Enter edit mode
      setIsEditing(true);
    }
  };
  
  // Sanitize HTML to prevent XSS attacks when editing
  const sanitizeHtml = (html: string): string => {
    // This is a simple sanitizer, in a real app you would use a library like DOMPurify
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/g, '');
  };

  return (
    <div className="estimate-preview-editable-container">
      <div className="mb-4 flex justify-between items-center">
        <Button 
          variant={isEditing ? "default" : "outline"} 
          onClick={handleEditToggle}
          className="flex items-center gap-1"
        >
          {isEditing ? <Save className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
          {isEditing ? "Save Changes" : "Edit Text"}
        </Button>
        
        <div className="flex gap-2">
          <Button 
            variant="default" 
            onClick={onDownload}
            disabled={isEditing}
            className="flex items-center gap-1"
          >
            <FileDown className="h-4 w-4" />
            Download PDF
          </Button>
          
          <Button 
            variant="outline" 
            onClick={onClose}
            className="flex items-center gap-1"
          >
            <X className="h-4 w-4" />
            Close
          </Button>
        </div>
      </div>

      {isEditing ? (
        <Card className="border rounded-md">
          <CardContent className="p-4">
            <Textarea
              value={editableContent}
              onChange={(e) => setEditableContent(sanitizeHtml(e.target.value))}
              className="min-h-[500px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Edit the HTML content directly. Basic HTML tags like &lt;p&gt;, &lt;h1&gt;, and &lt;strong&gt; are supported.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div 
          ref={previewRef}
          className="estimate-preview border rounded-md p-4 bg-white"
          dangerouslySetInnerHTML={{ __html: editableContent }}
        />
      )}
    </div>
  );
}