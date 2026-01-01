# Currency Handling Standards - Owl Fenc Payment System

## Overview
This document establishes the currency handling standards for the Owl Fenc payment system to ensure consistency and prevent calculation errors.

## Storage Standards

### Firebase (Projects/Estimates)
- **Field**: `totalPrice`
- **Unit**: **DOLLARS** (decimal)
- **Format**: `1234.56` represents $1,234.56
- **Reason**: Firebase stores project estimates which are user-facing and created before payment integration

### PostgreSQL (Payments)
- **Field**: `amount`
- **Unit**: **CENTS** (integer)
- **Format**: `123456` represents $1,234.56
- **Reason**: Stripe API requires amounts in cents; integer arithmetic avoids floating-point errors

### Stripe API
- **All amounts**: **CENTS** (integer)
- **Format**: `123456` represents $1,234.56
- **Reason**: Stripe's standard for all payment processing

## Conversion Rules

### Frontend → Backend (Payment Creation)
```typescript
// User enters: $100.50
const userInput = "100.50"; // dollars as string
const amountInCents = parseFloat(userInput) * 100; // Convert to cents: 10050
// Send to API: { amount: 10050 }
```

### Backend → Frontend (Display)
```typescript
// From API: { amount: 10050 }
const amountInCents = 10050;
const amountInDollars = amountInCents / 100; // Convert to dollars: 100.50
// Display: $100.50
```

### Firebase → Frontend (Project Display)
```typescript
// From Firebase: { totalPrice: 1234.56 }
const totalPrice = project.totalPrice; // Already in dollars
// Display directly: $1,234.56
```

## Implementation Guidelines

### ✅ DO
- Store payment amounts in **cents** (integer) in PostgreSQL
- Store project totals in **dollars** (decimal) in Firebase
- Convert to cents immediately before sending to Stripe or backend API
- Convert to dollars only for final display to user
- Add clear comments indicating currency units
- Use descriptive variable names: `amountInCents`, `totalInDollars`

### ❌ DON'T
- Mix cents and dollars in calculations
- Assume all amounts are in the same unit
- Perform floating-point arithmetic on cents
- Convert multiple times in the same flow
- Store cents as decimals or dollars as integers

## Code Examples

### ✅ CORRECT: Payment Creation
```typescript
// ProjectPaymentWorkflow.tsx
const paymentData = {
  projectId: selectedProject?.id || null,
  amount: parseFloat(paymentConfig.amount) * 100, // Convert dollars to cents
  type: paymentType,
  // ...
};
```

### ✅ CORRECT: Display Formatting
```typescript
// PaymentHistory.tsx
const formatCurrency = (amountInCents: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amountInCents / 100); // Convert cents to dollars for display
};
```

### ✅ CORRECT: Mixed Source Calculations
```typescript
// IntegratedProjectPaymentFlow.tsx
const calculateAmounts = (project: Project) => {
  const totalAmount = project.totalPrice || 0; // Already in dollars (Firebase)
  const totalPaid = projectPayments
    .reduce((sum, p) => sum + p.amount, 0) / 100; // Convert cents to dollars (PostgreSQL)
  const remainingBalance = totalAmount - totalPaid; // Both in dollars now
};
```

### ❌ INCORRECT: Inconsistent Handling
```typescript
// DON'T DO THIS
const total = project.totalPrice / 100; // Wrong if totalPrice is already in dollars
const amount = parseFloat(input); // Missing conversion to cents before API call
```

## Testing Checklist

When implementing payment features, verify:

- [ ] User input is converted to cents before API calls
- [ ] API responses in cents are converted to dollars for display
- [ ] Firebase totalPrice is treated as dollars
- [ ] PostgreSQL payment amounts are treated as cents
- [ ] Stripe amounts are sent in cents
- [ ] All currency displays show correct decimal places
- [ ] No floating-point arithmetic on cent values
- [ ] Variable names clearly indicate currency unit

## Migration Notes

If you need to migrate existing data:

1. **PostgreSQL payments**: Already in cents ✅
2. **Firebase projects**: Already in dollars ✅
3. **No migration needed** - system is designed to handle both

## Contact

For questions about currency handling, refer to:
- Backend: `/server/services/contractorPaymentService.ts`
- Frontend: `/client/src/components/payments/ProjectPaymentWorkflow.tsx`
- Webhooks: `/server/services/stripeWebhookService.ts`
