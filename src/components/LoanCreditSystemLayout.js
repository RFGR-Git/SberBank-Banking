import React, { useState } from 'react';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore'; // Added addDoc, collection
import GlassCard from './common/GlassCard';
import { COLORS } from '../constants';

const LoanCreditSystemLayout = ({ userProfile, setUserProfile, db, appId, auth }) => {
    const [loanType, setLoanType] = useState('Personal Loan'); // New: Loan type selection
    const [loanAmount, setLoanAmount] = useState('');
    const [repaymentPeriod, setRepaymentPeriod] = useState('');
    const [interestRate, setInterestRate] = useState(''); // This will be dynamically set or calculated
    const [monthlyPayment, setMonthlyPayment] = useState(0);
    const [collateralLink, setCollateralLink] = useState(''); // New: For collateral proof
    const [downPayment, setDownPayment] = useState(''); // New: For mortgage down payment
    const [propertyRegion, setPropertyRegion] = useState(''); // New: For mortgage property region

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

    // Get loan terms based on type and credit score
    const getLoanTerms = (score, type, amount) => {
        if (type === 'Personal Loan') {
            if (score >= 700) return { max: 3000000, rate: 0.05, minTerm: 12, maxTerm: 36, collateralRequired: amount > 1000000 ? 'Optional' : 'No' };
            if (score >= 600) return { max: 1000000, rate: 0.065, minTerm: 6, maxTerm: 24, collateralRequired: 'No' };
            if (score < 600) return { max: 250000, rate: 0.09, minTerm: 3, maxTerm: 12, collateralRequired: 'Yes' };
        } else if (type === 'Mortgage Loan') {
            if (score >= 700) return { max: 10000000, rate: 0.045, minTerm: 60, maxTerm: 60, collateralRequired: 'Always' };
            if (score >= 600) return { max: 5000000, rate: 0.06, minTerm: 48, maxTerm: 48, collateralRequired: 'Always' };
            if (score < 600) return { max: 0, rate: 0, minTerm: 0, maxTerm: 0, collateralRequired: 'Not Eligible' };
        } else if (type === 'Business Loan') { // Placeholder for Business Loans
            if (score >= 650 && amount <= 5000000) return { max: 5000000, rate: 0.05, minTerm: 12, maxTerm: 36, collateralRequired: 'Optional' };
            if (score < 700 && amount > 5000000) return { max: 10000000, rate: 0.07, minTerm: 24, maxTerm: 48, collateralRequired: 'Yes' };
        }
        return { max: 0, rate: 0, minTerm: 0, maxTerm: 0, collateralRequired: 'N/A' };
    };

    // Handle credit card application
    const handleApplyForCreditCard = async () => {
        try {
            // Submit request for admin approval
            await addDoc(collection(db, `artifacts/${appId}/public/data/creditCardRequests`), {
                userId: auth.currentUser.uid,
                userName: userProfile.name,
                creditScore: userProfile.creditScore,
                employmentInfo: 'Simulated Employment Info', // Placeholder
                creditAgreement: 'AGREE', // Placeholder
                status: 'Pending', // Status will be updated by admin or automated check
                timestamp: new Date().toISOString()
            });

            alert('Credit Card application submitted. Check your dashboard for status updates (may be auto-approved based on score).');
        } catch (error) {
            console.error("Error submitting credit card application:", error);
            alert(`Failed to submit Credit Card application: ${error.message}`);
        }
    };

    // Handle loan application
    const handleApplyForLoan = async (e) => {
        e.preventDefault();
        const amount = parseFloat(loanAmount);
        const period = parseInt(repaymentPeriod);
        const terms = getLoanTerms(userProfile.creditScore, loanType, amount);

        if (isNaN(amount) || amount <= 0 || isNaN(period) || period <= 0) {
            alert('Please enter valid loan amount and repayment period.');
            return;
        }

        if (amount > terms.max) {
            alert(`Loan amount exceeds maximum allowed for your credit score (${userProfile.creditScore}) and loan type. Max: ₽${terms.max.toLocaleString()}.`);
            return;
        }
        if (period < terms.minTerm || period > terms.maxTerm) {
            alert(`Repayment period must be between ${terms.minTerm} and ${terms.maxTerm} months for your loan type and credit score.`);
            return;
        }

        // Check for active personal loans (only 1 allowed)
        if (loanType === 'Personal Loan' && userProfile.loanHistory.some(loan => loan.type === 'Personal Loan' && loan.status === 'Active')) {
            alert('You already have an active Personal Loan. Only one active personal loan is allowed at a time.');
            return;
        }

        // Check for missed payments (denial if 2+ in past 60 RP days)
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        const recentMissedPayments = userProfile.loanHistory.filter(loan =>
            loan.status === 'Missed Payment' && new Date(loan.date) > sixtyDaysAgo
        ).length;

        if (recentMissedPayments >= 2) {
            alert('Your loan application is denied due to 2 or more missed payments in the past 60 RP days.');
            return;
        }

        // Collateral checks
        if (terms.collateralRequired === 'Yes' && !collateralLink) {
            alert('Collateral is required for this loan. Please provide a Discord message link for your asset.');
            return;
        }
        if (loanType === 'Mortgage Loan') {
            const minDownPayment = 500000;
            if (parseFloat(downPayment) < minDownPayment) {
                alert(`Minimum down payment for Mortgage is ₽${minDownPayment.toLocaleString()}.`);
                return;
            }
            if (propertyRegion !== userProfile.region) {
                alert('Property must be in your registered RP region.');
                return;
            }
            // Simulate property inspection
            alert('Simulating property inspection... (This would be an automated check)');
        }

        try {
            // Submit loan request for admin approval
            await addDoc(collection(db, `artifacts/${appId}/public/data/loanRequests`), { // New collection for loan requests
                userId: auth.currentUser.uid,
                userName: userProfile.name,
                loanType: loanType,
                amount: amount,
                repaymentPeriod: period,
                interestRate: terms.rate,
                collateralLink: collateralLink,
                downPayment: loanType === 'Mortgage Loan' ? parseFloat(downPayment) : 0,
                propertyRegion: loanType === 'Mortgage Loan' ? propertyRegion : '',
                creditScore: userProfile.creditScore,
                status: 'Pending', // Set status to pending
                timestamp: new Date().toISOString()
            });
            alert(`Loan application for ${amount.toFixed(2)} RUB submitted. Awaiting admin approval.`);
            setLoanAmount('');
            setRepaymentPeriod('');
            setCollateralLink('');
            setDownPayment('');
            setPropertyRegion('');
        } catch (error) {
            console.error("Error submitting loan application:", error);
            alert(`Failed to submit loan application: ${error.message}`);
        }
    };

    // Calculate estimated monthly loan payment
    const calculateLoan = (e) => {
        e.preventDefault();
        const amount = parseFloat(loanAmount);
        const period = parseInt(repaymentPeriod);
        const terms = getLoanTerms(userProfile.creditScore, loanType, amount);
        const rate = terms.rate; // Use the dynamic rate

        if (isNaN(amount) || amount <= 0 || isNaN(period) || period <= 0 || isNaN(rate) || rate < 0) {
            setMonthlyPayment(0);
            setInterestRate('N/A');
            return;
        }

        const monthlyRate = rate / 12;
        const calculatedPayment = amount * (monthlyRate * Math.pow(1 + monthlyRate, period)) / (Math.pow(1 + monthlyRate, period) - 1);
        setMonthlyPayment(isNaN(calculatedPayment) ? 0 : calculatedPayment);
        setInterestRate((rate * 100).toFixed(2) + '%'); // Display as percentage
    };

    const currentLoanTerms = getLoanTerms(userProfile.creditScore, loanType, parseFloat(loanAmount) || 0);


    return (
        <div className="container mx-auto px-4 py-8">
            <h2 className="text-4xl font-extrabold mb-8 text-center drop-shadow-sm" style={{ color: COLORS.primaryAccent }}>🧾 Loan & Credit System</h2>

            {/* Apply for Loans Section */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>Apply for a Loan</h3>
                <GlassCard className="p-8">
                    <form onSubmit={handleApplyForLoan} className="space-y-4">
                        <div>
                            <label htmlFor="loanType" className="block text-lg font-medium mb-2" style={{ color: COLORS.typography }}>Loan Type</label>
                            <select id="loanType" value={loanType} onChange={(e) => setLoanType(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }}>
                                <option>Personal Loan</option>
                                <option>Mortgage Loan</option>
                                <option>Business Loan</option> {/* Added Business Loan option */}
                            </select>
                        </div>
                        <input type="number" placeholder="Loan Amount (RUB)" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} required />
                        <input type="number" placeholder="Repayment Period (Months)" value={repaymentPeriod} onChange={(e) => setRepaymentPeriod(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} required />

                        {loanType === 'Mortgage Loan' && (
                            <>
                                <input type="number" placeholder="Down Payment (RUB)" value={downPayment} onChange={(e) => setDownPayment(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} required />
                                <input type="text" placeholder="Property Registered Region (e.g., Volga Valley)" value={propertyRegion} onChange={(e) => setPropertyRegion(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} required />
                            </>
                        )}

                        {currentLoanTerms.collateralRequired === 'Yes' && (
                            <div>
                                <label htmlFor="collateralLink" className="block text-lg font-medium mb-2" style={{ color: COLORS.typography }}>Collateral Discord Message Link</label>
                                <input type="url" id="collateralLink" value={collateralLink} onChange={(e) => setCollateralLink(e.target.value)} placeholder="https://discord.com/channels/..." className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} required />
                                <p className="text-sm text-gray-400 italic mt-1">Proof of asset pledged for collateral (e.g., vehicle, property, RP item).</p>
                            </div>
                        )}

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
                        <div>
                            <label htmlFor="loanTypeCalc" className="block text-lg font-medium mb-2" style={{ color: COLORS.typography }}>Loan Type</label>
                            <select id="loanTypeCalc" value={loanType} onChange={(e) => setLoanType(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }}>
                                <option>Personal Loan</option>
                                <option>Mortgage Loan</option>
                                <option>Business Loan</option>
                            </select>
                        </div>
                        <input type="number" placeholder="Loan Amount" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        <input type="number" placeholder="Repayment Period (Months)" value={repaymentPeriod} onChange={(e) => setRepaymentPeriod(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        {/* Interest Rate is now dynamically determined by loan type and credit score */}
                        <p className="text-lg font-semibold" style={{ color: COLORS.primaryAccent }}>Calculated Interest Rate: {interestRate || 'N/A'}</p>
                        <button type="submit" className="w-full font-bold py-3 px-6 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-300" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 15px ${COLORS.buttonsGlow}` }}>Calculate Schedule</button>
                        <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: COLORS.tertiary, color: COLORS.typography }}>
                            <p className="font-semibold" style={{ color: COLORS.primaryAccent }}>Estimated Monthly Payment: {monthlyPayment.toFixed(2)} RUB</p>
                            <p className="text-sm text-gray-400">Full repayment schedule would appear here.</p>
                        </div>
                    </form>
                </GlassCard>
            </section>

            {/* Collateral Policy System (Informational) */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>🏛️ Loan Collateral Policy System</h3>
                <GlassCard className="p-8">
                    <h4 className="text-2xl font-semibold mb-4" style={{ color: COLORS.primaryAccent }}>When is Collateral Required?</h4>
                    <div className="overflow-x-auto mb-6">
                        <table className="min-w-full text-left text-sm">
                            <thead style={{ color: COLORS.primaryAccent }}>
                                <tr>
                                    <th className="py-2 px-3">Loan Type</th>
                                    <th className="py-2 px-3">Loan Amount</th>
                                    <th className="py-2 px-3">Credit Score</th>
                                    <th className="py-2 px-3">Collateral Required?</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                <tr><td className="py-2 px-3">Personal Loan</td><td className="py-2 px-3">≤ ₽1,000,000</td><td className="py-2 px-3">600+</td><td className="py-2 px-3">❌ Optional</td></tr>
                                <tr><td className="py-2 px-3">Personal Loan</td><td className="py-2 px-3">> ₽1,000,000</td><td className="py-2 px-3">&lt; 650</td><td className="py-2 px-3">✅ Yes – must list item(s)</td></tr>
                                <tr><td className="py-2 px-3">Mortgage Loan</td><td className="py-2 px-3">Any amount</td><td className="py-2 px-3">Any</td><td className="py-2 px-3">✅ Always – the home is the collateral</td></tr>
                                <tr><td className="py-2 px-3">Business Loan</td><td className="py-2 px-3">≤ ₽5,000,000</td><td className="py-2 px-3">650+</td><td className="py-2 px-3">❌ Optional</td></tr>
                                <tr><td className="py-2 px-3">Business Loan</td><td className="py-2 px-3">> ₽5,000,000</td><td className="py-2 px-3">&lt; 700</td><td className="py-2 px-3">✅ Yes – must list business assets</td></tr>
                            </tbody>
                        </table>
                    </div>

                    <h4 className="text-2xl font-semibold mb-4" style={{ color: COLORS.primaryAccent }}>Accepted Collateral Types (Examples)</h4>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead style={{ color: COLORS.primaryAccent }}>
                                <tr>
                                    <th className="py-2 px-3">Type</th>
                                    <th className="py-2 px-3">Applies To</th>
                                    <th className="py-2 px-3">Example Entries</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                <tr><td className="py-2 px-3">Property</td><td className="py-2 px-3">Mortgage/High-Value</td><td className="py-2 px-3">Registered home, land, etc.</td></tr>
                                <tr><td className="py-2 px-3">Vehicles</td><td className="py-2 px-3">Personal/Business</td><td className="py-2 px-3">Trucks, cars, specialty equipment</td></tr>
                                <tr><td className="py-2 px-3">Business Assets</td><td className="py-2 px-3">Business Loans</td><td className="py-2 px-3">Storefront, inventory, machinery</td></tr>
                                <tr><td className="py-2 px-3">Bonds & Securities</td><td className="py-2 px-3">Personal/Investment</td><td className="py-2 px-3">In-app investment account items</td></tr>
                                <tr><td className="py-2 px-3">RP-Custom Items</td><td className="py-2 px-3">All types</td><td className="py-2 px-3">Custom RP assets: crypto, vessels, etc.</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <p className="text-sm text-gray-400 italic mt-4">⚠️ Value of collateral must be at least 50–75% of the loan amount.</p>
                    <p className="text-sm text-gray-400 italic mt-2">💼 Admin Workflow: Users input assets during loan application. System stores in “Collateral Ledger” attached to loan ID. If loan defaults, admin may seize assets (RP enforcement or flagging system). Assets cannot be sold/transferred while tied to active loan.</p>
                </GlassCard>
            </section>
        </div>
    );
};

export default LoanCreditSystemLayout;
