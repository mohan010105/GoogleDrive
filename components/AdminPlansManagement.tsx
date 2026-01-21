import React, { useState, useEffect } from 'react';
import { api } from '../services/supabaseService';
import { StoragePlan } from '../types';
import { Plus, Edit, Trash2, Eye, EyeOff, CheckCircle, XCircle, DollarSign } from 'lucide-react';
import EditPlanModal from './EditPlanModal';
import Modal from './Modal';

const AdminPlansManagement: React.FC = () => {
  const [plans, setPlans] = useState<StoragePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<StoragePlan | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<StoragePlan | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const fetchedPlans = await api.getPlans();
      setPlans(fetchedPlans);
    } catch (error) {
      console.error('Failed to load plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = () => {
    setSelectedPlan(null);
    setIsEditModalOpen(true);
  };

  const handleEditPlan = (plan: StoragePlan) => {
    setSelectedPlan(plan);
    setIsEditModalOpen(true);
  };

  const handleDeletePlan = (plan: StoragePlan) => {
    setPlanToDelete(plan);
    setIsDeleteModalOpen(true);
  };

  const confirmDeletePlan = async () => {
    if (!planToDelete) return;

    try {
      await api.deletePlan(planToDelete.id);
      setPlans(plans.filter(p => p.id !== planToDelete.id));
      setIsDeleteModalOpen(false);
      setPlanToDelete(null);
    } catch (error) {
      console.error('Failed to delete plan:', error);
    }
  };

  const handleTogglePlanStatus = async (plan: StoragePlan) => {
    try {
      await api.updatePlan(plan.id, { isActive: !plan.isActive });
      setPlans(plans.map(p => p.id === plan.id ? { ...p, isActive: !p.isActive } : p));
    } catch (error) {
      console.error('Failed to toggle plan status:', error);
    }
  };

  const handleShowToast = (message: string, type: 'success' | 'error') => {
    // This would typically use a toast context or callback
    console.log(`${type}: ${message}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Storage Plans Management</h3>
          <p className="text-sm text-gray-600">Create and manage storage plans for your users</p>
        </div>
        <button
          onClick={handleCreatePlan}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus size={18} />
          Create Plan
        </button>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`bg-white border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow ${
              plan.isPopular ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            {/* Plan Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">{plan.name}</h4>
                {plan.isPopular && (
                  <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium mt-1">
                    Popular
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleTogglePlanStatus(plan)}
                  className={`p-1 rounded-full transition-colors ${
                    plan.isActive
                      ? 'text-green-600 hover:bg-green-50'
                      : 'text-gray-400 hover:bg-gray-50'
                  }`}
                  title={plan.isActive ? 'Deactivate Plan' : 'Activate Plan'}
                >
                  {plan.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                <button
                  onClick={() => handleEditPlan(plan)}
                  className="p-1 text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
                  title="Edit Plan"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => handleDeletePlan(plan)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                  title="Delete Plan"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Storage & Pricing */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Storage:</span>
                <span className="font-semibold text-gray-900">{plan.storageGB} GB</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Monthly:</span>
                <span className="font-semibold text-gray-900">${plan.monthlyPrice}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Annual:</span>
                <span className="font-semibold text-gray-900">${plan.annualPrice}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Max File Size:</span>
                <span className="font-semibold text-gray-900">{plan.maxFileSizeMB} MB</span>
              </div>
            </div>

            {/* Features */}
            <div className="mb-4">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Features:</h5>
              <ul className="space-y-1">
                {plan.features.slice(0, 3).map((feature, index) => (
                  <li key={index} className="text-xs text-gray-600 flex items-center gap-1">
                    <CheckCircle size={12} className="text-green-500 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
                {plan.features.length > 3 && (
                  <li className="text-xs text-gray-500">
                    +{plan.features.length - 3} more features
                  </li>
                )}
              </ul>
            </div>

            {/* Status & Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                {plan.isActive ? (
                  <CheckCircle size={16} className="text-green-500" />
                ) : (
                  <XCircle size={16} className="text-red-500" />
                )}
                <span className={`text-sm font-medium ${
                  plan.isActive ? 'text-green-700' : 'text-red-700'
                }`}>
                  {plan.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <DollarSign size={12} />
                {plan.sharingEnabled && <span>Sharing</span>}
                {plan.prioritySupport && <span>• Priority</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {plans.length === 0 && (
        <div className="text-center py-12">
          <div className="inline-block p-4 rounded-full bg-gray-100 mb-4">
            <Plus size={24} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No plans yet</h3>
          <p className="text-gray-600 mb-4">Create your first storage plan to get started</p>
          <button
            onClick={handleCreatePlan}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Create Plan
          </button>
        </div>
      )}

      {/* Edit Plan Modal */}
      <EditPlanModal
        isOpen={isEditModalOpen}
        plan={selectedPlan}
        onClose={() => setIsEditModalOpen(false)}
        onSave={loadPlans}
        onShowToast={handleShowToast}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Plan"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete the plan <strong>"{planToDelete?.name}"</strong>?
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmDeletePlan}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              Delete Plan
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminPlansManagement;
