import React, { useState } from 'react';
import GlassCard from '../common/GlassCard';
import { COLORS } from '../../constants';
import { FileText, Award, CreditCard } from 'lucide-react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

const AdminCreditLoans = ({ db, appId, findUserByDiscordOrBankId }) => {
    const [targetUserId, setTargetUserId] = useState('');
    const [newCreditScore, setNewCreditScore] = useState('');
    const [penaltyType, setPenaltyType] = useState('Credit Overuse: Tier 1');
    const [penaltyUserId, setPenaltyUserId] = useState(''); // Separate state for penalty user ID

    const handleUpdateCreditScore = async (e) => {
        e.preventDefault();
        const score = parseInt(newCreditScore);
        if (isNaN(score) || score < 300 || score > 850) {
            alert('Please enter a valid credit score between 300 and 850.');
            return;
        }
        if (!targetUserId) {
            alert('Please enter a User ID to update credit score.');
            return;
        }

        try {
            const foundUser = await findUserByDiscordOrBankId(targetUserId);
            if (foundUser) {
                const userDocRef = doc(db, `artifacts/${appId}/users`, foundUser.id);
                await updateDoc(userDocRef, { creditScore: score });
                alert(`Credit score for ${targetUserId} updated to ${score}.`);
                setNewCreditScore('');
                setTargetUserId('');
            } else {
                alert('User not found.');
            }
        } catch (error) {
            console.error("Error updating credit score:", error);
            alert(`Failed to update credit score: ${error.message}`);
        }
    };

    const handleApplyPenalty = async () => {
        if (!penaltyUserId) {
            alert('Please enter a User ID to apply penalty.');
            return;
        }

        try {
            const foundUser = await findUserByDiscordOrBankId(penaltyUserId);
            if (!foundUser) {
                alert('User not found.');
                return;
            }
            const userDocRef = doc(db, `artifacts/${appId}/users`, foundUser.id);
            const currentUserData = foundUser.data;
            let newScore = currentUserData.creditScore;
            let updateData = {};
            let message = '';

            switch (penaltyType) {
                case 'Credit Overuse: Tier 1':
                    newScore = Math.max(300, newScore - 15);
                    message = `System Warning issued. Credit score for ${penaltyUserId} reduced by 15 to ${newScore}.`;
                    updateData = { creditScore: newScore };
                    break;
                case 'Credit Overuse: Tier 2':
                    newScore = Math.max(300, newScore - 40);
                    message = `3-5 day credit freeze applied. Credit score for ${penaltyUserId} reduced by 40 to ${newScore}.`;
                    updateData = { creditScore: newScore, isCreditFrozen: true, creditFreezeEndDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() }; // 5 days from now
                    break;
                case 'Credit Overuse: Tier 3':
                    newScore = Math.max(300, newScore - 80);
                    message = `30-day card suspension applied. Credit score for ${penaltyUserId} reduced by 80 to ${newScore}. Admin review required.`;
                    updateData = { creditScore: newScore, isCreditCardSuspended: true, creditCardSuspensionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() }; // 30 days from now
                    alert("Admin review required for Maxed Out Abuse."); // Additional alert for admin
                    break;
                case 'Missed Payment: Tier 1':
                    newScore = Math.max(300, newScore - 20);
                    message = `Reminder sent. Credit score for ${penaltyUserId} reduced by 20 to ${newScore}.`;
                    updateData = { creditScore: newScore };
                    break;
                case 'Missed Payment: Tier 2':
                    newScore = Math.max(300, newScore - 50);
                    message = `Interest +10% applied. Credit score for ${penaltyUserId} reduced by 50 to ${newScore}.`;
                    updateData = { creditScore: newScore, loanInterestIncrease: (currentUserData.loanInterestIncrease || 0) + 0.10 }; // Conceptual: increase interest on active loans
                    break;
                case 'Missed Payment: Tier 3':
                    newScore = Math.max(300, newScore - 100);
                    message = `Block on new loans (7 days) applied. Credit score for ${penaltyUserId} reduced by 100 to ${newScore}.`;
                    updateData = { creditScore: newScore, newLoanBlockedEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() }; // 7 days from now
                    break;
                case 'Loan Default: Tier 1':
                    newScore = Math.max(300, newScore - 75);
                    message = `Warning sent. Credit score for ${penaltyUserId} reduced by 75 to ${newScore}.`;
                    updateData = { creditScore: newScore };
                    break;
                case 'Loan Default: Tier 2':
                    message = `Asset review started. New credit access frozen for ${penaltyUserId}.`;
                    updateData = { isCreditFrozen: true, creditFreezeEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() }; // Long freeze for asset review
                    break;
                case 'Loan Default: Tier 3':
                    message = `Loan blacklist and account lock applied for ${penaltyUserId}.`;
                    updateData = { isLoanBlacklisted: true, isFrozen: true };
                    break;
                case 'Suspicious Activity: Tier 1':
                    newScore = Math.max(300, newScore - 30);
                    message = `Log flag and Admin alert issued. Credit score for ${penaltyUserId} reduced by 30 to ${newScore}.`;
                    updateData = { creditScore: newScore, isSuspicious: true };
                    alert("Admin alert: Light irregularities detected.");
                    break;
                case 'Suspicious Activity: Tier 2':
                    message = `Immediate account freeze and oversight review for ${penaltyUserId}.`;
                    updateData = { isFrozen: true, isSuspicious: true };
                    alert("Oversight review triggered for confirmed misconduct.");
                    break;
                case 'Suspicious Activity: Tier 3':
                    newScore = Math.max(300, newScore - (currentUserData.creditScore - 400)); // Set score to < 400
                    message = `Internal Affairs triggered. Credit score for ${penaltyUserId} set to < 400.`;
                    updateData = { creditScore: newScore, isSuspicious: true, triggerInternalAffairs: true };
                    alert("Ministry-linked or high-value fraud detected. Internal Affairs triggered.");
                    break;
                default:
                    alert('Invalid penalty type selected.');
                    return;
            }

            await updateDoc(userDocRef, updateData);
            alert(message);
            setPenaltyUserId('');

        } catch (error) {
            console.error("Error applying penalty:", error);
            alert(`Failed to apply penalty: ${error.message}`);
        }
    };

    return (
        <div className="p-8 w-full">
            <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>Credit & Loans</h3>

            {/* Loan Review Dashboard */}
            <section className="mb-8">
                <h4 className="text-2xl font-semibold mb-4 flex items-center" style={{ color: COLORS.primaryAccent }}><FileText size={24} className="mr-2" /> Loan Review Dashboard</h4>
                <GlassCard className="p-6">
                    <p className="text-sm text-gray-400 mb-4">View pending loan requests by type (Personal, Business, Mortgage, Government-backed).</p>
                    <button onClick={() => alert('Please navigate to "Account Queues" -> "Loan Requests" in the sidebar to view pending loan requests.')} className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-200" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>View Requests by Type</button>
                </GlassCard>
            </section>

            {/* Update Credit Score */}
            <section className="mb-8">
                <h4 className="text-2xl font-semibold mb-4 flex items-center" style={{ color: COLORS.primaryAccent }}><Award size={24} className="mr-2" /> Update Credit Score</h4>
                <GlassCard className="p-6">
                    <form onSubmit={handleUpdateCreditScore} className="space-y-4">
                        <input type="text" placeholder="User Discord ID or Bank ID" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        <input type="number" placeholder="New Score (300-850)" value={newCreditScore} onChange={(e) => setNewCreditScore(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        <button type="submit" className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-200" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Update Score</button>
                    </form>
                </GlassCard>
            </section>

            {/* Apply Penalties */}
            <section className="mb-8">
                <h4 className="text-2xl font-semibold mb-4 flex items-center" style={{ color: COLORS.primaryAccent }}><CreditCard size={24} className="mr-2" /> Apply Penalties</h4>
                <GlassCard className="p-6">
                    <input type="text" placeholder="User Discord ID or Bank ID" value={penaltyUserId} onChange={(e) => setPenaltyUserId(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                    <select value={penaltyType} onChange={(e) => setPenaltyType(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }}>
                        <optgroup label="Credit Overuse Penalties">
                            <option value="Credit Overuse: Tier 1">Tier 1: Mild Overuse (-15 Credit)</option>
                            <option value="Credit Overuse: Tier 2">Tier 2: Chronic Overuse (-40 Credit, 3-5 day freeze)</option>
                            <option value="Credit Overuse: Tier 3">Tier 3: Maxed Out Abuse (-80 Credit, 30-day suspension)</option>
                        </optgroup>
                        <optgroup label="Missed Payment Penalties">
                            <option value="Missed Payment: Tier 1">Tier 1: First Missed Payment (-20 Credit)</option>
                            <option value="Missed Payment: Tier 2">Tier 2: Second Missed Payment (-50 Credit, Interest +10%)</option>
                            <option value="Missed Payment: Tier 3">Tier 3: Third Strike (-100 Credit, Block new loans 7 days)</option>
                        </optgroup>
                        <optgroup label="Loan Default Penalties">
                            <option value="Loan Default: Tier 1">Tier 1: Default Notice (-75 Credit)</option>
                            <option value="Loan Default: Tier 2">Tier 2: Asset Seizure Pending (Freeze new credit access)</option>
                            <option value="Loan Default: Tier 3">Tier 3: Final Default (Loan blacklist, Account lock)</option>
                        </optgroup>
                        <optgroup label="Suspicious Activity Flag Tiers">
                            <option value="Suspicious Activity: Tier 1">Tier 1: Initial Flag (-30 Credit, Admin alert)</option>
                            <option value="Suspicious Activity: Tier 2">Tier 2: Confirmed Misconduct (Immediate account freeze)</option>
                            <option value="Suspicious Activity: Tier 3">Tier 3: Government-Level Suspicion (Set Credit Score &lt; 400)</option>
                        </optgroup>
                    </select>
                    <button onClick={handleApplyPenalty} className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-200 bg-red-600 hover:bg-red-500" style={{ boxShadow: `0 0 10px rgba(255,0,0,0.5)` }}>Apply Penalty</button>
                </GlassCard>
            </section>
        </div>
    );
};

export default AdminCreditLoans;
