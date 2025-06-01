import React from 'react';
import { Link } from 'wouter';

export default function LegalPolicy() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="bg-card rounded-lg p-8 shadow-md">
        <h1 className="text-3xl font-bold mb-6 text-center text-primary">Legal Policy</h1>
        
        <div className="prose prose-invert max-w-none">
          <h2 className="text-xl font-semibold mb-4">Terms of Service</h2>
          <p className="mb-4">
            These Terms of Service ("Terms") govern your access to and use of Owl Fenc Company's website, services, 
            and applications (the "Services"). By accessing or using our Services, you agree to be bound by these Terms.
          </p>
          
          <h2 className="text-xl font-semibold mb-4 mt-6">Use of Services</h2>
          <p className="mb-4">
            Our Services are intended for fence contractors and related professionals. You may use our Services only 
            as permitted by these Terms and any applicable laws or regulations.
          </p>
          
          <h2 className="text-xl font-semibold mb-4 mt-6">Intellectual Property</h2>
          <p className="mb-4">
            All content included in or made available through our Services, such as text, graphics, logos, images, 
            as well as the compilation thereof, and any software used in our Services, is the property of Owl Fenc 
            Company or its suppliers and protected by copyright and other laws.
          </p>
          
          <h2 className="text-xl font-semibold mb-4 mt-6">User Responsibilities</h2>
          <p className="mb-4">
            You are responsible for maintaining the confidentiality of your account credentials and for all activities 
            that occur under your account. You agree to provide accurate and complete information when using our Services 
            and to keep this information updated.
          </p>
          
          <h2 className="text-xl font-semibold mb-4 mt-6">Prohibited Uses</h2>
          <p className="mb-4">
            You may not use our Services for any unlawful purpose or to solicit others to perform illegal acts. 
            You agree not to interfere with or disrupt the Services or servers or networks connected to the Services.
          </p>
          
          <h2 className="text-xl font-semibold mb-4 mt-6">Service Availability</h2>
          <p className="mb-4">
            We strive to maintain high availability of our Services, but we do not guarantee uninterrupted access. 
            We reserve the right to modify, suspend, or discontinue any aspect of the Services at any time.
          </p>
          
          <h2 className="text-xl font-semibold mb-4 mt-6">Limitation of Liability</h2>
          <p className="mb-4">
            In no event shall Owl Fenc Company be liable for any indirect, incidental, special, consequential or 
            punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible 
            losses, resulting from your access to or use of or inability to access or use the Services.
          </p>
          
          <h2 className="text-xl font-semibold mb-4 mt-6">Governing Law</h2>
          <p className="mb-4">
            These Terms shall be governed by and construed in accordance with the laws of the jurisdiction where 
            Owl Fenc Company is registered, without regard to conflict of law principles.
          </p>
          
          <h2 className="text-xl font-semibold mb-4 mt-6">Changes to Terms</h2>
          <p className="mb-4">
            We reserve the right to modify these Terms at any time. We will notify users of any material changes 
            and continued use of the Services constitutes acceptance of the modified Terms.
          </p>
          
          <p className="text-sm text-muted-foreground mt-6">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        
        <div className="mt-8 text-center">
          <Link to="/" className="text-primary hover:underline">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}