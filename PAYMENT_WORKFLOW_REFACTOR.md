# Payment Workflow Refactor — Architecture Design

## Unified Flow: 2 Steps + Collapsible Advanced Options

### Step 1: Configure Payment
- Amount input (large, prominent)
- Link to existing project (optional toggle)
  - Project selector dropdown (auto-fills client info + suggested amount)
  - Payment type: Deposit 50% / Final 50% / Milestone / Custom
- Client info: Email (required for link), Name, Phone
- Payment method: Payment Link | Cash/Check | Terminal (disabled)
- [▼ Advanced Options] — collapsible, closed by default
  - Description (auto-generated if blank)
  - Due date
  - Auto-send email toggle (payment link only)
  - Fee absorption toggle (payment link only)
  - Manual payment fields: method, reference #, date, notes

### Step 2: Confirm & Share
- Success banner
- Payment link display + copy button
- Share buttons: Email, SMS, WhatsApp, QR Code, Preview, PDF
- Payment summary card
- Next steps guidance
- Actions: Create Another | View History

## Key Design Decisions
1. Single `step` state: "configure" | "success"
2. `showAdvanced` boolean for collapsible section
3. All existing handlers preserved (handleCreatePayment, copyToClipboard, etc.)
4. formatCurrency (cents) and formatDollars (dollars) both kept
5. Device detection kept for Terminal disabled state
6. localStorage memory for last payment method kept
7. All data-testid attributes preserved for compatibility
