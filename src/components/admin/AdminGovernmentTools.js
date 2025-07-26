import React, { useState } from 'react';
import GlassCard from '../common/GlassCard';
import { COLORS } from '../../constants';
import { Landmark, Building, FileBadge } from 'lucide-react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

const AdminGovernmentTools = ({ db, appId, findUserByDiscordOrBankId }) => {
    const [govAccountId, setGovAccountId] = useState('');
    const [govAmount, setGovAmount] = useState('');
    const [ministryName, setMinistryName] = useState('');
    const [businessLinkUserId, setBusinessLinkUserId] = useState('');
    const [businessRegId, setBusinessRegId] = useState('');

    const handleGovTransaction = async (type) => {
        const amount = parseFloat(govAmount);
        if (isNaN(amount) || amount <= 0 || !govAccountId) {
            alert('Please enter a valid amount and Government Account ID.');
            return;
        }
        try {
            const foundUser = await findUserByDiscordOrBankId(govAccountId);
            if (!foundUser) {
                alert('Government Account not found.');
                return;
            }
            const userDocRef = doc(db, `artifacts/${appId}/users`, foundUser.id);
            const currentGovBalance = foundUser.data.accounts.Government || 0;
            const currentBalance = foundUser.data.balance || 0;

            let newGovBalance = currentGovBalance;
            let newOverallBalance = currentBalance;
            let description = '';

            if (type === 'deposit') {
                newGovBalance += amount;
                newOverallBalance += amount;
                description = `Government Deposit by Admin`;
            } else {
                if (currentGovBalance < amount) {
                    alert('Insufficient funds in Government Account.');
                    return;
                }
                newGovBalance -= amount;
                newOverallBalance -= amount;
                description = `Government Withdrawal by Admin`;
            }

            await updateDoc(userDocRef, {
                'accounts.Government': newGovBalance,
                balance: newOverallBalance,
                transactions: [...(foundUser.data.transactions || []), {
                    date: new Date().toLocaleDateString('en-US'),
                    description: description,
                    amount: type === 'deposit' ? amount : -amount,
                    status: 'Complete'
                }]
            });
            alert(`${type === 'deposit' ? 'Deposited' : 'Withdrew'} ${amount.toFixed(2)} RUB for Government Account ${govAccountId}.`);
            setGovAccountId('');
            setGovAmount('');
        } catch (error) {
            console.error(`Error during Government ${type}:`, error);
            alert(`Failed to perform Government ${type}: ${error.message}`);
        }
    };

    const handleSetupMinistryAccount = () => {
        if (!ministryName) {
            alert('Please enter a Ministry/Agency Name.');
            return;
        }
        alert(`Simulating setup for Ministry/Agency Account: ${ministryName}. (Actual setup handled via Account Requests Queue).`);
        setMinistryName('');
    };

    const handleLinkBusiness = async () => {
        if (!businessLinkUserId || !businessRegId) {
            alert('Please enter both User ID and Business Registration ID.');
            return;
        }
        try {
            const foundUser = await findUserByDiscordOrBankId(businessLinkUserId);
            if (foundUser) {
                const userDocRef = doc(db, `artifacts/${appId}/users`, foundUser.id);
                // Ensure the user has a business account or it's implicitly created/linked
                // For simplicity, we'll just link the ID and set isBusinessOwner
                await updateDoc(userDocRef, {
                    businessRegistrationId: businessRegId,
                    isBusinessOwner: true,
                    // Optionally, you could also update a specific business account balance here
                    // 'accounts.Business': (foundUser.data.accounts?.Business || 0) // No change to balance on link
                });
                alert(`Business Registration ID ${businessRegId} linked to user ${businessLinkUserId}.`);
                setBusinessLinkUserId('');
                setBusinessRegId('');
            } else {
                alert('User not found.');
            }
        } catch (error) {
            console.error("Error linking business:", error);
            alert(`Failed to link business: ${error.message}`);
        }
    };

    return (
        <div className="p-8 w-full">
            <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>Government Tools</h3>

            {/* Deposit / Withdraw (Gov) */}
            <section className="mb-8">
                <h4 className="text-2xl font-semibold mb-4 flex items-center" style={{ color: COLORS.primaryAccent }}><Landmark size={24} className="mr-2" /> Deposit / Withdraw (Gov)</h4>
                <GlassCard className="p-6">
                    <input type="text" placeholder="Government Account ID" value={govAccountId} onChange={(e) => setGovAccountId(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                    <input type="number" placeholder="Amount" value={govAmount} onChange={(e) => setGovAmount(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                    <div className="flex space-x-4">
                        <button onClick={() => handleGovTransaction('deposit')} className="w-1/2 font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-200" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Deposit</button>
                        <button onClick={() => handleGovTransaction('withdraw')} className="w-1/2 font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-200 bg-orange-600 hover:bg-orange-500" style={{ boxShadow: `0 0 10px rgba(255,165,0,0.5)` }}>Withdraw</button>
                    </div>
                </GlassCard>
            </section>

            {/* Setup Ministry / Agency Account */}
            <section className="mb-8">
                <h4 className="text-2xl font-semibold mb-4 flex items-center" style={{ color: COLORS.primaryAccent }}><Building size={24} className="mr-2" /> Setup Ministry / Agency Account</h4>
                <GlassCard className="p-6">
                    <input type="text" placeholder="Ministry/Agency Name" value={ministryName} onChange={(e) => setMinistryName(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                    <button onClick={handleSetupMinistryAccount} className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-200" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Setup Gov Account (Simulated)</button>
                    <p className="text-sm text-gray-400 italic mt-2">Actual account creation is handled via the "Account Requests Queue".</p>
                </GlassCard>
            </section>

            {/* Link Business to User */}
            <section className="mb-8">
                <h4 className="text-2xl font-semibold mb-4 flex items-center" style={{ color: COLORS.primaryAccent }}><FileBadge size={24} className="mr-2" /> Link Business to User</h4>
                <GlassCard className="p-6">
                    <input type="text" placeholder="User Discord ID or Bank ID" value={businessLinkUserId} onChange={(e) => setBusinessLinkUserId(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                    <input type="text" placeholder="Business Reg. ID" value={businessRegId} onChange={(e) => setBusinessRegId(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                    <button onClick={handleLinkBusiness} className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-200" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Link Business</button>
                    <p className="text-sm text-gray-400 italic mt-2">Links a business registration ID to a user, marking them as a business owner.</p>
                </GlassCard>
            </section>
        </div>
    );
};

export default AdminGovernmentTools;
