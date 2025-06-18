import React from 'react';
import { Link } from 'wouter';

export default function LegalPolicy() {
  return (
    <div className="w-full h-full overflow-y-auto bg-background">
      <div className="container mx-auto max-w-4xl py-8 px-6">
        <div className="bg-card rounded-lg p-8 shadow-md">
          <h1 className="text-3xl font-bold mb-6 text-center text-primary">Terms of Service</h1>
          
          <div className="prose prose-invert max-w-none space-y-6">
            <div className="text-center mb-8">
              <p className="text-lg text-muted-foreground">
                Effective Date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">1. Acceptance of Terms</h2>
              <p className="mb-4 leading-relaxed">
                By accessing and using Owl Fence's website, AI-powered estimation tools, and related services (collectively, 
                the "Services"), you accept and agree to be bound by the terms and provision of this agreement. These Terms 
                of Service ("Terms") constitute a legally binding agreement between you and Owl Fence Company ("we," "us," or "our").
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">2. Description of Services</h2>
              <p className="mb-4 leading-relaxed">
                Owl Fence provides AI-powered fence estimation and contracting services, including but not limited to:
              </p>
              <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
                <li>Automated fence estimation and project planning</li>
                <li>AI-powered contract generation and management</li>
                <li>Property verification and measurement tools</li>
                <li>Material cost calculation and supplier recommendations</li>
                <li>Project management and client communication tools</li>
                <li>Mobile-responsive estimate approval workflows</li>
                <li>Professional document generation and PDF services</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">3. User Eligibility and Account Registration</h2>
              <h3 className="text-lg font-medium mb-3">Eligibility</h3>
              <p className="mb-4 leading-relaxed">
                Our Services are intended for licensed contractors, construction professionals, and related businesses. 
                You must be at least 18 years of age and have the legal authority to enter into this agreement.
              </p>
              
              <h3 className="text-lg font-medium mb-3">Account Security</h3>
              <p className="mb-4 leading-relaxed">
                You are responsible for maintaining the confidentiality of your account credentials and for all activities 
                that occur under your account. You must immediately notify us of any unauthorized use of your account.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">4. Acceptable Use Policy</h2>
              <h3 className="text-lg font-medium mb-3">Permitted Uses</h3>
              <p className="mb-4 leading-relaxed">
                You may use our Services solely for legitimate business purposes related to fence contracting, 
                estimation, and project management in compliance with all applicable laws and regulations.
              </p>
              
              <h3 className="text-lg font-medium mb-3">Prohibited Uses</h3>
              <p className="mb-4 leading-relaxed">You agree not to use our Services to:</p>
              <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
                <li>Engage in any unlawful purpose or activity</li>
                <li>Violate any local, state, national, or international law</li>
                <li>Transmit, or procure the sending of, any advertising or promotional material</li>
                <li>Impersonate or attempt to impersonate the company, employees, or other users</li>
                <li>Use the service in any manner that could disable, overburden, damage, or impair the site</li>
                <li>Attempt to gain unauthorized access to the service, server, or database</li>
                <li>Use automated systems to access the service without authorization</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">5. Intellectual Property Rights</h2>
              <h3 className="text-lg font-medium mb-3">Our Intellectual Property</h3>
              <p className="mb-4 leading-relaxed">
                The Services and their original content, features, and functionality are and will remain the exclusive 
                property of Owl Fence Company and its licensors. The Services are protected by copyright, trademark, 
                and other laws.
              </p>
              
              <h3 className="text-lg font-medium mb-3">Your Content</h3>
              <p className="mb-4 leading-relaxed">
                You retain ownership of any content you submit to our Services. By submitting content, you grant us 
                a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, and display such content 
                in connection with providing the Services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">6. Payment Terms and Billing</h2>
              <h3 className="text-lg font-medium mb-3">Subscription Fees</h3>
              <p className="mb-4 leading-relaxed">
                Certain features of our Services may require payment of fees. All fees are non-refundable unless 
                otherwise specified. Subscription fees are charged in advance on a recurring basis.
              </p>
              
              <h3 className="text-lg font-medium mb-3">Payment Processing</h3>
              <p className="mb-4 leading-relaxed">
                Payments are processed through secure third-party payment processors. You authorize us to charge 
                your designated payment method for all fees incurred in connection with your account.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">7. Service Availability and Modifications</h2>
              <p className="mb-4 leading-relaxed">
                We strive to maintain high availability of our Services but cannot guarantee uninterrupted access. 
                We reserve the right to modify, suspend, or discontinue any part of the Services at any time with 
                reasonable notice to users.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">8. Data Accuracy and Professional Responsibility</h2>
              <p className="mb-4 leading-relaxed">
                While our AI-powered tools provide estimates and recommendations, you remain solely responsible for:
              </p>
              <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
                <li>Verifying the accuracy of all estimates and measurements</li>
                <li>Ensuring compliance with local building codes and regulations</li>
                <li>Obtaining necessary permits and licenses</li>
                <li>Final project planning and execution</li>
                <li>Client relationships and contract fulfillment</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">9. Limitation of Liability</h2>
              <p className="mb-4 leading-relaxed">
                To the fullest extent permitted by applicable law, Owl Fence Company shall not be liable for any 
                indirect, incidental, special, consequential, or punitive damages, including without limitation, 
                loss of profits, data, use, goodwill, or other intangible losses.
              </p>
              
              <p className="mb-4 leading-relaxed">
                Our total liability to you for all claims arising out of or relating to the use of the Services 
                shall not exceed the amount you have paid us in the twelve (12) months preceding the claim.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">10. Indemnification</h2>
              <p className="mb-4 leading-relaxed">
                You agree to defend, indemnify, and hold harmless Owl Fence Company and its affiliates, officers, 
                directors, employees, and agents from and against any claims, damages, obligations, losses, 
                liabilities, costs, or debt arising from your use of the Services or violation of these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">11. Termination</h2>
              <h3 className="text-lg font-medium mb-3">Termination by You</h3>
              <p className="mb-4 leading-relaxed">
                You may terminate your account at any time by following the account closure process in your 
                account settings or by contacting our support team.
              </p>
              
              <h3 className="text-lg font-medium mb-3">Termination by Us</h3>
              <p className="mb-4 leading-relaxed">
                We may terminate or suspend your account immediately, without prior notice, for conduct that 
                we believe violates these Terms or is harmful to other users, us, or third parties.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">12. Dispute Resolution</h2>
              <h3 className="text-lg font-medium mb-3">Governing Law</h3>
              <p className="mb-4 leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of the jurisdiction 
                where Owl Fence Company is registered, without regard to conflict of law principles.
              </p>
              
              <h3 className="text-lg font-medium mb-3">Arbitration</h3>
              <p className="mb-4 leading-relaxed">
                Any dispute arising out of or relating to these Terms or the Services shall be resolved through 
                binding arbitration in accordance with the rules of the American Arbitration Association.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">13. Changes to Terms</h2>
              <p className="mb-4 leading-relaxed">
                We reserve the right to modify these Terms at any time. We will notify users of any material 
                changes by posting the new Terms on this page and updating the effective date. Continued use 
                of the Services after any changes constitutes acceptance of the modified Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">14. Severability</h2>
              <p className="mb-4 leading-relaxed">
                If any provision of these Terms is held to be invalid or unenforceable by a court, the remaining 
                provisions will continue to be valid and enforceable.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">15. Contact Information</h2>
              <p className="mb-4 leading-relaxed">
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <div className="bg-muted/50 p-4 rounded-lg mb-4">
                <p><strong>Email:</strong> legal@owlfenc.com</p>
                <p><strong>Address:</strong> Owl Fence Legal Department</p>
                <p className="text-sm text-muted-foreground mt-2">
                  We will respond to your inquiry within 30 days.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">16. Entire Agreement</h2>
              <p className="mb-4 leading-relaxed">
                These Terms of Service, together with our Privacy Policy, constitute the sole and entire agreement 
                between you and Owl Fence Company regarding the Services and supersede all prior and contemporaneous 
                understandings, agreements, representations, and warranties.
              </p>
            </section>
          </div>
          
          <div className="mt-8 text-center">
            <Link to="/" className="text-primary hover:underline">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}