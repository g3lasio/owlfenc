
-- Crear tabla de materiales
CREATE TABLE IF NOT EXISTS materials (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT NOT NULL,
  price INTEGER NOT NULL,
  supplier TEXT DEFAULT 'Home Depot',
  sku TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar datos iniciales
INSERT INTO materials (category, name, description, unit, price, sku) VALUES
-- Postes
('Posts', 'Pressure-Treated Post 4x4x8', 'Pressure treated pine post for fence construction', 'piece', 1699, '272-924'),
('Posts', 'Vinyl Post 4x4x8', 'White vinyl fence post with internal steel reinforcement', 'piece', 3999, '204-837'),

-- Paneles
('Panels', 'Privacy Fence Panel 6x8', 'Pressure-treated pine privacy panel', 'piece', 7999, '193-498'),
('Panels', 'Vinyl Privacy Panel 6x8', 'White vinyl privacy panel', 'piece', 12999, '214-365'),
('Panels', 'Chain Link 4ft x 50ft Roll', 'Galvanized chain link fabric', 'roll', 8999, '765-432'),

-- Hardware
('Hardware', 'Post Cap 4x4', 'Decorative pressure-treated wood post cap', 'piece', 599, '317-645'),
('Hardware', 'Gate Hinge Set', 'Heavy duty black gate hinge set', 'set', 1999, '456-789'),
('Hardware', 'Gate Latch', 'Adjustable gate latch with padlock option', 'piece', 1499, '234-567'),

-- Concrete
('Concrete', 'Fast-Setting Concrete 50lb', 'Quick-setting concrete mix for post installation', 'bag', 699, '891-234'),

-- Accesorios
('Accessories', 'Metal Bracket 4x4', 'Galvanized metal fence bracket', 'piece', 499, '123-890'),
('Accessories', 'Deck Screws 5lb', 'Exterior coated deck screws', 'box', 2999, '678-901');
