-- Smart Material Lists Cache - Para almacenar listas generadas por DeepSearch
CREATE TABLE IF NOT EXISTS smart_material_lists (
  id TEXT PRIMARY KEY,
  project_type VARCHAR(100) NOT NULL,
  project_description TEXT NOT NULL,
  region VARCHAR(100) NOT NULL,
  materials_list JSONB NOT NULL,
  labor_costs JSONB,
  additional_costs JSONB,
  total_materials_cost DECIMAL(10,2),
  total_labor_cost DECIMAL(10,2),
  total_additional_cost DECIMAL(10,2),
  grand_total DECIMAL(10,2),
  confidence DECIMAL(3,2),
  usage_count INTEGER NOT NULL DEFAULT 1,
  last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Project Templates Cache - Para patrones de proyectos comunes
CREATE TABLE IF NOT EXISTS project_templates (
  id TEXT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  project_type VARCHAR(100) NOT NULL,
  description TEXT,
  template_data JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_smart_materials_project_region ON smart_material_lists(project_type, region);
CREATE INDEX IF NOT EXISTS idx_smart_materials_usage ON smart_material_lists(usage_count DESC, last_used DESC);
CREATE INDEX IF NOT EXISTS idx_project_templates_type ON project_templates(project_type, is_active);
