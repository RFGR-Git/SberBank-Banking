import React, { useState } from 'react';
import { doc, updateDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore'; // Added query, where, getDocs, addDoc
import GlassCard from './common/GlassCard';
import { COLORS } from '../constants';

const BankingServicesLayout = ({ userProfile, setUserProfile, db, appId, auth }) => {
    const [transferAmount, setTransferAmount] = useState('');
    const [recipientBankId, setRecipientBankId] = useState(''); // Changed to recipientBankId
    const [transferSourceAccount, setTransferSourceAccount] = useState('Personal'); // New: Source account for transfer
    const [transferCurrency, setTransferCurrency] = useState('RUB');
    const [depositAmount, setDepositAmount] = useState('');
    const [depositDiscordLink, setDepositDiscordLink] = useState(''); // New: Discord link for deposit proof
    const [withdrawalAmount, setWithdrawalAmount] = useState('');
    const [withdrawalSourceAccount, setWithdrawalSourceAccount] = useState('Personal'); // New: Source account for withdrawal
    const [exchangeAmount, setExchangeAmount] = useState('');
    const [fromCurrency, setFromCurrency] = useState('RUB');
    const [toCurrency, setToCurrency] = useState('USD');
    const [exchangeResult, setExchangeResult] = useState(0);

    // Updated exchange rates
    const exchangeRates = {
        RUB: { USD: 0.43, EUR: 0.36 },
        USD: { RUB: 2.33, EUR: 0.92 }, // 1 USD = 2.33 RUB (inverse of 0.43)
        EUR: { RUB: 2.78, USD: 1.08 }, // 1 EUR = 2.78 RUB
    };

    // Get available accounts for dropdowns
    const availableAccounts = Object.keys(userProfile.accounts || {}).filter(accountType => userProfile.accounts[accountType] > 0);

    // Handle money transfer
    const handleTransfer = async (e) => {
        e.preventDefault();
        const amount = parseFloat(transferAmount);
        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid amount.');
            return;
        }
        // Check if source account has sufficient funds
        if (userProfile.accounts[transferSourceAccount] < amount) {
            alert(`Insufficient funds in your ${transferSourceAccount} account for transfer.`);
            return;
        }
        if (!recipientBankId) {
            alert('Please enter a recipient Bank ID.');
            return;
        }

        try {
            // Find recipient by bankId
            const recipientQuery = query(collection(db, `artifacts/${appId}/users`), where("bankId", "==", recipientBankId));
            const recipientSnapshot = await getDocs(recipientQuery);

            if (recipientSnapshot.empty) {
                alert('Recipient Bank ID not found.');
                return;
            }

            const recipientDoc = recipientSnapshot.docs[0];
            const recipientData = recipientDoc.data();
            const recipientDocRef = doc(db, `artifacts/${appId}/users`, recipientDoc.id);

            // Deduct from sender's account
            const senderDocRef = doc(db, `artifacts/${appId}/users`, auth.currentUser.uid);
            await updateDoc(senderDocRef, {
                [`accounts.${transferSourceAccount}`]: userProfile.accounts[transferSourceAccount] - amount,
                balance: userProfile.balance - amount,
                transactions: [...userProfile.transactions, {
                    date: new Date().toLocaleDateString('en-US'),
                    description: `Transfer to ${recipientData.name} (Bank ID: ${recipientBankId}) from ${transferSourceAccount}`,
                    amount: -amount,
                    status: 'Complete'
                }]
            });

            // Add to recipient's personal account (as specified)
            await updateDoc(recipientDocRef, {
                'accounts.Personal': recipientData.accounts.Personal + amount,
                balance: recipientData.balance + amount,
                transactions: [...recipientData.transactions, {
                    date: new Date().toLocaleDateString('en-US'),
                    description: `Transfer from ${userProfile.name} (Bank ID: ${userProfile.bankId}) to Personal`,
                    amount: amount,
                    status: 'Complete'
                }]
            });

            alert(`Transferred ${amount.toFixed(2)} ${transferCurrency} from ${transferSourceAccount} to ${recipientData.name}.`);
            setTransferAmount('');
            setRecipientBankId('');
        } catch (error) {
            console.error("Error during transfer:", error);
            alert(`Transfer failed: ${error.message}`);
        }
    };

    // Handle deposit request
    const handleDeposit = async (e) => {
        e.preventDefault();
        const amount = parseFloat(depositAmount);
        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid amount.');
            return;
        }
        if (!depositDiscordLink) {
            alert('Please provide a Discord message link as proof of payment to RFGRFTS.');
            return;
        }

        try {
            // Submit deposit request for admin approval
            await addDoc(collection(db, `artifacts/${appId}/public/data/depositRequests`), {
                userId: auth.currentUser.uid,
                userName: userProfile.name,
                amount: amount,
                discordLink: depositDiscordLink,
                status: 'Pending',
                timestamp: new Date().toISOString()
            });
            alert(`Deposit request for ${amount.toFixed(2)} RUB submitted. Awaiting admin approval.`);
            setDepositAmount('');
            setDepositDiscordLink('');
        } catch (error) {
            console.error("Error submitting deposit request:", error);
            alert(`Deposit request failed: ${error.message}`);
        }
    };

    // Handle withdrawal request
    const handleWithdrawal = async (e) => {
        e.preventDefault();
        const amount = parseFloat(withdrawalAmount);
        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid amount.');
            return;
        }
        // Check if source account has sufficient funds (conceptual, admin will verify)
        if (userProfile.accounts[withdrawalSourceAccount] < amount) {
            alert(`Insufficient funds in your ${withdrawalSourceAccount} account for withdrawal. (Admin will verify)`);
            // Continue to submit request even if client-side check fails, as admin has final say
        }

        try {
            // Submit withdrawal request for admin approval
            await addDoc(collection(db, `artifacts/${appId}/public/data/withdrawalRequests`), {
                userId: auth.currentUser.uid,
                userName: userProfile.name,
                amount: amount,
                sourceAccount: withdrawalSourceAccount,
                status: 'Pending',
                timestamp: new Date().toISOString()
            });
            alert(`Withdrawal request for ${amount.toFixed(2)} RUB from ${withdrawalSourceAccount} submitted. Awaiting admin approval.`);
            setWithdrawalAmount('');
        } catch (error) {
            console.error("Error submitting withdrawal request:", error);
            alert(`Withdrawal request failed: ${error.message}`);
        }
    };

    // Handle currency exchange
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

        // Simplified: assume all exchanges affect the main balance (RUB) for now
        // In a real system, you'd manage multi-currency accounts
        if (userProfile.balance < amount) {
            alert(`Insufficient ${fromCurrency} balance for exchange.`);
            return;
        }

        const convertedAmount = amount * rate;
        setExchangeResult(convertedAmount); // Display converted amount

        try {
            const userDocRef = doc(db, `artifacts/${appId}/users`, auth.currentUser.uid);
            // Deduct from overall balance and personal account (simplified)
            await updateDoc(userDocRef, {
                balance: userProfile.balance - amount,
                'accounts.Personal': userProfile.accounts.Personal - amount, // Update personal account with new RUB balance
                transactions: [...userProfile.transactions, { // Add transaction record
                    date: new Date().toLocaleDateString('en-US'),
                    description: `Currency Exchange: ${amount.toFixed(2)} ${fromCurrency} to ${convertedAmount.toFixed(2)} ${toCurrency}`,
                    amount: -amount, // Record original currency deduction
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
                        <div>
                            <label htmlFor="transferSourceAccount" className="block text-lg font-medium mb-2" style={{ color: COLORS.typography }}>Source Account</label>
                            <select id="transferSourceAccount" value={transferSourceAccount} onChange={(e) => setTransferSourceAccount(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }}>
                                {availableAccounts.map(accountType => (
                                    <option key={accountType} value={accountType}>{accountType} (₽{userProfile.accounts[accountType].toFixed(2)})</option>
                                ))}
                            </select>
                        </div>
                        <input type="text" placeholder="Recipient Bank ID" value={recipientBankId} onChange={(e) => setRecipientBankId(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} required />
                        <input type="number" placeholder="Amount" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} required />
                        <select value={transferCurrency} onChange={(e) => setTransferCurrency(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }}>
                            <option>RUB</option><option>USD</option><option>EUR</option>
                        </select>
                        <p className="text-sm text-gray-400 italic">Note: Funds will be transferred to recipient's Personal Account.</p>
                        <button type="submit" className="w-full font-bold py-3 px-6 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-300" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 15px ${COLORS.buttonsGlow}` }}>Initiate Transfer</button>
                    </form>
                </GlassCard>
            </section>

            {/* Deposit & Withdrawal Options */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>Deposit & Withdrawal</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <GlassCard className="p-6">
                        <h4 className="text-2xl font-semibold mb-4" style={{ color: COLORS.primaryAccent }}>Deposit Funds (Admin Approval)</h4>
                        <form onSubmit={handleDeposit} className="space-y-4">
                            <input type="number" placeholder="Amount" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} required />
                            <input type="url" placeholder="Discord Message Link (Proof to RFGRFTS)" value={depositDiscordLink} onChange={(e) => setDepositDiscordLink(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} required />
                            <button type="submit" className="w-full font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-200" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Request Deposit</button>
                        </form>
                    </GlassCard>
                    <GlassCard className="p-6">
                        <h4 className="text-2xl font-semibold mb-4" style={{ color: COLORS.primaryAccent }}>Withdraw Funds (Admin Approval)</h4>
                        <form onSubmit={handleWithdrawal} className="space-y-4">
                            <div>
                                <label htmlFor="withdrawalSourceAccount" className="block text-lg font-medium mb-2" style={{ color: COLORS.typography }}>Source Account</label>
                                <select id="withdrawalSourceAccount" value={withdrawalSourceAccount} onChange={(e) => setWithdrawalSourceAccount(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }}>
                                    {availableAccounts.map(accountType => (
                                        <option key={accountType} value={accountType}>{accountType} (₽{userProfile.accounts[accountType].toFixed(2)})</option>
                                    ))}
                                </select>
                            </div>
                            <input type="number" placeholder="Amount" value={withdrawalAmount} onChange={(e) => setWithdrawalAmount(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} required />
                            <button type="submit" className="w-full font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-200" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Request Withdrawal</button>
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
