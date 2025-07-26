import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import GlassCard from './common/GlassCard';
import { COLORS } from '../constants';

const BankingServicesLayout = ({ userProfile, setUserProfile, db, appId, auth }) => {
    const [transferAmount, setTransferAmount] = useState('');
    const [recipient, setRecipient] = useState('');
    const [transferCurrency, setTransferCurrency] = useState('RUB');
    const [depositAmount, setDepositAmount] = useState('');
    const [withdrawalAmount, setWithdrawalAmount] = useState('');
    const [exchangeAmount, setExchangeAmount] = useState('');
    const [fromCurrency, setFromCurrency] = useState('RUB');
    const [toCurrency, setToCurrency] = useState('USD');
    const [exchangeResult, setExchangeResult] = useState(0);

    const exchangeRates = {
        RUB: { USD: 0.011, EUR: 0.010 },
        USD: { RUB: 90.00, EUR: 0.92 },
        EUR: { RUB: 100.00, USD: 1.08 },
    };

    const handleTransfer = async (e) => {
        e.preventDefault();
        const amount = parseFloat(transferAmount);
        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid amount.');
            return;
        }
        if (userProfile.balance < amount) {
            alert('Insufficient funds for transfer.');
            return;
        }

        try {
            const userDocRef = doc(db, `artifacts/${appId}/users`, auth.currentUser.uid);
            await updateDoc(userDocRef, {
                balance: userProfile.balance - amount,
                'accounts.Personal': userProfile.accounts.Personal - amount, // Assume transfer from personal
                transactions: [...userProfile.transactions, {
                    date: new Date().toLocaleDateString('en-US'),
                    description: `Transfer to ${recipient}`,
                    amount: -amount,
                    status: 'Complete'
                }]
            });
            alert(`Transferred ${amount.toFixed(2)} ${transferCurrency} to ${recipient}.`);
            setTransferAmount('');
            setRecipient('');
        } catch (error) {
            console.error("Error during transfer:", error);
            alert(`Transfer failed: ${error.message}`);
        }
    };

    const handleDeposit = async (e) => {
        e.preventDefault();
        const amount = parseFloat(depositAmount);
        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid amount.');
            return;
        }

        try {
            const userDocRef = doc(db, `artifacts/${appId}/users`, auth.currentUser.uid);
            await updateDoc(userDocRef, {
                balance: userProfile.balance + amount,
                'accounts.Personal': userProfile.accounts.Personal + amount, // Assume deposit to personal
                transactions: [...userProfile.transactions, {
                    date: new Date().toLocaleDateString('en-US'),
                    description: 'Cash Deposit',
                    amount: amount,
                    status: 'Complete'
                }]
            });
            alert(`Deposited ${amount.toFixed(2)} RUB.`);
            setDepositAmount('');
        } catch (error) {
            console.error("Error during deposit:", error);
            alert(`Deposit failed: ${error.message}`);
        }
    };

    const handleWithdrawal = async (e) => {
        e.preventDefault();
        const amount = parseFloat(withdrawalAmount);
        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid amount.');
            return;
        }
        if (userProfile.balance < amount) {
            alert('Insufficient funds for withdrawal.');
            return;
        }

        try {
            const userDocRef = doc(db, `artifacts/${appId}/users`, auth.currentUser.uid);
            await updateDoc(userDocRef, {
                balance: userProfile.balance - amount,
                'accounts.Personal': userProfile.accounts.Personal - amount, // Assume withdrawal from personal
                transactions: [...userProfile.transactions, {
                    date: new Date().toLocaleDateString('en-US'),
                    description: 'Cash Withdrawal',
                    amount: -amount,
                    status: 'Complete'
                }]
            });
            alert(`Withdrew ${amount.toFixed(2)} RUB.`);
            setWithdrawalAmount('');
        } catch (error) {
            console.error("Error during withdrawal:", error);
            alert(`Withdrawal failed: ${error.message}`);
        }
    };

    const handleExchange = async (e) => {
        e.preventDefault();
        const amount = parseFloat(exchangeAmount);
        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid amount.');
            return;
        }
        if (fromCurrency === toCurrency) {
            alert('Cannot exchange to the same currency.');
            return;
        }

        const rate = exchangeRates[fromCurrency]?.[toCurrency];
        if (!rate) {
            alert('Exchange rate not available for selected currencies.');
            return;
        }

        if (userProfile.balance < amount) { // Simplified: assume all exchanges from main balance
            alert(`Insufficient RUB balance for exchange.`);
            return;
        }

        const convertedAmount = amount * rate;
        setExchangeResult(convertedAmount);

        try {
            const userDocRef = doc(db, `artifacts/${appId}/users`, auth.currentUser.uid);
            await updateDoc(userDocRef, {
                balance: userProfile.balance - amount, // Deduct from main balance
                'accounts.Personal': userProfile.accounts.Personal - amount, // Update personal account with new RUB balance
                transactions: [...userProfile.transactions, {
                    date: new Date().toLocaleDateString('en-US'),
                    description: `Currency Exchange: ${amount.toFixed(2)} ${fromCurrency} to ${convertedAmount.toFixed(2)} ${toCurrency}`,
                    amount: -amount, // Show original currency deduction
                    status: 'Complete'
                }]
            });
            alert(`Exchanged ${amount.toFixed(2)} ${fromCurrency} to ${convertedAmount.toFixed(2)} ${toCurrency}.`);
        } catch (error) {
            console.error("Error during exchange:", error);
            alert(`Exchange failed: ${error.message}`);
        }
    };


    return (
        <div className="container mx-auto px-4 py-8">
            <h2 className="text-4xl font-extrabold mb-8 text-center drop-shadow-sm" style={{ color: COLORS.primaryAccent }}>💵 Banking Services</h2>

            {/* Money Transfers */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>Money Transfers</h3>
                <GlassCard className="p-8">
                    <form onSubmit={handleTransfer} className="space-y-4">
                        <input type="text" placeholder="Recipient Account Number / Bank ID" value={recipient} onChange={(e) => setRecipient(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} required />
                        <input type="number" placeholder="Amount" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} required />
                        <select value={transferCurrency} onChange={(e) => setTransferCurrency(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }}>
                            <option>RUB</option><option>USD</option><option>EUR</option>
                        </select>
                        <p className="text-sm text-gray-400 italic">Note: Fees and delays apply for interbank/international transfers.</p>
                        <button type="submit" className="w-full font-bold py-3 px-6 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-300" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 15px ${COLORS.buttonsGlow}` }}>Initiate Transfer</button>
                    </form>
                </GlassCard>
            </section>

            {/* Deposit & Withdrawal Options */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>Deposit & Withdrawal</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <GlassCard className="p-6">
                        <h4 className="text-2xl font-semibold mb-4" style={{ color: COLORS.primaryAccent }}>Deposit Funds</h4>
                        <form onSubmit={handleDeposit} className="space-y-4">
                            <input type="number" placeholder="Amount" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} required />
                            <button type="submit" className="w-full font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-200" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Deposit (Manual Approval)</button>
                        </form>
                    </GlassCard>
                    <GlassCard className="p-6">
                        <h4 className="text-2xl font-semibold mb-4" style={{ color: COLORS.primaryAccent }}>Withdraw Funds</h4>
                        <form onSubmit={handleWithdrawal} className="space-y-4">
                            <input type="number" placeholder="Amount" value={withdrawalAmount} onChange={(e) => setWithdrawalAmount(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} required />
                            <button type="submit" className="w-full font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-200" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Withdraw to Cash/Digital Wallet</button>
                        </form>
                    </GlassCard>
                </div>
            </section>

            {/* Currency Exchange */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>Currency Exchange</h3>
                <GlassCard className="p-8">
                    <form onSubmit={handleExchange} className="space-y-4">
                        <input type="number" placeholder="Amount to Exchange" value={exchangeAmount} onChange={(e) => setExchangeAmount(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} required />
                        <div className="grid grid-cols-2 gap-4">
                            <select value={fromCurrency} onChange={(e) => setFromCurrency(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }}>
                                <option>RUB</option><option>USD</option><option>EUR</option>
                            </select>
                            <select value={toCurrency} onChange={(e) => setToCurrency(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }}>
                                <option>USD</option><option>RUB</option><option>EUR</option>
                            </select>
                        </div>
                        <p className="text-xl font-semibold text-center" style={{ color: COLORS.primaryAccent }}>Result: {exchangeResult.toFixed(2)} {toCurrency}</p>
                        <button type="submit" className="w-full font-bold py-3 px-6 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-300" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 15px ${COLORS.buttonsGlow}` }}>Calculate & Exchange</button>
                    </form>
                </GlassCard>
            </section>
        </div>
    );
};

export default BankingServicesLayout;
