import React, { useState, useEffect } from 'react';
import { api } from '../services/supabaseService';
import { StoragePlan, UserSubscription } from '../types';
import { HardDrive, TrendingUp, AlertTriangle, Crown } from 'lucide-react';

interface CurrentPlanProps {
  userId: string;
  onUpgradeClick: () => void;
  loading?: boolean;
}

const CurrentPlan: React.FC<CurrentPlanProps> = ({ userId, onUpgradeClick, loading: externalLoading }) => {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [plan, setPlan] = useState<StoragePlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscriptionData();

    // Subscribe to real-time updates for storage usage changes
    const subscription = api.subscribe((event) => {
      if (event.type === 'UPDATE' && (event.table === 'files' || event.table === 'folders' || event.table === 'subscriptions')) {
        // Refresh subscription data when files/folders or subscriptions are updated
        loadSubscriptionData();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  const loadSubscriptionData = async () => {
    try {
      const [subData, plansData] = await Promise.all([
        api.getUserSubscription(userId),
        api.getPlans()
      ]);

      setSubscription(subData);
      if (subData) {
        const planData = plansData.find(p => p.id === subData.planId);
        setPlan(planData || null);
      }
    } catch (error) {
      console.error('Failed to load subscription data:', error);
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
    if (!subscription || !plan) return 0;
    const totalBytes = plan.storageGB * 1024 * 1024 * 1024; // Convert GB to bytes
    return (subscription.storageUsed / totalBytes) * 100;
  };

  const getUsageColor = () => {
    const percentage = getUsagePercentage();
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const getUsageTextColor = () => {
    const percentage = getUsagePercentage();
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-blue-600';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-2 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!subscription || !plan) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <HardDrive className="text-gray-400" size={20} />
          <div>
            <p className="text-sm font-medium text-gray-900">Free Plan</p>
            <p className="text-xs text-gray-500">15 GB storage</p>
          </div>
        </div>
      </div>
    );
  }

  const usagePercentage = getUsagePercentage();
  const isNearLimit = usagePercentage >= 80;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${plan.id === 'free' ? 'bg-gray-100' : 'bg-blue-100'}`}>
            {plan.id === 'free' ? (
              <HardDrive className="text-gray-600" size={20} />
            ) : (
              <Crown className="text-blue-600" size={20} />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{plan.name} Plan</p>
            <p className="text-xs text-gray-500">
              {formatBytes(subscription.storageUsed)} of {plan.storageGB} GB used
            </p>
          </div>
        </div>

        {plan.id !== 'standard' && (
          <button
            onClick={onUpgradeClick}
            disabled={loading || externalLoading}
            className="text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white px-3 py-1 rounded-full font-medium transition-colors flex items-center gap-1"
          >
            {loading || externalLoading ? (
              <>
                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Loading...</span>
              </>
            ) : (
              'Upgrade'
            )}
          </button>
        )}
      </div>

      {/* Usage Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-600">Storage Usage</span>
          <span className={`text-xs font-medium ${getUsageTextColor()}`}>
            {usagePercentage.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getUsageColor()}`}
            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Warning for near limit */}
      {isNearLimit && (
        <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
          <AlertTriangle className="text-yellow-600 flex-shrink-0" size={16} />
          <div className="flex-1">
            <p className="text-xs font-medium text-yellow-800">Storage limit approaching</p>
            <p className="text-xs text-yellow-700">
              {usagePercentage >= 90 ? 'Upgrade now to avoid upload restrictions' : 'Consider upgrading your plan'}
            </p>
          </div>
          <button
            onClick={onUpgradeClick}
            className="text-xs bg-yellow-600 hover:bg-yellow-700 text-white px-2 py-1 rounded font-medium"
          >
            Upgrade
          </button>
        </div>
      )}

      {/* Smart Prediction */}
      <div className="flex items-center gap-2 text-xs text-gray-600">
        <TrendingUp size={14} />
        <span>
          Based on your usage, you'll reach limit in ~{Math.max(1, Math.floor((100 - usagePercentage) / 5))} months
        </span>
      </div>
    </div>
  );
};

export default CurrentPlan;
