import React, { useState } from 'react';
import GlassCard from '../common/GlassCard';
import { COLORS } from '../../constants';
import { User, Award, Lock, Ban, CheckCircle } from 'lucide-react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';

const AdminUserManagement = ({ db, appId, findUserByDiscordOrBankId }) => {
    const [kycSearchId, setKycSearchId] = useState('');
    const [searchedUserKyc, setSearchedUserKyc] = useState(null);
    const [assignRoleUserId, setAssignRoleUserId] = useState('');
    const [specialAccountType, setSpecialAccountType] = useState('VIP Client');
    const [freezeUserId, setFreezeUserId] = useState(''); // Separate state for freeze
    const [banUserId, setBanUserId] = useState(''); // Separate state for ban

    const handleFetchKycInfo = async (e) => {
        e.preventDefault();
        if (!kycSearchId) {
            alert('Please enter a Discord ID or Bank ID.');
            return;
        }
        try {
            const foundUser = await findUserByDiscordOrBankId(kycSearchId);
            if (foundUser) {
                setSearchedUserKyc(foundUser.data);
            } else {
                setSearchedUserKyc(null);
                alert('User not found.');
            }
        } catch (error) {
            console.error("Error fetching KYC info:", error);
            alert(`Failed to fetch KYC info: ${error.message}`);
        }
    };

    const handleAssignRole = async () => {
        if (!assignRoleUserId) {
            alert('Please enter a User ID to assign role.');
            return;
        }
        try {
            const foundUser = await findUserByDiscordOrBankId(assignRoleUserId);
            if (foundUser) {
                const userDocRef = doc(db, `artifacts/${appId}/users`, foundUser.id);
                await updateDoc(userDocRef, { specialRole: specialAccountType, isVIP: specialAccountType === 'VIP Client' });
                alert(`Special role "${specialAccountType}" assigned to ${assignRoleUserId}.`);
                setAssignRoleUserId('');
            } else {
                alert('User not found.');
            }
        } catch (error) {
            console.error("Error assigning role:", error);
            alert(`Failed to assign role: ${error.message}`);
        }
    };

    const handleFreezeAccount = async () => {
        if (!freezeUserId) {
            alert('Please enter a User ID to freeze.');
            return;
        }
        try {
            const foundUser = await findUserByDiscordOrBankId(freezeUserId);
            if (foundUser) {
                const userDocRef = doc(db, `artifacts/${appId}/users`, foundUser.id);
                await updateDoc(userDocRef, { isFrozen: true });
                alert(`Account for ${freezeUserId} frozen. All transactions for this user are now blocked.`);
                setFreezeUserId('');
            } else {
                alert('User not found.');
            }
        } catch (error) {
            console.error("Error freezing account:", error);
            alert(`Failed to freeze account: ${error.message}`);
        }
    };

    const handleUnfreezeAccount = async () => {
        if (!freezeUserId) {
            alert('Please enter a User ID to unfreeze.');
            return;
        }
        try {
            const foundUser = await findUserByDiscordOrBankId(freezeUserId);
            if (foundUser) {
                const userDocRef = doc(db, `artifacts/${appId}/users`, foundUser.id);
                await updateDoc(userDocRef, { isFrozen: false });
                alert(`Account for ${freezeUserId} unfrozen. Transactions are now allowed.`);
                setFreezeUserId('');
            } else {
                alert('User not found.');
            }
        } catch (error) {
            console.error("Error unfreezing account:", error);
            alert(`Failed to unfreeze account: ${error.message}`);
        }
    };

    const handleBanUser = async () => {
        if (!banUserId) {
            alert('Please enter a User ID to ban.');
            return;
        }
        try {
            const foundUser = await findUserByDiscordOrBankId(banUserId);
            if (foundUser) {
                const userDocRef = doc(db, `artifacts/${appId}/users`, foundUser.id);
                await deleteDoc(userDocRef); // Permanently delete the user's account
                alert(`User ${banUserId}'s account has been permanently deleted from the system.`);
                setBanUserId('');
            } else {
                alert('User not found.');
            }
        } catch (error) {
            console.error("Error banning user:", error);
            alert(`Failed to ban user: ${error.message}`);
        }
    };

    return (
        <div className="p-8 w-full">
            <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>User Management</h3>

            {/* Fetch KYC Info */}
            <section className="mb-8">
                <h4 className="text-2xl font-semibold mb-4 flex items-center" style={{ color: COLORS.primaryAccent }}><User size={24} className="mr-2" /> Fetch KYC Info</h4>
                <GlassCard className="p-6">
                    <form onSubmit={handleFetchKycInfo} className="space-y-4">
                        <input type="text" placeholder="User Discord ID or Bank ID" value={kycSearchId} onChange={(e) => setKycSearchId(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        <button type="submit" className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-200" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Fetch Info</button>
                    </form>
                    {searchedUserKyc && (
                        <div className="mt-4 p-4 rounded-lg text-sm" style={{ backgroundColor: COLORS.tertiary, color: COLORS.typography }}>
                            <p className="font-semibold" style={{ color: COLORS.primaryAccent }}>KYC Details for {searchedUserKyc.discordId || searchedUserKyc.bankId}:</p>
                            <p>Full Name: {searchedUserKyc.name}</p>
                            <p>Bank ID: {searchedUserKyc.bankId || 'N/A'}</p>
                            <p className="flex items-center">KYC Code: {searchedUserKyc.kycCode} {searchedUserKyc.kycCode && <CheckCircle size={16} color="green" className="ml-2" />}</p>
                            <p>Region: {searchedUserKyc.region}</p>
                            <p>Date Joined: {searchedUserKyc.dateJoined}</p>
                            <p>Credit Score: {searchedUserKyc.creditScore}</p>
                            <p>Account Frozen: {searchedUserKyc.isFrozen ? 'Yes' : 'No'}</p>
                            <p>Credit Card Suspended: {searchedUserKyc.isCreditCardSuspended ? 'Yes' : 'No'}</p>
                            <p>Loan Blacklisted: {searchedUserKyc.isLoanBlacklisted ? 'Yes' : 'No'}</p>
                            <p>Business Owner: {searchedUserKyc.isBusinessOwner ? 'Yes' : 'No'}</p>
                            {searchedUserKyc.businessRegistrationId && <p>Business Reg. ID: {searchedUserKyc.businessRegistrationId}</p>}
                        </div>
                    )}
                </GlassCard>
            </section>

            {/* Assign Tier Roles */}
            <section className="mb-8">
                <h4 className="text-2xl font-semibold mb-4 flex items-center" style={{ color: COLORS.primaryAccent }}><Award size={24} className="mr-2" /> Assign Tier Roles (VIP/Gov/Agent)</h4>
                <GlassCard className="p-6">
                    <input type="text" placeholder="User Discord ID or Bank ID" value={assignRoleUserId} onChange={(e) => setAssignRoleUserId(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                    <select value={specialAccountType} onChange={(e) => setSpecialAccountType(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }}>
                        <option value="VIP Client">VIP Client</option>
                        <option value="Government Official">Government Official</option>
                        <option value="Intelligence Agent">Intelligence Agent</option>
                        <option value="Super Admin">Super Admin</option> {/* Added for admin to assign super admin */}
                        <option value="">None</option> {/* Option to remove role */}
                    </select>
                    <button onClick={handleAssignRole} className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-200" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Assign Role</button>
                    <p className="text-sm text-gray-400 italic mt-4">Restricted Access Controls: Shadow & Government account access limited to Super Admins (conceptual).</p>
                </GlassCard>
            </section>

            {/* Account Security Options (Lock/Freeze) */}
            <section className="mb-8">
                <h4 className="text-2xl font-semibold mb-4 flex items-center" style={{ color: COLORS.primaryAccent }}><Lock size={24} className="mr-2" /> Account Security Options</h4>
                <GlassCard className="p-6">
                    <input type="text" placeholder="User Discord ID or Bank ID" value={freezeUserId} onChange={(e) => setFreezeUserId(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                    <div className="flex space-x-4">
                        <button onClick={handleFreezeAccount} className="w-1/2 font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-200 bg-red-600 hover:bg-red-500" style={{ boxShadow: `0 0 10px rgba(255,0,0,0.5)` }}>Lock / Freeze Account</button>
                        <button onClick={handleUnfreezeAccount} className="w-1/2 font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-200 bg-green-600 hover:bg-green-500" style={{ boxShadow: `0 0 10px rgba(0,255,0,0.5)` }}>Unlock / Unfreeze Account</button>
                    </div>
                    <p className="text-sm text-gray-400 italic mt-2">Temporary Hold: Freezes all transactions for the user.</p>
                </GlassCard>
            </section>

            {/* Ban User Access */}
            <section className="mb-8">
                <h4 className="text-2xl font-semibold mb-4 flex items-center" style={{ color: COLORS.primaryAccent }}><Ban size={24} className="mr-2" /> Ban User Access</h4>
                <GlassCard className="p-6">
                    <input type="text" placeholder="User Discord ID or Bank ID" value={banUserId} onChange={(e) => setBanUserId(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                    <button onClick={handleBanUser} className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-300 bg-red-800 hover:bg-red-700" style={{ boxShadow: `0 0 10px rgba(255,0,0,0.7)` }}>Permanently Ban & Delete Account</button>
                    <p className="text-sm text-gray-400 italic mt-2">Warning: This action is irreversible and will delete the user's entire profile and data.</p>
                </GlassCard>
            </section>
        </div>
    );
};

export default AdminUserManagement;
