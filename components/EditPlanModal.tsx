import React, { useState, useEffect } from 'react';
import { StoragePlan } from '../types';
import { X, Plus, Trash2 } from 'lucide-react';
import Modal from './Modal';
import { api } from '../services/supabaseService';

interface EditPlanModalProps {
  isOpen: boolean;
  plan: StoragePlan | null;
  onClose: () => void;
  onSave: () => void;
  onShowToast: (message: string, type: 'success' | 'error') => void;
}

const EditPlanModal: React.FC<EditPlanModalProps> = ({
  isOpen,
  plan,
  onClose,
  onSave,
  onShowToast
}) => {
  const [formData, setFormData] = useState<Partial<StoragePlan>>({
    name: '',
    storageGB: 0,
    monthlyPrice: 0,
    annualPrice: 0,
    features: [],
    isPopular: false,
    maxFileSizeMB: 0,
    sharingEnabled: false,
    prioritySupport: false,
    isActive: true
  });

  const [newFeature, setNewFeature] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (plan) {
      setFormData(plan);
    } else {
      setFormData({
        name: '',
        storageGB: 0,
        monthlyPrice: 0,
        annualPrice: 0,
        features: [],
        isPopular: false,
        maxFileSizeMB: 0,
        sharingEnabled: false,
        prioritySupport: false,
        isActive: true
      });
    }
  }, [plan, isOpen]);

  const handleInputChange = (field: keyof StoragePlan, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddFeature = () => {
    if (newFeature.trim()) {
      setFormData(prev => ({
        ...prev,
        features: [...(prev.features || []), newFeature.trim()]
      }));
      setNewFeature('');
    }
  };

  const handleRemoveFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: (prev.features || []).filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name?.trim()) {
      onShowToast('Plan name is required', 'error');
      return;
    }

    if (!formData.storageGB || formData.storageGB <= 0) {
      onShowToast('Storage must be greater than 0', 'error');
      return;
    }

    if (formData.monthlyPrice === undefined || formData.monthlyPrice < 0) {
      onShowToast('Monthly price must be 0 or greater', 'error');
      return;
    }

    if (formData.annualPrice === undefined || formData.annualPrice < 0) {
      onShowToast('Annual price must be 0 or greater', 'error');
      return;
    }

    if (!formData.maxFileSizeMB || formData.maxFileSizeMB <= 0) {
      onShowToast('Max file size must be greater than 0', 'error');
      return;
    }

    setLoading(true);
    try {
      const planData = {
        ...formData,
        features: formData.features || []
      };

      if (plan) {
        // Update existing plan
        await api.updatePlan(plan.id, planData);
        onShowToast('Plan updated successfully', 'success');
      } else {
        // Create new plan
        await api.createPlan(planData);
        onShowToast('Plan created successfully', 'success');
      }

      onSave();
      onClose();
    } catch (error: any) {
      onShowToast(error.message || 'Failed to save plan', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={plan ? 'Edit Plan' : 'Create New Plan'}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plan Name *
              </label>
              <input
                type="text"
                required
                value={formData.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="e.g., Pro Plan"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Storage (GB) *
              </label>
              <input
                type="number"
                required
                min="1"
                value={formData.storageGB || ''}
                onChange={(e) => handleInputChange('storageGB', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monthly Price ($) *
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.monthlyPrice || ''}
                onChange={(e) => handleInputChange('monthlyPrice', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="9.99"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Annual Price ($) *
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.annualPrice || ''}
                onChange={(e) => handleInputChange('annualPrice', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="99.99"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max File Size (MB) *
            </label>
            <input
              type="number"
              required
              min="1"
              value={formData.maxFileSizeMB || ''}
              onChange={(e) => handleInputChange('maxFileSizeMB', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="100"
            />
          </div>
        </div>

        {/* Features */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Features</h3>

          <div className="space-y-2">
            {(formData.features || []).map((feature, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                  {feature}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveFeature(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Remove feature"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newFeature}
              onChange={(e) => setNewFeature(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFeature())}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Add a feature..."
            />
            <button
              type="button"
              onClick={handleAddFeature}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Settings</h3>

          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.isPopular || false}
                onChange={(e) => handleInputChange('isPopular', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Mark as Popular Plan</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.sharingEnabled || false}
                onChange={(e) => handleInputChange('sharingEnabled', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Enable File Sharing</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.prioritySupport || false}
                onChange={(e) => handleInputChange('prioritySupport', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Priority Support</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.isActive !== false}
                onChange={(e) => handleInputChange('isActive', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Active Plan</span>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : (plan ? 'Update Plan' : 'Create Plan')}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EditPlanModal;
