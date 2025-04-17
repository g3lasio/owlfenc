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
            These Terms of Service ("Terms") govern your access to and use of Owl Fence Company's website, services, 
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
            as well as the compilation thereof, and any software used in our Services, is the property of Owl Fence 
            Company or its suppliers and protected by copyright and other laws.
          </p>
          
          <h2 className="text-xl font-semibold mb-4 mt-6">Limitation of Liability</h2>
          <p className="mb-4">
            In no event shall Owl Fence Company be liable for any indirect, incidental, special, consequential or 
            punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible 
            losses, resulting from your access to or use of or inability to access or use the Services.
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