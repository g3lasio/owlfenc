import React from 'react';

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-white/10 backdrop-blur-md rounded-lg border border-cyan-500/30 p-8">
          <h1 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Terms of Service
          </h1>
          
          <div className="prose prose-invert max-w-none">
            <p className="text-gray-300 mb-6">
              <strong>Effective Date:</strong> August 9, 2025
            </p>

            <h2 className="text-2xl font-semibold text-cyan-400 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-300 mb-4">
              By accessing and using this service, you accept and agree to be bound by the terms 
              and provision of this agreement.
            </p>

            <h2 className="text-2xl font-semibold text-cyan-400 mb-4">2. Description of Service</h2>
            <p className="text-gray-300 mb-4">
              Owl Fenc provides a comprehensive platform for contractors, including project management, 
              contract generation, estimation tools, and AI-powered assistance for construction industry professionals.
            </p>

            <h2 className="text-2xl font-semibold text-cyan-400 mb-4">3. User Responsibilities</h2>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2">
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Use the service only for lawful purposes</li>
              <li>Respect intellectual property rights</li>
              <li>Comply with all applicable laws and regulations</li>
            </ul>

            <h2 className="text-2xl font-semibold text-cyan-400 mb-4">4. Account Security</h2>
            <p className="text-gray-300 mb-4">
              You are responsible for maintaining the confidentiality of your account and password. 
              You agree to notify us immediately of any unauthorized use of your account.
            </p>

            <h2 className="text-2xl font-semibold text-cyan-400 mb-4">5. Payment Terms</h2>
            <p className="text-gray-300 mb-4">
              Subscription fees are billed in advance and are non-refundable except as required by law. 
              We reserve the right to change our pricing with reasonable notice.
            </p>

            <h2 className="text-2xl font-semibold text-cyan-400 mb-4">6. Intellectual Property</h2>
            <p className="text-gray-300 mb-4">
              The service and its original content, features, and functionality are owned by Owl Fenc 
              and are protected by international copyright, trademark, and other intellectual property laws.
            </p>

            <h2 className="text-2xl font-semibold text-cyan-400 mb-4">7. Limitation of Liability</h2>
            <p className="text-gray-300 mb-4">
              In no event shall Owl Fenc be liable for any indirect, incidental, special, consequential, 
              or punitive damages, including without limitation, loss of profits, data, use, goodwill, 
              or other intangible losses.
            </p>

            <h2 className="text-2xl font-semibold text-cyan-400 mb-4">8. Privacy</h2>
            <p className="text-gray-300 mb-4">
              Your privacy is important to us. Please review our Privacy Policy, which also governs 
              your use of the service, to understand our practices.
            </p>

            <h2 className="text-2xl font-semibold text-cyan-400 mb-4">9. Termination</h2>
            <p className="text-gray-300 mb-4">
              We may terminate or suspend your account and bar access to the service immediately, 
              without prior notice or liability, under our sole discretion, for any reason whatsoever.
            </p>

            <h2 className="text-2xl font-semibold text-cyan-400 mb-4">10. Changes to Terms</h2>
            <p className="text-gray-300 mb-4">
              We reserve the right to modify or replace these Terms at any time. If a revision is 
              material, we will provide at least 30 days notice prior to any new terms taking effect.
            </p>

            <h2 className="text-2xl font-semibold text-cyan-400 mb-4">11. Contact Information</h2>
            <p className="text-gray-300 mb-4">
              If you have any questions about these Terms of Service, please contact us through our 
              support channels within the application.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;