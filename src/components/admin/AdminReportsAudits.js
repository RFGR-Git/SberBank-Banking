import React, { useState } from 'react';
import GlassCard from '../common/GlassCard';
import { COLORS } from '../../constants';
import { BarChart, FileText, DollarSign } from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const AdminReportsAudits = ({ db, appId, findUserByDiscordOrBankId }) => {
    const [reportUserId, setReportUserId] = useState('');
    const [auditUserId, setAuditUserId] = useState('');
    const [transactionIdToFix, setTransactionIdToFix] = useState('');
    const [adjustBalanceUserId, setAdjustBalanceUserId] = useState('');
    const [adjustAmount, setAdjustAmount] = useState('');
    const [adjustType, setAdjustType] = useState('deposit');
    const [reportData, setReportData] = useState(null);
    const [auditLogs, setAuditLogs] = useState(null);

    const handleGenerateTaxReport = async () => {
        if (!reportUserId) {
            alert('Please enter a User ID to generate a tax report.');
            return;
        }
        try {
            const foundUser = await findUserByDiscordOrBankId(reportUserId);
            if (foundUser) {
                // In a real app, this would involve complex aggregation of income, expenses, etc.
                // For now, we'll display a summary of their transactions.
                const userTransactions = foundUser.data.transactions || [];
                const income = userTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
                const expenses = userTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0);

                setReportData({
                    userName: foundUser.data.name,
                    discordId: foundUser.data.discordId,
                    totalIncome: income,
                    totalExpenses: Math.abs(expenses),
                    netBalanceChange: income + expenses,
                    transactions: userTransactions
                });
                alert(`Tax report generated for ${foundUser.data.name}. Displaying transaction summary.`);
            } else {
                setReportData(null);
                alert('User not found.');
            }
        } catch (error) {
            console.error("Error generating tax report:", error);
            alert(`Failed to generate tax report: ${error.message}`);
        }
    };

    const handleViewAuditLogs = async () => {
        if (!auditUserId) {
            alert('Please enter a User ID to view audit logs.');
            return;
        }
        try {
            const foundUser = await findUserByDiscordOrBankId(auditUserId);
            if (foundUser) {
                // In a real app, audit logs would be more comprehensive (system events, admin actions etc.)
                // For now, we'll show their transaction history as audit logs.
                setAuditLogs({
                    userName: foundUser.data.name,
                    discordId: foundUser.data.discordId,
                    logs: foundUser.data.transactions || []
                });
                alert(`Audit logs fetched for ${foundUser.data.name}. Displaying transaction history.`);
            } else {
                setAuditLogs(null);
                alert('User not found.');
            }
        } catch (error) {
            console.error("Error fetching audit logs:", error);
            alert(`Failed to fetch audit logs: ${error.message}`);
        }
    };

    const handleUndoFixTransaction = () => {
        if (!transactionIdToFix) {
            alert('Please enter a Transaction ID or Error Log ID.');
            return;
        }
        alert(`Simulating correction for transaction/error ID: ${transactionIdToFix}. (This feature requires complex backend logic for actual undo/fix operations.)`);
        setTransactionIdToFix('');
    };

    const handleAdjustBalance = async () => {
        const amount = parseFloat(adjustAmount);
        if (isNaN(amount) || amount <= 0 || !adjustBalanceUserId) {
            alert('Please enter a valid amount and User ID.');
            return;
        }

        try {
            const foundUser = await findUserByDiscordOrBankId(adjustBalanceUserId);
            if (!foundUser) {
                alert('User not found.');
                return;
            }
            const userDocRef = doc(db, `artifacts/${appId}/users`, foundUser.id);
            const currentUserData = foundUser.data;
            let newBalance = currentUserData.balance || 0;
            let newPersonalAccountBalance = currentUserData.accounts?.Personal || 0;
            let description = '';

            if (adjustType === 'deposit') {
                newBalance += amount;
                newPersonalAccountBalance += amount;
                description = `Admin Balance Adjustment: +${amount.toFixed(2)} RUB`;
            } else {
                if (newBalance < amount) {
                    alert('Insufficient funds for withdrawal adjustment.');
                    return;
                }
                newBalance -= amount;
                newPersonalAccountBalance -= amount;
                description = `Admin Balance Adjustment: -${amount.toFixed(2)} RUB`;
            }

            await updateDoc(userDocRef, {
                balance: newBalance,
                'accounts.Personal': newPersonalAccountBalance,
                transactions: [...(currentUserData.transactions || []), {
                    date: new Date().toLocaleDateString('en-US'),
                    description: description,
                    amount: adjustType === 'deposit' ? amount : -amount,
                    status: 'Complete',
                    adminAdjust: true
                }]
            });
            alert(`Balance for ${adjustBalanceUserId} adjusted by ${adjustType === 'deposit' ? '+' : '-'}${amount.toFixed(2)} RUB. New balance: ${newBalance.toFixed(2)} RUB.`);
            setAdjustBalanceUserId('');
            setAdjustAmount('');
        } catch (error) {
            console.error("Error adjusting balance:", error);
            alert(`Failed to adjust balance: ${error.message}`);
        }
    };

    return (
        <div className="p-8 w-full">
            <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>Reports & Audits</h3>

            {/* Generate Tax Reports */}
            <section className="mb-8">
                <h4 className="text-2xl font-semibold mb-4 flex items-center" style={{ color: COLORS.primaryAccent }}><FileText size={24} className="mr-2" /> Generate Tax Reports</h4>
                <GlassCard className="p-6">
                    <input type="text" placeholder="User Discord ID / Entity ID" value={reportUserId} onChange={(e) => setReportUserId(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                    <button onClick={handleGenerateTaxReport} className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-300" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Generate Report</button>
                    {reportData && (
                        <div className="mt-4 p-4 rounded-lg text-sm" style={{ backgroundColor: COLORS.tertiary, color: COLORS.typography }}>
                            <p className="font-semibold" style={{ color: COLORS.primaryAccent }}>Tax Report Summary for {reportData.userName} ({reportData.discordId}):</p>
                            <p>Total Income: ₽{reportData.totalIncome.toFixed(2)}</p>
                            <p>Total Expenses: ₽{reportData.totalExpenses.toFixed(2)}</p>
                            <p>Net Balance Change: ₽{reportData.netBalanceChange.toFixed(2)}</p>
                            <h5 className="font-semibold mt-3" style={{ color: COLORS.primaryAccent }}>Recent Transactions:</h5>
                            <ul className="list-disc list-inside max-h-40 overflow-y-auto">
                                {reportData.transactions.slice(-5).reverse().map((t, i) => ( // Show last 5 transactions
                                    <li key={i}>{t.date}: {t.description} ({t.amount > 0 ? '+' : ''}{t.amount?.toFixed(2)} RUB)</li>
                                ))}
                            </ul>
                            <p className="text-xs italic mt-2">Note: This is a simplified transaction summary. A full tax report would involve more detailed categorization and calculations.</p>
                        </div>
                    )}
                </GlassCard>
            </section>

            {/* View Audit Logs (Detailed) */}
            <section className="mb-8">
                <h4 className="text-2xl font-semibold mb-4 flex items-center" style={{ color: COLORS.primaryAccent }}><BarChart size={24} className="mr-2" /> View Audit Logs (Detailed)</h4>
                <GlassCard className="p-6">
                    <input type="text" placeholder="User Discord ID / Transaction ID" value={auditUserId} onChange={(e) => setAuditUserId(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                    <button onClick={handleViewAuditLogs} className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-300" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Fetch Logs</button>
                    {auditLogs && (
                        <div className="mt-4 p-4 rounded-lg text-sm" style={{ backgroundColor: COLORS.tertiary, color: COLORS.typography }}>
                            <p className="font-semibold" style={{ color: COLORS.primaryAccent }}>Audit Logs for {auditLogs.userName} ({auditLogs.discordId}):</p>
                            <h5 className="font-semibold mt-3" style={{ color: COLORS.primaryAccent }}>Transaction History:</h5>
                            <ul className="list-disc list-inside max-h-40 overflow-y-auto">
                                {auditLogs.logs.slice(-10).reverse().map((log, i) => ( // Show last 10 logs
                                    <li key={i}>{log.date}: {log.description} ({log.amount > 0 ? '+' : ''}{log.amount?.toFixed(2)} RUB) [Status: {log.status}]</li>
                                ))}
                            </ul>
                            <p className="text-xs italic mt-2">Note: This displays transaction history as audit logs. A full audit system would track all user and system actions.</p>
                        </div>
                    )}
                </GlassCard>
            </section>

            {/* Undo / Fix Transactions */}
            <section className="mb-8">
                <h4 className="text-2xl font-semibold mb-4 flex items-center" style={{ color: COLORS.primaryAccent }}><DollarSign size={24} className="mr-2" /> Undo / Fix Transactions</h4>
                <GlassCard className="p-6">
                    <input type="text" placeholder="Transaction ID / Error Log ID" value={transactionIdToFix} onChange={(e) => setTransactionIdToFix(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                    <button onClick={handleUndoFixTransaction} className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-300" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Correct Entry (Simulated)</button>
                    <p className="text-sm text-gray-400 italic mt-2">Note: Actual undo/fix requires robust transaction logging and rollback capabilities, which are complex to implement client-side.</p>
                </GlassCard>
            </section>

            {/* Balance Adjust Tool */}
            <section className="mb-8">
                <h4 className="text-2xl font-semibold mb-4 flex items-center" style={{ color: COLORS.primaryAccent }}><DollarSign size={24} className="mr-2" /> Balance Adjust Tool</h4>
                <GlassCard className="p-6">
                    <input type="text" placeholder="User Discord ID or Bank ID" value={adjustBalanceUserId} onChange={(e) => setAdjustBalanceUserId(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                    <input type="number" placeholder="Amount" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                    <select value={adjustType} onChange={(e) => setAdjustType(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }}>
                        <option value="deposit">Increase Balance</option>
                        <option value="withdraw">Decrease Balance</option>
                    </select>
                    <button onClick={handleAdjustBalance} className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-300" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Adjust Balance</button>
                    <p className="text-sm text-gray-400 italic mt-2">Manually increase or decrease a user's personal account balance.</p>
                </GlassCard>
            </section>
        </div>
    );
};

export default AdminReportsAudits;
