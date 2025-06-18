import React from 'react';
import { Link } from 'wouter';

export default function PrivacyPolicy() {
  return (
    <div className="w-full h-full overflow-y-auto bg-background">
      <div className="container mx-auto max-w-4xl py-8 px-6">
        <div className="bg-card rounded-lg p-8 shadow-md">
          <h1 className="text-3xl font-bold mb-6 text-center text-primary">Privacy Policy</h1>
          
          <div className="prose prose-invert max-w-none space-y-6">
            <div className="text-center mb-8">
              <p className="text-lg text-muted-foreground">
                Effective Date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">1. Introduction</h2>
              <p className="mb-4 leading-relaxed">
                Welcome to Owl Fence ("we," "our," or "us"). This Privacy Policy explains how we collect, use, disclose, 
                and safeguard your information when you visit our website and use our AI-powered fence contractor services. 
                Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, 
                please do not access the site.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">2. Information We Collect</h2>
              <h3 className="text-lg font-medium mb-3">Personal Data</h3>
              <p className="mb-4 leading-relaxed">
                We may collect personally identifiable information, such as your name, shipping address, email address, 
                telephone number, and demographic information when you create an account, use our services, or communicate with us.
              </p>
              
              <h3 className="text-lg font-medium mb-3">Project Information</h3>
              <p className="mb-4 leading-relaxed">
                When using our fence estimation and contract services, we collect project details including property addresses, 
                fence specifications, measurements, materials preferences, and project requirements.
              </p>

              <h3 className="text-lg font-medium mb-3">Usage Data</h3>
              <p className="mb-4 leading-relaxed">
                We automatically collect certain information when you visit, use, or navigate the site. This information does not 
                reveal your specific identity but may include device and usage information, such as your IP address, browser 
                and device characteristics, operating system, language preferences, referring URLs, device name, country, 
                location, and information about how and when you use our services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">3. How We Use Your Information</h2>
              <p className="mb-4 leading-relaxed">We use the information we collect or receive to:</p>
              <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
                <li>Provide, operate, and maintain our AI-powered fence estimation services</li>
                <li>Generate accurate fence estimates and professional contracts</li>
                <li>Improve, personalize, and expand our services</li>
                <li>Understand and analyze how you use our website and services</li>
                <li>Develop new products, services, features, and functionality</li>
                <li>Communicate with you for customer service, updates, and marketing purposes</li>
                <li>Process your transactions and manage your orders</li>
                <li>Find and prevent fraud and abuse</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">4. Information Sharing and Disclosure</h2>
              <p className="mb-4 leading-relaxed">
                We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, 
                except as described in this Privacy Policy. We may share your information with:
              </p>
              <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
                <li><strong>Service Providers:</strong> Third-party vendors who assist us in operating our website and conducting our business</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights, property, or safety</li>
                <li><strong>Business Transfers:</strong> In connection with any merger, sale of assets, or acquisition</li>
                <li><strong>With Your Consent:</strong> When you explicitly agree to share your information</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">5. Data Security</h2>
              <p className="mb-4 leading-relaxed">
                We implement appropriate security measures to protect your personal information against unauthorized access, 
                alteration, disclosure, or destruction. These measures include encryption, secure servers, and access controls. 
                However, no method of transmission over the internet or electronic storage is 100% secure, and we cannot 
                guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">6. Cookies and Tracking Technologies</h2>
              <p className="mb-4 leading-relaxed">
                We use cookies and similar tracking technologies to collect information about your interactions with our 
                services. Cookies help us improve your experience, enhance security, analyze usage patterns, and provide 
                personalized content. You can control cookies through your browser settings, but disabling cookies may 
                affect the functionality of our services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">7. Your Privacy Rights</h2>
              <p className="mb-4 leading-relaxed">Depending on your location, you may have the following rights:</p>
              <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
                <li><strong>Access:</strong> Request copies of your personal information</li>
                <li><strong>Rectification:</strong> Request correction of inaccurate or incomplete information</li>
                <li><strong>Erasure:</strong> Request deletion of your personal information</li>
                <li><strong>Portability:</strong> Request transfer of your information to another service</li>
                <li><strong>Restriction:</strong> Request limitation of processing your information</li>
                <li><strong>Objection:</strong> Object to our processing of your information</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">8. Data Retention</h2>
              <p className="mb-4 leading-relaxed">
                We retain your personal information only for as long as necessary to fulfill the purposes outlined in this 
                Privacy Policy, unless a longer retention period is required or permitted by law. Project data and estimates 
                are typically retained for business and legal compliance purposes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">9. International Data Transfers</h2>
              <p className="mb-4 leading-relaxed">
                Your information may be transferred to and processed in countries other than your own. We ensure that such 
                transfers comply with applicable data protection laws and implement appropriate safeguards to protect your information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">10. Children's Privacy</h2>
              <p className="mb-4 leading-relaxed">
                Our services are not intended for individuals under the age of 18. We do not knowingly collect personal 
                information from children under 18. If we become aware that we have inadvertently received personal 
                information from a child under 18, we will delete such information from our records.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">11. Changes to This Privacy Policy</h2>
              <p className="mb-4 leading-relaxed">
                We may update this Privacy Policy from time to time to reflect changes in our practices or for other 
                operational, legal, or regulatory reasons. We will notify you of any material changes by posting the 
                new Privacy Policy on this page and updating the effective date. Your continued use of our services 
                after any changes constitutes acceptance of the updated Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-primary">12. Contact Information</h2>
              <p className="mb-4 leading-relaxed">
                If you have any questions, concerns, or requests regarding this Privacy Policy or our privacy practices, 
                please contact us at:
              </p>
              <div className="bg-muted/50 p-4 rounded-lg mb-4">
                <p><strong>Email:</strong> privacy@owlfenc.com</p>
                <p><strong>Address:</strong> Owl Fence Privacy Department</p>
                <p className="text-sm text-muted-foreground mt-2">
                  We will respond to your inquiry within 30 days.
                </p>
              </div>
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