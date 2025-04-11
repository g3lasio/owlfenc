import config from '../prices/materialParameters.json';

/**
 * Función para obtener el factor de ajuste por altura.
 * Basado en los parámetros de config.fenceRules.heightFactors.
 * @param {number} height - Altura del fence en pies.
 * @returns {number} Factor de altura.
 */
function getHeightFactor(height) {
  const factors = config.fenceRules.heightFactors;
  if (factors.hasOwnProperty(height.toString())) {
    return factors[height.toString()];
  } else {
    return height / 6; // Aproximación simple para otras alturas.
  }
}

/**
 * Calcula el costo total de un Wood Fence, desglosando materiales y mano de obra,
 * aplicando ajustes por altura y opciones adicionales (painting y lattice).
 *
 * @param {number} linearFeet - Longitud total del fence en pies.
 * @param {number} height - Altura del fence en pies (3, 6, 8, etc.).
 * @param {string} state - Estado para obtener el costo promedio de mano de obra.
 * @param {object} options - Opciones del proyecto:
 *    demolition: boolean (true si incluye demolición)
 *    painting: boolean (true si se incluye pintura a $3.50/ft²)
 *    laborRate: number (valor manual en $/ft para mano de obra; si se omite, se usa la base de datos)
 *    additionalLattice: boolean (true si se agrega lattice adicional)
 *    postType: string ("4x4", "6x6", "metalBlack", o "auto" para 4x4 por defecto)
 * @returns {object} Detalle completo del cálculo.
 */
function validateInput(linearFeet, height, state) {
  if (!linearFeet || linearFeet <= 0) throw new Error("La longitud debe ser mayor a 0");
  if (!height || ![3,4,6,8].includes(height)) throw new Error("Altura inválida. Use 3, 4, 6 u 8 pies");
  if (!state || !config.laborCostDatabase[state]) throw new Error("Estado inválido o no encontrado");
}

function calculateWoodFenceCost(linearFeet, height, state, options = {}) {
  validateInput(linearFeet, height, state);
  const {
    demolition = false,
    painting = false,
    laborRate = null,
    additionalLattice = false,
    postType = "auto"
  } = options;

  // 1. Factor de altura (afecta materiales y mano de obra)
  const heightFactor = getHeightFactor(height);

  // 2. Calcular cantidad de postes:
  const spacing = config.fenceRules.posts.spacingFt;
  let postsBase = Math.ceil(linearFeet / spacing);
  let totalPosts = postsBase + config.fenceRules.posts.extraPost;

  // 3. Selección del poste
  // Para fence de 6 ft se utiliza poste de 8 ft; para 8 ft se utiliza poste de 10 ft.
  const postLength = (height >= 8) ? "10" : "8";
  let finalPostType = (postType === "auto") ? config.fenceRules.posts.defaultType : postType;
  let postKey = (finalPostType === "metalBlack") ? ("metal" + postLength) : (finalPostType + "x" + postLength);
  // Obtener el costo unitario del poste desde config.materialParameters.posts
  let postPrice = config.materialParameters.posts[postKey] || 20.00;

  // Costo de postes:
  let postsCost = totalPosts * postPrice;

  // 4. Concreto: 2 bolsas por poste
  let totalBags = totalPosts * config.fenceRules.concrete.bagsPerPost;
  let concreteCost = totalBags * config.materialParameters.concrete["80lb"];

  // 5. Rieles: 2 rieles por segmento de 8 ft
  let totalRails = Math.ceil(linearFeet / config.fenceRules.rails.segmentLengthFt) * config.fenceRules.rails.quantity;
  let railsCost = totalRails * config.materialParameters.lumber["2x4_8ft"];

  // 6. Pickets: calcular basados en cobertura y aplicar extraFactor
  let basePickets = Math.ceil((linearFeet * 12) / config.fenceRules.pickets.coverageInches);
  let totalPickets = Math.ceil(basePickets * config.fenceRules.pickets.extraFactor);
  let picketsCost = totalPickets * config.materialParameters.pickets.default;

  // 7. Hangers: 4 por cada poste
  let totalHangers = totalPosts * config.fenceRules.hangers.perPost;
  let hangersCost = totalHangers * config.materialParameters.hangers.default;

  // 8. Tornillos: 1 caja por cada 50 ft
  let boxesScrews = Math.ceil(linearFeet / 50);
  let screwsCost = boxesScrews * config.materialParameters.screws.box_5lbs;

  // Sumar costos de materiales:
  let materialsSubtotal = postsCost + concreteCost + railsCost + picketsCost + hangersCost + screwsCost;
  let totalMaterialsCost = materialsSubtotal * config.fenceRules.recargoMaterial;

  // Ajustar por altura:
  totalMaterialsCost *= heightFactor;

  // 9. Si se activa lattice adicional, sumar costo fijo por pie lineal.
  let latticeCost = additionalLattice ? (linearFeet * config.fenceRules.lattice.costPerLinearFt) : 0;

  // 10. Mano de obra:
  let defaultLaborRate;
  if (state in config.laborCostDatabase) {
    if (demolition) {
      let [lowDemo, highDemo] = config.laborCostDatabase[state].withDemo;
      defaultLaborRate = (lowDemo + highDemo) / 2;
    } else {
      let [lowNew, highNew] = config.laborCostDatabase[state].newFence;
      defaultLaborRate = (lowNew + highNew) / 2;
    }
  } else {
    defaultLaborRate = demolition ? 65 : 60;
  }
  let finalLaborRate = (laborRate !== null) ? laborRate : defaultLaborRate;
  let totalLaborCost = linearFeet * finalLaborRate;
  totalLaborCost *= heightFactor;

  // 11. Costo base total (materiales + mano de obra)
  let baseTotalCost = totalMaterialsCost + totalLaborCost;

  // 12. Pintura (opcional): $3.50 por pie cuadrado de área
  let paintingCost = 0;
  if (painting) {
    let fenceArea = linearFeet * height;
    paintingCost = fenceArea * 3.50;
  }

  // 13. Costo final:
  let finalTotalCost = baseTotalCost + latticeCost + paintingCost;
  let costPerLinearFoot = finalTotalCost / linearFeet;

  return {
    linearFeet,
    height,
    state,
    postTypeUsed: finalPostType,
    postKeyUsed: postKey,
    totalPosts,
    postsCost: postsCost.toFixed(2),
    totalBags,
    concreteCost: concreteCost.toFixed(2),
    totalRails,
    railsCost: railsCost.toFixed(2),
    totalPickets,
    picketsCost: picketsCost.toFixed(2),
    totalHangers,
    hangersCost: hangersCost.toFixed(2),
    boxesScrews,
    screwsCost: screwsCost.toFixed(2),
    materialsSubtotal: materialsSubtotal.toFixed(2),
    totalMaterialsCost: totalMaterialsCost.toFixed(2),
    latticeCost: latticeCost.toFixed(2),
    laborRate: finalLaborRate.toFixed(2),
    laborCost: totalLaborCost.toFixed(2),
    paintingCost: paintingCost.toFixed(2),
    baseTotalCost: baseTotalCost.toFixed(2),
    finalTotalCost: finalTotalCost.toFixed(2),
    costPerLinearFoot: costPerLinearFoot.toFixed(2)
  };
}

/**
 * Calcula la distribución del costo total por pie lineal entre materiales y mano de obra,
 * basándose en un costo base por pie (sin incluir costos adicionales de pintura o lattice).
 *
 * @param {number} baseCostPerFt - Costo total en $/ft (ej.: $60 o $65)
 * @param {boolean} demolition - Indica si el proyecto incluye demolición.
 * @returns {object} Distribución en $/ft.
 */
function calculateRates(baseCostPerFt, demolition) {
  const ratioNew = { material: 0.45, labor: 0.55 };
  const ratioDemo = { material: 0.41, labor: 0.59 };
  let ratios = demolition ? ratioDemo : ratioNew;

  let materialCostPerFt = baseCostPerFt * ratios.material;
  let laborCostPerFt = baseCostPerFt * ratios.labor;

  return {
    baseCostPerFt: baseCostPerFt.toFixed(2),
    materialCostPerFt: materialCostPerFt.toFixed(2),
    laborCostPerFt: laborCostPerFt.toFixed(2)
  };
}

// ===== Ejemplos de uso =====

// Wood Fence de 125 ft, 6 ft (usa poste de 8 ft para 6 ft de fence) en California
const estimate125_6ft = calculateWoodFenceCost(125, 6, "California", {
  demolition: false,
  painting: false,
  additionalLattice: false,
  postType: "auto"
});

// Wood Fence de 125 ft, 6 ft, en California, con demolición (por ejemplo, usa 6x6 posts)
const estimate125_6ftDemo = calculateWoodFenceCost(125, 6, "California", {
  demolition: true,
  painting: false,
  additionalLattice: false,
  postType: "6x6"
});

// Wood Fence de 125 ft, 6 ft, en California, con demolición + pintura
const estimate125_6ftDemoPaint = calculateWoodFenceCost(125, 6, "California", {
  demolition: true,
  painting: true,
  additionalLattice: false,
  postType: "6x6"
});

// Wood Fence de 125 ft, 6 ft, en California, sin demolición, con lattice adicional
const estimate125_6ftLattice = calculateWoodFenceCost(125, 6, "California", {
  demolition: false,
  painting: false,
  additionalLattice: true,
  postType: "auto"
});

// Variación por altura:
// 125 ft de fence de 3 ft de altura en California.
const estimate125_3ft = calculateWoodFenceCost(125, 3, "California", {
  demolition: false,
  painting: false,
  additionalLattice: false,
  postType: "auto"
});
// 125 ft de fence de 8 ft de altura en California.
const estimate125_8ft = calculateWoodFenceCost(125, 8, "California", {
  demolition: false,
  painting: false,
  additionalLattice: false,
  postType: "auto"
});

// Mostrar resultados
console.log("Wood Fence 125 ft, 6 ft, California (sin demolición):", estimate125_6ft);
console.log("Wood Fence 125 ft, 6 ft, California (con demolición):", estimate125_6ftDemo);
console.log("Wood Fence 125 ft, 6 ft, California (con demolición + pintura):", estimate125_6ftDemoPaint);
console.log("Wood Fence 125 ft, 6 ft, California (con lattice adicional):", estimate125_6ftLattice);
console.log("Wood Fence 125 ft, 3 ft de altura, California:", estimate125_3ft);
console.log("Wood Fence 125 ft, 8 ft de altura, California:", estimate125_8ft);

// Ejemplo de desglose de costo por pie lineal a partir de un costo base
console.log("Desglose sin demolición @ $60/ft:", calculateRates(60, false));
console.log("Desglose con demolición @ $65/ft:", calculateRates(65, true));