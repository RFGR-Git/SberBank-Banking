import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import GlassCard from './common/GlassCard';
import { COLORS } from '../constants';

const LoanCreditSystemLayout = ({ userProfile, setUserProfile, db, appId, auth }) => {
    const [loanAmount, setLoanAmount] = useState('');
    const [repaymentPeriod, setRepaymentPeriod] = useState('');
    const [interestRate, setInterestRate] = useState('');
    const [monthlyPayment, setMonthlyPayment] = useState(0);

    // Function to determine credit score tier and associated information
    const getCreditScoreTier = (score) => {
        if (score >= 800) return { tier: 'Excellent', color: COLORS.primaryAccent, description: 'VIP status, priority approval' };
        if (score >= 750) return { tier: 'Very Good', color: COLORS.primaryAccent, description: 'Preferred rates, better limits' };
        if (score >= 650) return { tier: 'Good', color: COLORS.primaryAccent, description: 'Credit card access, standard loans' };
        if (score >= 550) return { tier: 'Fair', color: 'orange', description: 'Small loans; secured card eligibility' };
        if (score >= 400) return { tier: 'Poor', color: 'red', description: 'No credit card access; loan denial' };
        return { tier: 'Very Poor', color: 'darkred', description: 'No credit privileges, high risk' };
    };

    const creditScoreInfo = getCreditScoreTier(userProfile.creditScore);

    // Handle credit card application
    const handleApplyForCreditCard = async () => {
        if (userProfile.creditScore >= 650) { // Check if credit score is sufficient
            try {
                const userDocRef = doc(db, `artifacts/${appId}/users`, auth.currentUser.uid);
                // Update user profile to indicate they have a credit card and initialize its balance
                await updateDoc(userDocRef, {
                    hasCreditCard: true,
                    'accounts.CreditCard': 0.00
                });
                alert("Congratulations! Your credit card application has been approved. Your credit score is now visible on your dashboard.");
            } catch (error) {
                console.error("Error applying for credit card:", error);
                alert(`Failed to apply for credit card: ${error.message}`);
            }
        } else {
            alert(`Your current credit score (${userProfile.creditScore}) is too low for a credit card. A score of 650 or higher is required.`);
        }
    };

    // Handle loan application
    const handleApplyForLoan = async (e) => {
        e.preventDefault();
        const amount = parseFloat(loanAmount);
        const period = parseInt(repaymentPeriod);
        if (isNaN(amount) || amount <= 0 || isNaN(period) || period <= 0) {
            alert('Please enter valid loan amount and repayment period.');
            return;
        }

        if (userProfile.creditScore < 550) { // Check if credit score is sufficient for a loan
            alert(`Your credit score (${userProfile.creditScore}) is too low for a loan. Minimum 550 required.`);
            return;
        }

        try {
            const userDocRef = doc(db, `artifacts/${appId}/users`, auth.currentUser.uid);
            // Add loan amount to user's balance and record transaction
            await updateDoc(userDocRef, {
                balance: userProfile.balance + amount,
                transactions: [...userProfile.transactions, {
                    date: new Date().toLocaleDateString('en-US'),
                    description: `Loan Received (Term: ${period} months)`,
                    amount: amount,
                    status: 'Complete'
                }]
            });
            alert(`Loan of ${amount.toFixed(2)} RUB for ${period} months approved and added to your balance.`);
            setLoanAmount('');
            setRepaymentPeriod('');
        } catch (error) {
            console.error("Error applying for loan:", error);
            alert(`Failed to apply for loan: ${error.message}`);
        }
    };

    // Calculate estimated monthly loan payment
    const calculateLoan = (e) => {
        e.preventDefault();
        const amount = parseFloat(loanAmount);
        const period = parseInt(repaymentPeriod);
        const rate = parseFloat(interestRate);

        if (isNaN(amount) || amount <= 0 || isNaN(period) || period <= 0 || isNaN(rate) || rate < 0) {
            setMonthlyPayment(0);
            return;
        }

        const monthlyRate = rate / 12;
        const calculatedPayment = amount * (monthlyRate * Math.pow(1 + monthlyRate, period)) / (Math.pow(1 + monthlyRate, period) - 1);
        setMonthlyPayment(isNaN(calculatedPayment) ? 0 : calculatedPayment);
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h2 className="text-4xl font-extrabold mb-8 text-center drop-shadow-sm" style={{ color: COLORS.primaryAccent }}>🧾 Loan & Credit System</h2>

            {/* Apply for Loans Section */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>Apply for a Loan</h3>
                <GlassCard className="p-8">
                    <form onSubmit={handleApplyForLoan} className="space-y-4">
                        <select className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }}>
                            <option>Personal Loan</option>
                            <option>Business Loan</option>
                            <option>Mortgage</option>
                        </select>
                        <input type="number" placeholder="Loan Amount (RUB)" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} required />
                        <input type="number" placeholder="Repayment Period (Months)" value={repaymentPeriod} onChange={(e) => setRepaymentPeriod(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} required />
                        <p className="text-sm text-gray-400 italic">Interest rates and penalties apply.</p>
                        <button type="submit" className="w-full font-bold py-3 px-6 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-300" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 15px ${COLORS.buttonsGlow}` }}>Apply for Loan</button>
                    </form>
                </GlassCard>
            </section>

            {/* Credit Score System (Conditional Visibility) */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>Credit Score</h3>
                {userProfile.hasCreditCard ? ( // Only show detailed credit score if user has a credit card
                    <GlassCard className="p-8 text-center">
                        <p className="text-3xl font-extrabold" style={{ color: creditScoreInfo.color }}>{userProfile.creditScore} ({creditScoreInfo.tier})</p>
                        <p className="text-gray-400 italic mt-2">
                            Your Credit Score is based on:
                            <ul className="list-disc list-inside text-left mx-auto max-w-md mt-4">
                                <li>Account Open Duration: Longer is better.</li>
                                <li>Current Balance: Higher balances improve score.</li>
                                <li>Repayment Frequency: Payments before every Saturday (reporting date) improve score.</li>
                            </ul>
                        </p>
                        <h4 className="text-2xl font-semibold mt-8 mb-4" style={{ color: COLORS.primaryAccent }}>Credit Score Impact</h4>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left text-sm">
                                <thead style={{ color: COLORS.primaryAccent }}>
                                    <tr>
                                        <th className="py-2 px-3">Event/Behavior</th>
                                        <th className="py-2 px-3">Score Impact</th>
                                        <th className="py-2 px-3">Frequency</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    <tr><td className="py-2 px-3 text-green-500">✅ On-time Bill/Rent Pay</td><td className="py-2 px-3">+6</td><td className="py-2 px-3">per 8hr window</td></tr>
                                    <tr><td className="py-2 px-3 text-green-500">💳 Low Credit Usage (&lt;30%)</td><td className="py-2 px-3">+4</td><td className="py-2 px-3">per 8hr window</td></tr>
                                    <tr><td className="py-2 px-3 text-green-500">💼 Loan Repaid in Full</td><td className="py-2 px-3">+40</td><td className="py-2 px-3">One-time</td></tr>
                                    <tr><td className="py-2 px-3 text-green-500">💸 Active Transfers / Use</td><td className="py-2 px-3">+3</td><td className="py-2 px-3">if done in cycle</td></tr>
                                    <tr><td className="py-2 px-3 text-green-500">🏦 Savings Grown &gt; ₽5k</td><td className="py-2 px-3">+2</td><td className="py-2 px-3">per 8hr window</td></tr>
                                    <tr><td className="py-2 px-3 text-red-500">❌ Late Payment</td><td className="py-2 px-3">-15</td><td className="py-2 px-3">per missed deadline</td></tr>
                                    <tr><td className="py-2 px-3 text-red-500">💀 Loan Default</td><td className="py-2 px-3">-25</td><td className="py-2 px-3">One-time</td></tr>
                                    <tr><td className="py-2 px-3 text-red-500">🚨 Overused Credit (&gt;90%)</td><td className="py-2 px-3">-10</td><td className="py-2 px-3">per 8hr cycle</td></tr>
                                    <tr><td className="py-2 px-3 text-red-500">⚠️ Flagged by Auditor/Admin</td><td className="py-2 px-3">-30</td><td className="py-2 px-3">Manual</td></tr>
                                </tbody>
                            </table>
                        </div>

                        <h4 className="text-2xl font-semibold mt-8 mb-4" style={{ color: COLORS.primaryAccent }}>Credit Card Features</h4>
                        <ul className="list-disc list-inside text-left mx-auto max-w-md">
                            <li>Credit Limit: ₽10,000 base (increases with score)</li>
                            <li>Score Boost: +4 per cycle of low usage (under 30%)</li>
                            <li>Missed Payment: -20 immediate drop</li>
                            <li>Utilization: &lt;30% = boost / 30–90% = neutral / &gt;90% = penalty</li>
                        </ul>

                        <h4 className="text-2xl font-semibold mt-8 mb-4" style={{ color: COLORS.primaryAccent }}>Your Credit Status</h4>
                        <GlassCard className="p-4 text-left" style={{ backgroundColor: COLORS.secondaryAccent }}>
                            <p className="text-lg font-bold" style={{ color: COLORS.primaryAccent }}>Credit Score: {userProfile.creditScore} ({creditScoreInfo.tier})</p>
                            <p className="text-sm text-gray-400 mt-2">Next Review In: 2h 38m (Simulated)</p>
                            <p className="text-sm text-gray-400">Last Activity: Deposit ₽3,200 (✓ counted)</p>
                            <p className="text-sm text-red-500">Warning: Missed rent payment last cycle (Simulated)</p>
                        </GlassCard>
                    </GlassCard>
                ) : (
                    // Prompt to apply for credit card if not already done
                    <GlassCard className="p-8 text-center">
                        <p className="text-lg text-gray-400">Apply for a Credit Card to view your Credit Score and unlock related features.</p>
                        <button onClick={handleApplyForCreditCard} className="mt-4 font-bold py-2 px-6 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-300" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Apply for Credit Card</button>
                    </GlassCard>
                )}
            </section>

            {/* Loan Calculator Section */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>Loan Calculator</h3>
                <GlassCard className="p-8">
                    <form onSubmit={calculateLoan} className="space-y-4">
                        <input type="number" placeholder="Loan Amount" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        <input type="number" placeholder="Repayment Period (Months)" value={repaymentPeriod} onChange={(e) => setRepaymentPeriod(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        <input type="number" placeholder="Annual Interest Rate (e.g., 0.05)" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} step="0.01" className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        <button type="submit" className="w-full font-bold py-3 px-6 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-300" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 15px ${COLORS.buttonsGlow}` }}>Calculate Schedule</button>
                        <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: COLORS.tertiary, color: COLORS.typography }}>
                            <p className="font-semibold" style={{ color: COLORS.primaryAccent }}>Estimated Monthly Payment: {monthlyPayment.toFixed(2)} RUB</p>
                            <p className="text-sm text-gray-400">Full repayment schedule would appear here.</p>
                        </div>
                    </form>
                </GlassCard>
            </section>
        </div>
    );
};

export default LoanCreditSystemLayout;
