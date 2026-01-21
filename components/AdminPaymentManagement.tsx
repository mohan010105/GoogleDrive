import React, { useState, useEffect } from 'react';
import { api } from '../services/supabaseService';
import { Payment } from '../types';
import { Search, Filter, Download, CheckCircle, XCircle, Clock, AlertCircle, RefreshCw, Eye, Ban, DollarSign } from 'lucide-react';
import Modal from './Modal';

interface AdminPaymentManagementProps {
  isOpen: boolean;
  onClose: () => void;
}


const AdminPaymentManagement: React.FC<AdminPaymentManagementProps> = ({ isOpen, onClose }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      loadPayments();
      loadAnalytics();
    }
  }, [isOpen]);

  useEffect(() => {
    filterPayments();
  }, [payments, searchTerm, statusFilter]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const paymentData = await api.getAllPayments();
      setPayments(paymentData.payments);
    } catch (error) {
      console.error('Failed to load payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const analyticsData = await api.getPaymentAnalytics();
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  };

  const filterPayments = () => {
    let filtered = payments;

    if (searchTerm) {
      filtered = filtered.filter(payment =>
        payment.transactionId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.upiTransactionId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.userId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(payment => payment.status === statusFilter);
    }

    setFilteredPayments(filtered);
  };

  const handleStatusUpdate = async (transactionId: string, newStatus: Payment['status'], notes?: string) => {
    try {
      const result = await api.updatePaymentStatus(transactionId, newStatus, notes);
      if (result.success) {
        await loadPayments();
        await loadAnalytics();
      }
    } catch (error) {
      console.error('Failed to update payment status:', error);
    }
  };

  const handleCancelPayment = async (transactionId: string) => {
    try {
      const result = await api.cancelPayment(transactionId, 'Cancelled by admin');
      if (result.success) {
        await loadPayments();
        await loadAnalytics();
      }
    } catch (error) {
      console.error('Failed to cancel payment:', error);
    }
  };

  const simulateWebhook = async () => {
    try {
      const result = await api.simulateRandomWebhook();
      if (result) {
        await loadPayments();
        await loadAnalytics();
      }
    } catch (error) {
      console.error('Failed to simulate webhook:', error);
    }
  };

  const getStatusIcon = (status: Payment['status']) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'refunded':
        return <AlertCircle className="w-5 h-5 text-blue-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: Payment['status']) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Payment Management">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Modal>
    );
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Payment Management" maxWidth="7xl">
        <div className="space-y-6">
          {/* Analytics Overview */}
          {analytics && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <DollarSign className="w-8 h-8 text-blue-600 mr-3" />
                  <div>
                    <p className="text-sm text-blue-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-blue-900">₹{analytics.totalRevenue}</p>
                  </div>
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
                  <div>
                    <p className="text-sm text-green-600">Success Rate</p>
                    <p className="text-2xl font-bold text-green-900">{analytics.successRate.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <Clock className="w-8 h-8 text-yellow-600 mr-3" />
                  <div>
                    <p className="text-sm text-yellow-600">Pending</p>
                    <p className="text-2xl font-bold text-yellow-900">{payments.filter(p => p.status === 'pending').length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <RefreshCw className="w-8 h-8 text-purple-600 mr-3 cursor-pointer" onClick={simulateWebhook} />
                  <div>
                    <p className="text-sm text-purple-600">Simulate Webhook</p>
                    <p className="text-sm font-medium text-purple-900">Click to test</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by Transaction ID, UTR, or User ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
          </div>

          {/* Payments Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transaction
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {payment.transactionId}
                        </div>
                        {payment.upiTransactionId && (
                          <div className="text-sm text-gray-500">
                            UTR: {payment.upiTransactionId}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{payment.userId}</div>
                      <div className="text-sm text-gray-500">{payment.planId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">₹{payment.amount}</div>
                      <div className="text-sm text-gray-500">{payment.billingCycle}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                        {getStatusIcon(payment.status)}
                        <span className="ml-1 capitalize">{payment.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(payment.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedPayment(payment);
                            setShowDetails(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {payment.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleStatusUpdate(payment.transactionId!, 'verified', 'Verified by admin')}
                              className="text-green-600 hover:text-green-900"
                              title="Verify Payment"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(payment.transactionId!, 'rejected', 'Rejected by admin')}
                              className="text-red-600 hover:text-red-900"
                              title="Reject Payment"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleCancelPayment(payment.transactionId!)}
                              className="text-gray-600 hover:text-gray-900"
                              title="Cancel Payment"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredPayments.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No payments found matching your criteria</p>
            </div>
          )}
        </div>
      </Modal>

      {/* Payment Details Modal */}
      {showDetails && selectedPayment && (
        <Modal isOpen={showDetails} onClose={() => setShowDetails(false)} title="Payment Details">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Payment Information</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Transaction ID:</strong> {selectedPayment.transactionId}</p>
                  <p><strong>Amount:</strong> ₹{selectedPayment.amount}</p>
                  <p><strong>Currency:</strong> {selectedPayment.currency}</p>
                  <p><strong>Status:</strong> {selectedPayment.status}</p>
                  <p><strong>Payment Method:</strong> {selectedPayment.paymentMethod}</p>
                  <p><strong>Created:</strong> {formatDate(selectedPayment.createdAt)}</p>
                  {selectedPayment.completedAt && (
                    <p><strong>Completed:</strong> {formatDate(selectedPayment.completedAt)}</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Plan & User Details</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>User ID:</strong> {selectedPayment.userId}</p>
                  <p><strong>Plan:</strong> {selectedPayment.planId}</p>
                  <p><strong>Billing Cycle:</strong> {selectedPayment.billingCycle}</p>
                  {selectedPayment.upiTransactionId && (
                    <p><strong>UTR:</strong> {selectedPayment.upiTransactionId}</p>
                  )}
                  {selectedPayment.paymentApp && (
                    <p><strong>Payment App:</strong> {selectedPayment.paymentApp}</p>
                  )}
                  {selectedPayment.adminUpiId && (
                    <p><strong>Admin UPI ID:</strong> {selectedPayment.adminUpiId}</p>
                  )}
                </div>
              </div>
            </div>

            {selectedPayment.failureReason && (
              <div className="bg-red-50 p-4 rounded-lg">
                <h3 className="font-semibold text-red-900 mb-2">Failure Reason</h3>
                <p className="text-red-800">{selectedPayment.failureReason}</p>
              </div>
            )}

            {selectedPayment.verificationNotes && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Verification Notes</h3>
                <p className="text-blue-800">{selectedPayment.verificationNotes}</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
};

export default AdminPaymentManagement;