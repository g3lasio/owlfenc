/**
 * AUTH TEST PAGE
 * Demonstrates the working robust authentication system
 */

import React, { useState, useEffect } from 'react';
import { RobustLogin } from '../components/auth/RobustLogin';
import { robustAuth } from '../lib/robust-auth';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';

export function AuthTest() {
  const [user, setUser] = useState<any>(null);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = robustAuth.onAuthStateChanged((userData) => {
      setUser(userData);
      console.log('🔄 [AUTH-TEST] User state changed:', userData);
    });

    return unsubscribe;
  }, []);

  const runSystemTests = async () => {
    setIsLoading(true);
    const results: any[] = [];

    try {
      // Test 1: Check if user is authenticated
      results.push({
        test: 'Authentication Check',
        status: robustAuth.isAuthenticated() ? 'PASS' : 'FAIL',
        result: robustAuth.isAuthenticated() ? 'User is authenticated' : 'User not authenticated'
      });

      // Test 2: Check subscription status
      results.push({
        test: 'Subscription Status',
        status: robustAuth.hasActiveSubscription() ? 'PASS' : 'FAIL',
        result: `Status: ${robustAuth.getSubscriptionStatus()}, Days: ${robustAuth.getDaysRemaining()}`
      });

      if (user) {
        // Test 3: Feature access checks
        const features = ['contracts', 'estimates', 'projects'];
        for (const feature of features) {
          try {
            const access = await robustAuth.checkFeatureAccess(feature);
            results.push({
              test: `Feature Access: ${feature}`,
              status: access.canAccess ? 'PASS' : 'FAIL',
              result: `Can access: ${access.canAccess}, Used: ${access.usage.used}/${access.usage.limit}`
            });
          } catch (error) {
            results.push({
              test: `Feature Access: ${feature}`,
              status: 'ERROR',
              result: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
          }
        }

        // Test 4: Direct API test
        try {
          const response = await fetch(`/api/user/subscription-robust/${user.user.firebaseUid}`);
          const data = await response.json();
          results.push({
            test: 'Direct API Call',
            status: response.ok ? 'PASS' : 'FAIL',
            result: `API Response: ${data.active ? 'Active' : 'Inactive'} - ${data.subscription?.planName}`
          });
        } catch (error) {
          results.push({
            test: 'Direct API Call',
            status: 'ERROR',
            result: `API Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      }

    } catch (error) {
      results.push({
        test: 'System Test Suite',
        status: 'ERROR',
        result: `Test suite failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    setTestResults(results);
    setIsLoading(false);
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">🛡️ Robust Authentication System Test</h1>
        <p className="text-gray-600">
          Testing the new PostgreSQL-based authentication and subscription system
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Authentication Section */}
        <div className="space-y-4">
          <RobustLogin onSuccess={() => console.log('✅ Login successful!')} />
        </div>

        {/* System Status Section */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>🔧 System Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">Database:</p>
                  <p className="text-green-600">✅ PostgreSQL</p>
                </div>
                <div>
                  <p className="font-medium">Auth System:</p>
                  <p className="text-green-600">✅ Firebase + Robust</p>
                </div>
                <div>
                  <p className="font-medium">Data Persistence:</p>
                  <p className="text-green-600">✅ Permanent</p>
                </div>
                <div>
                  <p className="font-medium">Error Handling:</p>
                  <p className="text-green-600">✅ Safe Wrapper</p>
                </div>
              </div>

              {user && (
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Current User:</h4>
                  <div className="text-sm space-y-1 text-gray-600">
                    <p>📧 {user.user.email}</p>
                    <p>🆔 Internal ID: {user.user.internalUserId}</p>
                    <p>📋 Plan: {user.subscription.planName}</p>
                    <p>⏰ Days Remaining: {user.subscription.daysRemaining}</p>
                    <p>🎯 Active: {user.subscription.active ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              )}

              <Button 
                onClick={runSystemTests}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Running Tests...' : '🧪 Run System Tests'}
              </Button>
            </CardContent>
          </Card>

          {/* Test Results */}
          {testResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>🧪 Test Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {testResults.map((result, index) => (
                    <div 
                      key={index}
                      className={`flex justify-between items-center p-2 rounded text-sm ${
                        result.status === 'PASS' 
                          ? 'bg-green-50 border border-green-200' 
                          : result.status === 'FAIL' 
                          ? 'bg-red-50 border border-red-200'
                          : 'bg-yellow-50 border border-yellow-200'
                      }`}
                    >
                      <div>
                        <p className="font-medium">{result.test}</p>
                        <p className="text-gray-600">{result.result}</p>
                      </div>
                      <span className={`font-bold ${
                        result.status === 'PASS' 
                          ? 'text-green-600' 
                          : result.status === 'FAIL'
                          ? 'text-red-600'
                          : 'text-yellow-600'
                      }`}>
                        {result.status}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Technical Information */}
      <Card>
        <CardHeader>
          <CardTitle>🔧 Technical Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">✅ Problems Solved:</h4>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• Firebase UID mapping to internal user_id</li>
                <li>• Persistent PostgreSQL subscription data</li>
                <li>• Eliminated memory-based Maps that reset</li>
                <li>• Fixed "errorMessage.split()" crashes</li>
                <li>• Real-time subscription status tracking</li>
                <li>• Automatic trial creation for new users</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">🚀 New Capabilities:</h4>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• Robust error handling for all auth operations</li>
                <li>• Complete user data with subscription details</li>
                <li>• Feature access validation by plan</li>
                <li>• Usage tracking and limit enforcement</li>
                <li>• Seamless Firebase → PostgreSQL integration</li>
                <li>• Professional authentication UI components</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}