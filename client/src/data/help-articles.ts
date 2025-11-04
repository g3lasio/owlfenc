import { 
  FileText, 
  Settings, 
  BookOpen, 
  Zap, 
  HelpCircle, 
  CreditCard, 
  MessageSquare,
  Rocket 
} from 'lucide-react';

export interface HelpArticle {
  id: string;
  title: string;
  category: string;
  description: string;
  icon: any;
  content: string;
  relatedArticles?: string[];
}

export interface HelpCategory {
  id: string;
  title: string;
  description: string;
  icon: any;
  articles: HelpArticle[];
}

export const helpArticles: HelpArticle[] = [
  {
    id: '1',
    title: 'Creating Your First Estimate with Mervin AI',
    category: 'getting-started',
    description: 'Step-by-step guide to creating professional estimates',
    icon: FileText,
    relatedArticles: ['4', '2'],
    content: `
# Creating Your First Estimate with Mervin AI

Mervin AI makes creating professional estimates quick and easy. Follow these steps to generate your first estimate.

## Step 1: Navigate to Estimates

1. Log into your Mervin AI dashboard
2. Click on **"Estimates"** in the sidebar
3. Click the **"New Estimate"** button

## Step 2: Choose Your Method

You have two options for creating estimates:

### Basic Estimate
- Manually enter all details
- Full control over pricing
- Best for standard projects

### AI Smart Estimate
- Let AI generate the estimate
- Describe your project in natural language
- AI calculates materials and labor automatically

## Step 3: Fill in Project Details

**Required Information:**
- Client name and contact information
- Project address
- Fence type (wood, vinyl, chain-link, etc.)
- Linear footage
- Height specifications

**Optional Details:**
- Gate requirements
- Special features
- Terrain considerations
- Timeline preferences

## Step 4: Review AI Suggestions

If using AI Smart Estimate:
1. Review AI-calculated materials list
2. Check labor estimates
3. Adjust any values as needed
4. Add custom line items if necessary

## Step 5: Finalize and Send

1. Review the complete estimate
2. Add any notes or terms
3. Click **"Generate PDF"**
4. Email directly to your client or download

## Tips for Success

✅ **Be Specific**: The more details you provide, the more accurate your estimate will be

✅ **Use Photos**: Attach site photos to help with calculations

✅ **Save Templates**: Create templates for common project types

✅ **Track History**: All estimates are saved in your dashboard for easy reference

## Common Questions

**Q: Can I edit an estimate after sending?**
A: Yes! You can create a revised version at any time.

**Q: How does AI pricing work?**
A: AI uses current market rates for materials and standard labor calculations based on your region.

**Q: Can I customize my company branding?**
A: Yes! Go to Settings > Company Profile to upload your logo and customize colors.

---

Need more help? [Contact our support team](/support/get-support)
    `
  },
  {
    id: '2',
    title: 'Setting Up Your Company Profile',
    category: 'getting-started',
    description: 'Complete your profile for professional documents',
    icon: Settings,
    relatedArticles: ['1', '5'],
    content: `
# Setting Up Your Company Profile

Your company profile is essential for creating professional, branded documents. Here's how to set it up properly.

## Accessing Company Settings

1. Click on **Settings** in the sidebar
2. Select **"Company Profile"**
3. You'll see all profile options

## Essential Information

### Basic Details
- **Company Name**: Your legal business name
- **Contact Email**: Primary business email
- **Phone Number**: Business phone
- **Website**: Your company website (optional)

### Business Address
- Street address
- City, State, ZIP
- Service areas (for permit lookups)

### License & Insurance
- Contractor license number
- License state
- Insurance information
- Bond details (if applicable)

## Branding Your Documents

### Logo Upload
1. Click **"Upload Logo"**
2. Recommended size: 500x200 pixels
3. Accepted formats: PNG, JPG, SVG
4. Logo appears on all PDFs

### Color Scheme
- Choose your brand colors
- Affects headers and accents in documents
- Preview before saving

### Email Signature
- Customize the footer of estimate emails
- Add social media links
- Include taglines or certifications

## Document Preferences

### Default Terms & Conditions
Set up standard terms that appear on:
- Estimates
- Contracts
- Invoices

### Payment Terms
- Default payment schedules
- Accepted payment methods
- Deposit requirements

### Warranty Information
- Standard warranty period
- What's covered
- Claim process

## Verification & Compliance

### License Verification
- Upload license documentation
- Keeps your credentials current
- Required for legal contracts

### Tax Information
- Sales tax rates by region
- Tax ID number
- Automatic tax calculation

## Tips for Professional Documents

✅ **Complete Profile**: Fill out all fields for credibility

✅ **Professional Logo**: Use high-quality images

✅ **Clear Terms**: Make payment terms easy to understand

✅ **Keep Updated**: Review quarterly for accuracy

## Saving Your Changes

1. Review all information
2. Click **"Save Profile"**
3. Changes apply immediately to new documents
4. Existing documents remain unchanged

---

Questions? [Get support here](/support/get-support)
    `
  },
  {
    id: '3',
    title: 'Understanding Your Dashboard',
    category: 'getting-started',
    description: 'Navigate your workspace like a pro',
    icon: BookOpen,
    relatedArticles: ['1', '4'],
    content: `
# Understanding Your Dashboard

Your Mervin AI dashboard is command central for your contracting business. Here's a complete guide to every feature.

## Dashboard Overview

When you log in, you'll see:
- **Quick Stats**: Active projects, pending estimates, revenue
- **Recent Activity**: Latest estimates and contracts
- **Notifications**: Important updates and reminders
- **Quick Actions**: One-click access to common tasks

## Main Navigation

### Sidebar Menu

**Estimates**
- View all estimates
- Create new estimates
- Track sent/accepted/declined

**Contracts**
- Generate legal contracts
- Track signatures
- Manage templates

**Projects**
- Active job tracking
- Project timeline
- Client communication

**Clients**
- Client database
- Contact history
- Project history per client

**Mervin AI Chat**
- Ask questions
- Get instant help
- Research permits and codes

**Reports**
- Revenue analytics
- Project performance
- Client insights

## Quick Actions Panel

Located at the top right:
- **New Estimate**: Create quickly
- **New Contract**: Generate documents
- **Chat with Mervin**: Ask AI anything
- **Search**: Find any document

## Stats & Metrics

### This Month Overview
- Total estimates sent
- Conversion rate
- Revenue generated
- Active projects

### Performance Trends
- Week-over-week comparison
- Monthly growth charts
- Client acquisition rate

## Notifications Center

Bell icon shows:
- Estimate acceptances
- Contract signatures
- Payment received
- System updates

**Notification Settings:**
1. Click bell icon
2. Select "Settings"
3. Choose notification preferences
4. Email, SMS, or in-app

## Customizing Your Dashboard

### Widget Arrangement
- Drag and drop widgets
- Show/hide sections
- Save custom layouts

### Dark Mode
- Toggle in top-right corner
- Saves preference automatically
- Reduces eye strain

### Default Views
Set preferred default views for:
- Estimates (list vs. grid)
- Date ranges
- Sorting preferences

## Mobile App

Access dashboard on mobile:
- iOS and Android apps
- Full feature parity
- Offline mode available
- Push notifications

## Keyboard Shortcuts

Speed up your workflow:
- `Cmd/Ctrl + N`: New estimate
- `Cmd/Ctrl + K`: Search
- `Cmd/Ctrl + /`: Open Mervin chat
- `Cmd/Ctrl + ,`: Settings

## Dashboard Health Check

Monthly checklist:
- ✅ Review pending estimates
- ✅ Follow up on unsigned contracts
- ✅ Update client information
- ✅ Check notification settings
- ✅ Review analytics

## Getting Help

- **?** icon: Contextual help
- **Chat bubble**: Live support
- **Tutorials**: Video walkthroughs

---

Ready to dive deeper? [Explore features](/support/help-center#features)
    `
  },
  {
    id: '4',
    title: 'Using AI Smart Estimates',
    category: 'features',
    description: 'Generate accurate estimates with AI assistance',
    icon: Zap,
    relatedArticles: ['1', '6'],
    content: `
# Using AI Smart Estimates

Mervin AI's Smart Estimate feature revolutionizes how you create quotes. Let AI do the heavy lifting while you maintain full control.

## What is AI Smart Estimate?

Instead of manually calculating:
- Material quantities
- Labor hours
- Pricing
- Markup percentages

**Simply describe the project** and let AI generate a complete, accurate estimate.

## How It Works

### Step 1: Start a Smart Estimate

1. Go to Estimates > New Estimate
2. Select **"AI Smart Estimate"**
3. You'll see the AI input interface

### Step 2: Describe Your Project

Use natural language like:

> "I need to install 150 linear feet of 6-foot vinyl privacy fence with two gates on level terrain in Sacramento, CA"

**The AI understands:**
- Fence types (vinyl, wood, chain-link, etc.)
- Measurements (linear feet, height)
- Features (gates, caps, rails)
- Location (for pricing)
- Terrain considerations

### Step 3: Review AI Calculations

Mervin AI generates:

**Materials List:**
- Post quantities (based on spacing)
- Panel or picket counts
- Concrete requirements
- Hardware and fasteners
- Gates and accessories

**Labor Estimate:**
- Installation hours
- Removal (if needed)
- Site prep time
- Cleanup

**Pricing:**
- Material costs (current market rates)
- Labor costs (regional rates)
- Suggested markup
- Total price

### Step 4: Customize & Adjust

You have full control:
- Edit any line item
- Add custom items
- Adjust prices
- Change quantities
- Modify markup

### Step 5: Send to Client

- Generate professional PDF
- Email directly
- Track when viewed
- Get notified of acceptance

## Advanced Features

### Photo Analysis
Upload site photos and AI will:
- Detect obstacles
- Assess terrain difficulty
- Identify existing structures
- Suggest additional services

### Smart Suggestions
AI recommends:
- Upgrades clients might want
- Common add-ons
- Seasonal considerations
- Warranty options

### Regional Intelligence
Automatically factors in:
- Local material costs
- Regional labor rates
- Permit requirements
- Weather considerations

## Tips for Best Results

✅ **Be Specific**: Include all measurements and details

✅ **Mention Challenges**: Slopes, obstacles, access issues

✅ **Include Location**: City and state for accurate pricing

✅ **Specify Materials**: Exact fence type and quality level

✅ **Note Extras**: Gates, caps, special features

## Example Prompts

**Simple Project:**
> "120 ft of 4-foot chain-link fence, flat yard, no gates, Atlanta GA"

**Complex Project:**
> "200 linear feet of 6-foot cedar privacy fence on sloped terrain with three 4-foot gates, includes removal of existing fence, Los Angeles CA"

**Commercial Project:**
> "500 ft perimeter fence, 8-foot height, black vinyl, security grade, includes 10-foot double gate, industrial site, Houston TX"

## Common Questions

**Q: How accurate is AI pricing?**
A: Typically within 5-10% of manual calculations. Always review and adjust based on your costs.

**Q: Can AI handle complex projects?**
A: Yes! The more details you provide, the better the estimate.

**Q: Does it replace my expertise?**
A: No, it enhances it. You make final decisions on all pricing and details.

**Q: Can I save AI estimates as templates?**
A: Yes! Save common project types for even faster quoting.

## Limitations

AI estimates work best for:
- Standard residential fencing
- Commercial chain-link
- Typical installations

May need manual adjustment for:
- Highly custom designs
- Unusual materials
- Extreme terrain
- Heritage/restoration work

---

Need to refine an estimate? [Learn about editing](/support/help-center/article/1)
    `
  },
  {
    id: '5',
    title: 'Creating Legal Contracts',
    category: 'features',
    description: 'Generate state-compliant contracts automatically',
    icon: FileText,
    relatedArticles: ['1', '2'],
    content: `
# Creating Legal Contracts

Generate professional, state-compliant contracts in minutes. Mervin AI ensures your contracts meet legal requirements and protect your business.

## Contract Types Available

### Installation Contracts
- New fence installation
- Custom project agreements
- Material and labor warranties

### Service Agreements
- Maintenance contracts
- Repair services
- Inspection agreements

### Change Orders
- Project modifications
- Additional work authorization
- Price adjustments

## Creating Your First Contract

### Step 1: Select Contract Type

1. Navigate to **Contracts**
2. Click **"Generate New Contract"**
3. Choose your contract type
4. Select your state for compliance

### Step 2: Auto-Fill from Estimate

If you have an existing estimate:
- Select the estimate
- Contract pre-fills all details
- Pricing automatically transfers
- Client info imports

### Step 3: Customize Terms

**Payment Terms:**
- Deposit amount (percentage or fixed)
- Payment schedule (milestones)
- Accepted payment methods
- Late payment terms

**Project Scope:**
- Detailed work description
- Materials specification
- Timeline and milestones
- Completion criteria

**Legal Protections:**
- Liability limitations
- Warranty terms
- Force majeure clauses
- Dispute resolution

### Step 4: Review Legal Compliance

AI automatically includes:
- State-specific lien rights
- Required disclosures
- Cancellation rights (if applicable)
- Licensing information

### Step 5: Send for Signature

**Digital Signature Options:**
- Email to client
- SMS link
- In-person signing (tablet)
- Dual signature workflow

## State Compliance Features

Mervin AI ensures compliance with:

### California
- Mechanics lien notices
- 3-day right to cancel
- License bond disclosures
- Home Improvement Contract Act

### Texas
- DTPA disclosures
- Residential construction provisions
- Notice of customer complaints

### Florida
- Construction lien law notices
- Building permit requirements
- Hurricane provisions

### Other States
- All 50 states supported
- Automatic updates for law changes
- Regional requirements

## Digital Signatures

### How It Works
1. Contract sent via email
2. Client clicks secure link
3. Reviews contract online
4. Signs electronically
5. Both parties receive signed copy

### Legal Validity
- eSign Act compliant
- Court-admissible
- Tamper-proof encryption
- Audit trail included

### Dual Signature Workflow
1. Contractor signs first
2. Client receives for signature
3. Both must sign for completion
4. Automatic PDF generation

## Contract Management

### Status Tracking
- Draft
- Sent for signature
- Partially signed
- Fully executed
- Completed

### Notifications
Email alerts for:
- Client views contract
- Signature received
- Contract expires
- Payment due

### Document Storage
- Cloud storage included
- Search by client/project
- Download anytime
- 7-year retention

## Tips for Solid Contracts

✅ **Be Specific**: Detail every aspect of the work

✅ **Set Clear Milestones**: Break projects into phases

✅ **Define Materials**: Specify brands and grades

✅ **Include Photos**: Attach before photos to contract

✅ **Update Templates**: Review quarterly for accuracy

## Modifying Signed Contracts

For changes after signing:

1. Generate a **Change Order**
2. Detail modifications
3. Adjust pricing if needed
4. Both parties sign amendment
5. Attaches to original contract

## Common Questions

**Q: Are digital signatures legally binding?**
A: Yes! Fully compliant with federal eSign Act and UETA.

**Q: What if a client wants changes?**
A: Easily edit before sending. After signing, use change orders.

**Q: Can I use my own contract template?**
A: Yes! Upload custom templates while maintaining compliance features.

**Q: How long are contracts stored?**
A: Minimum 7 years, lifetime with premium plans.

## Contract Templates

### Pre-Built Templates
- Standard installation
- Repair work
- Maintenance agreement
- Emergency service
- Commercial projects

### Custom Templates
1. Create from scratch
2. Save for reuse
3. Share with team
4. Update globally

---

Questions about contracts? [Contact legal support](/support/get-support)
    `
  },
  {
    id: '6',
    title: 'Property Verification Tool',
    category: 'features',
    description: 'Verify property details before starting work',
    icon: HelpCircle,
    relatedArticles: ['4', '1'],
    content: `
# Property Verification Tool

Avoid costly mistakes by verifying property details before you start work. Mervin AI's verification tool checks boundaries, permits, and restrictions.

## Why Property Verification Matters

Common issues prevented:
- ❌ Building on easements
- ❌ Violating setback requirements
- ❌ Ignoring HOA restrictions
- ❌ Missing required permits
- ❌ Crossing property lines

## How to Verify a Property

### Step 1: Enter Property Address

1. Go to **Tools** > **Property Verification**
2. Enter the full address
3. AI retrieves public records

### Step 2: Review Property Details

**Parcel Information:**
- Parcel ID/APN
- Legal description
- Property dimensions
- Lot size

**Ownership:**
- Current owner verification
- Match against your client
- Ownership transfer dates

**Zoning:**
- Residential/Commercial designation
- Allowed uses
- Density restrictions

### Step 3: Check Restrictions

**Setback Requirements:**
- Front yard setback (often 15-25 ft)
- Side yard setback (often 5-10 ft)
- Rear yard setback (often 10-20 ft)
- Height restrictions

**Easements:**
- Utility easements
- Access easements
- Conservation easements
- Drainage easements

**HOA Rules:**
- Fence height limits
- Approved materials
- Color restrictions
- Architectural review needed?

### Step 4: Permit Requirements

AI checks if you need:
- Building permit
- Fence permit
- Grading permit
- Tree removal permit

**Permit Info Includes:**
- Where to apply
- Estimated cost
- Processing time
- Required documents

## Map View Features

Interactive property map shows:
- Property boundaries (surveyed)
- Easements (shaded areas)
- Setback lines (dashed)
- Existing structures
- Proposed fence line (you draw)

**Drawing Tools:**
- Measure distances
- Mark fence location
- Calculate linear feet
- Identify conflicts

## Interpreting Results

### Green Checkmark ✅
- No restrictions found
- Clear to proceed
- Standard permits may apply

### Yellow Warning ⚠️
- Potential issues detected
- Review recommended
- May need approvals

### Red Alert 🚫
- Serious restrictions
- Cannot proceed as planned
- Professional survey needed

## Common Restrictions Found

### HOA Restrictions
- Maximum fence height (often 6 ft rear, 4 ft front)
- Approved materials list
- Color limitations
- Board approval required

### Municipal Code
- Fence height by zone
- Corner lot visibility rules
- Pool enclosure requirements
- Material restrictions (some cities ban chain-link in front yards)

### Utility Easements
- Can't build permanent structures
- Utility access required
- Temporary fences only

## What to Do with Results

### No Issues Found
1. Proceed with confidence
2. Still check permit requirements
3. Save report for records
4. Include in project file

### Issues Detected
1. Review with client
2. Adjust plans if possible
3. Seek variance if needed
4. Consider professional survey

### Serious Conflicts
1. Stop planning immediately
2. Recommend surveyor
3. Consult local authorities
4. May need to decline project

## Advanced Features

### Historical Data
- Past permits on property
- Previous fence locations
- Known issues

### Neighbor Properties
- Adjacent property lines
- Shared fences
- Neighbor permits

### 3D Visualization
- Topographic view
- Grade changes
- Drainage patterns

## Accuracy & Limitations

**Data Sources:**
- County assessor records
- GIS databases
- HOA registries (if available)
- Municipal code databases

**Limitations:**
- Public records only
- May not include recent changes
- HOA data not always available
- Survey recommended for disputes

## When to Hire a Surveyor

Recommend professional survey for:
- Property line disputes
- No visible boundary markers
- Complex easements
- Steep slopes
- High-value properties
- Legal requirements

## Tips for Success

✅ **Verify Early**: Check before quoting

✅ **Share with Client**: Include in proposal

✅ **Document Everything**: Save reports

✅ **When in Doubt**: Recommend survey

✅ **Know Local Rules**: Learn your area's common restrictions

## Integration with Estimates

Verification data auto-populates:
- Property address
- Lot dimensions
- Permit requirements
- Special considerations

## Cost

Property verification included in:
- Pro plans: 50/month
- Master plans: Unlimited
- Free trials: 3 verifications

---

Need help interpreting results? [Ask our experts](/support/get-support)
    `
  },
  {
    id: '7',
    title: 'Understanding Subscription Plans',
    category: 'billing',
    description: 'Choose the right plan for your business',
    icon: CreditCard,
    relatedArticles: ['8', '9'],
    content: `
# Understanding Subscription Plans

Choose the Mervin AI plan that fits your business size and needs. All plans include core features with varying limits and capabilities.

## Available Plans

### Free Trial
**Perfect for testing**
- Duration: 14 days
- 3 AI estimates
- 1 contract generation
- Basic support
- No credit card required

### Starter Plan - $29/month
**For new contractors**
- 20 estimates/month
- 5 contracts/month
- Email support
- Basic analytics
- 1 user

### Professional Plan - $79/month
**For growing businesses**
- 100 estimates/month
- 25 contracts/month
- Priority support
- Advanced analytics
- Up to 3 users
- Custom branding
- Property verification (50/month)

### Master Contractor Plan - $149/month
**For established companies**
- Unlimited estimates
- Unlimited contracts
- 24/7 phone support
- Full analytics suite
- Unlimited users
- White-label options
- Unlimited property verifications
- API access
- Dedicated account manager

### Enterprise
**Custom solutions**
- Everything in Master
- Custom integrations
- On-premise option
- SLA guarantees
- Training & onboarding
- Custom pricing

## Feature Comparison

| Feature | Free Trial | Starter | Pro | Master |
|---------|------------|---------|-----|--------|
| AI Estimates | 3 | 20/mo | 100/mo | Unlimited |
| Contracts | 1 | 5/mo | 25/mo | Unlimited |
| Users | 1 | 1 | 3 | Unlimited |
| Storage | 100MB | 5GB | 50GB | 500GB |
| Support | Email | Email | Priority | 24/7 Phone |
| Branding | No | No | Yes | Yes |
| Analytics | Basic | Basic | Advanced | Full |
| API | No | No | No | Yes |

## Choosing the Right Plan

### Start with Starter if:
- You're new to the business
- Do 5-15 jobs per month
- Working solo
- Budget-conscious

### Upgrade to Professional if:
- Growing client base
- 15-50 jobs per month
- Have a small team
- Need advanced features

### Go Master if:
- Established business
- 50+ jobs per month
- Larger team
- Need unlimited everything

## What Counts Towards Limits?

### Estimates
- Each new estimate = 1 count
- Revisions don't count
- Duplicates don't count
- Saved drafts don't count

### Contracts
- Each generated contract = 1 count
- Change orders don't count
- Templates don't count

### Users
- Each team member with login
- View-only users don't count (Pro+)

## Usage Tracking

Monitor your usage:
1. Dashboard > Subscription
2. View current month usage
3. See days remaining
4. Upgrade if needed

**Soft Limits:**
- Get warned at 80% usage
- Email notification at 90%
- Upgrade prompt at 100%

**Overage Policy:**
- Starter & Pro: Blocked at limit
- Master: Unlimited (no overages)
- Can upgrade mid-month

## Annual vs. Monthly

### Monthly Billing
- Cancel anytime
- Month-to-month
- Full price

### Annual Billing (Save 20%)
- Pay once per year
- 2 months free
- Can still cancel
- Refund first 30 days

**Annual Pricing:**
- Starter: $279/year (vs $348)
- Professional: $759/year (vs $948)
- Master: $1,429/year (vs $1,788)

## What's Included in All Plans

✅ Unlimited client database
✅ Cloud document storage
✅ Email delivery
✅ Digital signatures
✅ Mobile app access
✅ Basic templates
✅ Automatic backups
✅ 256-bit encryption
✅ GDPR compliance
✅ Regular updates

## Add-Ons (Any Plan)

### Extra Users
- $15/month per user
- Full feature access
- Individual logins

### Extra Storage
- +100GB for $10/month
- Unlimited on Master

### White Labeling
- $29/month
- Remove "Powered by Mervin AI"
- Custom domain for client portal
- Professional or Master only

## Free Features

Never charged for:
- Software updates
- Security patches
- New feature releases
- Customer support (varies by tier)
- Mobile apps
- Data exports

## Educational Discount

**Students & Educators:**
- 50% off Starter or Professional
- Verification required
- Annual billing only
- Email edu@mervinai.com

## Non-Profit Discount

**Registered 501(c)(3):**
- 30% off any plan
- 501(c)(3) documentation required
- Support community projects

---

Ready to upgrade? [Manage your subscription](/subscription) or [Contact sales](/support/get-support)
    `
  },
  {
    id: '8',
    title: 'Managing Payment Methods',
    category: 'billing',
    description: 'Update your billing information',
    icon: CreditCard,
    relatedArticles: ['7', '9'],
    content: `
# Managing Payment Methods

Keep your billing information current to avoid service interruptions. Here's how to manage your payment methods securely.

## Adding a Payment Method

### Step 1: Access Billing

1. Click your profile picture
2. Select **"Subscription"**
3. Go to **"Payment Methods"** tab

### Step 2: Add New Method

**Credit/Debit Card:**
1. Click **"Add Payment Method"**
2. Enter card number
3. Expiration date
4. CVC code
5. Billing ZIP code
6. Click **"Save"**

**Accepted Cards:**
- Visa
- Mastercard
- American Express
- Discover

**Alternative Payment Methods:**
- PayPal (coming soon)
- ACH Bank Transfer (Enterprise only)
- Wire Transfer (Annual plans)

## Setting Default Payment Method

1. View all payment methods
2. Click **"⋮"** on desired method
3. Select **"Set as Default"**
4. Confirmation appears

Default method is used for:
- Monthly subscriptions
- Add-on purchases
- Overage charges (if any)

## Updating Card Information

**When card expires or is replaced:**

1. Find existing payment method
2. Click **"Edit"**
3. Update information
4. Save changes
5. Next billing uses new card

**Note:** If your card number changed (not just expiration), add as new method and remove old one.

## Removing Payment Methods

**Important:** Can't remove default payment method with active subscription.

To remove:
1. Set different default (if active subscription)
2. Find method to remove
3. Click **"⋮"**
4. Select **"Remove"**
5. Confirm deletion

## Security Features

### Data Protection
- All data encrypted (256-bit SSL)
- PCI DSS Level 1 compliant
- Card numbers never stored in plain text
- Powered by Stripe

### Fraud Prevention
- Address verification (AVS)
- CVC verification
- 3D Secure support
- Suspicious activity alerts

### Your Privacy
- We never see full card numbers
- Billing handled by Stripe
- No card data in our database
- SOC 2 Type II certified

## Payment Failed - What to Do

If a payment fails:

### Immediate Actions
1. Check email for failure notice
2. Verify card not expired
3. Confirm sufficient funds
4. Check billing address matches

### Grace Period
- 3-day grace period
- Service continues
- Daily retry attempts
- Email reminders

### After Grace Period
- Account locked (read-only)
- Can't create new estimates
- Historical data preserved
- 7 days to resolve

### Resolving Failed Payments

**Option 1: Update Card**
1. Add new payment method
2. Set as default
3. We auto-retry
4. Account restored immediately

**Option 2: Manual Retry**
1. Fix card issue
2. Click **"Retry Payment"**
3. Immediate processing
4. Account reactivated

## Billing Statements

### Accessing Invoices

1. Go to Subscription > Billing History
2. View all past invoices
3. Download PDF
4. Email to accounting

**Invoice Details:**
- Invoice number
- Billing date
- Amount charged
- Plan details
- Payment method used
- Tax information

### Setting Up Auto-Forward

Send invoices to your accountant:
1. Subscription > Settings
2. **"Invoice Settings"**
3. Add email address(es)
4. Automatic forward on each payment

## Refund Policy

### 30-Day Money-Back Guarantee

**New subscribers:**
- Full refund within 30 days
- No questions asked
- Cancel subscription
- Refund in 5-7 business days

**Annual plans:**
- Pro-rated refund available
- After 30 days
- Minus months used

**Monthly plans:**
- No refund after 30 days
- Cancel to avoid future charges

### Requesting a Refund

1. Contact support at billing@mervinai.com
2. Include:
   - Account email
   - Reason (optional)
   - Invoice number
3. Processed within 48 hours

## Tax Information

### Sales Tax
- Charged based on billing address
- Rates update automatically
- Shown before payment
- Itemized on invoice

### VAT (International)
- VAT collected in EU
- GST collected in applicable countries
- Enter VAT/GST number to exempt

### W-9 for Businesses
- Email accounting@mervinai.com
- For expense reporting
- Provided within 3 business days

## Changing Billing Frequency

### Switch Monthly to Annual

**Benefits:**
- Save 20%
- Billed once per year
- Upgrade anytime

**How to Switch:**
1. Subscription > Plan Details
2. Click **"Switch to Annual"**
3. See prorated calculation
4. Confirm change
5. Charged immediately for year

### Switch Annual to Monthly

**Considerations:**
- Loses annual discount
- Takes effect at renewal
- Can't switch mid-year
- Existing year honored

**How to Switch:**
1. Subscription > Plan Details
2. **"Change to Monthly at Renewal"**
3. Confirmation message
4. Switches on renewal date

## Payment Receipts

Auto-emailed on each payment:
- To account email
- Within 5 minutes of charge
- PDF attachment
- Includes all details

**Missing receipt?**
1. Check spam folder
2. Subscription > Billing History
3. Download manually
4. Or email support@mervinai.com

## International Payments

### Currency
- All plans in USD
- Bank handles conversion
- Exchange rates vary
- May incur foreign transaction fees

### International Cards
- Accepted worldwide
- Address verification for some countries
- May require phone verification
- Contact support for issues

---

Payment questions? [Contact billing support](/support/get-support)
    `
  },
  {
    id: '9',
    title: 'Upgrading or Downgrading Your Plan',
    category: 'billing',
    description: 'Change your subscription anytime',
    icon: CreditCard,
    relatedArticles: ['7', '8'],
    content: `
# Upgrading or Downgrading Your Plan

Your business needs change, and your subscription should too. Here's how to upgrade or downgrade your Mervin AI plan anytime.

## Upgrading Your Plan

### When to Upgrade

**You've hit your limits:**
- Running out of estimates
- Need more contracts
- Team is growing
- Need advanced features

**Automatic Prompts:**
- At 80% of limit
- When attempting to exceed
- Via email notification
- Dashboard banner

### How to Upgrade

#### Quick Upgrade
1. Dashboard shows upgrade prompt
2. Click **"Upgrade Now"**
3. Select new plan
4. Confirm change
5. Immediate access

#### Manual Upgrade
1. Click profile > **"Subscription"**
2. **"Change Plan"**
3. View plan comparison
4. Select higher tier
5. Review prorated billing
6. Confirm upgrade

### Prorated Billing Explained

**Mid-month upgrade:**
- Pay difference for remaining days
- Credit unused portion of old plan
- Charged immediately
- New limits apply instantly

**Example:**
- Currently on Starter ($29/mo)
- 15 days into billing cycle
- Upgrading to Professional ($79/mo)
- Unused Starter credit: $14.50
- Professional for 15 days: $39.50
- Total charge today: $25.00
- Next month: Full $79

### Immediate Benefits

**After upgrading you get:**
- ✅ Instant access to new features
- ✅ Increased limits right away
- ✅ New tools and capabilities
- ✅ Enhanced support tier
- ✅ Historical data preserved

### Feature Unlock Timeline

**Instant:**
- Estimate/contract limits
- User seats
- Support level upgrade
- Analytics access

**Within 24 hours:**
- White-label activation
- API key generation
- Custom domain setup

## Downgrading Your Plan

### When to Downgrade

**Common reasons:**
- Slower season
- Reduced team size
- Budget constraints
- Don't need all features

**Consider:**
- Will you lose needed features?
- Are you near limits on lower tier?
- Seasonal fluctuations?
- Annual vs monthly savings?

### How to Downgrade

#### From Dashboard
1. Subscription settings
2. **"Change Plan"**
3. Select lower tier
4. Review what you'll lose
5. Confirm downgrade

**Timing Options:**

**Immediate Downgrade:**
- Takes effect right away
- Prorated refund to account credit
- Use credit on next billing
- Lost features immediately

**Downgrade at Renewal:**
- Keep current features until renewal
- No refund (paid for full period)
- Automatic switch on renewal date
- Recommended option

### What Happens to Your Data?

**Estimates & Contracts:**
- All historical data preserved
- View-only access to old documents
- Can't create new if over limit
- Exports available anytime

**Users:**
- Extra users deactivated
- Can choose which users stay active
- Deactivated users can reactivate if you upgrade
- No data lost

**Storage:**
- Files remain accessible
- Can't upload new if over limit
- Download documents anytime
- 30 days to reduce or upgrade

### Feature Loss Warning

When downgrading, you may lose:

**Professional to Starter:**
- ❌ Custom branding
- ❌ Extra user seats
- ❌ Advanced analytics
- ❌ Property verification
- ❌ Priority support

**Master to Professional:**
- ❌ Unlimited limits
- ❌ 24/7 phone support
- ❌ API access
- ❌ Dedicated account manager
- ❌ White-label options

### Prorated Refund Policy

**Monthly plans:**
- Credit applied to account
- Used on next billing cycle
- Can request cash refund
- Processed in 5-7 days

**Annual plans:**
- Prorated based on months unused
- Credited to account
- Or refund to original payment method
- 10-14 day processing

## Switching Between Annual and Monthly

### Monthly to Annual

**Save 20%:**
- Starter: Save $69/year
- Professional: Save $189/year
- Master: Save $359/year

**How it works:**
1. Click **"Switch to Annual"**
2. See annual savings
3. Charged immediately for year
4. Credit for unused monthly time

**Worth it if:**
- Planning to use for full year
- Want to save money
- Prefer one payment annually

### Annual to Monthly

**Converts at renewal:**
- Can't switch mid-year
- Set to switch on renewal
- Keeps annual pricing until then
- Email reminder before switch

## Pause or Cancel Subscription

### Pausing (Not Available)

Currently we don't offer pause feature, but you can:
- Downgrade to Starter (lowest cost)
- Cancel and restart later
- Keep free account with view-only access

### Canceling Completely

**How to cancel:**
1. Subscription > **"Cancel Subscription"**
2. Select reason (helps us improve)
3. Confirm cancellation
4. Receive confirmation email

**What happens:**
- Service continues until period end
- No future charges
- Account becomes view-only
- Data preserved for 90 days
- Can reactivate anytime

**Data export:**
- Download all documents
- Export client database
- Save templates
- Available until period end

## Reactivating Canceled Account

**Easy reactivation:**
1. Log back in
2. Click **"Reactivate"**
3. Select plan
4. Add payment method
5. Immediate access

**Your data:**
- Preserved for 90 days after cancellation
- Full restoration if within 90 days
- After 90 days, create new account

## Plan Change FAQs

**Q: Can I change plans multiple times?**
A: Yes! Change as often as needed. Each change is prorated.

**Q: Will I lose my data?**
A: Never. All data is preserved regardless of plan changes.

**Q: Can I upgrade mid-month?**
A: Yes! You're charged a prorated amount and get instant access.

**Q: What if I downgrade by accident?**
A: Contact support within 24 hours for free upgrade restoration.

**Q: Do enterprise contracts allow plan changes?**
A: Enterprise plans are custom. Contact your account manager.

## Getting Help with Plan Changes

**Not sure which plan?**
- Chat with Mervin AI
- Email sales@mervinai.com
- Schedule consultation
- Review comparison chart

**Billing questions?**
- Email billing@mervinai.com
- Support ticket
- Phone: 1-800-MERVIN-AI
- Live chat during business hours

---

Ready to change plans? [Manage subscription](/subscription)
    `
  },
  {
    id: '10',
    title: 'PDF Generation Issues',
    category: 'troubleshooting',
    description: 'Resolve problems with document generation',
    icon: FileText,
    relatedArticles: ['1', '5'],
    content: `
# PDF Generation Issues

Having trouble generating PDFs for estimates or contracts? Here are solutions to common problems.

## Common Symptoms

- ❌ "Failed to generate PDF" error
- ❌ PDF doesn't download
- ❌ Blank or corrupted PDF
- ❌ Missing content in PDF
- ❌ Formatting looks wrong

## Quick Fixes (Try These First)

### 1. Refresh the Page
- Click browser refresh (Cmd/Ctrl + R)
- Try generating again
- Often resolves temporary glitches

### 2. Clear Browser Cache
- Chrome: Settings > Privacy > Clear Browsing Data
- Check "Cached images and files"
- Time range: "Last hour"
- Try generating again

### 3. Use Different Browser
- Try Chrome, Firefox, or Safari
- Sometimes browser-specific issues
- If works in another browser, clear cache in original

### 4. Check Internet Connection
- PDF generation requires stable connection
- Try different network if possible
- Close large downloads/uploads

### 5. Disable Browser Extensions
- Ad blockers can interfere
- Privacy extensions may block
- Disable temporarily and retry

## Specific Error Messages

### "Generation Timeout"

**Cause:** Large or complex document taking too long

**Solutions:**
1. Reduce number of line items
2. Remove high-resolution images
3. Simplify custom formatting
4. Try again in a few minutes

### "Template Error"

**Cause:** Issue with document template

**Solutions:**
1. Select different template
2. Use default template
3. Contact support if custom template
4. Clear and re-enter data

### "Authentication Failed"

**Cause:** Session expired

**Solutions:**
1. Log out completely
2. Clear cookies
3. Log back in
4. Try generating again

## PDF Content Issues

### Blank PDF

**Possible causes:**
- Browser pop-up blocker
- Missing required fields
- Template corruption

**Fix:**
1. Allow pop-ups from mervinai.com
2. Check all required fields filled
3. Try different template
4. Contact support

### Missing Logo or Images

**Possible causes:**
- Image file too large
- Unsupported image format
- Image link broken

**Fix:**
1. Logo should be under 2MB
2. Use JPG or PNG format
3. Re-upload logo in Settings
4. Check image still exists

### Formatting Issues

**Text cutoff or overlapping:**
- Long company names (shorten)
- Too many line items (split into pages)
- Custom fonts not loading (use defaults)

**Weird characters:**
- Special characters not supported
- Use standard ASCII characters
- Remove emojis from descriptions

## Email Delivery Issues

### PDF Emails Not Sending

**Check:**
1. Client email address correct
2. Not in spam/junk folder
3. Email quota not exceeded (check plan limits)
4. Domain not blacklisted

**Test:**
1. Send to your own email first
2. Check delivery
3. Then send to client

### Emails Going to Spam

**Solutions:**
1. Ask client to whitelist @mervinai.com
2. Add to contacts
3. Check spam folder and mark "Not Spam"
4. Use direct download link as backup

## Advanced Troubleshooting

### For Developers/Technical Users

**Check Browser Console:**
1. Open Developer Tools (F12)
2. Go to Console tab
3. Look for red errors
4. Screenshot and send to support

**Network Issues:**
1. Open Network tab in Dev Tools
2. Try generating PDF
3. Look for failed requests (red)
4. Check if 500 or 400 errors

### Server-Side Issues

**Symptoms:**
- Everyone having same problem
- Consistent failures
- Error on all devices

**Check:**
1. Status page: status.mervinai.com
2. Twitter: @MervinAI for updates
3. Wait 15-30 minutes
4. Contact support if persists

## Browser-Specific Issues

### Chrome
- Disable "Download PDF files" setting
- Allow pop-ups from mervinai.com
- Update to latest version
- Clear cache and cookies

### Safari
- Allow pop-ups and downloads
- Enable JavaScript
- Disable "Prevent cross-site tracking" temporarily
- Update to latest macOS/iOS

### Firefox
- Set PDF handler to "Save File"
- Allow pop-ups from mervinai.com
- Disable Enhanced Tracking Protection for site
- Clear recent history

### Mobile Browsers
- Use desktop mode for generation
- Ensure enough storage space
- Use native browser (not in-app browsers)
- Download to device then share

## Plan Limit Issues

### Monthly Limit Reached

**Error:** "Monthly PDF limit exceeded"

**Solutions:**
1. Wait until next billing cycle
2. Upgrade plan for more PDFs
3. Use existing PDFs in meantime
4. Contact sales for one-time increase

### Storage Limit

**Error:** "Storage quota exceeded"

**Solutions:**
1. Delete old estimates/contracts
2. Download and archive locally
3. Upgrade storage capacity
4. Contact support for options

## Contact Support Checklist

If none of above solutions work, contact support with:

**Required Information:**
- ✅ Error message (exact text or screenshot)
- ✅ Browser and version
- ✅ Operating system
- ✅ Steps you've tried
- ✅ When problem started
- ✅ Estimate/Contract ID if applicable

**Optional but Helpful:**
- Browser console errors (screenshot)
- Network tab errors
- Different browser results
- Different device results

## Prevention Tips

✅ **Keep software updated:** Browser, OS, app

✅ **Stable internet:** Strong connection when generating

✅ **Reasonable file sizes:** Compress images before upload

✅ **Regular backups:** Download important PDFs periodically

✅ **Test before clients:** Generate test PDFs regularly

✅ **Monitor limits:** Watch usage to avoid hitting caps

---

Still having issues? [Contact technical support](/support/get-support) - Select "Technical" category
    `
  },
  {
    id: '11',
    title: 'Login & Authentication Problems',
    category: 'troubleshooting',
    description: 'Get back into your account',
    icon: Settings,
    relatedArticles: ['10', '12'],
    content: `
# Login & Authentication Problems

Can't access your account? Here's how to resolve common login issues and regain access.

## Common Login Issues

### "Invalid Email or Password"

**Causes:**
- Typo in email or password
- Caps Lock enabled
- Copy-paste extra spaces
- Wrong account

**Solutions:**

**1. Check Email Format:**
- Ensure complete email (include @domain.com)
- No spaces before or after
- Correct domain (.com not .co)

**2. Check Password:**
- Caps Lock off
- Type instead of paste
- Check for extra spaces
- Try password manager if used

**3. Use Password Reset:**
1. Click "Forgot Password?"
2. Enter your email
3. Check inbox for reset link
4. Check spam if not received
5. Link valid for 1 hour

### "Account Locked"

**Cause:** Too many failed login attempts

**Auto-unlock:** 30 minutes

**Immediate unlock:**
1. Use "Forgot Password" to reset
2. Or contact support with:
   - Account email
   - Reason for lockout
   - Identity verification

**Prevention:** Use password manager

### "Email Not Found"

**Possible reasons:**
- Typo in email
- Different email used for signup
- Account deleted
- Never registered

**Solutions:**

**1. Try Other Email Addresses:**
- Work vs personal email
- Old email addresses
- Email aliases

**2. Check Confirmation:**
- Search inbox for "Mervin AI"
- Check registration confirmation
- Signup email shows correct address

**3. Create New Account:**
If never registered:
1. Click "Sign Up"
2. Use desired email
3. New account created
4. Start fresh

### Email Verification Required

**First-time login requires verification:**

1. Check inbox for verification email
2. Click "Verify Email" link
3. If expired, request new one
4. Check spam/junk folder
5. Add noreply@mervinai.com to contacts

**Didn't receive email?**

**Troubleshoot:**
1. Check spam folder
2. Verify email typed correctly
3. Click "Resend Verification"
4. Wait 5-10 minutes
5. Check email provider not blocking

**Alternative:**
- Use different email if available
- Contact support for manual verification
- Verify with phone number (if enabled)

## Password Reset Issues

### Not Receiving Reset Email

**Check these:**
- ✅ Spam/Junk folder
- ✅ Email typed correctly
- ✅ Promotions tab (Gmail)
- ✅ Email provider not blocking
- ✅ Inbox not full

**Request again:**
1. Wait 5 minutes between requests
2. Try different browser
3. Disable email filters temporarily
4. Add mervinai.com to safe senders

### Reset Link Expired

**Links expire after 1 hour**

**Solution:**
1. Request new reset link
2. Use immediately
3. Complete within 60 minutes

### Reset Link Not Working

**Possible issues:**
- Link wrapped/broken in email
- Extra characters from email client
- Already used
- Expired

**Fix:**
1. Copy entire URL
2. Paste in browser address bar
3. Or request new link
4. Use different email client

## Two-Factor Authentication (2FA) Issues

### Lost Access to 2FA Device

**Using Authenticator App:**

**Recovery Options:**

**1. Use Backup Codes:**
- Found in Security Settings when you set up 2FA
- One-time use codes
- Keep in safe place

**2. Recovery Phone:**
- If set up, receive code via SMS
- Enter when prompted

**3. Contact Support:**
If no backup access:
- Email from registered address
- Provide account details
- Identity verification required
- Manual 2FA reset (24-48 hours)

### 2FA Code Not Working

**Common causes:**
- Time sync issue on phone
- Wrong code entered
- Code expired (30-second window)
- Using old code

**Solutions:**

**1. Time Sync:**
- Authenticator apps use device time
- Ensure "Auto time zone" enabled
- Sync time in app settings

**2. Generate New Code:**
- Wait for next 30-second cycle
- Don't reuse old codes
- Enter immediately

**3. Check App:**
- Ensure correct account selected
- Some apps store multiple accounts
- Look for "Mervin AI" entry

## Session Expired

**"Please login again" message:**

**Causes:**
- Inactive for extended period
- Logged out for security
- Password changed
- IP address changed significantly

**Normal behavior:**
- Sessions expire after 7 days inactive
- Refresh extends session
- Security feature

**Solutions:**
- Simply log back in
- Enable "Remember Me" for longer sessions
- Use password manager for quick login

## "Account Suspended"

**Reasons for suspension:**
- Payment failed
- Terms of Service violation
- Fraudulent activity detected
- Chargeback issued

**To resolve:**
1. Check email for suspension notice
2. Reason stated in email
3. Follow instructions to resolve
4. Or contact support immediately

**Payment-related:**
- Update payment method
- Resolve failed payment
- Account reactivated automatically

## Browser Issues

### Cookies Disabled

**Error:** "Please enable cookies"

**Fix:**

**Chrome:**
1. Settings > Privacy and Security
2. Cookies and other site data
3. "Allow all cookies" or
4. Add mervinai.com to allowed sites

**Firefox:**
1. Settings > Privacy & Security
2. Cookies and Site Data
3. Uncheck "Delete cookies when Firefox closes"
4. Or add exception for mervinai.com

**Safari:**
1. Preferences > Privacy
2. Uncheck "Block all cookies"
3. Or website-specific settings

### JavaScript Disabled

**Error:** "JavaScript required"

**Enable JavaScript:**

**Chrome/Firefox/Safari:**
1. Settings > Privacy/Security
2. Site Settings > JavaScript
3. Enable "Allowed"

### Incognito/Private Mode

**Sessions don't persist in private mode**

**Solution:**
- Use regular browser window
- Or log in each session
- Enable "Remember Me"

## Multi-Device Issues

### Different Devices Show Different Data

**Possible causes:**
- Not fully synced
- Cached data
- Logged into different accounts

**Solutions:**

**1. Verify Account:**
- Check email on each device
- Ensure same account

**2. Force Refresh:**
- Pull to refresh (mobile)
- Cmd/Ctrl + Shift + R (desktop)
- Clear cache

**3. Log Out and In:**
- Completely log out
- Clear app data (mobile)
- Log back in
- Data should sync

## Mobile App Issues

### Can't Login on Mobile

**Different from website:**

**Check:**
- Latest app version installed
- Account created on web first
- Same credentials as website
- Internet connection stable

**Solutions:**
1. Update app to latest version
2. Restart app
3. Restart device
4. Reinstall app
5. Contact support if persists

### Biometric Login Not Working

**Face ID / Touch ID / Fingerprint:**

**Requirements:**
- Set up in app settings after first login
- Device supports biometrics
- Biometrics enrolled on device

**Troubleshooting:**
1. Re-enable in app settings
2. Ensure device biometrics working
3. Fall back to password
4. Re-set up biometric login

## Corporate/Enterprise Login

### Single Sign-On (SSO) Issues

**For enterprise accounts using SSO:**

**Contact your IT department first**

**Common issues:**
- SSO configuration incomplete
- Wrong SSO provider selected
- Account not provisioned

**Backup:**
- Use email/password if enabled
- Contact your account manager
- IT can reset SSO

## Still Can't Login?

### Contact Support

**Provide this information:**

**Required:**
- Account email address
- Description of problem
- Error messages (screenshot)
- Browser/app version
- Device type

**Helpful:**
- When it started
- What you've tried
- Last successful login
- Payment method on file (last 4 digits)

**Contact methods:**
- Support ticket (fastest): support.mervinai.com
- Email: support@mervinai.com
- Phone: 1-800-MERVIN-AI (business hours)
- Live chat: Available 9am-5pm PT Mon-Fri

**Response times:**
- Critical (can't login): 2 hours
- Standard support: 24 hours
- Free trial: 48 hours

---

Need immediate assistance? [Open support ticket](/support/get-support) - Select "Urgent" for login issues
    `
  },
  {
    id: '12',
    title: 'Email Delivery Issues',
    category: 'troubleshooting',
    description: 'Troubleshoot email sending problems',
    icon: MessageSquare,
    relatedArticles: ['10', '1'],
    content: `
# Email Delivery Issues

Estimates and contracts not reaching your clients? Here's how to diagnose and fix email delivery problems.

## Quick Diagnostics

### Test Email Delivery

**Step 1: Send to yourself first**
1. Create test estimate
2. Enter your own email
3. Send
4. Check if received

**If you receive it:**
- ✅ System is working
- Issue is client-side
- See Client Email Issues below

**If you don't receive it:**
- ❌ System issue or configuration
- See System Issues below

## Common Client Email Issues

### Email in Spam/Junk Folder

**Most common reason for "not received"**

**Why it happens:**
- Aggressive spam filters
- First-time sender
- Attachment triggers filter
- Domain reputation

**Solutions:**

**For clients:**
1. Check spam/junk folder
2. Mark as "Not Spam"
3. Add sender to contacts
4. Whitelist @mervinai.com

**For you:**
1. Ask client to check spam
2. Send direct download link
3. Use alternative email
4. Add client to address book before sending

### Email Blocked by Company Firewall

**Corporate/enterprise email systems**

**Symptoms:**
- Bounces back immediately
- "Blocked by policy" error
- Works on personal email

**Solutions:**

**Request IT whitelist:**
- Domain: mervinai.com
- Sender: noreply@mervinai.com
- noreply@stripe.com (payment confirmations)

**Alternative:**
- Use client's personal email
- Share via text message link
- Download and attach manually

### Inbox Full

**Rare but possible**

**Error:** "Mailbox full" or 552 error

**Solutions:**
- Ask client to clear inbox
- Use alternative email
- Text message link
- Share via client portal

### Typo in Email Address

**Human error**

**Common typos:**
- Missing @ symbol
- Wrong domain (.com vs .net)
- Extra spaces
- Transposed letters

**Prevention:**
1. Double-check email
2. Send test to yourself first
3. Confirm with client verbally
4. Use auto-complete from saved clients

## System Issues

### "Failed to Send" Error

**Immediate troubleshooting:**

**1. Check your internet:**
- Connection stable?
- Try other websites
- Restart router if needed

**2. Try again:**
- Click "Retry"
- Wait 5 minutes
- Try different browser

**3. Check status:**
- Visit status.mervinai.com
- Check email service status
- Twitter @MervinAI for updates

### Email Quota Exceeded

**Plan limits reached**

**Error:** "Monthly email limit exceeded"

**Check your plan:**
- Starter: 50 emails/month
- Professional: 200 emails/month
- Master: Unlimited

**Solutions:**
1. Upgrade plan
2. Wait for next billing cycle
3. Use direct download links
4. Request one-time increase

### From Address Rejected

**Email authentication issue**

**Error:** "Sender not authorized"

**Causes:**
- Custom domain misconfigured
- SPF/DKIM records incorrect
- Domain verification needed

**Fix:**
1. Use default @mervinai.com sender
2. Contact support for custom domain help
3. Verify domain ownership
4. Update DNS records

## Bounced Emails

### Hard Bounce

**Email address doesn't exist**

**Reasons:**
- Typo in address
- Account closed
- Domain doesn't exist

**Identify:**
- Immediate bounce back
- "User unknown" error
- "Domain not found"

**Fix:**
1. Verify email with client
2. Update client record
3. Resend to correct address

### Soft Bounce

**Temporary delivery failure**

**Reasons:**
- Mailbox temporarily full
- Server temporarily down
- Message too large

**System behavior:**
- Auto-retry for 24 hours
- Up to 3 attempts
- Final bounce if still failing

**What to do:**
1. Wait 24 hours
2. System retries automatically
3. If fails, try alternative email
4. Or use download link

## Attachment Issues

### Attachments Too Large

**Email size limits:**
- Most providers: 25MB max
- Corporate: Often 10MB
- Mervin AI: 25MB per email

**Our PDFs typically:**
- 500KB - 2MB (normal)
- 5MB+ (many photos)

**If too large:**
1. Remove high-res images
2. Compress images before upload
3. Use download link instead
4. Split into multiple emails

### Attachments Stripped

**Some systems remove attachments**

**Corporate security:**
- .PDF blocked by policy
- Attachments quarantined
- Requires IT approval

**Solutions:**
1. Use direct download link
2. Client portal access
3. Physical mail if critical
4. IT whitelist PDF from mervinai.com

## Delivery Delays

### Normal Delivery Times

**Expected:**
- Immediate to 5 minutes: Normal
- 5-30 minutes: Sometimes happens
- 30+ minutes: Investigate
- 24+ hours: System issue

**Factors affecting speed:**
- Recipient server speed
- Spam filter processing
- Email size
- Server load

### Persistent Delays

**All emails slow:**

**Check:**
1. System status page
2. Your internet speed
3. Multiple recipient servers unlikely all slow

**Report to support if:**
- Consistent delays over 30 min
- Affects all recipients
- Started suddenly
- Other users reporting same

## Email Formatting Issues

### Broken Links

**Links not clickable:**

**Causes:**
- Email client stripping links
- Plain text view
- Security settings

**Solutions:**
1. Use HTML email view
2. Copy-paste URL into browser
3. Access via client portal
4. Generate new email

### Images Not Loading

**Logo or images broken:**

**Causes:**
- Email blocks external images
- "Load images" setting
- Slow connection

**Fix:**
1. Click "Load images" in email
2. Add sender to contacts
3. Images then auto-load

## Provider-Specific Issues

### Gmail

**Common issues:**
- Promotional tab
- Spam filter sensitive
- Blocks suspected phishing

**Solutions:**
- Check Promotions tab
- Drag to Primary inbox
- Star important emails
- Report "Not spam"

### Outlook/Office 365

**Corporate environments:**
- Strict filtering
- Policy-based blocks
- IT-managed

**Solutions:**
- Check Junk folder
- Whitelist with IT
- Safe Senders list
- Check quarantine

### Yahoo/AOL

**Legacy providers:**
- Very aggressive filters
- Often block automated emails

**Solutions:**
- Whitelist @mervinai.com
- Check spam thoroughly
- Consider different email
- Add to contacts first

### Mobile Email (iOS Mail, Android Gmail)

**Push notification issues:**
- Might not notify
- Still in inbox
- Check manually

**Solutions:**
- Refresh inbox
- Check notification settings
- Enable push for mervinai.com

## Alternative Delivery Methods

### When Email Fails

**Option 1: Direct Download Link**
1. Generate PDF
2. Copy shareable link
3. Send via text message
4. Or paste in any messenger

**Option 2: Client Portal**
- Client logs into their portal
- All documents available
- No email needed
- Automatic notifications

**Option 3: Manual Download**
1. Download PDF
2. Attach to your own email
3. Send from your business email
4. Less automated but guaranteed delivery

**Option 4: Physical Mail**
- Print and mail
- For sensitive clients
- Older demographic
- Legal requirements

## Monitoring Email Delivery

### Delivery Status Dashboard

**Track sent emails:**
1. Go to Estimates/Contracts
2. Click email icon
3. View delivery status

**Statuses:**
- ✅ Delivered: Successfully received
- 📬 Sent: In transit
- ⏳ Pending: Queued for delivery
- ❌ Bounced: Failed delivery
- 👁️ Opened: Client viewed (if tracking enabled)

### Email Notifications

**Get notified when:**
- Email bounces
- Client opens email
- Client clicks link
- Client views document

**Enable:**
1. Settings > Notifications
2. Email Delivery Alerts
3. Choose notification method

## Prevention Best Practices

✅ **Maintain Clean Client List:**
- Regular update email addresses
- Remove bounced addresses
- Verify before important sends

✅ **Warm Up New Domains:**
- Don't send 100s immediately
- Start small, increase gradually
- Build sender reputation

✅ **Test First:**
- Send to yourself
- Check formatting
- Verify links work
- Then send to client

✅ **Provide Alternatives:**
- Include download link in email
- Mention client portal access
- Offer text message backup

✅ **Follow Up:**
- Confirm receipt with client
- Phone call for critical docs
- Don't assume delivered

✅ **Monitor Delivery:**
- Check delivery status
- Act on bounces quickly
- Track patterns

## Escalation to Support

**Contact support if:**
- Multiple bounces to different recipients
- System-wide delivery issues
- Authentication errors
- Custom domain problems
- API integration issues

**Provide:**
- Email addresses affected
- Error messages (screenshot)
- Delivery status
- Timeline of issue
- Steps you've tried

**Priority support for:**
- Paid plans: 4-hour response
- Free plans: 24-hour response
- Urgent issues: Mark as urgent

---

Email still not working? [Contact support immediately](/support/get-support) - Select "Technical" + "Urgent"
    `
  }
];

export const helpCategories: HelpCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Learn the basics and get up and running',
    icon: Rocket,
    articles: helpArticles.filter(a => a.category === 'getting-started')
  },
  {
    id: 'features',
    title: 'Features & Tools',
    description: 'Master all the powerful features',
    icon: Zap,
    articles: helpArticles.filter(a => a.category === 'features')
  },
  {
    id: 'billing',
    title: 'Billing & Subscription',
    description: 'Manage your account and payments',
    icon: CreditCard,
    articles: helpArticles.filter(a => a.category === 'billing')
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    description: 'Solutions to common issues',
    icon: HelpCircle,
    articles: helpArticles.filter(a => a.category === 'troubleshooting')
  },
];

// Helper function to get article by ID
export function getArticleById(id: string): HelpArticle | undefined {
  return helpArticles.find(article => article.id === id);
}

// Helper function to get related articles
export function getRelatedArticles(articleId: string): HelpArticle[] {
  const article = getArticleById(articleId);
  if (!article || !article.relatedArticles) return [];
  
  return article.relatedArticles
    .map(id => getArticleById(id))
    .filter((a): a is HelpArticle => a !== undefined);
}
