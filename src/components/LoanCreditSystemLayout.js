import React, { useState, useEffect } from 'react';
import { doc, updateDoc, collection, query, where, getDocs, getDoc, addDoc, onSnapshot } from 'firebase/firestore';
import GlassCard from './common/GlassCard';
import { COLORS } from '../constants';
import { CreditCard, DollarSign, FileText, BarChart, Lock, Shield, TrendingUp, Landmark, Truck, Building, FileBadge, Coins, Package, MapPin } from 'lucide-react';

const LoanCreditSystemLayout = ({ userProfile, db, appId }) => {
    const [loanType, setLoanType] = useState('Personal Loan');
    const [loanAmount, setLoanAmount] = useState('');
    const [repaymentPeriod, setRepaymentPeriod] = useState(12); // in months
    const [interestRate, setInterestRate] = useState(0.05); // 5% annual
    const [collateralLink, setCollateralLink] = useState(''); // For asset-backed loans
    const [downPayment, setDownPayment] = useState(''); // For mortgage
    const [propertyRegion, setPropertyRegion] = useState(''); // For mortgage
    const [loanHistory, setLoanHistory] = useState([]);

    useEffect(() => {
        if (!db || !userProfile || !userProfile.id) return;

        const userDocRef = doc(db, `artifacts/${appId}/users`, userProfile.id);
        const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setLoanHistory(docSnap.data().loanHistory || []);
            }
        }, (error) => console.error("Error fetching loan history:", error));

        return () => unsubscribe();
    }, [db, userProfile, appId]);

    const handleLoanRequest = async (e) => {
        e.preventDefault();
        const amount = parseFloat(loanAmount);
        const downPmt = parseFloat(downPayment);

        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid loan amount.');
            return;
        }
        if (loanType === 'Mortgage Loan' && (isNaN(downPmt) || downPmt < 0)) {
            alert('Please enter a valid down payment for Mortgage Loan.');
            return;
        }
        if (loanType === 'Mortgage Loan' && !propertyRegion) {
            alert('Please specify the property region for Mortgage Loan.');
            return;
        }
        if (loanType === 'Business Loan' && !collateralLink) {
            alert('Please provide a collateral link for Business Loan.');
            return;
        }

        try {
            const loanRequestData = {
                userId: userProfile.id,
                userName: userProfile.name,
                discordId: userProfile.discordId,
                loanType,
                amount,
                repaymentPeriod,
                interestRate,
                creditScore: userProfile.creditScore,
                status: 'Pending',
                timestamp: new Date().toISOString(),
                collateralLink: loanType === 'Business Loan' ? collateralLink : null,
                downPayment: loanType === 'Mortgage Loan' ? downPmt : null,
                propertyRegion: loanType === 'Mortgage Loan' ? propertyRegion : null,
            };

            await addDoc(collection(db, `artifacts/${appId}/public/data/loanRequests`), loanRequestData);
            alert('Loan request submitted successfully! Awaiting admin approval.');

            // Clear form
            setLoanAmount('');
            setCollateralLink('');
            setDownPayment('');
            setPropertyRegion('');

        } catch (error) {
            console.error("Error submitting loan request:", error);
            alert(`Failed to submit loan request: ${error.message}`);
        }
    };

    const calculateMonthlyPayment = (principal, annualRate, periods) => {
        if (annualRate === 0) return principal / periods;
        const monthlyRate = annualRate / 12;
        return (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -periods));
    };

    const estimatedMonthlyPayment = loanAmount && repaymentPeriod && interestRate
        ? calculateMonthlyPayment(parseFloat(loanAmount), interestRate, parseInt(repaymentPeriod)).toFixed(2)
        : '0.00';

    const getLoanRequirements = () => {
        switch (loanType) {
            case 'Personal Loan':
                return 'No collateral required. Approval based on credit score.';
            case 'Business Loan':
                return 'Requires collateral (e.g., business assets, inventory).';
            case 'Mortgage Loan':
                return 'Requires a down payment and specified property region.';
            case 'Government-Backed Loan':
                return 'Requires specific government approval and purpose. No collateral.';
            default:
                return '';
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h2 className="text-4xl font-extrabold mb-8 text-center drop-shadow-sm" style={{ color: COLORS.primaryAccent }}>💰 Loan & Credit System</h2>

            {/* Apply for New Loan */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6 flex items-center" style={{ color: COLORS.typography }}><FileText size={30} className="mr-3" /> Apply for a New Loan</h3>
                <GlassCard className="p-8">
                    <form onSubmit={handleLoanRequest} className="space-y-6">
                        <div>
                            <label className="block text-lg font-medium mb-2" style={{ color: COLORS.typography }}>Loan Type</label>
                            <select value={loanType} onChange={(e) => setLoanType(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }}>
                                <option value="Personal Loan">Personal Loan</option>
                                <option value="Business Loan">Business Loan</option>
                                <option value="Mortgage Loan">Mortgage Loan</option>
                                <option value="Government-Backed Loan">Government-Backed Loan</option>
                            </select>
                            <p className="text-sm text-gray-400 italic mt-2">{getLoanRequirements()}</p>
                        </div>

                        <div>
                            <label className="block text-lg font-medium mb-2" style={{ color: COLORS.typography }}>Loan Amount (RUB)</label>
                            <input type="number" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} placeholder="e.g., 50000" className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        </div>

                        <div>
                            <label className="block text-lg font-medium mb-2" style={{ color: COLORS.typography }}>Repayment Period (Months)</label>
                            <input type="number" value={repaymentPeriod} onChange={(e) => setRepaymentPeriod(e.target.value)} placeholder="e.g., 12" min="1" className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        </div>

                        <div>
                            <label className="block text-lg font-medium mb-2" style={{ color: COLORS.typography }}>Annual Interest Rate (%)</label>
                            <input type="number" step="0.01" value={(interestRate * 100).toFixed(2)} onChange={(e) => setInterestRate(parseFloat(e.target.value) / 100)} placeholder="e.g., 5.00" className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        </div>

                        {(loanType === 'Business Loan' || loanType === 'Mortgage Loan') && (
                            <div>
                                <label className="block text-lg font-medium mb-2" style={{ color: COLORS.typography }}>Collateral / Asset Proof Link (Discord/Image)</label>
                                <input type="text" value={collateralLink} onChange={(e) => setCollateralLink(e.target.value)} placeholder="Link to asset proof (e.g., Discord message link)" className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                                <p className="text-sm text-gray-400 italic mt-2">Required for Business Loans.</p>
                            </div>
                        )}

                        {loanType === 'Mortgage Loan' && (
                            <>
                                <div>
                                    <label className="block text-lg font-medium mb-2" style={{ color: COLORS.typography }}>Down Payment (RUB)</label>
                                    <input type="number" value={downPayment} onChange={(e) => setDownPayment(e.target.value)} placeholder="e.g., 10000" className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                                </div>
                                <div>
                                    <label className="block text-lg font-medium mb-2" style={{ color: COLORS.typography }}>Property Region</label>
                                    <input type="text" value={propertyRegion} onChange={(e) => setPropertyRegion(e.target.value)} placeholder="e.g., Moscow, Siberia" className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                                </div>
                            </>
                        )}

                        <div className="text-center p-4 rounded-lg" style={{ backgroundColor: COLORS.tertiary, color: COLORS.typography }}>
                            <p className="text-xl font-bold">Estimated Monthly Payment: ₽{estimatedMonthlyPayment}</p>
                            <p className="text-sm text-gray-400">Based on your input, this is an estimate. Final terms subject to approval.</p>
                        </div>

                        <button type="submit" className="w-full font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-200" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>
                            Submit Loan Request
                        </button>
                    </form>
                </GlassCard>
            </section>

            {/* Current Loan Status */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6 flex items-center" style={{ color: COLORS.typography }}><TrendingUp size={30} className="mr-3" /> Current Loan Status</h3>
                <GlassCard className="p-8">
                    {loanHistory.length === 0 ? (
                        <p className="text-gray-400 text-center">No active or past loans found.</p>
                    ) : (
                        <ul className="space-y-4">
                            {loanHistory.map((loan, index) => (
                                <li key={index} className="p-4 rounded-lg" style={{ backgroundColor: COLORS.tertiary }}>
                                    <p className="font-semibold text-lg" style={{ color: COLORS.primaryAccent }}>{loan.type} - ₽{loan.amount?.toLocaleString()}</p>
                                    <p className="text-sm text-gray-400">Status: <span className={`font-bold ${loan.status === 'Active' ? 'text-green-500' : 'text-yellow-500'}`}>{loan.status}</span></p>
                                    <p className="text-sm text-gray-400">Issued: {loan.dateIssued} | Term: {loan.repaymentPeriod} months | Rate: {(loan.interestRate * 100).toFixed(2)}%</p>
                                    {loan.status === 'Active' && (
                                        <p className="text-sm text-gray-400">Monthly Payment: ₽{loan.monthlyPayment?.toFixed(2) || 'N/A'}</p>
                                    )}
                                    {loan.collateralLink && (
                                        <p className="text-sm text-gray-400">Collateral: <a href={loan.collateralLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">View Proof</a></p>
                                    )}
                                    {loan.loanType === 'Mortgage Loan' && (
                                        <p className="text-sm text-gray-400">Down Payment: ₽{loan.downPayment?.toLocaleString() || 0}, Region: {loan.propertyRegion}</p>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </GlassCard>
            </section>

            {/* Credit Score Overview */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6 flex items-center" style={{ color: COLORS.typography }}><CreditCard size={30} className="mr-3" /> Credit Score Overview</h3>
                <GlassCard className="p-8 text-center">
                    <p className="text-lg" style={{ color: COLORS.typography }}>Your Current Credit Score:</p>
                    <p className="text-6xl font-extrabold my-4" style={{ color: userProfile.creditScore >= 700 ? 'green' : userProfile.creditScore >= 500 ? 'orange' : 'red' }}>
                        {userProfile.creditScore || 'N/A'}
                    </p>
                    <p className="text-sm text-gray-400 italic">A higher score improves your loan eligibility and credit limits.</p>
                    <div className="mt-6">
                        <h4 className="text-xl font-semibold mb-3" style={{ color: COLORS.primaryAccent }}>Credit Score Factors:</h4>
                        <ul className="list-disc list-inside text-left text-gray-400 text-sm space-y-1">
                            <li>Payment History: Timely loan repayments and bill payments.</li>
                            <li>Credit Utilization: How much of your available credit you're using.</li>
                            <li>Length of Credit History: How long you've had credit accounts.</li>
                            <li>New Credit: Number of recent credit applications.</li>
                            <li>Credit Mix: Variety of credit accounts (e.g., loans, credit cards).</li>
                        </ul>
                    </div>
                </GlassCard>
            </section>

            {/* Credit Card Management */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6 flex items-center" style={{ color: COLORS.typography }}><CreditCard size={30} className="mr-3" /> Credit Card Management</h3>
                <GlassCard className="p-8">
                    {userProfile.hasCreditCard ? (
                        <div className="text-center">
                            <p className="text-lg font-semibold" style={{ color: COLORS.primaryAccent }}>You have an active Credit Card!</p>
                            <p className="text-xl my-2" style={{ color: COLORS.typography }}>Credit Limit: ₽{userProfile.accounts?.CreditCard?.toLocaleString() || '0'}</p>
                            <p className="text-sm text-gray-400">Manage your credit card through your main dashboard.</p>
                        </div>
                    ) : (
                        <div className="text-center">
                            <p className="text-lg font-semibold mb-4" style={{ color: COLORS.primaryAccent }}>Apply for a Credit Card</p>
                            <p className="text-gray-400 mb-4">Improve your credit score and gain financial flexibility with a SberBank credit card. Your current credit score is {userProfile.creditScore}.</p>
                            <button onClick={() => alert('Credit card application is handled via the "Apply for Account" section in the main dashboard.')} className="font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-200" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>
                                Apply Now
                            </button>
                        </div>
                    )}
                </GlassCard>
            </section>

            {/* Advanced Credit Tools (Info Only) */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6 flex items-center" style={{ color: COLORS.typography }}><Settings size={30} className="mr-3" /> Advanced Credit Tools (Info Only)</h3>
                <GlassCard className="p-8">
                    <ul className="space-y-3 text-gray-400">
                        <li><span className="font-semibold" style={{ color: COLORS.primaryAccent }}>Credit Score Simulator:</span> See how financial actions impact your score.</li>
                        <li><span className="font-semibold" style={{ color: COLORS.primaryAccent }}>Debt Consolidation Calculator:</span> Plan to combine multiple debts into one loan.</li>
                        <li><span className="font-semibold" style={{ color: COLORS.primaryAccent }}>Loan Refinancing Options:</span> Explore options to lower interest rates or monthly payments.</li>
                        <li><span className="font-semibold" style={{ color: COLORS.primaryAccent }}>Credit Counseling Resources:</span> Access external resources for financial guidance.</li>
                    </ul>
                </GlassCard>
            </section>
        </div>
    );
};

export default LoanCreditSystemLayout;
