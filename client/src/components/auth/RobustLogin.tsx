/**
 * ROBUST LOGIN COMPONENT
 * Usa el sistema robusto de autenticación PostgreSQL
 */

import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { robustAuth } from '../../lib/robust-auth';
import { safeFirebaseError, getErrorMessage } from '../../lib/firebase-error-fix';
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
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Escuchar cambios de autenticación robusta
    const unsubscribe = robustAuth.onAuthStateChanged((userData) => {
      setUser(userData);
      if (userData && onSuccess) {
        onSuccess();
      }
    });

    return unsubscribe;
  }, [onSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      let result;
      
      if (isLogin) {
        // Iniciar sesión
        result = await signInWithEmailAndPassword(auth, email, password);
        console.log('✅ [ROBUST-LOGIN] Firebase login successful');
      } else {
        // Registrar nuevo usuario
        result = await createUserWithEmailAndPassword(auth, email, password);
        console.log('✅ [ROBUST-LOGIN] Firebase registration successful');
      }

      // El sistema robusto se encargará automáticamente del mapeo
      console.log('🔄 [ROBUST-LOGIN] Waiting for robust system to process...');

    } catch (error: any) {
      console.error('❌ [ROBUST-LOGIN] Authentication failed:', error);
      
      // Usar nuestro sistema robusto de manejo de errores
      const safeError = safeFirebaseError(error);
      const userMessage = getErrorMessage(error);
      
      setError(userMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Si el usuario ya está autenticado, mostrar estado
  if (user) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-green-600">✅ Authenticated</CardTitle>
          <CardDescription>
            Welcome back, {user.user.email}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600">
            <p><strong>Status:</strong> {user.subscription.status}</p>
            <p><strong>Plan:</strong> {user.subscription.planName || 'None'}</p>
            <p><strong>Active:</strong> {user.subscription.active ? 'Yes' : 'No'}</p>
            <p><strong>Days Remaining:</strong> {user.subscription.daysRemaining}</p>
          </div>
          <div className="text-xs text-gray-500">
            <p><strong>System:</strong> {user.systemInfo.dataSource}</p>
            <p><strong>User ID:</strong> {user.user.internalUserId}</p>
          </div>
          <Button 
            onClick={() => auth.signOut()}
            variant="outline"
            className="w-full"
          >
            Sign Out
          </Button>
        </CardContent>
      </Card>
    );
  }

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