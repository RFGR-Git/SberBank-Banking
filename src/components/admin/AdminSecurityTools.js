import React, { useState } from 'react';
import GlassCard from '../common/GlassCard';
import { COLORS } from '../../constants';
import { Shield, Lock, Search } from 'lucide-react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

const AdminSecurityTools = ({ db, appId, findUserByDiscordOrBankId }) => {
    const [transactionOverrideId, setTransactionOverrideId] = useState('');
    const [globalLockActive, setGlobalLockActive] = useState(false); // State for global lock

    const handleTransactionFreezeOverride = () => {
        if (!transactionOverrideId) {
            alert('Please enter a Transaction ID to override.');
            return;
        }
        alert(`Simulating override for transaction ID: ${transactionOverrideId}. (This requires complex transaction state management.)`);
        setTransactionOverrideId('');
    };

    const handleToggleGlobalLock = async () => {
        try {
            // In a real application, this would update a global setting in Firestore
            // For now, we'll simulate it with a local state and an alert.
            const newLockState = !globalLockActive;
            setGlobalLockActive(newLockState);

            // Update a conceptual global setting in Firestore (e.g., in an admin settings doc)
            const adminSettingsRef = doc(db, `artifacts/${appId}/public/data/adminSettings`, 'global');
            await updateDoc(adminSettingsRef, { isSystemLocked: newLockState });

            alert(`Global system lock is now ${newLockState ? 'ACTIVE' : 'INACTIVE'}. All user transactions are ${newLockState ? 'temporarily halted' : 'resumed'}.`);
        } catch (error) {
            console.error("Error toggling global lock:", error);
            alert(`Failed to toggle global lock: ${error.message}`);
        }
    };

    const handleViewInterbankLog = () => {
        alert('Simulating viewing of interbank transfer logs. (Requires dedicated interbank transfer collection.)');
    };

    return (
        <div className="p-8 w-full">
            <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>Security Tools</h3>

            {/* Transaction Freeze Override */}
            <section className="mb-8">
                <h4 className="text-2xl font-semibold mb-4 flex items-center" style={{ color: COLORS.primaryAccent }}><Shield size={24} className="mr-2" /> Transaction Freeze Override</h4>
                <GlassCard className="p-6">
                    <input type="text" placeholder="Transaction ID" value={transactionOverrideId} onChange={(e) => setTransactionOverrideId(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                    <button onClick={handleTransactionFreezeOverride} className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-200" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Approve / Deny Flagged Transaction (Simulated)</button>
                    <p className="text-sm text-gray-400 italic mt-2">Manually approve or deny transactions on flagged or frozen accounts.</p>
                </GlassCard>
            </section>

            {/* Force Emergency Lockdown */}
            <section className="mb-8">
                <h4 className="text-2xl font-semibold mb-4 flex items-center" style={{ color: COLORS.primaryAccent }}><Lock size={24} className="mr-2" /> Force Emergency Lockdown</h4>
                <GlassCard className="p-6 text-center">
                    <p className="text-lg font-semibold mb-4" style={{ color: COLORS.typography }}>Current Global Lock Status: <span style={{ color: globalLockActive ? COLORS.danger : COLORS.success }}>{globalLockActive ? 'ACTIVE' : 'INACTIVE'}</span></p>
                    <button onClick={handleToggleGlobalLock} className={`w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-200 ${globalLockActive ? 'bg-green-600 hover:bg-green-500' : 'bg-red-800 hover:bg-red-700'}`} style={{ boxShadow: `0 0 10px ${globalLockActive ? 'rgba(0,255,0,0.5)' : 'rgba(255,0,0,0.7)'}` }}>
                        {globalLockActive ? 'Deactivate Global Lock' : 'Activate Global Lock'}
                    </button>
                    <p className="text-sm text-gray-400 italic mt-2">Temporarily halts all transactions system-wide for emergency review.</p>
                </GlassCard>
            </section>

            {/* View Interbank Transfers Log */}
            <section className="mb-8">
                <h4 className="text-2xl font-semibold mb-4 flex items-center" style={{ color: COLORS.primaryAccent }}><Search size={24} className="mr-2" /> View Interbank Transfers Log</h4>
                <GlassCard className="p-6">
                    <button onClick={handleViewInterbankLog} className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-200" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>View Logs (Simulated)</button>
                    <p className="text-sm text-gray-400 italic mt-2">View pending, approved, and flagged transfers between banks.</p>
                </GlassCard>
            </section>
        </div>
    );
};

export default AdminSecurityTools;
