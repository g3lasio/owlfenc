/**
 * AI-Powered Legal Defense Clauses Service
 * 
 * This service provides intelligent legal clause suggestions based on project analysis.
 * It uses AI to assess risks and recommend appropriate contractor protections.
 */

import Anthropic from '@anthropic-ai/sdk';

// Complete legal clause library with full legal text
export const LEGAL_CLAUSES_LIBRARY: Record<string, LegalClause> = {
  'liability': {
    id: 'liability',
    title: 'Limitation of Liability',
    description: 'Limits contractor liability to contract value',
    category: 'liability',
    content: `LIMITATION OF LIABILITY. The Contractor's total liability under this Agreement, whether arising in contract, tort (including negligence), strict liability, or otherwise, shall be limited to the total contract price set forth herein. Under no circumstances shall the Contractor be liable for any indirect, incidental, special, consequential, punitive, or exemplary damages, including but not limited to loss of profits, loss of business opportunity, loss of data, or diminution in value, regardless of whether such damages were foreseeable or whether the Contractor was advised of the possibility of such damages. This limitation shall apply to the fullest extent permitted by applicable law.`,
    riskFactors: ['high_value_project', 'complex_scope', 'commercial_client'],
    baseRiskLevel: 'high'
  },
  'indemnity': {
    id: 'indemnity',
    title: 'Indemnification',
    description: 'Client indemnifies contractor from third-party claims',
    category: 'liability',
    content: `MUTUAL INDEMNIFICATION. The Client agrees to indemnify, defend, and hold harmless the Contractor, its officers, employees, and agents from and against any and all claims, damages, losses, costs, and expenses (including reasonable attorney fees) arising from: (a) the Client's breach of any representation, warranty, or obligation under this Agreement; (b) the Client's negligent or wrongful acts or omissions; (c) any third-party claims arising from the Client's use of the completed work; and (d) any injuries or damages occurring on the work site not caused by the Contractor's negligence. The Client's indemnification obligations shall survive the completion or termination of this Agreement.`,
    riskFactors: ['third_party_access', 'public_facing', 'high_foot_traffic'],
    baseRiskLevel: 'high'
  },
  'warranty': {
    id: 'warranty',
    title: 'Limited Warranty Terms',
    description: 'Limited warranty on workmanship and materials',
    category: 'warranty',
    content: `LIMITED WARRANTY. The Contractor warrants that all work performed under this Agreement shall be completed in a workmanlike manner and shall be free from material defects in workmanship for a period of one (1) year from the date of substantial completion (the "Warranty Period"). This warranty does not cover: (a) normal wear and tear; (b) damage caused by the Client, third parties, or acts of God; (c) damage resulting from improper use, maintenance, or alterations by others; (d) materials supplied by the Client; or (e) pre-existing conditions. The Contractor's sole obligation under this warranty shall be to repair or replace the defective work at the Contractor's option. THIS WARRANTY IS EXCLUSIVE AND IN LIEU OF ALL OTHER WARRANTIES, EXPRESS OR IMPLIED, INCLUDING ANY IMPLIED WARRANTIES OF MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE.`,
    riskFactors: ['material_intensive', 'residential', 'long_term_installation'],
    baseRiskLevel: 'medium'
  },
  'payment': {
    id: 'payment',
    title: 'Payment Protection Terms',
    description: 'Late payment penalties and collection rights',
    category: 'financial',
    content: `PAYMENT PROTECTION. All invoices are due and payable within fifteen (15) days of receipt. Failure to pay any amount when due shall constitute a material breach of this Agreement. Late payments shall accrue interest at the rate of one and one-half percent (1.5%) per month or the maximum rate permitted by applicable law, whichever is less. In the event of non-payment, the Contractor shall have the right to: (a) suspend all work until payment is received; (b) file a mechanic's lien against the property in accordance with applicable state law; (c) pursue collection through legal means, with the Client being responsible for all collection costs, including reasonable attorney fees. The Client waives any right to offset or withhold any amounts due under this Agreement except as expressly provided herein.`,
    riskFactors: ['new_client', 'large_project', 'extended_timeline'],
    baseRiskLevel: 'high'
  },
  'scope': {
    id: 'scope',
    title: 'Scope Change Protection',
    description: 'Additional work requires written change orders',
    category: 'scope',
    content: `CHANGE ORDER REQUIREMENT. Any modifications, additions, or alterations to the scope of work described herein ("Change Orders") must be documented in writing and signed by both parties before any additional work is performed. No verbal agreements or instructions shall be binding. Each Change Order shall specify: (a) a detailed description of the changed work; (b) any adjustment to the contract price; (c) any modification to the completion schedule; and (d) any impact on existing warranties. The Contractor shall not be obligated to perform any work not expressly set forth in this Agreement or in a properly executed Change Order. Any work performed without a signed Change Order shall be at the sole risk of the party requesting such work.`,
    riskFactors: ['vague_requirements', 'renovation', 'design_build'],
    baseRiskLevel: 'medium'
  },
  'force-majeure': {
    id: 'force-majeure',
    title: 'Force Majeure Protection',
    description: 'Protection from unforeseeable circumstances',
    category: 'performance',
    content: `FORCE MAJEURE. Neither party shall be liable for any delay or failure in performance caused by circumstances beyond their reasonable control, including but not limited to: acts of God, natural disasters, earthquakes, floods, hurricanes, tornadoes, or severe weather conditions; epidemics, pandemics, or public health emergencies; war, terrorism, civil unrest, or armed conflict; government actions, laws, regulations, or restrictions; labor disputes, strikes, or lockouts affecting suppliers or subcontractors; shortages of materials, equipment, or transportation; utility outages or disruptions; or any other event beyond the reasonable control of the affected party. In the event of a force majeure, the completion date shall be extended by the duration of the delay, and the affected party shall provide prompt notice to the other party.`,
    riskFactors: ['outdoor_work', 'long_timeline', 'supply_chain_dependent'],
    baseRiskLevel: 'medium'
  },
  'dispute-resolution': {
    id: 'dispute-resolution',
    title: 'Dispute Resolution Clause',
    description: 'Mandatory mediation before litigation',
    category: 'legal',
    content: `DISPUTE RESOLUTION. In the event of any dispute, controversy, or claim arising out of or relating to this Agreement, the parties agree to first attempt to resolve the matter through good faith negotiation for a period of not less than thirty (30) days. If negotiation fails, the parties agree to submit the dispute to non-binding mediation before a mutually agreed-upon mediator prior to initiating any legal action. The costs of mediation shall be shared equally by the parties. If mediation is unsuccessful, either party may pursue binding arbitration in accordance with the Construction Industry Arbitration Rules of the American Arbitration Association. The prevailing party shall be entitled to recover reasonable attorney fees, expert witness fees, and costs of arbitration from the non-prevailing party.`,
    riskFactors: ['high_value_project', 'complex_client', 'multi_party'],
    baseRiskLevel: 'medium'
  },
  'termination': {
    id: 'termination',
    title: 'Termination for Cause',
    description: 'Protection against wrongful contract termination',
    category: 'performance',
    content: `TERMINATION PROTECTION. This Agreement may be terminated for cause only upon material breach by either party, provided that the breaching party has received written notice specifying the nature of the breach and has failed to cure such breach within fifteen (15) days of receipt of notice. In the event of termination for cause by the Client without valid grounds, the Contractor shall be entitled to: (a) payment for all work completed through the date of termination; (b) reimbursement for all materials ordered or purchased; (c) recovery of a proportionate share of overhead and profit; and (d) compensation for all demobilization costs. The Contractor's right to payment for work performed shall survive termination of this Agreement.`,
    riskFactors: ['first_time_client', 'volatile_market', 'financing_involved'],
    baseRiskLevel: 'medium'
  },
  'insurance-requirements': {
    id: 'insurance-requirements',
    title: 'Insurance and Bonding Requirements',
    description: 'Defined insurance coverage and responsibilities',
    category: 'liability',
    content: `INSURANCE PROVISIONS. The Contractor maintains comprehensive general liability insurance with minimum coverage limits of One Million Dollars ($1,000,000) per occurrence and Two Million Dollars ($2,000,000) aggregate, and workers' compensation insurance as required by applicable law. The Client acknowledges receipt of certificates of insurance upon request. The Client agrees to maintain adequate property insurance on the work site during construction. Neither party's insurance coverage shall be deemed to limit any of the obligations or indemnities set forth in this Agreement. The Client shall be responsible for any uninsured losses to the work caused by the Client's acts or omissions, or by third parties granted access to the site by the Client.`,
    riskFactors: ['subcontractor_work', 'hazardous_materials', 'occupied_premises'],
    baseRiskLevel: 'high'
  },
  'site-access': {
    id: 'site-access',
    title: 'Site Access and Conditions',
    description: 'Client obligations for site preparation and access',
    category: 'performance',
    content: `SITE ACCESS AND CONDITIONS. The Client shall provide the Contractor with unobstructed access to the work site during normal working hours and such additional hours as may be reasonably required. The Client represents and warrants that: (a) the Client has legal authority to authorize work on the property; (b) all necessary easements and right-of-way have been obtained; (c) the site is free from hazardous materials or conditions, or the Client has disclosed all known hazards; and (d) the Client will remove or secure all personal property and obstacles that may interfere with the work. Any delays or additional costs caused by the Client's failure to provide adequate site access shall be the sole responsibility of the Client and shall entitle the Contractor to an equitable adjustment in the contract price and completion date.`,
    riskFactors: ['occupied_site', 'shared_access', 'limited_parking'],
    baseRiskLevel: 'low'
  },
  'permits-compliance': {
    id: 'permits-compliance',
    title: 'Permit and Compliance Protection',
    description: 'Clear permit responsibilities and compliance terms',
    category: 'regulatory',
    content: `PERMITS AND REGULATORY COMPLIANCE. The responsibility for obtaining necessary permits shall be as specified in this Agreement. Regardless of permit responsibility, the Client acknowledges that: (a) permit approval timelines are beyond the Contractor's control; (b) any delays in permit issuance shall extend the completion date accordingly; (c) additional requirements imposed by permitting authorities may result in Change Orders; and (d) the Contractor shall not be responsible for any pre-existing code violations on the property. If unexpected code compliance issues are discovered during the work, the Contractor shall notify the Client promptly, and any required remediation work shall be subject to a Change Order unless such issues were known to the Contractor prior to contract execution.`,
    riskFactors: ['renovation', 'older_building', 'multiple_jurisdictions'],
    baseRiskLevel: 'medium'
  },
  'intellectual-property': {
    id: 'intellectual-property',
    title: 'Intellectual Property Rights',
    description: 'Ownership of designs, plans, and work product',
    category: 'legal',
    content: `INTELLECTUAL PROPERTY. All designs, drawings, specifications, methods, techniques, and other intellectual property developed or used by the Contractor in connection with this Agreement shall remain the exclusive property of the Contractor. The Client is granted a limited, non-exclusive license to use such materials solely for the purpose of maintaining and repairing the completed work. The Client shall not copy, reproduce, modify, or distribute the Contractor's designs or specifications, or use them for any other project, without the Contractor's prior written consent. Any custom designs created specifically for this project shall become the property of the Client upon full payment, but the Contractor retains the right to use similar designs for other clients.`,
    riskFactors: ['custom_design', 'unique_solution', 'design_build'],
    baseRiskLevel: 'low'
  }
};

export interface LegalClause {
  id: string;
  title: string;
  description: string;
  category: string;
  content: string;
  riskFactors: string[];
  baseRiskLevel: 'low' | 'medium' | 'high';
}

export interface ProjectAnalysis {
  projectType: string;
  projectValue: number;
  location: string;
  projectDescription: string;
}

export interface RiskAssessment {
  overallRiskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: string[];
  recommendations: string[];
}

export interface SuggestedClause {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  mandatory: boolean;
  risk: 'low' | 'medium' | 'high';
  riskScore: number;
  reasoning: string;
}

export interface ClauseSuggestionResult {
  clauses: SuggestedClause[];
  projectRiskAssessment: RiskAssessment;
  analysisTimestamp: string;
}

class LegalClausesAIService {
  private anthropic: Anthropic | null = null;

  private getAnthropic(): Anthropic {
    if (!this.anthropic) {
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY is not configured');
      }
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }
    return this.anthropic;
  }

  /**
   * Analyze project and suggest appropriate legal clauses
   */
  async suggestClauses(project: ProjectAnalysis): Promise<ClauseSuggestionResult> {
    console.log('🛡️ [LEGAL-AI] Starting intelligent clause suggestion...');
    console.log('📊 [LEGAL-AI] Project data:', {
      type: project.projectType,
      value: project.projectValue,
      location: project.location?.substring(0, 50) + '...',
    });

    try {
      // 1. Perform AI-powered risk analysis
      const riskAssessment = await this.analyzeProjectRisks(project);
      
      // 2. Select appropriate clauses based on risk analysis
      const suggestedClauses = this.selectClausesForRisk(project, riskAssessment);
      
      console.log(`✅ [LEGAL-AI] Generated ${suggestedClauses.length} clause suggestions`);
      
      return {
        clauses: suggestedClauses,
        projectRiskAssessment: riskAssessment,
        analysisTimestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ [LEGAL-AI] Error in clause suggestion:', error);
      
      // Fallback to rule-based suggestions if AI fails
      return this.getFallbackSuggestions(project);
    }
  }

  /**
   * AI-powered risk analysis using Claude
   */
  private async analyzeProjectRisks(project: ProjectAnalysis): Promise<RiskAssessment> {
    const anthropic = this.getAnthropic();
    
    const prompt = `You are a construction law expert and risk analyst. Analyze the following project and identify potential legal risks for the contractor.

PROJECT DETAILS:
- Type: ${project.projectType}
- Value: $${project.projectValue.toLocaleString()}
- Location: ${project.location}
- Description: ${project.projectDescription}

Analyze this project and respond with a JSON object containing:
1. overallRiskScore (1-100, where 100 is highest risk)
2. riskLevel ("low", "medium", "high", or "critical")
3. riskFactors (array of specific risk identifiers from this list: high_value_project, complex_scope, commercial_client, residential, new_client, renovation, design_build, outdoor_work, long_timeline, supply_chain_dependent, occupied_site, older_building, hazardous_materials, custom_design, third_party_access, vague_requirements)
4. recommendations (array of brief risk mitigation recommendations)

Consider factors like:
- Project value (higher value = higher risk)
- Scope complexity
- Timeline implications
- Location-specific risks
- Type of work (new construction vs renovation)
- Client type (residential vs commercial)

Respond ONLY with valid JSON, no additional text.`;

    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            overallRiskScore: parsed.overallRiskScore || 50,
            riskLevel: parsed.riskLevel || 'medium',
            riskFactors: parsed.riskFactors || [],
            recommendations: parsed.recommendations || [],
          };
        }
      }
    } catch (error) {
      console.error('❌ [LEGAL-AI] AI risk analysis failed:', error);
    }

    // Fallback to rule-based risk assessment
    return this.calculateRuleBasedRisk(project);
  }

  /**
   * Rule-based risk calculation as fallback
   */
  private calculateRuleBasedRisk(project: ProjectAnalysis): RiskAssessment {
    let riskScore = 30; // Base risk
    const riskFactors: string[] = [];
    const recommendations: string[] = [];

    // Value-based risk
    if (project.projectValue > 100000) {
      riskScore += 25;
      riskFactors.push('high_value_project');
      recommendations.push('Include comprehensive liability limitation for high-value project');
    } else if (project.projectValue > 50000) {
      riskScore += 15;
      riskFactors.push('high_value_project');
    }

    // Type-based risk
    const projectTypeLower = project.projectType?.toLowerCase() || '';
    if (projectTypeLower.includes('renovation') || projectTypeLower.includes('remodel')) {
      riskScore += 15;
      riskFactors.push('renovation');
      riskFactors.push('older_building');
      recommendations.push('Include permit compliance protection for renovation work');
    }
    if (projectTypeLower.includes('commercial')) {
      riskScore += 10;
      riskFactors.push('commercial_client');
    }
    if (projectTypeLower.includes('design')) {
      riskScore += 10;
      riskFactors.push('design_build');
      riskFactors.push('custom_design');
    }
    if (projectTypeLower.includes('construction')) {
      riskScore += 5;
      riskFactors.push('complex_scope');
    }

    // Description-based risk factors
    const descLower = project.projectDescription?.toLowerCase() || '';
    if (descLower.includes('outdoor') || descLower.includes('exterior')) {
      riskFactors.push('outdoor_work');
    }
    if (descLower.includes('occupied') || descLower.includes('living')) {
      riskFactors.push('occupied_site');
    }
    if (descLower.includes('material') || descLower.includes('supply')) {
      riskFactors.push('supply_chain_dependent');
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (riskScore >= 75) {
      riskLevel = 'critical';
    } else if (riskScore >= 55) {
      riskLevel = 'high';
    } else if (riskScore >= 35) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    return {
      overallRiskScore: Math.min(riskScore, 100),
      riskLevel,
      riskFactors,
      recommendations,
    };
  }

  /**
   * Select appropriate clauses based on risk assessment
   */
  private selectClausesForRisk(project: ProjectAnalysis, risk: RiskAssessment): SuggestedClause[] {
    const allClauses = Object.values(LEGAL_CLAUSES_LIBRARY);
    const suggestedClauses: SuggestedClause[] = [];

    for (const clause of allClauses) {
      let clauseScore = 0;
      let reasoning = '';
      
      // Base score from clause risk level
      if (clause.baseRiskLevel === 'high') clauseScore += 30;
      else if (clause.baseRiskLevel === 'medium') clauseScore += 20;
      else clauseScore += 10;

      // Add score based on matching risk factors
      const matchingFactors = clause.riskFactors.filter(f => 
        risk.riskFactors.includes(f)
      );
      clauseScore += matchingFactors.length * 15;

      // Adjust based on project value
      if (project.projectValue > 50000) {
        if (['liability', 'indemnity', 'payment'].includes(clause.id)) {
          clauseScore += 20;
          reasoning = `Recommended for projects over $50,000. `;
        }
      }

      // Build reasoning
      if (matchingFactors.length > 0) {
        reasoning += `Addresses risk factors: ${matchingFactors.join(', ')}. `;
      }
      if (risk.riskLevel === 'high' || risk.riskLevel === 'critical') {
        if (clause.baseRiskLevel === 'high') {
          clauseScore += 15;
          reasoning += `Essential for ${risk.riskLevel}-risk projects. `;
        }
      }

      // Determine if mandatory based on score and overall risk
      const isMandatory = clauseScore >= 50 || 
        (clause.baseRiskLevel === 'high' && risk.riskLevel !== 'low') ||
        (risk.riskLevel === 'critical' && clauseScore >= 35);

      // Determine display risk level
      let displayRisk: 'low' | 'medium' | 'high';
      if (clauseScore >= 55) displayRisk = 'high';
      else if (clauseScore >= 35) displayRisk = 'medium';
      else displayRisk = 'low';

      suggestedClauses.push({
        id: clause.id,
        title: clause.title,
        description: clause.description,
        content: clause.content,
        category: clause.category,
        mandatory: isMandatory,
        risk: displayRisk,
        riskScore: clauseScore,
        reasoning: reasoning || 'Standard protection clause.',
      });
    }

    // Sort by risk score (highest first) and then by mandatory status
    return suggestedClauses.sort((a, b) => {
      if (a.mandatory !== b.mandatory) return a.mandatory ? -1 : 1;
      return b.riskScore - a.riskScore;
    });
  }

  /**
   * Fallback suggestions when AI analysis fails
   */
  private getFallbackSuggestions(project: ProjectAnalysis): ClauseSuggestionResult {
    console.log('⚠️ [LEGAL-AI] Using fallback clause suggestions');
    
    const risk = this.calculateRuleBasedRisk(project);
    const clauses = this.selectClausesForRisk(project, risk);
    
    return {
      clauses,
      projectRiskAssessment: risk,
      analysisTimestamp: new Date().toISOString(),
    };
  }

  /**
   * Get full clause content by ID
   */
  getClauseById(clauseId: string): LegalClause | undefined {
    return LEGAL_CLAUSES_LIBRARY[clauseId];
  }

  /**
   * Get all available clauses
   */
  getAllClauses(): LegalClause[] {
    return Object.values(LEGAL_CLAUSES_LIBRARY);
  }
}

export const legalClausesAIService = new LegalClausesAIService();
