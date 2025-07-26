import React, { useState } from 'react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import GlassCard from './common/GlassCard';
import { COLORS } from '../constants';

const BusinessBankingLayout = ({ userProfile, db, appId, auth }) => {
    // Check if the user has a business account opened (balance > 0)
    const isBusinessAccount = userProfile.accounts.Business > 0;
    const [employeeName, setEmployeeName] = useState('');
    const [employeeRole, setEmployeeRole] = useState('');
    const [employeeSalary, setEmployeeSalary] = useState('');

    // Handle adding a fictional employee (for UI demonstration)
    const handleAddEmployee = async (e) => {
        e.preventDefault();
        // In a real application, this would involve adding employee data to a sub-collection
        // under the user's business account document in Firestore.
        alert(`Employee ${employeeName} (${employeeRole}) with salary ${employeeSalary} RUB added.`);
        setEmployeeName('');
        setEmployeeRole('');
        setEmployeeSalary('');
    };

    // Handle running payroll simulation
    const handleRunPayroll = async () => {
        const payrollAmount = 5000; // Example fixed payroll amount for simulation
        // Check if business account has sufficient funds
        if (userProfile.accounts.Business < payrollAmount) {
            alert('Insufficient funds in Business Account for payroll.');
            return;
        }
        try {
            const userDocRef = doc(db, `artifacts/${appId}/users`, auth.currentUser.uid);
            // Deduct payroll amount from business account and overall balance, record transaction
            await updateDoc(userDocRef, {
                'accounts.Business': userProfile.accounts.Business - payrollAmount,
                balance: userProfile.balance - payrollAmount,
                transactions: [...userProfile.transactions, {
                    date: new Date().toLocaleDateString('en-US'),
                    description: 'Payroll Run',
                    amount: -payrollAmount, // Negative for outflow
                    status: 'Complete'
                }]
            });
            alert(`Payroll of ${payrollAmount.toFixed(2)} RUB debited from Business Account.`);
        } catch (error) {
            console.error("Error running payroll:", error);
            alert(`Payroll failed: ${error.message}`);
        }
    };

    // Handle receiving invoice payment simulation
    const handleReceiveInvoicePayment = async () => {
        const invoiceAmount = 10000; // Example fixed invoice amount
        try {
            const userDocRef = doc(db, `artifacts/${appId}/users`, auth.currentUser.uid);
            // Add invoice amount to business account and overall balance, record transaction
            await updateDoc(userDocRef, {
                'accounts.Business': userProfile.accounts.Business + invoiceAmount,
                balance: userProfile.balance + invoiceAmount,
                transactions: [...userProfile.transactions, {
                    date: new Date().toLocaleDateString('en-US'),
                    description: 'Invoice Payment Received',
                    amount: invoiceAmount, // Positive for inflow
                    status: 'Complete'
                }]
            });
            alert(`Received invoice payment of ${invoiceAmount.toFixed(2)} RUB to Business Account.`);
        } catch (error) {
            console.error("Error receiving invoice payment:", error);
            alert(`Failed to receive invoice payment: ${error.message}`);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h2 className="text-4xl font-extrabold mb-8 text-center drop-shadow-sm" style={{ color: COLORS.primaryAccent }}>🏦 Banking for Businesses</h2>

            {/* Message if user does not have a business account */}
            {!isBusinessAccount && (
                <GlassCard className="p-8 text-center mb-12">
                    <p className="text-xl text-red-500 font-bold">Access Denied:</p>
                    <p className="text-lg text-gray-400 mt-2">This section is only available for Business Accounts. Please open a Business Account to access these features.</p>
                </GlassCard>
            )}

            {/* Business Banking features (only visible if user has a business account) */}
            {isBusinessAccount && (
                <>
                    {/* Corporate Account Management Section */}
                    <section className="mb-12">
                        <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>Corporate Account Management</h3>
                        <GlassCard className="p-8">
                            <div className="space-y-4">
                                <p className="text-xl font-semibold" style={{ color: COLORS.primaryAccent }}>Business Name: SberTech Solutions</p>
                                <p className="text-gray-400">Corporate Account Balance: <span className="font-bold text-2xl" style={{ color: COLORS.primaryAccent }}>{userProfile.accounts.Business.toFixed(2)} RUB</span></p>
                                <button onClick={handleReceiveInvoicePayment} className="w-full font-bold py-3 px-6 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-300" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 15px ${COLORS.buttonsGlow}` }}>Receive Invoice Payment</button>
                            </div>
                        </GlassCard>
                    </section>

                    {/* Payroll System Section */}
                    <section className="mb-12">
                        <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>Payroll System</h3>
                        <GlassCard className="p-8">
                            <form onSubmit={handleAddEmployee} className="space-y-4">
                                <input type="text" placeholder="Employee Name" value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} required />
                                <input type="text" placeholder="Employee Role" value={employeeRole} onChange={(e) => setEmployeeRole(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} required />
                                <input type="number" placeholder="Salary (RUB)" value={employeeSalary} onChange={(e) => setEmployeeSalary(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} required />
                                <button type="submit" className="w-full font-bold py-3 px-6 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-300" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 15px ${COLORS.buttonsGlow}` }}>Add Employee</button>
                            </form>
                            <button onClick={handleRunPayroll} className="w-full font-bold py-3 px-6 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-300 mt-4" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 15px ${COLORS.buttonsGlow}` }}>Run Payroll</button>
                            <p className="text-sm text-gray-400 italic mt-4">Auto-pay cycles and tax withholding would be configured here.</p>
                        </GlassCard>
                    </section>

                    {/* Investment Products (Placeholder) - Removed from previous versions but kept as a section header for clarity */}
                    <section className="mb-12">
                        <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>Investment Products (Placeholder)</h3>
                        <GlassCard className="p-8 text-center">
                            <p className="text-gray-400">Investment products for businesses would be displayed here. (Currently removed for this draft phase).</p>
                        </GlassCard>
                    </section>
                </>
            )}
        </div>
    );
};

export default BusinessBankingLayout;
