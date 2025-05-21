/**
 * Utility for loading HTML templates from static files
 */

// Template file paths (archivos en carpeta pública)
const TEMPLATE_PATHS = {
  'standard': '/templates/basictemplateestimate.html',
  'professional': '/templates/Premiumtemplateestimate.html', 
  'luxury': '/templates/luxurytemplate.html'
};

// Cache for loaded templates
const templateCache: Record<string, string> = {};

/**
 * Loads an HTML template from a file
 * @param style The template style (standard, professional, luxury)
 * @returns Promise with the template HTML
 */
export async function loadTemplateHTML(style: string): Promise<string> {
  // Return from cache if available
  if (templateCache[style]) {
    return templateCache[style];
  }
  
  try {
    // Get the template path
    const path = TEMPLATE_PATHS[style as keyof typeof TEMPLATE_PATHS];
    if (!path) {
      console.error(`No template path found for style: ${style}`);
      return '';
    }
    
    // Fetch the template file
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load template: ${response.status} ${response.statusText}`);
    }
    
    // Get the HTML content
    const html = await response.text();
    
    // Cache the template
    templateCache[style] = html;
    
    return html;
  } catch (error) {
    console.error('Error loading template:', error);
    return '';
  }
}

/**
 * Gets the template style based on template name or ID
 * @param template Template object or ID
 * @returns The template style (standard, professional, luxury)
 */
export function getTemplateStyle(template: any): string {
  if (!template) return 'standard';
  
  // Check if template is an object with style
  if (typeof template === 'object' && template.style) {
    return template.style;
  }
  
  // Check if template is an object with name
  if (typeof template === 'object' && template.name) {
    const name = template.name.toLowerCase();
    if (name.includes('profesional') || name.includes('professional')) {
      return 'professional';
    } else if (name.includes('premium') || name.includes('luxury')) {
      return 'luxury';
    }
    return 'standard';
  }
  
  // Default to standard
  return 'standard';
}