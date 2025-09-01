/**
 * ROBUST LOGIN COMPONENT
 * Usa el sistema robusto de autenticación PostgreSQL
 */

import React, { useState, useEffect } from 'react';
import { useSignIn, useSignUp } from '@clerk/clerk-react';
import { safeFirebaseError, getErrorMessage } from '@/lib/firebase-error-fix';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';

interface RobustLoginProps {
  onSuccess?: () => void;
}

export function RobustLogin({ onSuccess }: RobustLoginProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  
  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isLogin) {
        if (!signInLoaded) throw new Error('Sign in not ready');
        
        const result = await signIn.create({
          identifier: email,
          password,
        });

        if (result.status === 'complete') {
          console.log('✅ [ROBUST-LOGIN] Clerk login successful');
          if (onSuccess) onSuccess();
        }
      } else {
        if (!signUpLoaded) throw new Error('Sign up not ready');
        
        const result = await signUp.create({
          emailAddress: email,
          password,
        });

        if (result.status === 'complete') {
          console.log('✅ [ROBUST-LOGIN] Clerk registration successful');
          if (onSuccess) onSuccess();
        } else if (result.status === 'missing_requirements') {
          // Handle email verification
          await result.prepareEmailAddressVerification({ strategy: 'email_code' });
          setError('Por favor verifica tu email para completar el registro');
        }
      }

    } catch (error: any) {
      console.error('❌ [ROBUST-LOGIN] Clerk authentication failed:', error);
      const userMessage = getErrorMessage(error);
      setError(userMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Clerk handles authentication state - component always shows login form

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>
          {isLogin ? 'Sign In' : 'Create Account'}
        </CardTitle>
        <CardDescription>
          {isLogin 
            ? 'Access your contractor dashboard' 
            : 'Join the Owl Fenc platform'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              minLength={6}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading 
              ? (isLogin ? 'Signing in...' : 'Creating account...') 
              : (isLogin ? 'Sign In' : 'Create Account')
            }
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-blue-600 hover:underline"
              disabled={isLoading}
            >
              {isLogin 
                ? "Need an account? Sign up" 
                : "Already have an account? Sign in"
              }
            </button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t text-xs text-gray-500 space-y-1">
          <p>🛡️ Robust Authentication System</p>
          <p>✅ PostgreSQL data persistence</p>
          <p>🔄 Automatic subscription management</p>
          <p>📊 Real-time usage tracking</p>
        </div>
      </CardContent>
    </Card>
  );
}