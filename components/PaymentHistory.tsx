import React, { useState, useEffect } from 'react';
import { api } from '../services/supabaseService';
import { Payment } from '../types';
import { Download, Receipt, Calendar, CreditCard, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import Modal from './Modal';

interface PaymentHistoryProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

const PaymentHistory: React.FC<PaymentHistoryProps> = ({ userId, isOpen, onClose }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPaymentHistory();
    }
  }, [isOpen, userId]);

  const loadPaymentHistory = async () => {
    try {
      setLoading(true);
      const paymentData = await api.getPayments(userId);
      setPayments(paymentData);
    } catch (error) {
      console.error('Failed to load payment history:', error);
    } finally {
      setLoading(false);
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
        return 'text-green-700 bg-green-100';
      case 'pending':
        return 'text-yellow-700 bg-yellow-100';
      case 'rejected':
        return 'text-red-700 bg-red-100';
      case 'refunded':
        return 'text-blue-700 bg-blue-100';
      default:
        return 'text-gray-700 bg-gray-100';
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

  const generateReceipt = async (payment: Payment) => {
    try {
      const receiptData = await api.generateReceipt(payment.transactionId!);
      if (receiptData.receipt) {
        // In a real app, this would download a PDF
        // For now, we'll show a modal with receipt details
        setSelectedPayment(payment);
        setShowReceipt(true);
      }
    } catch (error) {
      console.error('Failed to generate receipt:', error);
    }
  };

  const downloadReceipt = (payment: Payment) => {
    // In a real app, this would trigger a PDF download
    // For demo purposes, we'll create a simple text receipt
    const receiptText = `
PAYMENT RECEIPT
================

Transaction ID: ${payment.transactionId}
Amount: ₹${payment.amount}
Plan: ${payment.planId}
Billing Cycle: ${payment.billingCycle}
Payment Method: ${payment.paymentMethod}
Status: ${payment.status}
Date: ${formatDate(payment.createdAt)}

${payment.upiTransactionId ? `UTR: ${payment.upiTransactionId}` : ''}
${payment.paymentApp ? `Payment App: ${payment.paymentApp}` : ''}

Thank you for your payment!
    `.trim();

    const blob = new Blob([receiptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt_${payment.transactionId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Payment History">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Modal>
    );
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Payment History">
        <div className="space-y-4">
          {payments.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No payment history found</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {payments.map((payment) => (
                <div key={payment.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(payment.status)}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">₹{payment.amount}</p>
                      <p className="text-sm text-gray-500">{payment.planId} - {payment.billingCycle}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                    <div>
                      <p><strong>Transaction ID:</strong> {payment.transactionId}</p>
                      {payment.upiTransactionId && (
                        <p><strong>UTR:</strong> {payment.upiTransactionId}</p>
                      )}
                    </div>
                    <div>
                      <p><strong>Date:</strong> {formatDate(payment.createdAt)}</p>
                      {payment.paymentApp && (
                        <p><strong>App:</strong> {payment.paymentApp}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => generateReceipt(payment)}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      <Receipt className="w-4 h-4" />
                      View Receipt
                    </button>
                    <button
                      onClick={() => downloadReceipt(payment)}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Receipt Modal */}
      {showReceipt && selectedPayment && (
        <Modal isOpen={showReceipt} onClose={() => setShowReceipt(false)} title="Payment Receipt">
          <div className="space-y-4">
            <div className="border-2 border-gray-200 rounded-lg p-6 bg-gray-50">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">PAYMENT RECEIPT</h2>
                <p className="text-gray-600">CloudDrive Payment Confirmation</p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Payment Details</h3>
                  <div className="space-y-1 text-sm">
                    <p><strong>Transaction ID:</strong> {selectedPayment.transactionId}</p>
                    <p><strong>Amount:</strong> ₹{selectedPayment.amount}</p>
                    <p><strong>Currency:</strong> {selectedPayment.currency}</p>
                    <p><strong>Status:</strong> {selectedPayment.status}</p>
                    <p><strong>Payment Method:</strong> {selectedPayment.paymentMethod}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Plan Details</h3>
                  <div className="space-y-1 text-sm">
                    <p><strong>Plan:</strong> {selectedPayment.planId}</p>
                    <p><strong>Billing Cycle:</strong> {selectedPayment.billingCycle}</p>
                    <p><strong>Date:</strong> {formatDate(selectedPayment.createdAt)}</p>
                    {selectedPayment.completedAt && (
                      <p><strong>Completed:</strong> {formatDate(selectedPayment.completedAt)}</p>
                    )}
                  </div>
                </div>
              </div>

              {selectedPayment.upiTransactionId && (
                <div className="mt-4">
                  <h3 className="font-semibold text-gray-900 mb-2">UPI Details</h3>
                  <div className="space-y-1 text-sm">
                    <p><strong>UTR:</strong> {selectedPayment.upiTransactionId}</p>
                    {selectedPayment.paymentApp && (
                      <p><strong>Payment App:</strong> {selectedPayment.paymentApp}</p>
                    )}
                    {selectedPayment.adminUpiId && (
                      <p><strong>Admin UPI ID:</strong> {selectedPayment.adminUpiId}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-gray-300 text-center">
                <p className="text-sm text-gray-600">
                  This receipt confirms successful payment processing.
                  For support, contact our team.
                </p>
              </div>
            </div>

            <div className="flex justify-center">
              <button
                onClick={() => downloadReceipt(selectedPayment)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                <Download className="w-4 h-4" />
                Download Receipt
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default PaymentHistory;
