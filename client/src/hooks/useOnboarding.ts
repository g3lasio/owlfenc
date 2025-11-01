import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';

export const useOnboarding = () => {
  const { currentUser } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!currentUser) {
        setIsLoading(false);
        return;
      }

      try {
        // Check if user has completed onboarding
        const onboardingKey = `onboarding_completed_${currentUser.uid}`;
        const completed = localStorage.getItem(onboardingKey);
        
        // Also check if user has company profile setup
        const response = await fetch(`/api/user/onboarding-status?uid=${currentUser.uid}`);
        const result = await response.json();
        const hasProfile = result.success && result.hasCompletedOnboarding;
        
        // If no onboarding flag AND no profile, show onboarding
        const needsOnboarding = !completed && !hasProfile;
        
        setNeedsOnboarding(needsOnboarding);
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        // Default to showing onboarding for new users
        const onboardingKey = `onboarding_completed_${currentUser.uid}`;
        const completed = localStorage.getItem(onboardingKey);
        setNeedsOnboarding(!completed);
      } finally {
        setIsLoading(false);
      }
    };

    checkOnboardingStatus();
  }, [currentUser]);

  const completeOnboarding = () => {
    if (currentUser) {
      const onboardingKey = `onboarding_completed_${currentUser.uid}`;
      localStorage.setItem(onboardingKey, 'true');
      setNeedsOnboarding(false);
    }
  };

  const resetOnboarding = () => {
    if (currentUser) {
      const onboardingKey = `onboarding_completed_${currentUser.uid}`;
      localStorage.removeItem(onboardingKey);
      setNeedsOnboarding(true);
    }
  };

  return {
    needsOnboarding,
    isLoading,
    completeOnboarding,
    resetOnboarding
  };
};