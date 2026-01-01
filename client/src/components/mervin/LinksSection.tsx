/**
 * LinksSection Component
 * 
 * Renderiza una lista de links estructurados enviados por el backend.
 * Muestra links importantes como referencias, fuentes o recursos adicionales.
 */

import { Link as LinkType } from "@/mervin-v2/types/responses";
import { ExternalLink, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LinksSectionProps {
  links: LinkType[];
}

export function LinksSection({ links }: LinksSectionProps) {
  if (!links || links.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 space-y-2">
      <p className="text-sm text-muted-foreground font-medium">🔗 Enlaces relacionados:</p>
      <div className="flex flex-wrap gap-2">
        {links.map((link, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            asChild
            className="group hover:bg-primary/10 hover:border-primary transition-colors"
          >
            <a
              href={link.url}
              target={link.external !== false ? "_blank" : "_self"}
              rel={link.external !== false ? "noopener noreferrer" : undefined}
              className="flex items-center gap-2"
            >
              <LinkIcon className="w-4 h-4 text-primary" />
              <span className="text-sm">{link.label}</span>
              {link.external !== false && (
                <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
              )}
            </a>
          </Button>
        ))}
      </div>
    </div>
  );
}
