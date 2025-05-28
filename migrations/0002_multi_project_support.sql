
-- Migración para soportar múltiples tipos de proyectos
-- 0002_multi_project_support.sql

-- Agregar nuevas columnas para tipos de proyecto
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS project_subtype TEXT,
ADD COLUMN IF NOT EXISTS project_category VARCHAR(100) DEFAULT 'general',
ADD COLUMN IF NOT EXISTS project_description TEXT,
ADD COLUMN IF NOT EXISTS project_scope TEXT,
ADD COLUMN IF NOT EXISTS materials_list JSONB,
ADD COLUMN IF NOT EXISTS labor_hours INTEGER,
ADD COLUMN IF NOT EXISTS difficulty VARCHAR(20) DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal';

-- Actualizar el campo project_type existente para tener un valor por defecto apropiado
UPDATE projects 
SET project_type = CASE 
  WHEN fence_type IS NOT NULL THEN 'fencing'
  ELSE 'general'
END 
WHERE project_type IS NULL OR project_type = 'fence';

-- Actualizar project_subtype basado en fence_type existente
UPDATE projects 
SET project_subtype = fence_type 
WHERE fence_type IS NOT NULL AND project_subtype IS NULL;

-- Actualizar project_category para que coincida con project_type
UPDATE projects 
SET project_category = project_type 
WHERE project_category = 'general' AND project_type != 'general';

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_projects_project_type ON projects(project_type);
CREATE INDEX IF NOT EXISTS idx_projects_project_category ON projects(project_category);
CREATE INDEX IF NOT EXISTS idx_projects_priority ON projects(priority);
CREATE INDEX IF NOT EXISTS idx_projects_difficulty ON projects(difficulty);

-- Comentarios para documentar los cambios
COMMENT ON COLUMN projects.project_type IS 'Categoría principal del proyecto (fencing, roofing, plumbing, etc.)';
COMMENT ON COLUMN projects.project_subtype IS 'Tipo específico del proyecto (Wood Fence, Metal Roofing, etc.)';
COMMENT ON COLUMN projects.project_category IS 'Alias para project_type para compatibilidad';
COMMENT ON COLUMN projects.project_description IS 'Descripción detallada del proyecto';
COMMENT ON COLUMN projects.project_scope IS 'Alcance del trabajo a realizar';
COMMENT ON COLUMN projects.materials_list IS 'Lista de materiales en formato JSON';
COMMENT ON COLUMN projects.labor_hours IS 'Horas estimadas de trabajo';
COMMENT ON COLUMN projects.difficulty IS 'Nivel de dificultad: easy, medium, hard';
COMMENT ON COLUMN projects.priority IS 'Prioridad del proyecto: low, normal, high, urgent';
