/**
 * 🔐 CLERK AUTHENTICATION PAGE
 * Modern auth page using Clerk components with OTP support
 */

import React from 'react';
import { SignIn, SignUp } from '@clerk/clerk-react';
import { useLocation } from 'wouter';

const ClerkAuthPage: React.FC = () => {
  const [location] = useLocation();
  const isSignUp = location.includes('signup');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            {isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {isSignUp ? 'Regístrate para acceder a la plataforma' : 'Accede a tu cuenta de Owl Fenc'}
          </p>
        </div>
        
        <div className="flex justify-center">
          {isSignUp ? (
            <SignUp
              routing="path"
              path="/signup"
              signInUrl="/login"
              appearance={{
                elements: {
                  formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-sm normal-case",
                  card: "shadow-lg",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden",
                }
              }}
            />
          ) : (
            <SignIn
              routing="path"
              path="/login"
              signUpUrl="/signup"
              appearance={{
                elements: {
                  formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-sm normal-case",
                  card: "shadow-lg",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden",
                }
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ClerkAuthPage;