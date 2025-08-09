import React from 'react';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-white/10 backdrop-blur-md rounded-lg border border-cyan-500/30 p-8">
          <h1 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Privacy Policy
          </h1>
          
          <div className="prose prose-invert max-w-none">
            <p className="text-gray-300 mb-6">
              <strong>Effective Date:</strong> August 9, 2025
            </p>

            <h2 className="text-2xl font-semibold text-cyan-400 mb-4">1. Information We Collect</h2>
            <p className="text-gray-300 mb-4">
              We collect information you provide directly to us, such as when you create an account, 
              use our services, or contact us for support. This may include your name, email address, 
              phone number, and project information.
            </p>

            <h2 className="text-2xl font-semibold text-cyan-400 mb-4">2. How We Use Your Information</h2>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2">
              <li>To provide and maintain our services</li>
              <li>To process your transactions and manage your projects</li>
              <li>To send you technical notices and support messages</li>
              <li>To improve our services and develop new features</li>
            </ul>

            <h2 className="text-2xl font-semibold text-cyan-400 mb-4">3. Information Sharing</h2>
            <p className="text-gray-300 mb-4">
              We do not sell, rent, or share your personal information with third parties without your 
              consent, except as described in this policy or as required by law.
            </p>

            <h2 className="text-2xl font-semibold text-cyan-400 mb-4">4. Data Security</h2>
            <p className="text-gray-300 mb-4">
              We implement appropriate security measures to protect your personal information against 
              unauthorized access, alteration, disclosure, or destruction.
            </p>

            <h2 className="text-2xl font-semibold text-cyan-400 mb-4">5. Authentication Services</h2>
            <p className="text-gray-300 mb-4">
              When you use third-party authentication services (Google, Apple), we receive limited 
              profile information as permitted by those services and your consent.
            </p>

            <h2 className="text-2xl font-semibold text-cyan-400 mb-4">6. Your Rights</h2>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2">
              <li>Access and update your personal information</li>
              <li>Delete your account and associated data</li>
              <li>Opt out of non-essential communications</li>
              <li>Request a copy of your data</li>
            </ul>

            <h2 className="text-2xl font-semibold text-cyan-400 mb-4">7. Contact Us</h2>
            <p className="text-gray-300 mb-4">
              If you have any questions about this Privacy Policy, please contact us through our 
              support channels within the application.
            </p>

            <h2 className="text-2xl font-semibold text-cyan-400 mb-4">8. Changes to This Policy</h2>
            <p className="text-gray-300 mb-4">
              We may update this Privacy Policy from time to time. We will notify you of any changes 
              by posting the new Privacy Policy on this page and updating the effective date.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;