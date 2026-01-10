/**
 * Map US state codes to IANA timezone identifiers
 */
export function getTimezoneForState(stateCode?: string): string {
  if (!stateCode) return 'America/Los_Angeles'; // Default to Pacific
  
  const state = stateCode.toUpperCase();
  
  // Eastern Time (ET)
  const easternStates = ['CT', 'DE', 'FL', 'GA', 'IN', 'KY', 'ME', 'MD', 'MA', 'MI', 'NH', 'NJ', 'NY', 'NC', 'OH', 'PA', 'RI', 'SC', 'TN', 'VT', 'VA', 'WV'];
  if (easternStates.includes(state)) return 'America/New_York';
  
  // Central Time (CT)
  const centralStates = ['AL', 'AR', 'IL', 'IA', 'KS', 'LA', 'MN', 'MS', 'MO', 'NE', 'ND', 'OK', 'SD', 'TX', 'WI'];
  if (centralStates.includes(state)) return 'America/Chicago';
  
  // Mountain Time (MT)
  const mountainStates = ['AZ', 'CO', 'ID', 'MT', 'NM', 'UT', 'WY'];
  if (mountainStates.includes(state)) return 'America/Denver';
  
  // Pacific Time (PT)
  const pacificStates = ['CA', 'NV', 'OR', 'WA'];
  if (pacificStates.includes(state)) return 'America/Los_Angeles';
  
  // Alaska Time (AKT)
  if (state === 'AK') return 'America/Anchorage';
  
  // Hawaii-Aleutian Time (HAT)
  if (state === 'HI') return 'Pacific/Honolulu';
  
  // Default to Pacific if state not found
  return 'America/Los_Angeles';
}
