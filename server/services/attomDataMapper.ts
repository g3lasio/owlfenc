/**
 * ATTOM Data Mapper
 * Maps raw ATTOM API response to comprehensive property report format
 */

export interface AttomPropertyRecord {
  identifier?: {
    attomId?: string;
    fips?: string;
    apn?: string;
  };
  address?: {
    country?: string;
    countrySubd?: string;
    line1?: string;
    line2?: string;
    locality?: string;
    matchCode?: string;
    oneLine?: string;
    postal1?: string;
    postal2?: string;
    postal3?: string;
  };
  location?: {
    accuracy?: string;
    elevation?: number;
    latitude?: number;
    longitude?: number;
    distance?: number;
    geoid?: string;
  };
  summary?: {
    absenteeInd?: string;
    propClass?: string;
    propSubType?: string;
    propType?: string;
    yearBuilt?: number;
    propLandUse?: string;
    propIndicator?: string;
    legal1?: string;
    legal2?: string;
  };
  lot?: {
    lotNum?: string;
    lotSize1?: number;
    lotSize2?: number;
    poolInd?: string;
    poolType?: string;
  };
  area?: {
    countrySecSubd?: string;
    munName?: string;
    munCode?: string;
    subdName?: string;
    subdTractNum?: string;
  };
  building?: {
    size?: {
      bldgSize?: number;
      grossSize?: number;
      grossSizeAdjusted?: number;
      groundFloorSize?: number;
      livingSize?: number;
      sizeInd?: string;
      universalSize?: number;
    };
    rooms?: {
      beds?: number;
      bathsFull?: number;
      bathsHalf?: number;
      bathsTotal?: number;
      roomsTotal?: number;
    };
    interior?: {
      bsmtSize?: number;
      fplcCount?: number;
      fplcInd?: string;
      fplcType?: string;
    };
    construction?: {
      archStyle?: string;
      bldgType?: string;
      condition?: string;
      construction?: string;
      constructionType?: string;
      exteriorWalls?: string;
      fireplace?: string;
      flooring?: string;
      foundation?: string;
      heating?: string;
      heatingFuel?: string;
      interiorWalls?: string;
      parking?: string;
      quality?: string;
      roofCover?: string;
      roofFrame?: string;
      roofShape?: string;
      stories?: number;
      unitsCount?: number;
      yearBuilt?: number;
    };
    parking?: {
      garageParkingCapacity?: number;
      garageParkingType?: string;
      prkgSize?: number;
      prkgSpaces?: number;
      prkgType?: string;
    };
  };
  utilities?: {
    heatingType?: string;
    heatingFuel?: string;
    airConditioningType?: string;
    waterType?: string;
    sewerType?: string;
  };
  assessment?: {
    assessed?: {
      assdImprValue?: number;
      assdLandValue?: number;
      assdTtlValue?: number;
    };
    market?: {
      mktImprValue?: number;
      mktLandValue?: number;
      mktTtlValue?: number;
    };
    tax?: {
      taxAmt?: number;
      taxYear?: number;
      taxDeliqYear?: number;
    };
    owner?: {
      owner1?: {
        fullName?: string;
        firstName?: string;
        lastName?: string;
      };
      owner2?: {
        fullName?: string;
        firstName?: string;
        lastName?: string;
      };
      owner3?: {
        fullName?: string;
        firstName?: string;
        lastName?: string;
      };
      owner4?: {
        fullName?: string;
        firstName?: string;
        lastName?: string;
      };
    };
    ownership?: {
      ownershipType?: string;
      ownershipVesting?: string;
      deedDocNumber?: string;
      deedDocType?: string;
      deedTransDate?: string;
    };
  };
  sale?: {
    saleTransDate?: string;
    saleAmountData?: {
      saleAmt?: number;
      saleRecDate?: string;
      saleDisclosureType?: string;
      saleDocNum?: string;
      saleTransType?: string;
      saleCode?: string;
    };
    buyer?: {
      buyer1FullName?: string;
      buyer2FullName?: string;
    };
    seller?: {
      seller1FullName?: string;
      seller2FullName?: string;
    };
  };
  mortgage?: {
    lender?: {
      lenderCode?: string;
      lenderName?: string;
      lenderType?: string;
    };
    amount?: {
      loanAmt?: number;
      loanAmt2?: number;
      loanType?: string;
      loanType2?: string;
    };
    dates?: {
      loanRecDate?: string;
      loanDueDate?: string;
      loanTermMonths?: number;
    };
    rate?: {
      loanInterestRate?: number;
      loanInterestRateType?: string;
    };
  };
  vintage?: {
    lastModified?: string;
    pubDate?: string;
  };
  school?: {
    district?: {
      districtName?: string;
      districtCode?: string;
    };
    elementary?: {
      schoolName?: string;
      schoolCode?: string;
    };
    middle?: {
      schoolName?: string;
      schoolCode?: string;
    };
    high?: {
      schoolName?: string;
      schoolCode?: string;
    };
  };
  neighborhood?: {
    census?: {
      censusTract?: string;
      censusBlock?: string;
    };
    msa?: {
      msaCode?: string;
      msaName?: string;
    };
  };
  valuation?: {
    avm?: {
      amount?: {
        value?: number;
        high?: number;
        low?: number;
      };
      eventDate?: string;
      source?: string;
    };
  };
  foreclosure?: {
    status?: {
      foreclosureStatus?: string;
      foreclosureDate?: string;
      foreclosureType?: string;
      foreclosureAmount?: number;
    };
  };
  hoa?: {
    hoaFee?: number;
    hoaFeeFreq?: string;
    hoaName?: string;
  };
  legal?: {
    liens?: Array<{
      lienAmount?: number;
      lienType?: string;
      lienDate?: string;
    }>;
    judgments?: Array<{
      judgmentAmount?: number;
      judgmentType?: string;
      judgmentDate?: string;
    }>;
  };
}

export interface ComprehensivePropertyData {
  // Basic Info
  address: string;
  owner: string;
  sqft: number;
  bedrooms: number;
  bathrooms?: number;
  yearBuilt?: number;
  propertyType?: string;
  
  // Lot Info
  lotSize?: string;
  landSqft?: number;
  
  // Financial
  assessedValue?: number;
  assessedLandValue?: number;
  assessedImprovementValue?: number;
  marketValue?: number;
  marketLandValue?: number;
  marketImprovementValue?: number;
  taxAmount?: number;
  taxYear?: number;
  taxDelinquentYear?: number;
  
  // Ownership
  owner2?: string;
  owner3?: string;
  owner4?: string;
  ownerOccupied?: boolean;
  ownershipType?: string;
  ownershipVesting?: string;
  deedDocNumber?: string;
  deedDocType?: string;
  deedTransDate?: string;
  
  // Sale History
  purchaseDate?: string;
  purchasePrice?: number;
  saleRecordingDate?: string;
  saleType?: string;
  saleDocNumber?: string;
  buyer1?: string;
  buyer2?: string;
  seller1?: string;
  seller2?: string;
  
  // Construction Details
  stories?: number;
  roofCover?: string;
  roofFrame?: string;
  roofShape?: string;
  exteriorWalls?: string;
  foundation?: string;
  constructionType?: string;
  architecturalStyle?: string;
  buildingCondition?: string;
  buildingQuality?: string;
  heatingType?: string;
  heatingFuel?: string;
  fireplaceCount?: number;
  fireplaceType?: string;
  basementSize?: number;
  flooring?: string;
  interiorWalls?: string;
  
  // Parking & Garage
  garageParkingCapacity?: number;
  garageParkingType?: string;
  parkingSpaces?: number;
  parkingType?: string;
  
  // Utilities
  airConditioningType?: string;
  waterType?: string;
  sewerType?: string;
  
  // Pool
  pool?: boolean;
  poolType?: string;
  
  // Mortgage
  lenderName?: string;
  loanAmount?: number;
  loanType?: string;
  loanRecordingDate?: string;
  loanDueDate?: string;
  loanTermMonths?: number;
  loanInterestRate?: number;
  
  // Legal
  lienAmount?: number;
  lienType?: string;
  lienDate?: string;
  judgmentAmount?: number;
  judgmentType?: string;
  judgmentDate?: string;
  foreclosureStatus?: string;
  foreclosureDate?: string;
  foreclosureType?: string;
  foreclosureAmount?: number;
  
  // HOA
  hoaFee?: number;
  hoaFeeFrequency?: string;
  hoaName?: string;
  
  // School
  schoolDistrict?: string;
  elementarySchool?: string;
  middleSchool?: string;
  highSchool?: string;
  
  // Location
  latitude?: number;
  longitude?: number;
  elevation?: number;
  
  // AVM
  avmValue?: number;
  avmHigh?: number;
  avmLow?: number;
  avmDate?: string;
  
  // Metadata
  verified: boolean;
  ownershipVerified: boolean;
  source?: string;
}

/**
 * Map raw ATTOM property record to comprehensive property data
 */
export function mapAttomToComprehensive(
  attomRecord: AttomPropertyRecord,
  address: string
): ComprehensivePropertyData {
  
  console.log('🗺️ [ATTOM-MAPPER] Mapping ATTOM data to comprehensive format');
  
  // Extract owner names
  const owner1 = attomRecord.assessment?.owner?.owner1?.fullName || 
                 attomRecord.assessment?.owner?.owner1?.lastName || 
                 'Owner information not available';
  const owner2 = attomRecord.assessment?.owner?.owner2?.fullName;
  const owner3 = attomRecord.assessment?.owner?.owner3?.fullName;
  const owner4 = attomRecord.assessment?.owner?.owner4?.fullName;
  
  // Determine if owner occupied
  const ownerOccupied = attomRecord.summary?.absenteeInd !== 'ABSENTEE(MAIL AND SITUS NOT =)';
  
  // Pool indicator
  const hasPool = attomRecord.lot?.poolInd === 'Y' || 
                  attomRecord.lot?.poolInd === 'Yes' || 
                  attomRecord.lot?.poolInd === '1';
  
  // Extract liens and judgments (take first one if multiple)
  const firstLien = attomRecord.legal?.liens?.[0];
  const firstJudgment = attomRecord.legal?.judgments?.[0];
  
  const comprehensiveData: ComprehensivePropertyData = {
    // Basic Info
    address: address,
    owner: owner1,
    sqft: attomRecord.building?.size?.bldgSize || 
          attomRecord.building?.size?.livingSize || 
          attomRecord.building?.size?.universalSize || 
          0,
    bedrooms: attomRecord.building?.rooms?.beds || 0,
    bathrooms: attomRecord.building?.rooms?.bathsTotal || 
               attomRecord.building?.rooms?.bathsFull,
    yearBuilt: attomRecord.summary?.yearBuilt || 
               attomRecord.building?.construction?.yearBuilt,
    propertyType: attomRecord.summary?.propType || 
                  attomRecord.summary?.propSubType || 
                  'Single Family Residence',
    
    // Lot Info
    lotSize: attomRecord.lot?.lotSize1 ? `${attomRecord.lot.lotSize1} acres` : undefined,
    landSqft: attomRecord.lot?.lotSize2,
    
    // Financial
    assessedValue: attomRecord.assessment?.assessed?.assdTtlValue,
    assessedLandValue: attomRecord.assessment?.assessed?.assdLandValue,
    assessedImprovementValue: attomRecord.assessment?.assessed?.assdImprValue,
    marketValue: attomRecord.assessment?.market?.mktTtlValue,
    marketLandValue: attomRecord.assessment?.market?.mktLandValue,
    marketImprovementValue: attomRecord.assessment?.market?.mktImprValue,
    taxAmount: attomRecord.assessment?.tax?.taxAmt,
    taxYear: attomRecord.assessment?.tax?.taxYear,
    taxDelinquentYear: attomRecord.assessment?.tax?.taxDeliqYear,
    
    // Ownership
    owner2: owner2,
    owner3: owner3,
    owner4: owner4,
    ownerOccupied: ownerOccupied,
    ownershipType: attomRecord.assessment?.ownership?.ownershipType,
    ownershipVesting: attomRecord.assessment?.ownership?.ownershipVesting,
    deedDocNumber: attomRecord.assessment?.ownership?.deedDocNumber,
    deedDocType: attomRecord.assessment?.ownership?.deedDocType,
    deedTransDate: attomRecord.assessment?.ownership?.deedTransDate,
    
    // Sale History
    purchaseDate: attomRecord.sale?.saleTransDate,
    purchasePrice: attomRecord.sale?.saleAmountData?.saleAmt,
    saleRecordingDate: attomRecord.sale?.saleAmountData?.saleRecDate,
    saleType: attomRecord.sale?.saleAmountData?.saleTransType,
    saleDocNumber: attomRecord.sale?.saleAmountData?.saleDocNum,
    buyer1: attomRecord.sale?.buyer?.buyer1FullName,
    buyer2: attomRecord.sale?.buyer?.buyer2FullName,
    seller1: attomRecord.sale?.seller?.seller1FullName,
    seller2: attomRecord.sale?.seller?.seller2FullName,
    
    // Construction Details
    stories: attomRecord.building?.construction?.stories,
    roofCover: attomRecord.building?.construction?.roofCover,
    roofFrame: attomRecord.building?.construction?.roofFrame,
    roofShape: attomRecord.building?.construction?.roofShape,
    exteriorWalls: attomRecord.building?.construction?.exteriorWalls,
    foundation: attomRecord.building?.construction?.foundation,
    constructionType: attomRecord.building?.construction?.constructionType,
    architecturalStyle: attomRecord.building?.construction?.archStyle,
    buildingCondition: attomRecord.building?.construction?.condition,
    buildingQuality: attomRecord.building?.construction?.quality,
    heatingType: attomRecord.building?.construction?.heating || 
                 attomRecord.utilities?.heatingType,
    heatingFuel: attomRecord.building?.construction?.heatingFuel || 
                 attomRecord.utilities?.heatingFuel,
    fireplaceCount: attomRecord.building?.interior?.fplcCount,
    fireplaceType: attomRecord.building?.interior?.fplcType,
    basementSize: attomRecord.building?.interior?.bsmtSize,
    flooring: attomRecord.building?.construction?.flooring,
    interiorWalls: attomRecord.building?.construction?.interiorWalls,
    
    // Parking & Garage
    garageParkingCapacity: attomRecord.building?.parking?.garageParkingCapacity,
    garageParkingType: attomRecord.building?.parking?.garageParkingType,
    parkingSpaces: attomRecord.building?.parking?.prkgSpaces,
    parkingType: attomRecord.building?.parking?.prkgType,
    
    // Utilities
    airConditioningType: attomRecord.utilities?.airConditioningType,
    waterType: attomRecord.utilities?.waterType,
    sewerType: attomRecord.utilities?.sewerType,
    
    // Pool
    pool: hasPool,
    poolType: attomRecord.lot?.poolType,
    
    // Mortgage
    lenderName: attomRecord.mortgage?.lender?.lenderName,
    loanAmount: attomRecord.mortgage?.amount?.loanAmt,
    loanType: attomRecord.mortgage?.amount?.loanType,
    loanRecordingDate: attomRecord.mortgage?.dates?.loanRecDate,
    loanDueDate: attomRecord.mortgage?.dates?.loanDueDate,
    loanTermMonths: attomRecord.mortgage?.dates?.loanTermMonths,
    loanInterestRate: attomRecord.mortgage?.rate?.loanInterestRate,
    
    // Legal
    lienAmount: firstLien?.lienAmount,
    lienType: firstLien?.lienType,
    lienDate: firstLien?.lienDate,
    judgmentAmount: firstJudgment?.judgmentAmount,
    judgmentType: firstJudgment?.judgmentType,
    judgmentDate: firstJudgment?.judgmentDate,
    foreclosureStatus: attomRecord.foreclosure?.status?.foreclosureStatus,
    foreclosureDate: attomRecord.foreclosure?.status?.foreclosureDate,
    foreclosureType: attomRecord.foreclosure?.status?.foreclosureType,
    foreclosureAmount: attomRecord.foreclosure?.status?.foreclosureAmount,
    
    // HOA
    hoaFee: attomRecord.hoa?.hoaFee,
    hoaFeeFrequency: attomRecord.hoa?.hoaFeeFreq,
    hoaName: attomRecord.hoa?.hoaName,
    
    // School
    schoolDistrict: attomRecord.school?.district?.districtName,
    elementarySchool: attomRecord.school?.elementary?.schoolName,
    middleSchool: attomRecord.school?.middle?.schoolName,
    highSchool: attomRecord.school?.high?.schoolName,
    
    // Location
    latitude: attomRecord.location?.latitude,
    longitude: attomRecord.location?.longitude,
    elevation: attomRecord.location?.elevation,
    
    // AVM
    avmValue: attomRecord.valuation?.avm?.amount?.value,
    avmHigh: attomRecord.valuation?.avm?.amount?.high,
    avmLow: attomRecord.valuation?.avm?.amount?.low,
    avmDate: attomRecord.valuation?.avm?.eventDate,
    
    // Metadata
    verified: true,
    ownershipVerified: true,
    source: 'ATTOM Data Solutions'
  };
  
  console.log('✅ [ATTOM-MAPPER] Mapping completed successfully');
  console.log('📊 [ATTOM-MAPPER] Fields mapped:', Object.keys(comprehensiveData).filter(k => comprehensiveData[k as keyof ComprehensivePropertyData] !== undefined).length);
  
  return comprehensiveData;
}
