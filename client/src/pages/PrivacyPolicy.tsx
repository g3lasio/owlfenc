import React from 'react';
import { Link } from 'wouter';

export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="bg-card rounded-lg p-8 shadow-md">
        <h1 className="text-3xl font-bold mb-6 text-center text-primary">Privacy Policy</h1>
        
        <div className="prose prose-invert max-w-none">
          <h2 className="text-xl font-semibold mb-4">Information We Collect</h2>
          <p className="mb-4">
            We collect information you provide directly to us when you create an account, use our Services, 
            or communicate with us. This information may include your name, email address, phone number, 
            company information, and any other information you choose to provide.
          </p>
          
          <h2 className="text-xl font-semibold mb-4 mt-6">How We Use Your Information</h2>
          <p className="mb-4">
            We use the information we collect to provide, maintain, and improve our Services, communicate 
            with you, and customize your experience with our Services. We may use your information to send 
            you technical notices, updates, security alerts, and support and administrative messages.
          </p>
          
          <h2 className="text-xl font-semibold mb-4 mt-6">Cookies and Similar Technologies</h2>
          <p className="mb-4">
            We use cookies and similar technologies to collect information about your interactions with our 
            Services and to help us improve your experience, enhance security, and analyze usage patterns.
          </p>
          
          <h2 className="text-xl font-semibold mb-4 mt-6">Your Choices</h2>
          <p className="mb-4">
            You can choose not to provide certain information, but this may limit your ability to use some 
            features of our Services. You can also update or correct your account information at any time.
          </p>
          
          <h2 className="text-xl font-semibold mb-4 mt-6">Contact Us</h2>
          <p className="mb-4">
            If you have any questions about this Privacy Policy, please contact us at privacy@owlfenc.com.
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