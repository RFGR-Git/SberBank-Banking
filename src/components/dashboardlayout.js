import React, { useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import GlassCard from './common/GlassCard';
import { COLORS } from '../constants';
import { UserCog, Briefcase, Landmark, TrendingUp, PiggyBank, CreditCard, UserRoundSearch, PlusCircle, FileText, Shield } from 'lucide-react';

const DashboardLayout = ({ userProfile, setCurrentView, db, appId, auth }) => {
    const getCreditScoreTier = (score) => {
        if (score >= 800) return { tier: 'Excellent', color: COLORS.primaryAccent, description: 'VIP status, priority approval' };
        if (score >= 750) return { tier: 'Very Good', color: COLORS.primaryAccent, description: 'Preferred rates, better limits' };
        if (score >= 650) return { tier: 'Good', color: COLORS.primaryAccent, description: 'Credit card access, standard loans' };
        if (score >= 550) return { tier: 'Fair', color: 'orange', description: 'Small loans; secured card eligibility' };
        if (score >= 400) return { tier: 'Poor', color: 'red', description: 'No credit card access; loan denial' };
        return { tier: 'Very Poor', color: 'darkred', description: 'No credit privileges, high risk' };
    };

    const creditScoreInfo = getCreditScoreTier(userProfile.creditScore);

    // Check if any account has a balance > 0 to show Account Overview
    const hasAnyAccountOpened = Object.values(userProfile.accounts || {}).some(balance => typeof balance === 'number' ? balance > 0 : Object.values(balance || {}).some(val => val > 0));
    const hasTransactions = userProfile.transactions && userProfile.transactions.length > 0;

    // Debit card expiration logic
    useEffect(() => {
        if (userProfile && userProfile.debitCard && auth.currentUser) {
            const cardExpiryDateISO = userProfile.debitCard.expiryDate;
            if (!cardExpiryDateISO) return; // Ensure expiryDate exists

            const cardExpiry = new Date(cardExpiryDateISO);
            const fiveDaysBeforeExpiry = new Date(cardExpiry);
            fiveDaysBeforeExpiry.setDate(cardExpiry.getDate() - 5);
            const now = new Date();

            if (now >= fiveDaysBeforeExpiry && now < cardExpiry) {
                // Simulate card renewal
                const newExpiryDate = new Date(cardExpiry);
                newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 7); // Extend by 7 years
                const newExpiryMonth = String(newExpiryDate.getMonth() + 1).padStart(2, '0');
                const newExpiryYear = String(newExpiryDate.getFullYear()).slice(-2);

                const updatedDebitCard = {
                    ...userProfile.debitCard,
                    expiry: `${newExpiryMonth}/${newExpiryYear}`,
                    expiryDate: newExpiryDate.toISOString(), // Store as ISO string for date comparison
                };

                const userDocRef = doc(db, `artifacts/${appId}/users`, auth.currentUser.uid);
                updateDoc(userDocRef, { debitCard: updatedDebitCard })
                    .then(() => console.log("Debit card renewed automatically."))
                    .catch(error => console.error("Error renewing debit card:", error));
            }
        }
    }, [userProfile, db, appId, auth.currentUser]);


    return (
        <div className="container mx-auto px-4 py-8">
            <h2 className="text-4xl font-extrabold mb-8 text-center drop-shadow-sm" style={{ color: COLORS.primaryAccent }}>🏛️ Your Client Dashboard</h2>

            {/* Hero Section - Large Glassy Card */}
            <GlassCard className="p-10 mb-12 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#00FFAA10] to-[#0D0D0D] opacity-20 z-0"></div>
                <div className="relative z-10">
                    <p className="text-xl font-semibold mb-3" style={{ color: COLORS.typography }}>Overall Balance</p>
                    <p className="font-bold text-6xl mb-4" style={{ color: COLORS.primaryAccent }}>{userProfile.balance.toFixed(2)} RUB</p>
                    <p className="text-lg mb-2" style={{ color: COLORS.typography }}>User ID / Identity: {userProfile.discordId}</p>
                    {/* Credit Score only visible if credit card applied */}
                    {userProfile.hasCreditCard && (
                        <p className="text-lg mb-6" style={{ color: COLORS.typography }}>
                            Credit Score: <span className="font-bold" style={{ color: creditScoreInfo.color }}>{userProfile.creditScore} ({creditScoreInfo.tier})</span>
                        </p>
                    )}
                    <button
                        onClick={() => { setCurrentView('banking-services'); }} // Link to banking services for transactions
                        className="font-bold py-3 px-8 rounded-full text-lg shadow-lg transform hover:scale-105 transition-all duration-300"
                        style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 20px ${COLORS.buttonsGlow}` }}
                    >
                        💸 Make a Transaction
                    </button>
                </div>
            </GlassCard>

            {/* Account Overview Cards - Only show if any account is opened */}
            {hasAnyAccountOpened && (
                <section className="mb-12">
                    <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>Account Overview</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {userProfile.accounts.Personal > 0 && (
                            <GlassCard className="p-6">
                                <div className="flex items-center mb-3">
                                    <UserCog color={COLORS.primaryAccent} size={30} className="mr-3" />
                                    <h4 className="text-xl font-semibold" style={{ color: COLORS.primaryAccent }}>Personal Account</h4>
                                </div>
                                <p className="text-lg">₽ {userProfile.accounts.Personal.toFixed(2)}</p>
                            </GlassCard>
                        )}
                        {userProfile.accounts.Business > 0 && (
                            <GlassCard className="p-6">
                                <div className="flex items-center mb-3">
                                    <Briefcase color={COLORS.primaryAccent} size={30} className="mr-3" />
                                    <h4 className="text-xl font-semibold" style={{ color: COLORS.primaryAccent }}>Business Account</h4>
                                </div>
                                <p className="text-lg">₽ {userProfile.accounts.Business.toFixed(2)}</p>
                            </GlassCard>
                        )}
                        {userProfile.accounts.Government > 0 && (
                            <GlassCard className="p-6">
                                <div className="flex items-center mb-3">
                                    <Landmark color={COLORS.primaryAccent} size={30} className="mr-3" />
                                    <h4 className="text-xl font-semibold" style={{ color: COLORS.primaryAccent }}>Government Grants</h4>
                                </div>
                                <p className="text-lg">₽ {userProfile.accounts.Government.toFixed(2)}</p>
                            </GlassCard>
                        )}
                        {userProfile.accounts.Investment > 0 && (
                            <GlassCard className="p-6">
                                <div className="flex items-center mb-3">
                                    <TrendingUp color={COLORS.primaryAccent} size={30} className="mr-3" />
                                    <h4 className="text-xl font-semibold" style={{ color: COLORS.primaryAccent }}>Investment Balance</h4>
                                </div>
                                <p className="text-lg">₽ {userProfile.accounts.Investment.toFixed(2)}</p>
                            </GlassCard>
                        )}
                        {userProfile.accounts.Savings > 0 && (
                            <GlassCard className="p-6">
                                <div className="flex items-center mb-3">
                                    <PiggyBank color={COLORS.primaryAccent} size={30} className="mr-3" />
                                    <h4 className="text-xl font-semibold" style={{ color: COLORS.primaryAccent }}>Savings Account</h4>
                                </div>
                                <p className="text-lg">₽ {userProfile.accounts.Savings.toFixed(2)}</p>
                            </GlassCard>
                        )}
                         {userProfile.accounts.CreditCard > 0 && (
                            <GlassCard className="p-6">
                                <div className="flex items-center mb-3">
                                    <CreditCard color={COLORS.primaryAccent} size={30} className="mr-3" />
                                    <h4 className="text-xl font-semibold" style={{ color: COLORS.primaryAccent }}>Credit Card Balance</h4>
                                </div>
                                <p className="text-lg">₽ {userProfile.accounts.CreditCard.toFixed(2)}</p>
                            </GlassCard>
                        )}
                        {userProfile.accounts.Shadow > 0 && (
                            <GlassCard className="p-6">
                                <div className="flex items-center mb-3">
                                    <UserRoundSearch color={COLORS.primaryAccent} size={30} className="mr-3" />
                                    <h4 className="text-xl font-semibold" style={{ color: COLORS.primaryAccent }}>Shadow Account</h4>
                                </div>
                                <p className="text-lg">₽ {userProfile.accounts.Shadow.toFixed(2)}</p>
                            </GlassCard>
                        )}
                    </div>
                </section>
            )}


            {/* Quick Actions */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <GlassCard className="p-4 text-center cursor-pointer hover:shadow-xl transition-shadow duration-300" style={{ boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }} onClick={() => { setCurrentView('open-account'); }}>
                        <PlusCircle color={COLORS.primaryAccent} size={30} className="mx-auto mb-2" />
                        <p className="font-semibold" style={{ color: COLORS.typography }}>Open New Account</p>
                    </GlassCard>
                    <GlassCard className="p-4 text-center cursor-pointer hover:shadow-xl transition-shadow duration-300" style={{ boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }} onClick={() => { setCurrentView('loans-credit'); }}>
                        <FileText color={COLORS.primaryAccent} size={30} className="mx-auto mb-2" />
                        <p className="font-semibold" style={{ color: COLORS.typography }}>Apply for Loan</p>
                    </GlassCard>
                    {userProfile.accountType === 'Government' && ( // Government Portal only for government accounts
                        <GlassCard className="p-4 text-center cursor-pointer hover:shadow-xl transition-shadow duration-300" style={{ boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }} onClick={() => { setCurrentView('government-portal'); }}>
                            <Landmark color={COLORS.primaryAccent} size={30} className="mx-auto mb-2" />
                            <p className="font-semibold" style={{ color: COLORS.typography }}>Government Portal</p>
                        </GlassCard>
                    )}
                    <GlassCard className="p-4 text-center cursor-pointer hover:shadow-xl transition-shadow duration-300" style={{ boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }} onClick={() => { setCurrentView('security'); }}>
                        <Shield color={COLORS.primaryAccent} size={30} className="mx-auto mb-2" />
                        <p className="font-semibold" style={{ color: COLORS.typography }}>Security</p>
                    </GlassCard>
                </div>
            </section>

            {/* Transaction History - Only show if any transactions exist */}
            {hasTransactions && (
                <section className="mb-12">
                    <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>📊 Transaction History</h3>
                    <GlassCard className="p-6 overflow-x-auto">
                        <table className="min-w-full">
                            <thead style={{ color: COLORS.primaryAccent }}>
                                <tr>
                                    <th className="py-3 px-4 text-left text-sm font-semibold uppercase tracking-wider">Date</th>
                                    <th className="py-3 px-4 text-left text-sm font-semibold uppercase tracking-wider">Description</th>
                                    <th className="py-3 px-4 text-right text-sm font-semibold uppercase tracking-wider">Amount</th>
                                    <th className="py-3 px-4 text-left text-sm font-semibold uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {userProfile.transactions.map((tx, index) => (
                                    <tr key={index} className="hover:bg-white hover:bg-opacity-10 transition-colors duration-200">
                                        <td className="py-3 px-4">{tx.date}</td>
                                        <td className="py-3 px-4">{tx.description}</td>
                                        <td className="py-3 px-4 text-right" style={{ color: tx.amount >= 0 ? COLORS.primaryAccent : 'red' }}>{tx.amount.toFixed(2)} RUB</td>
                                        <td className="py-3 px-4">✅ {tx.status}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </GlassCard>
                </section>
            )}

            {/* Registered Debit Card Display - Only show if Personal Account is opened and debitCard exists */}
            {userProfile.accounts.Personal > 0 && userProfile.debitCard && (
                <section className="mb-12">
                    <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>💳 Your Debit Card</h3>
                    <GlassCard className="p-6 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#00FFAA10] to-[#0D0D0D] opacity-20 z-0"></div>
                        <div className="relative z-10 text-white">
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-lg font-semibold">Sberbank Debit Card</span>
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
                    </GlassCard>
                </section>
            )}
        </div>
    );
};

export default DashboardLayout;
