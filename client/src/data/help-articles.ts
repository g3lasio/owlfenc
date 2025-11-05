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
    description: 'Step-by-step guide to creating estimate data',
    icon: FileText,
    relatedArticles: ['4', '2'],
    content: `
# Creating Your First Estimate with Mervin AI

Mervin AI provides a simple 4-step wizard to help you organize and calculate estimate data for your construction projects.

## Important: Current Capabilities

**What This Tool Does:**
- ✅ Organize client information
- ✅ Create detailed project descriptions with AI assistance
- ✅ Add and calculate line items (materials, labor, costs)
- ✅ Automatically calculate subtotals, tax, and totals
- ✅ Store client data for future use

**Coming Soon (Not Yet Available):**
- ⏳ PDF generation
- ⏳ Email delivery to clients
- ⏳ Persistent saving of estimates
- ⏳ Download options

Currently, the estimate tool helps you **organize and calculate** your project data. You'll need to manually transfer this information to your own documents or systems.

## Step 1: Navigate to Estimates

1. Log into your Mervin AI account
2. Click on **"Estimates"** in the sidebar
3. Click the **"Create Estimate"** or **"New Estimate"** button

## Step 2: Client Information (Step 1 of 4)

The wizard starts with client details:

**Required Information:**
- Client name
- Client email
- Client phone number
- Project address

**Quick Options:**
- **Select Existing Client**: Choose from your saved client database
- **Search Clients**: Find a client by name, email, or phone
- **Add New Client**: Enter new client information manually

**Tips:**
- Use the search feature to find existing clients quickly
- Client information is saved automatically to your client database
- You can update client details from the Clients page

## Step 3: Project Details (Step 2 of 4)

Enter your project information:

**Project Information:**
- Estimate title
- Project description
- Property/work location

**AI-Powered Description Enhancement:**
- Use the **"Enhance with AI"** button to improve your project description
- The AI will expand and clarify your project details
- You can refine the AI-generated description before proceeding
- This is one of the most powerful features currently available!

**Tips:**
- Be specific in your project description for accurate estimates
- The enhanced description helps create professional, detailed scopes
- You can always edit the description manually after AI enhancement

## Step 4: Line Items (Step 3 of 4)

Add all materials and labor to your estimate:

**Adding Line Items:**
1. Click **"Add Item"** button
2. Enter item details:
   - Item name
   - Description
   - Quantity
   - Unit of measure
   - Unit price
3. Total automatically calculates for each item

**Managing Items:**
- **Edit**: Click the edit icon to modify any item
- **Delete**: Remove items with the trash icon
- **Reorder**: Drag and drop items to reorder (where supported)

**Calculations:**
- Subtotal: Automatically calculated from all line items
- Tax: Optional tax percentage (automatically applied)
- Total: Final amount including tax

## Step 5: Review & Calculate (Step 4 of 4)

Final review of your estimate calculations:

**Review All Details:**
- Verify client information is correct
- Check project description
- Confirm all line items and pricing
- Review subtotal, tax, and total amounts

**Add Notes:**
- Include any special terms or conditions
- Add payment terms
- Include warranty information
- Add project timeline

**What You Can Do Next:**
- Review all calculated totals
- Make notes of the information for your records
- Manually create your own PDF using this data
- Copy/paste the information into your own documents

## Tips for Success

✅ **Save Client Data**: Build your client database for faster future estimates

✅ **Use AI Enhancement**: The ProjectDescriptionEnhancer is a powerful tool - use it!

✅ **Be Detailed**: Include all materials and labor for accurate calculations

✅ **Keep Your Own Records**: Currently, you'll need to save this information externally

✅ **Double-Check Math**: Review all calculations before using

## Plan Limits

Estimate creation limits vary by plan:

**Primo Chambeador (Free):**
- 5 basic estimates per month
- 1 AI-enhanced estimate per month

**Mero Patrón ($49.99/month):**
- 50 basic estimates per month
- 20 AI-enhanced estimates per month

**Master Contractor ($99.99/month):**
- Unlimited estimates

## Common Questions

**Q: Can I save my estimates?**
A: Persistent saving is not yet implemented. We recommend copying the information to your own documents or systems.

**Q: Can I generate a PDF?**
A: PDF generation is planned for a future update. Currently, you'll need to create your own documents using the calculated data.

**Q: Can I email estimates to clients?**
A: Direct email functionality is not yet available. You can use the estimate tool to calculate totals, then create and send your own documents.

**Q: What's the difference between basic and AI-enhanced estimates?**
A: Using the "Enhance with AI" feature on the project description counts as an AI estimate and uses your AI credits.

**Q: Can I use my company logo and branding?**
A: Company profile settings are available. Check Settings > Company Profile for available options.

---

Need more help? [Contact our support team](/support/get-support)
    `
  },
  {
    id: '2',
    title: 'Setting Up Your Company Profile',
    category: 'getting-started',
    description: 'Configure your company information',
    icon: Settings,
    relatedArticles: ['1', '5'],
    content: `
# Setting Up Your Company Profile

Configure your company information in Mervin AI for a more personalized experience.

## Accessing Company Settings

1. Click on **Settings** in the sidebar
2. Select **"Company Profile"** or **"Profile"**
3. You'll see available profile options

## Essential Information

### Basic Details
- **Company Name**: Your legal business name
- **Contact Email**: Primary business email
- **Phone Number**: Business phone
- **Website**: Your company website (optional)

### Business Address
- Street address
- City, State, ZIP
- Service areas

### License & Insurance
- Contractor license number
- License state
- Insurance information
- Bond details (if applicable)

## Future Capabilities

**Coming Soon:**
- Document branding (logo upload)
- Custom color schemes
- Branded PDF templates
- Email signature customization

**Current Use:**
- Store your company information
- Maintain business records
- Reference for future features

## Saving Your Changes

1. Review all information
2. Click **"Save Profile"** or **"Update Profile"**
3. Your information is stored for future use

---

Questions? [Get support here](/support/get-support)
    `
  },
  {
    id: '3',
    title: 'Getting Started with Mervin AI',
    category: 'getting-started',
    description: 'Navigate your workspace and access features',
    icon: BookOpen,
    relatedArticles: ['1', '4'],
    content: `
# Getting Started with Mervin AI

Welcome to Mervin AI! Here's how to navigate and understand the currently available features.

## Home Screen

When you first log in, you'll see the Mervin AI home screen:

**Central Logo:**
- Displays the Mervin AI logo with an animated glow effect
- Click the logo to access the **Mervin AI Chat Interface**
- This is your gateway to the AI assistant

## Main Navigation

Access features from the **sidebar menu**:

### Currently Available Core Features

**Estimates**
- Create estimate calculations
- 4-step wizard for data organization
- AI-powered description enhancement
- Automatic total calculations

**Contracts**
- Generate legal contracts from projects
- Digital signature workflow
- Track signing status
- Firebase-powered contract management

**Mervin AI Chat**
- Conversational AI assistant
- Get instant help with projects
- Research permits and building codes
- Project planning assistance

**Property Verification**
- Verify property ownership
- Check parcel information
- 3-step verification process
- Powered by Mapbox and public records

**Permit Advisor**
- Look up required permits
- City and project-based permit research
- Permit requirements and timelines
- Save permit research for reference

### Additional Pages

**Clients**
- Manage your client database
- Store contact information
- View client information
- Quick access for estimates

**Subscription**
- View your current plan
- Upgrade or manage billing
- Track feature usage
- Payment method management

**Settings**
- Company profile setup
- Account preferences
- Account security

## Quick Actions

**Creating Your First Estimate:**
1. Click **"Estimates"** in sidebar
2. Follow the 4-step wizard
3. Use AI to enhance descriptions
4. Review calculated totals

**Chatting with Mervin AI:**
1. Click the Mervin logo on home screen, or
2. Select **"Mervin AI"** from sidebar
3. Ask questions in natural language
4. Get instant construction intelligence

**Verifying a Property:**
1. Go to **"Property Verification"**
2. Enter the property address
3. Review ownership and parcel details
4. Save verification for records

**Looking Up Permits:**
1. Navigate to **"Permit Advisor"**
2. Enter project address and type
3. Get permit requirements
4. Review research results

## Web Access

The platform is web-based and responsive:
- Access from any device with a browser
- Mobile-optimized interface
- Desktop, tablet, and phone compatible
- Seamless experience across screen sizes

**Note:** There is no dedicated mobile app. The platform is accessed through your web browser on any device.

## Keyboard Navigation

Speed up your workflow:
- Use tab to navigate between fields
- Enter to submit forms
- Sidebar navigation is always accessible
- Click anywhere to close dialogs

## Your First Steps

**1. Set Up Your Profile**
- Go to Settings > Company Profile
- Add your business information
- Fill out available fields

**2. Create Your First Estimate**
- Navigate to Estimates
- Click Create New Estimate
- Follow the 4-step wizard
- Try the AI description enhancer

**3. Try Mervin AI Chat**
- Click the home screen logo
- Ask a construction question
- Explore permit requirements
- Get project assistance

**4. Explore Features**
- Property Verification for due diligence
- Permit Advisor for compliance
- Contract Generator for legal docs
- Client management for organization

## Getting Help

**Mervin AI Assistant:**
- Click the logo to chat
- Ask questions about features
- Get construction advice
- Research building codes

**Support Resources:**
- This help center
- Email: support@mervinai.com
- In-app support

## Plan Features

Your available features depend on your subscription plan:

**Primo Chambeador (Free):**
- 5 basic estimates/month
- 1 AI estimate/month
- Limited access to advanced features

**Mero Patrón ($49.99/month):**
- 50 basic estimates/month
- 20 AI estimates/month
- 50 contracts/month
- 15 property verifications/month
- 10 permit advisor uses/month

**Master Contractor ($99.99/month):**
- Unlimited estimates
- Unlimited contracts
- Unlimited property verifications
- Unlimited permit advisor
- Priority support

---

Ready to dive deeper? [Explore all features](/support/help-center#features)
    `
  },
  {
    id: '4',
    title: 'Using AI-Enhanced Project Descriptions',
    category: 'features',
    description: 'Let AI help craft professional project descriptions',
    icon: Zap,
    relatedArticles: ['1', '6'],
    content: `
# Using AI-Enhanced Project Descriptions

One of Mervin AI's most powerful features is the **Project Description Enhancer** - an AI tool that transforms brief project notes into detailed, professional descriptions.

## What is AI Enhancement?

The **Project Description Enhancer** is an AI-powered tool that:
- Expands brief descriptions into detailed project scopes
- Clarifies technical details
- Adds professional language
- Helps prevent misunderstandings
- Creates clear scope definitions

**This is a REAL, working feature** that you can use today!

## How It Works

### Step 1: Start Creating an Estimate

1. Go to Estimates > New Estimate
2. Complete the client information (Step 1)
3. Move to project details (Step 2)

### Step 2: Write Your Initial Description

Enter a basic project description like:

> "Install 150 feet of vinyl privacy fence, 6 feet tall, two gates"

**Keep it simple:**
- Basic measurements
- Fence type
- Key features
- Location details

### Step 3: Use the Enhance Button

1. Click the **"Enhance with AI"** button
2. AI processes your description in real-time
3. Wait a few seconds for enhancement
4. Review the AI-generated description

### Step 4: Review & Refine

The AI expands your description with:

**Detailed Scope:**
- Specific materials and specifications
- Installation process overview
- Professional terminology
- Clear project boundaries

**You can:**
- Edit the AI-generated text
- Accept it as-is
- Regenerate if needed
- Combine AI suggestions with your own words

## Example Transformation

**Your Input:**
> "150 ft vinyl fence, 6 ft high, 2 gates, level yard"

**AI Enhanced:**
> "This project involves the installation of approximately 150 linear feet of premium 6-foot vinyl privacy fencing on level terrain. The scope includes professional-grade vinyl panels, secure post installation with concrete footings, and the installation of two standard 4-foot access gates with self-closing hinges and lockable latches. All materials will be high-quality, UV-resistant vinyl designed for long-term durability and minimal maintenance. The installation will be completed according to local building codes and manufacturer specifications."

## When to Use AI Enhancement

**Best For:**
- First-time clients who need detailed information
- Complex projects with multiple components
- Formal proposals
- Projects requiring clear scope definition
- When you want to sound more professional

**Skip Enhancement For:**
- Repeat clients who know your work
- Very simple projects
- Internal notes
- When you want maximum brevity

## Plan Limits

AI enhancement uses count toward your monthly limits:

**Primo Chambeador (Free):**
- 1 AI enhancement per month

**Mero Patrón ($49.99/month):**
- 20 AI enhancements per month

**Master Contractor ($99.99/month):**
- Unlimited AI enhancements

**Tracking Usage:**
- View remaining AI credits in your dashboard
- Upgrade prompt appears when limit is reached

## Tips for Best Results

✅ **Include Key Details**: Measurements, materials, and features

✅ **Mention Challenges**: Slopes, obstacles, or special conditions

✅ **Specify Location**: City helps AI understand local context

✅ **Review Carefully**: AI is a tool, you're the expert

✅ **Edit Freely**: Customize the AI output to match your style

✅ **Start Simple**: Brief input often yields better results

## What This Feature Does NOT Do

**Important Clarifications:**

❌ Does not create PDFs
❌ Does not email anything
❌ Does not save estimates permanently
❌ Only enhances the description text field

**What It DOES Do:**

✅ Transforms your brief description into detailed, professional text
✅ Works in real-time during estimate creation
✅ Helps you communicate clearly with clients
✅ Saves you time writing detailed scopes

## Common Questions

**Q: Does AI enhancement cost extra?**
A: It's included in your plan but counts toward monthly AI usage limits.

**Q: Can I use both AI and manual descriptions?**
A: Absolutely! Use AI as a starting point and customize as needed.

**Q: Is the AI aware of building codes?**
A: AI includes general best practices but always verify codes with local authorities.

**Q: What if I don't like the AI enhancement?**
A: Simply edit it or discard it and write your own description.

**Q: Does using AI enhancement create a PDF?**
A: No. AI enhancement only improves the description text. PDF generation is a separate feature that is not yet available.

## Best Practices

✅ **Use It**: This is one of the best working features - take advantage of it!

✅ **Review Output**: Always check AI suggestions for accuracy

✅ **Add Personal Touch**: Include your company's specific approach

✅ **Client Communication**: Ensure descriptions match client expectations

✅ **Documentation**: Detailed descriptions prevent disputes later

---

Ready to create your first estimate? [Learn the 4-step process](/support/help-center/article/1)
    `
  },
  {
    id: '5',
    title: 'Creating Legal Contracts',
    category: 'features',
    description: 'Generate and manage contracts with digital signatures',
    icon: FileText,
    relatedArticles: ['1', '2'],
    content: `
# Creating Legal Contracts

Generate professional contracts with Mervin AI's contract generator. Built on Firebase with secure digital signature workflow.

## Contract Generation Process

### Step 1: Select a Project

**From Existing Estimates:**
1. Navigate to **Contracts** page
2. View list of your projects/estimates
3. Click **"Generate Contract"** for a project
4. Contract pre-fills with project details

**Manual Entry:**
1. Go to Contracts > Create New
2. Enter project information manually
3. Add client details
4. Define scope and pricing

### Step 2: Customize Contract Terms

**Project Information:**
- Auto-filled from selected estimate (if available)
- Project description and scope
- Materials and labor breakdown
- Total project cost

**Payment Terms:**
- Deposit amount (percentage or fixed)
- Payment schedule milestones
- Accepted payment methods
- Late payment terms and fees

**Timeline:**
- Project start date
- Estimated completion date
- Milestone deadlines
- Weather delay provisions

**Legal Clauses:**
- Standard contractor terms
- Warranty information
- Liability limitations
- Change order procedures

### Step 3: Review and Generate

1. Review all contract details
2. Check client information accuracy
3. Verify pricing and terms
4. Click **"Generate Contract"**
5. System creates contract document

## Digital Signature Workflow

Mervin AI uses a **dual signature system**:

### How It Works

**1. Contractor Signs First:**
- You review the contract
- Click **"Sign as Contractor"**
- Enter your signature
- Contract marked as partially signed

**2. Send to Client:**
- System generates unique signing link
- Email sent to client automatically (where supported)
- Client receives secure access link
- Link includes contract preview

**3. Client Signs:**
- Client clicks email link
- Reviews complete contract
- Signs electronically
- Contract becomes fully executed

**4. Completed Contract:**
- Both parties receive signed PDF
- Contract stored in Firebase
- Status updated to "Completed"
- Downloadable by both parties

## Contract Status Tracking

Track your contracts in real-time:

**Status Types:**

**Draft**
- Contract created but not yet signed
- Can be edited or deleted
- Not sent to client yet

**Pending Contractor Signature**
- Waiting for you to sign
- Ready for your review and signature

**Pending Client Signature**
- You've signed, waiting for client
- Client has received signing link
- Tracking shows if client viewed

**Completed**
- Both parties have signed
- Fully executed contract
- PDF generated and stored
- Ready for download

**Cancelled**
- Contract voided before completion
- Retained for records
- Marked as inactive

## Contract Management

### View All Contracts

**Dashboard View:**
- See all contracts at a glance
- Filter by status (Draft, In Progress, Completed)
- Search by client name
- Sort by date or project

**Contract History:**
- View past contracts
- Download signed PDFs (where available)
- Check signature timestamps
- Review contract details

### Download Options

**Signed PDF:**
- Click download icon
- Get fully executed contract
- Includes both signatures
- Time-stamped for legal validity

## Firebase-Powered Features

Contracts are stored securely in Firebase:

**Real-Time Updates:**
- Status changes update instantly
- Signature notifications in real-time
- Multi-device synchronization

**Secure Storage:**
- Encrypted cloud storage
- Automatic backups
- Long-term retention
- GDPR compliant

**Access Control:**
- Only authorized parties can view
- Secure signing links expire
- Audit trail of all actions

## Legal Validity

**Digital Signatures:**
- Legally binding under E-Sign Act
- Court-admissible documentation
- Tamper-proof encryption
- Audit trail included

**Contract Storage:**
- Minimum 7-year retention
- Downloadable anytime
- Multiple backup locations

## Plan Limits

Contract generation varies by plan:

**Primo Chambeador (Free):**
- No contract generation included
- Upgrade to generate contracts

**Mero Patrón ($49.99/month):**
- 50 contracts per month
- Digital signatures included
- Firebase storage included

**Master Contractor ($99.99/month):**
- Unlimited contracts
- Unlimited storage
- Priority support

## Tips for Solid Contracts

✅ **Be Specific**: Detail every aspect of the work

✅ **Set Clear Milestones**: Break projects into payment phases

✅ **Define Materials**: Specify brands and quality levels

✅ **Include Timeline**: Set realistic completion dates

✅ **Get Both Signatures**: Never start work without full execution

✅ **Keep Records**: Download and save completed contracts

## Common Questions

**Q: Are digital signatures legally binding?**
A: Yes, under the E-Sign Act and UETA, digital signatures are legally valid.

**Q: Can I modify a contract after it's signed?**
A: No. Create a new contract or change order for modifications.

**Q: What if my client doesn't sign?**
A: Follow up with them. The contract remains in "Pending Client Signature" status.

**Q: Can I have multiple contracts with one client?**
A: Yes! Create separate contracts for each project.

**Q: How long are contracts stored?**
A: Indefinitely in Firebase, with minimum 7-year retention guaranteed.

---

Need help with contracts? [Contact support](/support/get-support)
    `
  },
  {
    id: '6',
    title: 'Property Ownership Verification',
    category: 'features',
    description: 'Verify property ownership before you quote',
    icon: FileText,
    relatedArticles: ['1', '5'],
    content: `
# Property Ownership Verification

Verify property ownership and check parcel information before submitting estimates or starting work.

## What is Property Verification?

**Due Diligence Tool:**
- Verify who owns a property
- Check legal owner of record
- View parcel information
- Access property details
- Review assessment data

**Why Verify:**
- Ensure you're dealing with the property owner
- Avoid working for non-owners
- Check property boundaries
- Access parcel numbers for permits
- Professional due diligence

## How to Verify a Property

### Step 1: Enter Address

1. Go to **"Property Verification"** in sidebar
2. Enter complete property address
3. Use autocomplete for accuracy
4. Verify address is correct

**Address Tips:**
- Include street number and name
- Add city and state
- ZIP code helps narrow results
- Use standard address format

### Step 2: Run Verification

1. Click **"Verify Property"** or **"Search"**
2. System searches public records
3. Wait for results (usually 5-15 seconds)
4. Review ownership information

**Data Sources:**
- County assessor records
- Public tax records
- GIS mapping databases
- Parcel information systems

### Step 3: Review Results

**Owner Information:**
- Legal owner name
- Mailing address
- Ownership type (individual, LLC, trust, etc.)
- Multiple owners (if applicable)

**Property Details:**
- Property address
- Parcel number (APN)
- Legal description
- Lot size
- Year built
- Property type

**Tax & Assessment:**
- Assessed value
- Last sale date
- Last sale price (where available)
- Current tax status

## Using Verification Data

### Before Estimates

**Verify Client is Owner:**
- Compare client name with owner of record
- Ask about ownership if different
- May be authorized representative
- Document authorization

### For Permits

**Parcel Information:**
- Use parcel number on permit applications
- Verify legal description
- Confirm property boundaries
- Check zoning information

### Property Details

**Parcel Information:**
- Use for permit applications
- Verify lot size for planning
- Check legal description accuracy
- Compare with client information

**Zoning:**
- Residential vs commercial
- Allowed uses
- Setback requirements
- Height restrictions

## Verification History

**Track All Verifications:**

1. Go to Property Verification
2. Click **"History"** tab
3. View all past verifications

**History Features:**
- Search by address
- Filter by date
- View saved results
- Re-download information
- Add notes and tags

**Useful For:**
- Repeat clients
- Project documentation
- Due diligence records
- Audit trail

## Plan Limits

Property verification usage varies by plan:

**Primo Chambeador (Free):**
- No property verifications included
- Upgrade to access feature

**Mero Patrón ($49.99/month):**
- 15 property verifications per month

**Master Contractor ($99.99/month):**
- Unlimited property verifications

## Best Practices

✅ **Verify Early**: Check property before estimating

✅ **Match Names**: Ensure owner matches your client

✅ **Save Results**: Keep verification records for each project

✅ **Check Boundaries**: Review property lines carefully

✅ **Note Discrepancies**: Document any red flags

✅ **Professional Survey**: Order survey for complex properties

## Limitations & Disclaimers

**Data Sources:**
- Public county records
- Assessor databases
- GIS mapping systems
- Mapbox location data

**Important Notes:**
- Data may be outdated
- Boundaries are approximate
- Not a substitute for professional survey
- Always verify critical information

**When to Get a Survey:**
- Property line disputes
- Complex boundary issues
- High-value projects
- New construction
- Legal requirements

## Common Questions

**Q: How accurate is the ownership information?**
A: We use public records, but data can be outdated. Always verify with client.

**Q: Are property boundaries exact?**
A: No, boundaries are approximate from GIS data. Get a professional survey for exact lines.

**Q: What if the owner doesn't match my client?**
A: Stop and verify with your client. They may be renting, or there's an error.

**Q: Can I use this for permit applications?**
A: The parcel number is useful, but verify all information with local authorities.

**Q: What if I can't find a property?**
A: Some addresses may not be in the database. Try alternate address formats or contact support.

## Integration with Workflows

**Use Verification For:**
- Pre-estimate due diligence
- Contract documentation
- Permit application preparation
- Client record keeping

---

Need to verify a property? [Start verification now](/property-verification)
    `
  },
  {
    id: '7',
    title: 'Understanding Plans & Pricing',
    category: 'billing',
    description: 'Compare plans and choose the right one for you',
    icon: CreditCard,
    relatedArticles: ['8', '9'],
    content: `
# Understanding Plans & Pricing

Mervin AI offers flexible plans to match your business needs, from solo contractors to established companies.

## Available Plans

### Free Trial - 14 Days

**Get started risk-free:**
- Duration: 14 days from signup
- No credit card required
- Access to core features
- Try before you commit

**What's Included:**
- Create estimates
- Test AI features
- Explore all tools
- Email support

**After Trial:**
- Automatically converts to Primo Chambeador (Free)
- Or upgrade to paid plan anytime
- No data loss

### Primo Chambeador - FREE Forever

**"Ningún trabajo es pequeño cuando tu espíritu es grande"**

**Perfect for:**
- Starting out in business
- Side projects
- Low-volume contractors
- Testing the platform

**Monthly Limits:**
- 5 basic estimates
- 1 AI-enhanced estimate
- No contract generation
- No property verification
- No permit advisor access

**Features:**
- Client database (unlimited clients)
- Cloud storage for estimates
- Basic support
- Web access on any device

**Cost:** FREE - No credit card required

### Mero Patrón - $49.99/month

**"Para contratistas profesionales"**

**Perfect for:**
- Growing contractors
- Regular project volume
- Professional operations
- Small to medium business

**Monthly Limits:**
- 50 basic estimates
- 20 AI-enhanced estimates
- 50 contracts with digital signatures
- 15 property verifications
- 10 permit advisor lookups

**Features:**
- Everything in Primo Chambeador, plus:
- Contract generation with e-signatures
- Property ownership verification
- Permit advisor and research
- Priority email support
- Advanced analytics

**Cost:** $49.99 per month (billed monthly)

**Annual Option:** $499.90/year (Save 17% - ~2 months free)

### Master Contractor - $99.99/month

**"Sin límites para profesionales"**

**Perfect for:**
- Established companies
- High project volume
- Teams and crews
- Professional contractors

**Monthly Limits:**
- ✨ **UNLIMITED** estimates (basic and AI)
- ✨ **UNLIMITED** contracts
- ✨ **UNLIMITED** property verifications
- ✨ **UNLIMITED** permit advisor
- ✨ **UNLIMITED** everything

**Features:**
- Everything in Mero Patrón, plus:
- Unlimited usage of all features
- Priority support
- Advanced analytics and reporting

**Cost:** $99.99 per month (billed monthly)

**Annual Option:** $999.90/year (Save 17% - ~2 months free)

## Feature Comparison

| Feature | Primo Chambeador | Mero Patrón | Master Contractor |
|---------|------------------|-------------|-------------------|
| **Price** | FREE | $49.99/mo | $99.99/mo |
| **Basic Estimates** | 5/month | 50/month | Unlimited |
| **AI Estimates** | 1/month | 20/month | Unlimited |
| **Contracts** | ❌ | 50/month | Unlimited |
| **Property Verification** | ❌ | 15/month | Unlimited |
| **Permit Advisor** | ❌ | 10/month | Unlimited |
| **Client Database** | ✅ Unlimited | ✅ Unlimited | ✅ Unlimited |
| **Cloud Storage** | ✅ | ✅ | ✅ |
| **Support** | Email | Priority Email | Priority Email |
| **Web Access** | ✅ | ✅ | ✅ |

## Choosing the Right Plan

### Choose Primo Chambeador if:
- You're just starting out
- Handle 1-5 jobs per month
- Want to try the platform
- Budget is tight
- Don't need contracts or advanced features

### Choose Mero Patrón if:
- Growing contractor business
- 10-50 jobs per month
- Need professional contracts
- Want property verification
- Permit research is important
- Professional image matters

### Choose Master Contractor if:
- Established contracting company
- 50+ jobs per month
- High volume of work
- Need unlimited everything
- Want priority support
- Growing team

## What Counts Towards Limits?

### Estimates

**Basic Estimates:**
- Each new estimate created
- Counts when you click "Create Estimate"
- Revisions/edits don't count as new

**AI Estimates:**
- Each use of "Enhance with AI" button
- Only counts when you use AI enhancement
- You can create basic estimates without AI

### Contracts
- Each contract generated
- Counts when contract is created
- Drafts don't count until finalized

### Property Verifications
- Each property address verified
- Counts when you click "Verify"
- Viewing history doesn't count

### Permit Advisor
- Each permit lookup performed
- Counts per project research
- Viewing saved research doesn't count

## Usage Tracking

**Monitor Your Usage:**

1. Go to Subscription or Dashboard
2. View current month usage
3. See remaining credits
4. Days until reset

**Notifications:**
- Email at 80% usage
- Warning at 90%
- Blocked at 100%
- Upgrade prompt shown

**Monthly Reset:**
- Limits reset on billing date
- Same day each month
- Unused credits don't roll over

## Billing & Payments

### Monthly Billing
- Charged on signup date each month
- Cancel anytime
- No long-term commitment
- Prorated if upgrading mid-month

### Annual Billing (Save ~17%)
- Pay once per year
- Approximately 2 months free
- Still cancel anytime
- Refund available (see policy)

**Annual Pricing:**
- Mero Patrón: $499.90/year (vs $599.88 monthly)
- Master Contractor: $999.90/year (vs $1,199.88 monthly)

## Upgrading & Downgrading

**Upgrade Anytime:**
- Instant access to new features
- Prorated billing for current month
- No data loss
- Previous records preserved

**Downgrade Anytime:**
- Takes effect at next billing cycle
- Keep features until renewal
- Data preserved
- Or immediate downgrade (prorated credit)

[Learn more about plan changes →](/support/help-center/article/9)

## What's Included in All Plans

✅ Client database (unlimited)
✅ Cloud storage
✅ Web access on any device
✅ Secure login
✅ Data encryption
✅ Regular updates
✅ GDPR compliance

## Free Features (Never Charged)

- Software updates
- Security patches
- New feature releases
- Bug fixes
- Data exports

## Enterprise & Custom Plans

**Need custom solutions?**
- Higher volume limits
- Custom integrations
- Dedicated support
- SLA guarantees
- Custom pricing

Contact: sales@mervinai.com

## Frequently Asked Questions

**Q: Can I change plans anytime?**
A: Yes! Upgrade or downgrade anytime with no penalties.

**Q: What happens if I hit my limit?**
A: You'll be prompted to upgrade. Or wait until next month's reset.

**Q: Do unused credits roll over?**
A: No, limits reset monthly on your billing date.

**Q: Is there a setup fee?**
A: No setup fees. Pay only for your monthly plan.

**Q: Can I cancel anytime?**
A: Yes, cancel anytime with no cancellation fees.

**Q: What payment methods do you accept?**
A: All major credit cards via Stripe.

---

Ready to get started? [Choose your plan](/subscription) or [Contact sales](/support/get-support)
    `
  },
  {
    id: '8',
    title: 'Managing Payment Methods',
    category: 'billing',
    description: 'Update your billing information securely',
    icon: CreditCard,
    relatedArticles: ['7', '9'],
    content: `
# Managing Payment Methods

Keep your billing information current to avoid service interruptions. All payment processing is handled securely through Stripe.

## Adding a Payment Method

### Step 1: Access Billing

1. Click on **Subscription** in the sidebar
2. Go to **"Payment Methods"** or **"Billing"** tab
3. Click **"Add Payment Method"**

### Step 2: Enter Card Information

**Credit/Debit Card:**
- Card number
- Expiration date (MM/YY)
- CVC security code
- Billing ZIP code
- Card holder name

**Accepted Cards:**
- Visa
- Mastercard
- American Express
- Discover
- Most debit cards

### Step 3: Save & Verify

1. Click **"Save Card"**
2. May require verification
3. Card becomes available for billing
4. Set as default if desired

## Setting Default Payment Method

**Your default card is charged automatically:**

1. View all payment methods
2. Find the card you want as default
3. Click **"Set as Default"** or menu icon
4. Confirmation message appears

**Default card used for:**
- Monthly subscription charges
- Upgrade charges
- Any additional fees

## Updating Card Information

**When your card expires or is replaced:**

**Option 1: Edit Existing**
1. Find payment method
2. Click **"Edit"** or menu icon
3. Update expiration date or details
4. Save changes

**Option 2: Add New Card**
1. Add new payment method
2. Set as default
3. Remove old card
4. Next charge uses new card

**Note:** If card number changed (not just expiration), add as new method.

## Removing Payment Methods

**Important:** Cannot remove the default payment method while subscription is active.

**To Remove:**
1. Set a different card as default (if active subscription)
2. Find method to remove
3. Click menu icon or **"Remove"**
4. Confirm deletion
5. Card removed from account

## Security & Privacy

### Stripe-Powered Security

**All payment processing through Stripe:**
- Industry-leading security
- PCI DSS Level 1 compliant
- 256-bit SSL encryption
- No card data stored on our servers

### What We See

**We never see:**
- Your full card number
- Your CVV code
- Complete card details

**We only see:**
- Last 4 digits
- Card brand (Visa, etc.)
- Expiration date
- Billing ZIP

### Fraud Prevention

**Automatic Protection:**
- Address verification (AVS)
- CVC verification
- 3D Secure support (if required)
- Suspicious activity monitoring

## Payment Failed - What to Do

**If a payment fails:**

### Immediate Actions

**Check These First:**
1. Card not expired
2. Sufficient funds available
3. Billing address matches card
4. Card not reported lost/stolen

### Grace Period

**3-Day Grace:**
- Service continues normally
- Daily automatic retry attempts
- Email notifications sent
- Resolve before grace ends

### After Grace Period

**If still not resolved:**
- Account limited to read-only
- Cannot create new estimates/contracts
- Existing data preserved
- 7 days to resolve before suspension

### How to Resolve

**Option 1: Update Card**
1. Add new payment method
2. Set as default
3. System retries automatically
4. Account restored immediately

**Option 2: Manual Retry**
1. Fix the issue with existing card
2. Click **"Retry Payment"** button
3. Immediate charge attempt
4. Account reactivated if successful

## Viewing Billing History

### Access Invoices

1. Subscription > **"Billing History"**
2. View all past charges
3. Download invoice PDFs (where available)
4. Email to accounting

**Invoice Details Include:**
- Invoice number
- Billing date
- Amount charged
- Plan details
- Payment method (last 4 digits)
- Tax breakdown

### Email Receipts

**Automatic receipts:**
- Sent within minutes of payment
- To your account email
- PDF attachment (where supported)
- Full payment details

**Missing receipt?**
1. Check spam/junk folder
2. Download from billing history
3. Contact support if needed

## Refund Policy

### 30-Day Money-Back Guarantee

**For new paid subscribers:**
- Full refund within 30 days
- No questions asked
- Email billing@mervinai.com
- Processed in 5-7 business days

### After 30 Days

**Monthly plans:**
- No refunds after 30-day window
- Cancel to avoid future charges
- Access until period end

**Annual plans:**
- Prorated refund may be available
- Based on unused months
- Contact support to request

### Requesting Refund

**Email:** billing@mervinai.com

**Include:**
- Account email address
- Reason (optional)
- Invoice number
- Preferred refund method

**Response:** Within 48 hours

## Tax Information

### Sales Tax

**Automatically calculated:**
- Based on billing address
- Rates update regularly
- Shown before charge
- Itemized on invoice

### International VAT/GST

**EU & other countries:**
- VAT collected where required
- GST in applicable countries
- Enter VAT number to exempt (if eligible)
- Shown on invoices

### Business Tax Documents

**Need a W-9 or tax info?**
- Email: accounting@mervinai.com
- Provided within 3 business days
- For expense reporting

## Alternative Payment Methods

### Currently Available
- Credit cards (Visa, MC, Amex, Discover)
- Debit cards
- Stripe payment processing

### Coming Soon
- PayPal
- ACH bank transfers (annual plans)
- Purchase orders (Enterprise)

## Common Questions

**Q: When will I be charged?**
A: On your billing date each month (or year for annual plans).

**Q: Can I change my billing date?**
A: Billing date is set at signup. Contact support for special requests.

**Q: What if my card is declined?**
A: Check with your bank, update card info, or try a different card.

**Q: Do you store my credit card?**
A: No, Stripe securely stores all payment information.

**Q: Can I get a refund?**
A: Yes, within 30 days of initial purchase. See refund policy above.

**Q: How do I download invoices?**
A: Go to Subscription > Billing History and download PDFs.

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

Your business needs change, and your subscription should too. Change plans anytime with no penalties.

## Upgrading Your Plan

### When to Upgrade

**Common Reasons:**
- Hit your monthly limits
- Need contract generation (upgrade from Free)
- Want property verification
- Need permit advisor access
- Growing project volume
- Want unlimited features

**You'll see prompts:**
- At 80% of your limit
- When attempting to exceed limit
- Dashboard notifications
- Email reminders

### How to Upgrade

#### Quick Upgrade (From Limit Prompt)

1. See upgrade prompt when limit reached
2. Click **"Upgrade Now"**
3. Select new plan (Mero Patrón or Master Contractor)
4. Enter payment method if needed
5. Confirm upgrade
6. Instant access to new limits

#### Manual Upgrade (Anytime)

1. Go to **Subscription** page
2. Click **"View Plans"** or **"Upgrade"**
3. Compare plan features
4. Select higher tier
5. Review prorated charge
6. Confirm upgrade

### Prorated Billing Explained

**Mid-month upgrades are prorated:**

**Example:**
- Currently: Primo Chambeador (Free)
- Upgrading to: Mero Patrón ($49.99/month)
- 15 days into month (50% through billing cycle)
- Today's charge: ~$25 (50% of $49.99)
- Next month: Full $49.99

**How it works:**
- Credit for unused time on old plan (if paid)
- Charge for remaining time on new plan
- Fair pricing for mid-cycle changes
- New limits effective immediately

### Immediate Benefits

**After upgrading:**
- ✅ Instant access to new features
- ✅ Limits increase right away
- ✅ New monthly allowances reset
- ✅ All data preserved
- ✅ Enhanced support tier

**What resets immediately:**
- Estimate limits (basic and AI)
- Contract generation availability
- Property verification credits
- Permit advisor lookups

## Downgrading Your Plan

### When to Downgrade

**Common Reasons:**
- Lower project volume
- Budget constraints
- Seasonal slowdown
- Don't need all features
- Testing lower tier

**Consider First:**
- Will you lose needed features?
- Are your current usage levels sustainable on lower tier?
- Seasonal fluctuations?
- Annual plans save more

### How to Downgrade

1. Go to **Subscription** page
2. Click **"Change Plan"**
3. Select lower tier
4. Review features you'll lose
5. Choose timing
6. Confirm downgrade

### Downgrade Timing Options

**Option 1: At Renewal (Recommended)**
- Keep current features until billing date
- No immediate changes
- No refund (you paid for full period)
- Automatic switch on renewal
- Smoother transition

**Option 2: Immediate Downgrade**
- Takes effect right away
- Lose premium features immediately
- Prorated credit to account
- Use credit on next billing
- Use if you won't need features

### What Happens to Your Data?

**All data is preserved:**

**Estimates & Contracts:**
- All historical documents saved
- View and download anytime
- Can't create new if over new limit
- Wait for monthly reset or upgrade again

**Clients:**
- Client database always unlimited
- No data loss
- All client information remains

**Saved Verifications:**
- Past property verifications remain accessible
- Permit research history saved
- Can view but not create new (if over limit)

### Feature Loss by Downgrade

**Master Contractor → Mero Patrón:**
- ❌ Unlimited usage (now limited to monthly caps)
- ✅ Keep: Contracts, verifications, permits (within limits)

**Mero Patrón → Primo Chambeador:**
- ❌ Contract generation
- ❌ Property verification
- ❌ Permit advisor
- ✅ Keep: Basic estimates (5/month), AI estimates (1/month)

## Plan Change FAQs

**Q: Can I change my mind after downgrading?**
A: Yes! Upgrade back anytime. Your data is still there.

**Q: Will I lose my data when I downgrade?**
A: No. All historical data is preserved. You just can't create new items if over the new limit.

**Q: Can I upgrade mid-month?**
A: Yes! You'll be charged a prorated amount and get instant access.

**Q: What if I downgrade by accident?**
A: Contact support within 24 hours for assistance.

**Q: What happens to my usage limits when I upgrade?**
A: They reset immediately to your new plan's limits.

## Getting Help with Plan Changes

**Not sure which plan is right?**

**Options:**
- Chat with Mervin AI assistant
- Email: sales@mervinai.com
- Support ticket
- Review comparison chart

**Billing questions?**
- Email: billing@mervinai.com
- Support ticket

**Response times:**
- Paid plans: 4-hour response
- Free plans: 24-hour response
- Urgent issues: Mark as urgent

---

Ready to change plans? [Manage your subscription](/subscription)
    `
  },
  {
    id: '10',
    title: 'Getting Support',
    category: 'troubleshooting',
    description: 'How to get help when you need it',
    icon: FileText,
    relatedArticles: ['11', '3'],
    content: `
# Getting Support

Need help with Mervin AI? Here's how to get assistance.

## Available Support Channels

### Help Center
- Browse articles
- Search for solutions
- Step-by-step guides
- FAQs and tips

### Email Support
**Email:** support@mervinai.com

**What to include:**
- Your account email
- Description of issue
- Screenshots (if applicable)
- Browser/device information
- Steps you've already tried

**Response times:**
- Free plan: Within 24-48 hours
- Paid plans: Within 4-8 hours
- Urgent issues: Mark as priority

### Mervin AI Chat
- Click the logo on home screen
- Ask questions about features
- Get construction advice
- Research building codes

## Common Support Topics

### Technical Issues
- Can't access account
- Feature not working
- Error messages
- Performance problems

### Billing Questions
- Payment problems
- Plan changes
- Invoices
- Refund requests

### Feature Questions
- How to use a feature
- Feature availability
- Plan limitations
- Best practices

## Self-Service Resources

**Help Center:**
- Comprehensive articles
- Video tutorials (coming soon)
- Best practices
- Tips and tricks

**Account Dashboard:**
- Usage tracking
- Billing history
- Plan information
- Settings

## Response Time Expectations

**Free Plan (Primo Chambeador):**
- Email: 24-48 hours
- Standard priority

**Paid Plans (Mero Patrón & Master Contractor):**
- Email: 4-8 hours
- Priority support
- Faster resolution

## Tips for Faster Support

✅ **Be Specific**: Describe the exact problem

✅ **Include Screenshots**: Visual aids help us understand

✅ **List Steps**: Tell us what you've already tried

✅ **Provide Context**: Browser, device, when it started

✅ **Account Email**: Always include your login email

---

Need help now? [Contact support](/support/get-support)
    `
  },
  {
    id: '11',
    title: 'Login & Authentication Problems',
    category: 'troubleshooting',
    description: 'Get back into your account',
    icon: Settings,
    relatedArticles: ['10', '3'],
    content: `
# Login & Authentication Problems

Can't access your account? Here's how to resolve common login issues and regain access.

## Common Login Issues

### "Invalid Email or Password"

**Most common causes:**
- Typo in email or password
- Caps Lock enabled
- Copy-paste added spaces
- Wrong account/email

**Solutions:**

**1. Check Email Format:**
- Ensure complete email (@domain.com)
- No spaces before or after
- Correct domain spelling
- Try alternate emails you use

**2. Check Password:**
- Turn off Caps Lock
- Type manually (don't copy-paste)
- Check for extra spaces
- Try password manager if you use one

**3. Reset Password:**
1. Click **"Forgot Password?"**
2. Enter your email address
3. Check inbox for reset link
4. Check spam folder if not received
5. Link valid for 1 hour
6. Create new password

### "Account Not Found"

**Possible reasons:**
- Email typo
- Used different email for signup
- Account never created
- Account deleted

**Solutions:**

**1. Try Other Email Addresses:**
- Personal vs work email
- Old email addresses
- Email aliases
- Common typo variations

**2. Check Registration:**
- Search email for "Mervin AI"
- Look for welcome email
- Verify signup was completed

**3. Create New Account:**
- If never registered before
- Click **"Sign Up"**
- Use correct email
- Set strong password

### Email Verification Required

**First login needs verification:**

**Steps:**
1. Check inbox for verification email
2. Look for email from noreply@mervinai.com
3. Click **"Verify Email"** link
4. If expired, request new one
5. Check spam/junk folder

**Didn't receive email?**

1. Check spam/junk/promotions
2. Verify email spelled correctly
3. Click **"Resend Verification"**
4. Wait 5-10 minutes
5. Add noreply@mervinai.com to contacts
6. Try different email if continues

## Password Reset Issues

### Not Receiving Reset Email

**Check these:**
- ✅ Spam/Junk folder
- ✅ Promotions tab (Gmail)
- ✅ Email typed correctly
- ✅ Email provider not blocking
- ✅ Inbox not full

**Try again:**
1. Wait 5 minutes between requests
2. Check all email folders
3. Try different browser
4. Add mervinai.com to safe senders
5. Contact support if still no email

### Reset Link Expired

**Password reset links expire after 1 hour**

**Solution:**
1. Request new reset link
2. Check email immediately
3. Complete reset within 60 minutes
4. Don't close the page

### Reset Link Not Working

**Issues:**
- Link wrapped/broken in email
- Extra characters added
- Already used
- Expired

**Fix:**
1. Copy entire URL carefully
2. Paste directly in browser address bar
3. Or request fresh reset link
4. Use desktop browser if on mobile

## Session Expired

**"Please login again" message**

**Why it happens:**
- Inactive for extended period
- Security timeout
- Password changed
- Logged out from another device

**Normal behavior:**
- Sessions expire for security
- Timeout after inactivity
- Required after password change

**Solution:**
- Simply log back in
- Enable "Remember Me" for longer sessions
- Use password manager for quick access

## Account Suspended

**Reasons:**
- Payment failed
- Terms of Service violation
- Fraudulent activity
- Chargeback issued

**To resolve:**
1. Check email for suspension notice
2. Reason stated in notification
3. Follow instructions provided
4. Contact support immediately

**Payment-related:**
- Update payment method
- Resolve failed payment
- Account auto-reactivates

## Browser Issues

### Cookies Disabled

**Error:** "Please enable cookies to login"

**Enable cookies:**

**Chrome:**
1. Settings > Privacy and Security
2. Cookies and site data
3. "Allow all cookies" or
4. Add mervinai.com to allowed

**Firefox:**
1. Settings > Privacy & Security
2. Cookies and Site Data
3. Standard or Custom protection
4. Don't block cookies from mervinai.com

**Safari:**
1. Preferences > Privacy
2. Uncheck "Block all cookies"
3. Or allow for mervinai.com

### JavaScript Disabled

**Enable JavaScript:**

**All browsers:**
1. Settings > Privacy/Security
2. Site Settings > JavaScript
3. Enable "Allowed" or "Recommended"
4. Refresh page

### Incognito/Private Mode

**Sessions don't persist**

**Solution:**
- Use regular browser window
- Or log in each private session
- Enable "Remember Me"

## Getting Help

### Contact Support

**Email:** support@mervinai.com

**Include:**
- Account email address
- Description of problem
- Error messages (screenshots)
- Browser/device info
- Steps already tried

**Response times:**
- Critical login issues: 2-4 hours
- Standard: 24 hours
- Free tier: 48 hours

---

Need immediate help? [Open support ticket](/support/get-support) - Mark as "Urgent" for login issues
    `
  },
  {
    id: '12',
    title: 'Troubleshooting Common Issues',
    category: 'troubleshooting',
    description: 'Solutions to frequently encountered problems',
    icon: MessageSquare,
    relatedArticles: ['10', '11'],
    content: `
# Troubleshooting Common Issues

Common problems and their solutions to help you get back to work quickly.

## Browser Issues

### Page Won't Load

**Quick Fixes:**
1. Refresh the page (F5 or Cmd/Ctrl + R)
2. Clear browser cache
3. Try different browser
4. Check internet connection
5. Restart browser

### Features Not Working

**Common causes:**
- JavaScript disabled
- Cookies blocked
- Browser extensions interfering
- Outdated browser

**Solutions:**
1. Enable JavaScript
2. Allow cookies for mervinai.com
3. Try incognito/private mode
4. Update browser to latest version
5. Disable extensions temporarily

### Slow Performance

**Improve speed:**
- Close unnecessary tabs
- Clear browser cache
- Check internet speed
- Restart browser
- Use supported browser (Chrome, Firefox, Safari)

## Account Issues

### Can't Login

See our dedicated article: [Login & Authentication Problems](/support/help-center/article/11)

**Quick checks:**
- Email and password correct
- Caps Lock off
- Cookies enabled
- Account verified

### Session Keeps Expiring

**Normal behavior:**
- Sessions timeout after inactivity
- Security feature

**Solutions:**
- Enable "Remember Me" at login
- Stay active in the application
- Use password manager

## Feature Usage Issues

### Hit Monthly Limit

**What happens:**
- Cannot create more items until reset
- Upgrade prompt appears
- All existing data remains accessible

**Solutions:**
1. Wait for monthly reset (on billing date)
2. Upgrade to higher plan
3. View existing data without creating new

### Feature Not Available

**Check:**
- Your current plan includes the feature
- Monthly limit not exceeded
- Feature is fully launched (not coming soon)

**Solutions:**
- Upgrade plan if needed
- Wait for monthly reset
- Contact support for clarification

## Data Issues

### Missing Data

**Check:**
- You're logged into correct account
- Data exists in this environment
- Filters or search applied
- Correct date range selected

**Solutions:**
- Remove filters
- Search by different criteria
- Check other sections/pages
- Contact support if data truly missing

### Can't Save Changes

**Common causes:**
- Required fields empty
- Invalid data format
- Connection interrupted
- Session expired

**Solutions:**
1. Fill all required fields
2. Check data format (dates, emails, etc.)
3. Refresh connection
4. Log in again
5. Try saving again

## Connection Issues

### "Network Error" Messages

**Check:**
1. Internet connection active
2. Firewall not blocking mervinai.com
3. VPN not interfering
4. No network maintenance

**Solutions:**
- Refresh the page
- Check other websites
- Restart router
- Try different network
- Contact support if persists

### Intermittent Connectivity

**Causes:**
- Unstable internet
- Network congestion
- ISP issues

**Solutions:**
- Use wired connection if possible
- Close bandwidth-heavy applications
- Contact ISP if consistent problem

## Getting Help

### When to Contact Support

**Contact support if:**
- Problem persists after troubleshooting
- Error messages appear repeatedly
- Data is missing or incorrect
- Account is suspended
- Billing issues

### How to Contact

**Email:** support@mervinai.com

**Include:**
- Detailed description
- Screenshots of errors
- Steps to reproduce
- Browser and OS info
- Your account email

**Response times:**
- Paid plans: 4-8 hours
- Free plans: 24-48 hours
- Urgent issues: Mark as priority

## Prevention Tips

✅ **Keep browser updated**: Latest version prevents many issues

✅ **Stable internet**: Strong connection reduces errors

✅ **Allow cookies**: Required for proper functionality

✅ **Enable JavaScript**: Essential for all features

✅ **Regular backups**: Keep your own copies of important data

---

Still having issues? [Contact support](/support/get-support) - We're here to help!
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
  }
];

export function getArticleById(id: string): HelpArticle | undefined {
  return helpArticles.find(article => article.id === id);
}

export function getRelatedArticles(articleId: string): HelpArticle[] {
  const article = getArticleById(articleId);
  if (!article || !article.relatedArticles) {
    return [];
  }
  
  return article.relatedArticles
    .map(id => getArticleById(id))
    .filter((a): a is HelpArticle => a !== undefined);
}
