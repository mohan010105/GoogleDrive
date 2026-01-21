import React, { useState, useEffect } from 'react';
import { api } from '../services/supabaseService';
import { StoragePlan, UserSubscription, UserProfile } from '../types';
import { ArrowLeft, Check, Crown, HardDrive, Users, Shield, Zap, Star } from 'lucide-react';

interface PricingPageProps {
  user: UserProfile;
  onNavigate: (path: string) => void;
  // third argument billingCycle provided for routing to payment page
  onUpgradeClick: (currentPlan: StoragePlan, targetPlan: StoragePlan, billingCycle: 'monthly' | 'annual') => void;
  onShowToast: (message: string, type: 'success' | 'error') => void;
}

const PricingPage: React.FC<PricingPageProps> = ({
  user,
  onNavigate,
  onUpgradeClick,
  onShowToast
}) => {
  const [plans, setPlans] = useState<StoragePlan[]>([]);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [currentPlan, setCurrentPlan] = useState<StoragePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    loadData();
    const sub = api.subscribe((event) => {
      if (event.type === 'UPDATE' && event.table === 'subscriptions') {
        loadData();
      }
    });
    return () => sub.unsubscribe();
  }, [user.id]);

  const loadData = async () => {
    try {
      const [plansData, subData] = await Promise.all([
        api.getPlans(),
        api.getUserSubscription(user.id)
      ]);

      setPlans(plansData);
      setSubscription(subData);

      if (subData) {
        const planData = plansData.find(p => p.id === subData.planId);
        setCurrentPlan(planData || null);
      } else {
        // Default to free plan
        setCurrentPlan(plansData.find(p => p.id === 'free') || null);
      }
    } catch (error) {
      console.error('Failed to load pricing data:', error);
      onShowToast('Failed to load pricing information', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getUsagePercentage = () => {
    if (!subscription || !currentPlan) return 0;
    return (subscription.storageUsed / (currentPlan.storageGB * 1024 * 1024 * 1024)) * 100;
  };

  const handleUpgradeClick = (targetPlan: StoragePlan) => {
    if (!currentPlan) return;

    // Check if already on this plan or higher
    if (targetPlan.id === currentPlan.id) {
      onShowToast("You're already on this plan", 'error');
      return;
    }

    // Check if trying to downgrade (not allowed in this flow)
    const currentIndex = plans.findIndex(p => p.id === currentPlan.id);
    const targetIndex = plans.findIndex(p => p.id === targetPlan.id);
    if (targetIndex < currentIndex) {
      onShowToast("Downgrades are not available through this flow", 'error');
      return;
    }

    if (navigating) return;
    setNavigating(true);
    try {
      console.debug('PricingPage: upgrade click', { currentPlan: currentPlan?.id, targetPlan: targetPlan.id, billingCycle });
      onUpgradeClick(currentPlan, targetPlan, billingCycle);
    } finally {
      setTimeout(() => setNavigating(false), 800);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const usagePercentage = getUsagePercentage();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => onNavigate('drive')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="font-medium">Back to Drive</span>
            </button>
            <h1 className="text-xl font-semibold text-gray-900">Choose Your Plan</h1>
            <div className="w-24"></div> {/* Spacer */}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Current Plan Section */}
        {currentPlan && (
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Your Current Plan</h2>
                <div className="flex items-center gap-2">
                  {currentPlan.id === 'free' ? (
                    <HardDrive className="text-gray-500" size={20} />
                  ) : (
                    <Crown className="text-blue-600" size={20} />
                  )}
                  <span className="font-medium text-gray-900">{currentPlan.name}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Storage Used</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {subscription ? formatBytes(subscription.storageUsed) : '0 B'} of {currentPlan.storageGB} GB
                  </p>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        usagePercentage >= 90 ? 'bg-red-500' :
                        usagePercentage >= 75 ? 'bg-yellow-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{usagePercentage.toFixed(1)}% used</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Billing Cycle</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {subscription?.billingCycle === 'annual' ? 'Annual' : 'Monthly'}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-1">Plan Features</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {currentPlan.features.slice(0, 2).map((feature, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                        <Check size={12} className="mr-1" />
                        {feature}
                      </span>
                    ))}
                    {currentPlan.features.length > 2 && (
                      <span className="text-xs text-gray-500">+{currentPlan.features.length - 2} more</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Billing Cycle Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg p-1 shadow-sm border border-gray-200">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                billingCycle === 'monthly'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-6 py-2 rounded-md font-medium transition-colors relative ${
                billingCycle === 'annual'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Annual
              <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {plans.filter(plan => plan.isActive).map((plan) => {
            const isCurrentPlan = currentPlan?.id === plan.id;
            const isUpgrade = currentPlan && plans.findIndex(p => p.id === plan.id) > plans.findIndex(p => p.id === currentPlan.id);
            const price = billingCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice;

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-lg shadow-sm border transition-all duration-200 ${
                  plan.isPopular ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-200'
                } ${isCurrentPlan ? 'ring-2 ring-green-500/20 border-green-500' : ''}`}
              >
                {plan.isPopular && (
                  <div className="bg-blue-500 text-white text-center py-1 px-4 rounded-t-lg">
                    <span className="text-sm font-medium">Most Popular</span>
                  </div>
                )}

                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {plan.id === 'free' ? (
                        <HardDrive className="text-gray-500" size={24} />
                      ) : plan.id === 'basic' ? (
                        <Users className="text-blue-500" size={24} />
                      ) : plan.id === 'standard' ? (
                        <Shield className="text-purple-500" size={24} />
                      ) : (
                        <Crown className="text-yellow-500" size={24} />
                      )}
                      <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                    </div>
                    {isCurrentPlan && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Current
                      </span>
                    )}
                  </div>

                  <div className="mb-4">
                    <div className="flex items-baseline">
                      <span className="text-3xl font-bold text-gray-900">₹{price}</span>
                      <span className="text-gray-500 ml-1">
                        /{billingCycle === 'annual' ? 'year' : 'month'}
                      </span>
                    </div>
                    {billingCycle === 'annual' && plan.id !== 'free' && (
                      <p className="text-sm text-green-600 mt-1">
                        Save ₹{(plan.monthlyPrice * 12 - plan.annualPrice)} annually
                      </p>
                    )}
                  </div>

                  <div className="mb-6">
                    <p className="text-sm text-gray-600 mb-2">
                      {plan.storageGB} GB Storage • Max {plan.maxFileSizeMB}MB files
                    </p>
                    <ul className="space-y-2">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center text-sm text-gray-600">
                          <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={() => handleUpgradeClick(plan)}
                    disabled={isCurrentPlan || navigating}
                    className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                      isCurrentPlan
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : isUpgrade
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-gray-600 hover:bg-gray-700 text-white'
                    }`}
                  >
                    {isCurrentPlan ? 'Current Plan' : isUpgrade ? (navigating ? 'Redirecting...' : 'Upgrade') : 'Select Plan'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ or Additional Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Frequently Asked Questions</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900">Can I change my plan anytime?</h4>
              <p className="text-sm text-gray-600 mt-1">Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">What happens to my files if I downgrade?</h4>
              <p className="text-sm text-gray-600 mt-1">If you exceed the storage limit of your new plan, you'll need to delete files or upgrade again.</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Is my data secure?</h4>
              <p className="text-sm text-gray-600 mt-1">Yes, all files are encrypted and stored securely. We use industry-standard security practices.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
