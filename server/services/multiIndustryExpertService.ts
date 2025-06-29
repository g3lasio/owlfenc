/**
 * Multi-Industry Expert Contractor Service
 * Expandido para manejar todas las industrias de construcción con precisión quirúrgica
 */

interface IndustryMaterial {
  id: string;
  name: string;
  description: string;
  unit: string;
  category: string;
  avgPriceRange: { min: number; max: number; typical: number };
  wasteFactorPercent: number;
  laborHoursPerUnit: number;
  specifications: string[];
  suppliers: string[];
}

interface CalculationFormula {
  industry: string;
  projectType: string;
  formula: (dimensions: any, specs: any) => number;
  unit: string;
  description: string;
}

interface ProjectDimensions {
  // Universales
  length?: number;
  width?: number;
  height?: number;
  area?: number;
  volume?: number;
  
  // Específicos por industria
  linearFeet?: number;
  squareFeet?: number;
  cubicYards?: number;
  rooms?: number;
  fixtures?: number;
  circuits?: number;
  pitch?: number; // para techos
  depth?: number; // para concreto
  squares?: number; // para roofing (100 sqft = 1 square)
}

export class MultiIndustryExpertService {
  
  /**
   * Base de datos expandida de materiales por industria
   */
  private industryMaterials: Record<string, IndustryMaterial[]> = {
    
    // FENCING - Existente mejorado
    fencing: [
      {
        id: 'post_4x4x8_pt',
        name: '4"×4"×8\' Pressure Treated Pine Post',
        description: 'Ground contact rated pressure treated fence posts',
        unit: 'each',
        category: 'structural',
        avgPriceRange: { min: 12, max: 18, typical: 15 },
        wasteFactorPercent: 5,
        laborHoursPerUnit: 0.5,
        specifications: ['Ground Contact', 'ACQ Treated', '.40 CCA'],
        suppliers: ['Home Depot', 'Lowe\'s', 'Local Lumber Yard']
      },
      {
        id: 'board_1x6x8_cedar',
        name: '1"×6"×8\' Western Red Cedar Board',
        description: 'Select grade Western Red Cedar fencing boards',
        unit: 'each',
        category: 'covering',
        avgPriceRange: { min: 8, max: 14, typical: 11 },
        wasteFactorPercent: 10,
        laborHoursPerUnit: 0.15,
        specifications: ['Select Grade', 'Kiln Dried', 'Smooth Finish'],
        suppliers: ['Specialty Lumber', 'Home Depot', 'Local Cedar Mill']
      }
    ],

    // FLOORING - Nueva industria
    flooring: [
      {
        id: 'laminate_ac4_premium',
        name: 'AC4 Premium Laminate Flooring',
        description: 'Commercial grade laminate with attached underlayment',
        unit: 'sqft',
        category: 'flooring_material',
        avgPriceRange: { min: 5.50, max: 9.00, typical: 7.25 },
        wasteFactorPercent: 10,
        laborHoursPerUnit: 0.15,
        specifications: ['AC4 Rating', 'Water Resistant', '12mm Thick', 'Click Lock'],
        suppliers: ['Floor & Decor', 'Home Depot', 'Lumber Liquidators']
      },
      {
        id: 'underlayment_foam_3mm',
        name: '3mm Foam Underlayment',
        description: 'Moisture barrier foam underlayment',
        unit: 'sqft',
        category: 'preparation',
        avgPriceRange: { min: 0.35, max: 0.65, typical: 0.50 },
        wasteFactorPercent: 5,
        laborHoursPerUnit: 0.05,
        specifications: ['3mm Thickness', 'Moisture Barrier', 'Sound Dampening'],
        suppliers: ['Floor & Decor', 'Home Depot', 'BuildDirect']
      },
      {
        id: 'transition_strip_multi',
        name: 'Multi-Surface Transition Strip',
        description: 'T-molding for transitions between surfaces',
        unit: 'linear_ft',
        category: 'trim',
        avgPriceRange: { min: 3.50, max: 7.00, typical: 5.25 },
        wasteFactorPercent: 5,
        laborHoursPerUnit: 0.25,
        specifications: ['Adjustable Height', 'Multiple Finishes', '8ft Length'],
        suppliers: ['Floor & Decor', 'Home Depot', 'Lowe\'s']
      }
    ],

    // ROOFING - Nueva industria
    roofing: [
      {
        id: 'shingles_architectural_30yr',
        name: '30-Year Architectural Shingles',
        description: 'Premium architectural asphalt shingles',
        unit: 'square', // 100 sqft
        category: 'roofing_material',
        avgPriceRange: { min: 180, max: 280, typical: 230 },
        wasteFactorPercent: 15,
        laborHoursPerUnit: 6,
        specifications: ['30-Year Warranty', 'Class A Fire Rating', 'Wind Resistant'],
        suppliers: ['GAF', 'Owens Corning', 'CertainTeed']
      },
      {
        id: 'underlayment_synthetic',
        name: 'Synthetic Roofing Underlayment',
        description: 'High-performance synthetic underlayment',
        unit: 'square',
        category: 'roofing_material',
        avgPriceRange: { min: 65, max: 95, typical: 80 },
        wasteFactorPercent: 10,
        laborHoursPerUnit: 1.5,
        specifications: ['Tear Resistant', 'UV Stable', 'Non-Slip Surface'],
        suppliers: ['GAF', 'Owens Corning', 'Home Depot']
      },
      {
        id: 'ridge_cap_shingles',
        name: 'Ridge Cap Shingles',
        description: 'Pre-formed ridge cap shingles',
        unit: 'linear_ft',
        category: 'finishing',
        avgPriceRange: { min: 2.50, max: 4.50, typical: 3.50 },
        wasteFactorPercent: 5,
        laborHoursPerUnit: 0.3,
        specifications: ['Pre-Formed', 'Matching Color', 'Ventilated Options'],
        suppliers: ['GAF', 'Owens Corning', 'Lowe\'s']
      }
    ],

    // PLUMBING - Nueva industria
    plumbing: [
      {
        id: 'pex_pipe_half_inch',
        name: '1/2" PEX Tubing',
        description: 'Cross-linked polyethylene water supply tubing',
        unit: 'linear_ft',
        category: 'piping',
        avgPriceRange: { min: 0.45, max: 0.85, typical: 0.65 },
        wasteFactorPercent: 10,
        laborHoursPerUnit: 0.1,
        specifications: ['NSF Certified', 'Chlorine Resistant', 'Flexible'],
        suppliers: ['Ferguson', 'Home Depot', 'Lowe\'s']
      },
      {
        id: 'toilet_dual_flush',
        name: 'Dual-Flush Toilet',
        description: 'Water-efficient dual-flush toilet',
        unit: 'each',
        category: 'fixture',
        avgPriceRange: { min: 180, max: 400, typical: 290 },
        wasteFactorPercent: 0,
        laborHoursPerUnit: 3,
        specifications: ['EPA WaterSense', 'Dual Flush', 'Elongated Bowl'],
        suppliers: ['Ferguson', 'Home Depot', 'Kohler']
      }
    ],

    // ELECTRICAL - Nueva industria  
    electrical: [
      {
        id: 'romex_12awg_250ft',
        name: '12 AWG Romex Cable 250ft',
        description: 'Non-metallic sheathed cable for 20A circuits',
        unit: 'roll',
        category: 'wiring',
        avgPriceRange: { min: 85, max: 130, typical: 108 },
        wasteFactorPercent: 15,
        laborHoursPerUnit: 0.05, // per foot
        specifications: ['12 AWG', '20A Rated', 'NM-B Cable'],
        suppliers: ['Electrical Supply', 'Home Depot', 'Lowe\'s']
      },
      {
        id: 'outlet_gfci_20a',
        name: '20A GFCI Outlet',
        description: 'Ground fault circuit interrupter outlet',
        unit: 'each',
        category: 'device',
        avgPriceRange: { min: 15, max: 35, typical: 25 },
        wasteFactorPercent: 5,
        laborHoursPerUnit: 0.75,
        specifications: ['20A Rating', 'Weather Resistant', 'Tamper Resistant'],
        suppliers: ['Electrical Supply', 'Home Depot', 'Leviton']
      }
    ],

    // PAINTING - Nueva industria
    painting: [
      {
        id: 'paint_interior_premium',
        name: 'Premium Interior Paint',
        description: 'High-quality interior latex paint',
        unit: 'gallon',
        category: 'coating',
        avgPriceRange: { min: 85, max: 125, typical: 105 },
        wasteFactorPercent: 5,
        laborHoursPerUnit: 0.008, // per sqft coverage
        specifications: ['Zero VOC', 'One Coat Coverage', 'Washable'],
        suppliers: ['Sherwin Williams', 'Benjamin Moore', 'Home Depot']
      },
      {
        id: 'primer_bonding',
        name: 'High-Performance Bonding Primer',
        description: 'Universal bonding primer for multiple surfaces',
        unit: 'gallon',
        category: 'preparation',
        avgPriceRange: { min: 65, max: 95, typical: 80 },
        wasteFactorPercent: 5,
        laborHoursPerUnit: 0.007, // per sqft coverage
        specifications: ['Multi-Surface', 'High Adhesion', 'Quick Dry'],
        suppliers: ['Sherwin Williams', 'Benjamin Moore', 'Zinsser']
      },
      {
        id: 'rollers_premium_9in',
        name: '9" Premium Paint Rollers',
        description: 'High-quality paint rollers for smooth finish',
        unit: 'each',
        category: 'preparation',
        avgPriceRange: { min: 8, max: 15, typical: 12 },
        wasteFactorPercent: 0,
        laborHoursPerUnit: 0.1,
        specifications: ['Lint-Free', 'High Capacity', '9-inch Width'],
        suppliers: ['Sherwin Williams', 'Home Depot', 'Lowe\'s']
      },
      {
        id: 'brushes_premium_set',
        name: 'Premium Paint Brush Set',
        description: 'Professional paint brush set for detail work',
        unit: 'set',
        category: 'preparation',
        avgPriceRange: { min: 25, max: 45, typical: 35 },
        wasteFactorPercent: 0,
        laborHoursPerUnit: 0.5,
        specifications: ['Natural Bristles', 'Multiple Sizes', 'Professional Grade'],
        suppliers: ['Sherwin Williams', 'Benjamin Moore', 'Home Depot']
      }
    ],

    // CONCRETE - Nueva industria
    concrete: [
      {
        id: 'concrete_4000psi',
        name: 'Ready-Mix Concrete 4000 PSI',
        description: 'High-strength ready-mix concrete',
        unit: 'cubic_yard',
        category: 'structural',
        avgPriceRange: { min: 160, max: 220, typical: 190 },
        wasteFactorPercent: 10,
        laborHoursPerUnit: 1.5,
        specifications: ['4000 PSI', '6-inch Slump', 'Air Entrained'],
        suppliers: ['Local Ready-Mix', 'Cemex', 'LaFarge']
      },
      {
        id: 'rebar_4',
        name: '#4 Rebar (1/2")',
        description: 'Grade 60 deformed steel reinforcement bar',
        unit: 'linear_ft',
        category: 'reinforcement',
        avgPriceRange: { min: 0.65, max: 0.95, typical: 0.80 },
        wasteFactorPercent: 10,
        laborHoursPerUnit: 0.05,
        specifications: ['Grade 60', 'ASTM A615', 'Deformed'],
        suppliers: ['Steel Supply', 'Home Depot', 'Lowe\'s']
      },
      {
        id: 'wire_mesh_6x6',
        name: '6"×6" Welded Wire Mesh',
        description: 'Concrete reinforcement wire mesh',
        unit: 'square_ft',
        category: 'reinforcement',
        avgPriceRange: { min: 0.85, max: 1.25, typical: 1.05 },
        wasteFactorPercent: 15,
        laborHoursPerUnit: 0.02,
        specifications: ['6×6 Grid', 'Galvanized', 'W1.4×W1.4'],
        suppliers: ['Steel Supply', 'Home Depot', 'Concrete Supply']
      },
      {
        id: 'gravel_base_crushed',
        name: 'Crushed Stone Base',
        description: 'Graded aggregate base for concrete',
        unit: 'cubic_yard',
        category: 'base',
        avgPriceRange: { min: 35, max: 55, typical: 45 },
        wasteFactorPercent: 5,
        laborHoursPerUnit: 0.5,
        specifications: ['3/4" Minus', 'Compactable', 'Clean Stone'],
        suppliers: ['Quarry Direct', 'Landscape Supply', 'Home Depot']
      }
    ],

    // RETAINING WALLS - Nueva especialidad
    retaining_walls: [
      {
        id: 'concrete_block_8x8x16',
        name: '8"×8"×16" Concrete Masonry Block',
        description: 'Standard concrete masonry unit for retaining walls',
        unit: 'each',
        category: 'structural',
        avgPriceRange: { min: 1.85, max: 2.75, typical: 2.30 },
        wasteFactorPercent: 5,
        laborHoursPerUnit: 0.15,
        specifications: ['Medium Weight', '2000 PSI', 'Standard CMU'],
        suppliers: ['Masonry Supply', 'Home Depot', 'Local Block Plant']
      },
      {
        id: 'rebar_5_grade60',
        name: '#5 Rebar (5/8") Grade 60',
        description: 'Heavy duty reinforcement for retaining walls',
        unit: 'linear_ft',
        category: 'reinforcement',
        avgPriceRange: { min: 0.65, max: 1.10, typical: 0.85 },
        wasteFactorPercent: 10,
        laborHoursPerUnit: 0.08,
        specifications: ['Grade 60', '5/8" Diameter', 'ASTM A615'],
        suppliers: ['Steel Supply', 'Construction Materials', 'Rebar Depot']
      },
      {
        id: 'gravel_base_3_4',
        name: '3/4" Crushed Gravel Base',
        description: 'Drainage gravel for retaining wall foundation',
        unit: 'cubic_yard',
        category: 'foundation',
        avgPriceRange: { min: 28, max: 45, typical: 35 },
        wasteFactorPercent: 15,
        laborHoursPerUnit: 0.5,
        specifications: ['3/4" Clean Stone', 'ASTM C33', 'Drainage Grade'],
        suppliers: ['Aggregate Supply', 'Local Quarry', 'Landscape Supply']
      },
      {
        id: 'drain_pipe_4in',
        name: '4" Perforated Drain Pipe',
        description: 'French drain system for retaining wall',
        unit: 'linear_ft',
        category: 'drainage',
        avgPriceRange: { min: 1.25, max: 2.10, typical: 1.65 },
        wasteFactorPercent: 5,
        laborHoursPerUnit: 0.1,
        specifications: ['4" Diameter', 'Perforated', 'HDPE Material'],
        suppliers: ['Plumbing Supply', 'Home Depot', 'Drainage Solutions']
      },
      {
        id: 'geotextile_fabric',
        name: 'Geotextile Filter Fabric',
        description: 'Separation fabric for drainage system',
        unit: 'square_yard',
        category: 'drainage',
        avgPriceRange: { min: 0.85, max: 1.45, typical: 1.15 },
        wasteFactorPercent: 10,
        laborHoursPerUnit: 0.02,
        specifications: ['Non-Woven', 'Permeable', '4 oz/sq yd'],
        suppliers: ['Geotechnical Supply', 'Landscape Supply', 'Construction Materials']
      },
      {
        id: 'mortar_type_s',
        name: 'Type S Mortar Mix',
        description: 'High-strength mortar for block laying',
        unit: 'bag_80lb',
        category: 'bonding',
        avgPriceRange: { min: 4.25, max: 6.50, typical: 5.35 },
        wasteFactorPercent: 10,
        laborHoursPerUnit: 0.25,
        specifications: ['Type S', '2500 PSI', '80 lb bag'],
        suppliers: ['Masonry Supply', 'Home Depot', 'Lowe\'s']
      }
    ]
  };

  /**
   * Fórmulas de cálculo específicas por industria
   */
  private calculationFormulas: CalculationFormula[] = [
    
    // FENCING FORMULAS
    {
      industry: 'fencing',
      projectType: 'privacy_fence',
      formula: (dims: ProjectDimensions) => Math.ceil((dims.linearFeet || 0) / 8) + 1,
      unit: 'posts',
      description: 'Posts needed: linear feet ÷ 8ft spacing + 1'
    },
    {
      industry: 'fencing', 
      projectType: 'fence_boards',
      formula: (dims: ProjectDimensions) => Math.ceil(((dims.linearFeet || 0) * (dims.height || 6)) / 48),
      unit: 'boards',
      description: 'Boards needed: (linear feet × height) ÷ board coverage'
    },

    // FLOORING FORMULAS
    {
      industry: 'flooring',
      projectType: 'laminate_installation',
      formula: (dims: ProjectDimensions) => dims.squareFeet || dims.area || 0,
      unit: 'sqft',
      description: 'Flooring needed: total square footage'
    },
    {
      industry: 'flooring',
      projectType: 'transition_strips',
      formula: (dims: ProjectDimensions) => (dims.width || 0) + (dims.length || 0),
      unit: 'linear_ft',
      description: 'Transition strips: perimeter of room'
    },

    // ROOFING FORMULAS
    {
      industry: 'roofing',
      projectType: 'shingle_installation',
      formula: (dims: ProjectDimensions) => dims.squares || (dims.squareFeet || 0) / 100,
      unit: 'squares',
      description: 'Roofing squares: total roof area ÷ 100'
    },
    {
      industry: 'roofing',
      projectType: 'roof_coverage',
      formula: (dims: ProjectDimensions) => dims.squares || (dims.squareFeet || 0) / 100,
      unit: 'squares',
      description: 'Primary roofing material coverage'
    },
    {
      industry: 'roofing',
      projectType: 'ridge_cap',
      formula: (dims: ProjectDimensions) => dims.linearFeet || (dims.length || 0) + (dims.width || 0),
      unit: 'linear_ft',
      description: 'Ridge cap: total ridge length'
    },

    // PAINTING FORMULAS
    {
      industry: 'painting',
      projectType: 'wall_coverage',
      formula: (dims: ProjectDimensions) => Math.ceil((dims.squareFeet || 0) / 350), // 350 sqft per gallon
      unit: 'gallons',
      description: 'Paint needed: wall area ÷ 350 sqft coverage per gallon'
    },
    {
      industry: 'painting',
      projectType: 'interior_painting',
      formula: (dims: ProjectDimensions) => Math.ceil((dims.squareFeet || 0) / 350),
      unit: 'gallons',
      description: 'Interior paint coverage calculation'
    },

    // CONCRETE FORMULAS
    {
      industry: 'concrete',
      projectType: 'slab_pour',
      formula: (dims: ProjectDimensions) => {
        const area = dims.squareFeet || dims.area || 0;
        const depth = dims.depth || 4; // inches
        return Math.ceil((area * (depth / 12)) / 27); // convert to cubic yards
      },
      unit: 'cubic_yards',
      description: 'Concrete needed: area × depth ÷ 27'
    },
    {
      industry: 'concrete',
      projectType: 'concrete_mixing',
      formula: (dims: ProjectDimensions) => {
        const area = dims.squareFeet || dims.area || 0;
        const depth = dims.depth || 4;
        return Math.ceil((area * (depth / 12)) / 27);
      },
      unit: 'cubic_yards',
      description: 'Concrete volume calculation'
    },

    // RETAINING WALL FORMULAS
    {
      industry: 'retaining_walls',
      projectType: 'concrete_blocks',
      formula: (dims: ProjectDimensions) => {
        const linearFeet = dims.linearFeet || dims.length || 0;
        const height = dims.height || 3;
        // CMU blocks are 16" long x 8" high, so blocks per row = linear feet ÷ 1.33
        const blocksPerRow = Math.ceil(linearFeet / 1.33);
        const rows = Math.ceil(height / 0.67); // 8" = 0.67 feet
        return blocksPerRow * rows;
      },
      unit: 'blocks',
      description: 'Concrete blocks: (linear feet ÷ 1.33) × (height ÷ 0.67 feet per row)'
    },
    {
      industry: 'retaining_walls',
      projectType: 'rebar_horizontal',
      formula: (dims: ProjectDimensions) => {
        const linearFeet = dims.linearFeet || dims.length || 0;
        const height = dims.height || 3;
        const rows = Math.ceil(height / 0.67); // Every 8 inches
        return linearFeet * rows * 2; // Two horizontal runs per row
      },
      unit: 'linear_ft',
      description: 'Horizontal rebar: linear feet × rows × 2 runs per row'
    },
    {
      industry: 'retaining_walls',
      projectType: 'foundation_gravel',
      formula: (dims: ProjectDimensions) => {
        const linearFeet = dims.linearFeet || dims.length || 0;
        const width = 2; // 2 feet wide foundation
        const depth = 0.5; // 6 inches deep
        return (linearFeet * width * depth) / 27;
      },
      unit: 'cubic_yards',
      description: 'Foundation gravel: linear feet × 2 ft width × 0.5 ft depth ÷ 27'
    },
    {
      industry: 'retaining_walls',
      projectType: 'drain_pipe',
      formula: (dims: ProjectDimensions) => dims.linearFeet || dims.length || 0,
      unit: 'linear_ft',
      description: 'Drain pipe: equals linear feet of retaining wall'
    },
    {
      industry: 'retaining_walls',
      projectType: 'geotextile',
      formula: (dims: ProjectDimensions) => {
        const linearFeet = dims.linearFeet || dims.length || 0;
        const height = dims.height || 3;
        return (linearFeet * height) / 9; // Convert to square yards
      },
      unit: 'square_yards',
      description: 'Geotextile fabric: linear feet × height ÷ 9 (sq yards)'
    },
    {
      industry: 'retaining_walls',
      projectType: 'mortar_bags',
      formula: (dims: ProjectDimensions) => {
        const linearFeet = dims.linearFeet || dims.length || 0;
        const height = dims.height || 3;
        const blocksPerRow = Math.ceil(linearFeet / 1.33);
        const rows = Math.ceil(height / 0.67);
        const totalBlocks = blocksPerRow * rows;
        return Math.ceil(totalBlocks / 40); // 40 blocks per 80lb bag
      },
      unit: 'bags',
      description: 'Mortar bags: total blocks ÷ 40 blocks per 80lb bag'
    }
  ];

  /**
   * Detecta automáticamente la industria del proyecto
   */
  detectProjectIndustry(description: string): string[] {
    const industries: string[] = [];
    const patterns = {
      fencing: /fence|fencing|cercas|privacy|boundary|gate|post/i,
      flooring: /flooring|laminate|hardwood|tile|carpet|vinyl|floor/i,
      roofing: /roof|roofing|shingles|gutters|flashing|underlayment|ridge/i,
      plumbing: /plumbing|pipes|toilet|sink|shower|faucet|water|drain/i,
      electrical: /electrical|electric|wiring|outlets|switches|breaker|circuit/i,
      painting: /paint|painting|primer|stain|wall|ceiling|color/i,
      concrete: /concrete|foundation|slab|driveway|patio|pour|cement/i,
      retaining_walls: /retaining wall|muro contenedor|retaining|wall retainer|container wall|block wall|masonry wall|retention wall/i
    };

    for (const [industry, pattern] of Object.entries(patterns)) {
      if (pattern.test(description)) {
        industries.push(industry);
      }
    }

    return industries.length > 0 ? industries : ['general_construction'];
  }

  /**
   * Extrae dimensiones mejoradas para múltiples industrias
   */
  extractDimensions(description: string, industry: string): ProjectDimensions {
    const dimensions: ProjectDimensions = {};

    // Patrones universales
    const lengthMatch = description.match(/(\d+(?:\.\d+)?)\s*(?:feet?|ft|linear\s*feet?|linear\s*ft)/i);
    const widthMatch = description.match(/(\d+(?:\.\d+)?)\s*(?:wide|width)/i);
    const heightMatch = description.match(/(\d+(?:\.\d+)?)\s*(?:tall|high|height|feet?\s*tall|ft\s*tall)/i);
    const areaMatch = description.match(/(\d+(?:\.\d+)?)\s*(?:square\s*feet?|sqft|sq\s*ft)/i);

    if (lengthMatch) dimensions.length = parseFloat(lengthMatch[1]);
    if (widthMatch) dimensions.width = parseFloat(widthMatch[1]);
    if (heightMatch) dimensions.height = parseFloat(heightMatch[1]);
    if (areaMatch) dimensions.area = parseFloat(areaMatch[1]);

    // Cálculos derivados
    if (dimensions.length && !dimensions.linearFeet) {
      dimensions.linearFeet = dimensions.length;
    }
    
    if (dimensions.length && dimensions.width && !dimensions.area) {
      dimensions.area = dimensions.length * dimensions.width;
    }
    
    if (dimensions.area && !dimensions.squareFeet) {
      dimensions.squareFeet = dimensions.area;
    }

    // Patrones específicos por industria
    switch (industry) {
      case 'concrete':
        const depthMatch = description.match(/(\d+(?:\.\d+)?)\s*(?:inches?|in|deep|depth|thick)/i);
        if (depthMatch) dimensions.depth = parseFloat(depthMatch[1]);
        break;
        
      case 'roofing':
        const squaresMatch = description.match(/(\d+(?:\.\d+)?)\s*(?:squares?|sq)/i);
        if (squaresMatch) dimensions.squares = parseFloat(squaresMatch[1]);
        const pitchMatch = description.match(/(\d+)\/(\d+)\s*pitch/i);
        if (pitchMatch) dimensions.pitch = parseFloat(pitchMatch[1]) / parseFloat(pitchMatch[2]);
        break;
        
      case 'painting':
        // For painting, if no area is specified, try to extract from "house" references
        if (!dimensions.squareFeet && !dimensions.area) {
          const houseMatch = description.match(/(\d+(?:\.\d+)?)\s*(?:square\s*foot|sqft|sq\s*ft)\s*house/i);
          if (houseMatch) {
            dimensions.squareFeet = parseFloat(houseMatch[1]);
            dimensions.area = dimensions.squareFeet;
          }
        }
        break;
        
      case 'plumbing':
        const fixturesMatch = description.match(/(\d+)\s*(?:bathroom|toilet|sink|fixture)/i);
        if (fixturesMatch) dimensions.fixtures = parseInt(fixturesMatch[1]);
        break;
    }

    return dimensions;
  }

  /**
   * Genera estimado multi-industria con precisión quirúrgica
   */
  generateMultiIndustryEstimate(
    projectDescription: string, 
    location: string = 'CA'
  ) {
    console.log('🏗️ Multi-Industry Expert: Iniciando análisis multi-industria');
    
    // 1. Detectar industrias involucradas
    const industries = this.detectProjectIndustry(projectDescription);
    console.log('🔍 Industrias detectadas:', industries);
    
    // 2. Extraer dimensiones para cada industria
    const allDimensions: Record<string, ProjectDimensions> = {};
    for (const industry of industries) {
      allDimensions[industry] = this.extractDimensions(projectDescription, industry);
    }
    console.log('📏 Dimensiones por industria:', allDimensions);
    
    // 3. Calcular materiales para cada industria
    const allMaterials: any[] = [];
    let totalCost = 0;
    
    for (const industry of industries) {
      const industryMaterials = this.calculateIndustryMaterials(
        industry,
        allDimensions[industry],
        projectDescription,
        location
      );
      
      allMaterials.push(...industryMaterials);
      totalCost += industryMaterials.reduce((sum, item) => sum + item.totalPrice, 0);
    }
    
    console.log(`✅ Multi-Industry: ${allMaterials.length} materiales generados, costo total: $${totalCost.toFixed(2)}`);
    
    return {
      materials: allMaterials,
      costs: {
        materials: Math.round(totalCost * 100) / 100,
        labor: Math.round(totalCost * 0.6 * 100) / 100, // Estimado de labor
        total: Math.round(totalCost * 1.6 * 100) / 100
      },
      analysis: {
        industriesDetected: industries,
        dimensionsByIndustry: allDimensions,
        expertiseLevel: 'Multi-Industry Master Contractor',
        precisionLevel: 'Surgical Precision Across All Construction Trades'
      }
    };
  }

  /**
   * Calcula materiales específicos por industria
   */
  private calculateIndustryMaterials(
    industry: string,
    dimensions: ProjectDimensions,
    description: string,
    location: string
  ): any[] {
    const materials = this.industryMaterials[industry] || [];
    const results: any[] = [];
    
    // Factor geográfico simplificado
    const locationMultiplier = location.includes('CA') ? 1.15 : 1.0;
    
    for (const material of materials) {
      // Buscar fórmula aplicable
      const formula = this.calculationFormulas.find(
        f => f.industry === industry && this.isFormulaApplicable(f, material, description)
      );
      
      if (formula) {
        const baseQuantity = formula.formula(dimensions, { material, description });
        const wasteAdjusted = baseQuantity * (1 + material.wasteFactorPercent / 100);
        const finalQuantity = Math.ceil(wasteAdjusted);
        const unitPrice = material.avgPriceRange.typical * locationMultiplier;
        const totalPrice = finalQuantity * unitPrice;
        
        if (finalQuantity > 0) {
          results.push({
            id: material.id,
            name: material.name,
            description: material.description,
            category: material.category,
            quantity: finalQuantity,
            unit: material.unit,
            unitPrice: Math.round(unitPrice * 100) / 100,
            totalPrice: Math.round(totalPrice * 100) / 100,
            specifications: material.specifications.join(', '),
            supplier: material.suppliers[0],
            calculationMethod: formula.description,
            industry: industry
          });
        }
      }
    }
    
    return results;
  }

  /**
   * Determina si una fórmula es aplicable al material y descripción
   */
  private isFormulaApplicable(formula: CalculationFormula, material: IndustryMaterial, description: string): boolean {
    // Matching simplificado pero efectivo para todas las industrias
    const industryMatch = formula.industry === material.category.split('_')[0] || 
                         formula.industry === this.getIndustryFromMaterial(material);
    
    // Mapeo específico por industria y categoría de material
    const mappings = {
      fencing: {
        structural: ['privacy_fence', 'fence_posts'],
        covering: ['fence_boards', 'privacy_fence']
      },
      flooring: {
        flooring_material: ['laminate_installation', 'flooring_coverage'],
        trim: ['transition_strips', 'baseboard_installation']
      },
      roofing: {
        roofing_material: ['shingle_installation', 'roof_coverage'],
        finishing: ['ridge_cap', 'roof_accessories']
      },
      painting: {
        coating: ['wall_coverage', 'interior_painting'],
        preparation: ['surface_prep', 'primer_application']
      },
      concrete: {
        structural: ['slab_pour', 'concrete_mixing'],
        reinforcement: ['rebar_installation', 'reinforcement']
      }
    };

    const categoryMappings = mappings[formula.industry];
    if (categoryMappings && categoryMappings[material.category]) {
      return categoryMappings[material.category].includes(formula.projectType);
    }

    // Fallback: si la industria coincide, asumir aplicable
    return formula.industry === this.getIndustryFromMaterial(material);
  }

  /**
   * Extrae la industria del material basado en su categoría
   */
  private getIndustryFromMaterial(material: IndustryMaterial): string {
    if (material.category.includes('flooring')) return 'flooring';
    if (material.category.includes('roofing')) return 'roofing';
    if (material.category.includes('coating') || material.category.includes('paint')) return 'painting';
    if (material.category.includes('structural') && material.id.includes('concrete')) return 'concrete';
    if (material.category.includes('structural') && (material.id.includes('post') || material.id.includes('fence'))) return 'fencing';
    return 'general';
  }
}