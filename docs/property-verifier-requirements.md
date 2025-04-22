
# Property Ownership Verifier Integration Requirements

## Overview
The Property Ownership Verifier is a critical component of Owl Fence that validates property ownership and details before contractors begin work. This document outlines the integration requirements for the external team developing the backend service.

## API Requirements

### Endpoint: `/api/property/details`
- Method: `GET`
- Query Parameters:
  - `address`: Full property address (string, required)

### Expected Response Format
```typescript
interface PropertyDetails {
  owner: string;          // Property owner's full name
  address: string;        // Formatted property address
  sqft: number;          // Square footage of property
  bedrooms: number;      // Number of bedrooms
  bathrooms: number;     // Number of bathrooms
  lotSize: string;       // Lot size (e.g., "0.25 acres")
  yearBuilt: number;     // Year property was built
  propertyType: string;  // Type of property (e.g., "Single Family Home")
  ownerOccupied: boolean; // Whether owner lives in property
  verified: boolean;     // Whether data is verified
  ownershipVerified: boolean; // Whether ownership is verified
}
```

### Error Response Format
```typescript
interface ErrorResponse {
  message: string;
  errorCode?: string;    // Optional error code for specific handling
  details?: string;      // Optional detailed error message
}
```

### Required Status Codes
- 200: Success
- 400: Invalid address format
- 404: Property not found
- 502: Service provider (CoreLogic/ATTOM) connectivity issues

## Previous Integration Attempts

### Attempt 1: CoreLogic Integration
**Status**: Failed
**Date**: April 2025
**API Keys Used**:
```
CORELOGIC_CONSUMER_KEY=cl_test_c44abc123def456
CORELOGIC_CONSUMER_SECRET=cl_secret_789ghi0jklmno12
```
**Issues**:
- API rate limits too restrictive
- Inconsistent data availability
- High latency (>5s response times)
- Complex authentication process

### Attempt 2: ATTOM Integration
**Status**: Failed
**Date**: April 2025
**API Keys Used**:
```
ATTOM_API_KEY=att_62d4f8e9c1a2b3d4e5f6g7h8
```
**Issues**:
- Limited coverage in target markets
- Missing critical owner verification data
- Unreliable API uptime
- Expensive per-query costs

## Current Frontend Implementation
The frontend is built using React and implements the following features:

1. Address input with Google Places Autocomplete
2. Loading states and error handling
3. Property details display
4. Owner verification indicators
5. Responsive design for mobile/desktop

## Integration Requirements

### Authentication
- API key-based authentication
- Keys should be stored in environment variables
- Rate limiting should allow minimum 1000 requests/day

### Performance Requirements
- API response time < 2 seconds
- 99.9% uptime guarantee
- Support for US addresses
- Data freshness within 30 days

### Cache Requirements 
- Implement response caching (1 hour TTL)
- Cache invalidation on ownership changes
- Store cache in Redis or similar

## Testing Requirements
- Sandbox environment for development
- Test credentials
- Sample response data
- Error simulation endpoints

