import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import GlassCard from './common/GlassCard';
import { COLORS } from '../constants';

const CardDigitalPaymentSystemLayout = ({ userProfile, setUserProfile, db, appId, auth }) => {
    const [paymentRecipient, setPaymentRecipient] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentCurrency, setPaymentCurrency] = useState('RUB');

    // Helper function to generate random debit card details
    const generateRandomCardDetails = () => {
        const num = Array(4).fill(0).map(() => Math.floor(1000 + Math.random() * 9000)).join(' '); // 16-digit number
        const issueDate = new Date('2005-01-01'); // Fixed issue date
        const expiryDate = new Date(issueDate);
        expiryDate.setFullYear(issueDate.getFullYear() + 7); // 7 years expiration
        const expiryMonth = String(expiryDate.getMonth() + 1).padStart(2, '0');
        const expiryYear = String(expiryDate.getFullYear()).slice(-2); // Last two digits of year
        const cvv = String(Math.floor(100 + Math.random() * 900)); // 3-digit CVV
        const pin = String(Math.floor(1000 + Math.random() * 9000)); // 4-digit PIN
        return {
            number: num,
            expiry: `${expiryMonth}/${expiryYear}`,
            cvv,
            pin,
            issueDate: issueDate.toISOString(), // Store as ISO string for date comparisons
            expiryDate: expiryDate.toISOString(), // Store as ISO string for date comparisons
        };
    };

    // Handle generation of a new virtual card
    const handleGenerateVirtualCard = async () => {
        // Ensure a personal account exists before generating a card
        if (userProfile.accounts.Personal === 0) {
            alert('You must have a Personal Account to generate a virtual card.');
            return;
        }

        const newCard = generateRandomCardDetails(); // Generate new card details
        try {
            const userDocRef = doc(db, `artifacts/${appId}/users`, auth.currentUser.uid);
            // Update user's profile in Firestore with the new debit card
            await updateDoc(userDocRef, { debitCard: newCard });
            alert('New virtual card generated!');
        } catch (error) {
            console.error("Error generating virtual card:", error);
            alert(`Failed to generate virtual card: ${error.message}`);
        }
    };

    // Handle simulation of a digital payment
    const handleSimulatePayment = async (e) => {
        e.preventDefault();
        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid amount.');
            return;
        }
        if (userProfile.balance < amount) {
            alert('Insufficient funds for payment.');
            return;
        }

        try {
            const userDocRef = doc(db, `artifacts/${appId}/users`, auth.currentUser.uid);
            // Deduct payment amount from overall balance and personal account (simplified)
            await updateDoc(userDocRef, {
                balance: userProfile.balance - amount,
                'accounts.Personal': userProfile.accounts.Personal - amount,
                transactions: [...userProfile.transactions, { // Add transaction record
                    date: new Date().toLocaleDateString('en-US'),
                    description: `Digital Payment to ${paymentRecipient}`,
                    amount: -amount, // Negative for outflow
                    status: 'Complete'
                }]
            });
            alert(`Simulated payment of ${amount.toFixed(2)} ${paymentCurrency} to ${paymentRecipient}.`);
            setPaymentRecipient('');
            setPaymentAmount('');
        } catch (error) {
            console.error("Error during payment simulation:", error);
            alert(`Payment simulation failed: ${error.message}`);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h2 className="text-4xl font-extrabold mb-8 text-center drop-shadow-sm" style={{ color: COLORS.primaryAccent }}>💳 Card & Digital Payment System</h2>

            {/* Virtual Debit Card Generator Section */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>Virtual Debit Card Generator</h3>
                <GlassCard className="p-8">
                    <button onClick={handleGenerateVirtualCard} className="w-full font-bold py-3 px-6 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-300" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 15px ${COLORS.buttonsGlow}` }}>Generate New Virtual Card</button>
                    {userProfile.debitCard && ( // Display card details if a debit card exists
                        <div className="mt-8 bg-gradient-to-br from-[#00FFAA10] to-[#0D0D0D] text-white p-6 rounded-xl shadow-xl border border-opacity-10 border-white">
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-lg font-semibold">Sberbank Virtual Debit</span>
                                <img src="https://placehold.co/40x25/00FFAA/0D0D0D?text=VISA" alt="Visa Logo" className="h-6" />
                            </div>
                            <p className="text-3xl font-mono tracking-wider mb-4">{userProfile.debitCard.number}</p>
                            <div className="flex justify-between text-sm mb-2">
                                <span>Valid Thru: {userProfile.debitCard.expiry}</span>
                                <span>CVV: {userProfile.debitCard.cvv}</span>
                            </div>
                            <p className="text-sm">PIN: {userProfile.debitCard.pin}</p>
                            <p className="text-xl font-bold mt-4">Balance: {userProfile.accounts.Personal.toFixed(2)} RUB</p>
                        </div>
                    )}
                </GlassCard>
            </section>

            {/* Payment Gateway Simulation Section */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>Payment Gateway Simulation</h3>
                <GlassCard className="p-8">
                    <form onSubmit={handleSimulatePayment} className="space-y-4">
                        <input type="text" placeholder="Recipient (Business/Service)" value={paymentRecipient} onChange={(e) => setPaymentRecipient(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} required />
                        <input type="number" placeholder="Amount" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} required />
                        <select value={paymentCurrency} onChange={(e) => setPaymentCurrency(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }}>
                            <option>RUB</option><option>USD</option><option>EUR</option>
                        </select>
                        <button type="submit" className="w-full font-bold py-3 px-6 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-300" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 15px ${COLORS.buttonsGlow}` }}>Simulate Payment</button>
                    </form>
                </GlassCard>
            </section>

            {/* QR / Payment Code (Removed as per request) - Kept as a section header for clarity */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>QR / Payment Code (Removed)</h3>
                <GlassCard className="p-8 text-center">
                    <p className="text-gray-400">QR / Payment Code simulation has been removed for this draft phase.</p>
                </GlassCard>
            </section>
        </div>
    );
};

export default CardDigitalPaymentSystemLayout;
