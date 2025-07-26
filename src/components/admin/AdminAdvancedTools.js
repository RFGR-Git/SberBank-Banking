import React, { useState } from 'react';
import GlassCard from '../common/GlassCard';
import { COLORS } from '../../constants';
import { Search, Users, Download, Filter, Zap, Settings } from 'lucide-react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

const AdminAdvancedTools = ({ db, appId, findUserByDiscordOrBankId, userProfile }) => {
    const [universalSearchQuery, setUniversalSearchQuery] = useState('');
    const [universalSearchResults, setUniversalSearchResults] = useState([]);
    const [massRoleUserId, setMassRoleUserId] = useState(''); // For single user role change for now
    const [massRoleType, setMassRoleType] = useState('VIP Client');
    const [exportType, setExportType] = useState('Personal');
    const [filterToggleStatus, setFilterToggleStatus] = useState('Off'); // Conceptual

    const handleUniversalSearch = async (e) => {
        e.preventDefault();
        if (!universalSearchQuery) {
            alert('Please enter a search query.');
            return;
        }
        try {
            const usersRef = collection(db, `artifacts/${appId}/users`);
            const q1 = await getDocs(usersRef); // Fetch all users for client-side filtering
            const allUsers = q1.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const results = allUsers.filter(user =>
                user.discordId?.includes(universalSearchQuery) ||
                user.bankId?.includes(universalSearchQuery) ||
                user.name?.toLowerCase().includes(universalSearchQuery.toLowerCase()) ||
                user.specialRole?.toLowerCase().includes(universalSearchQuery.toLowerCase()) ||
                user.businessRegistrationId?.includes(universalSearchQuery)
            );
            setUniversalSearchResults(results);
            if (results.length === 0) {
                alert('No matching users found.');
            }
        } catch (error) {
            console.error("Error during universal search:", error);
            alert(`Failed to perform search: ${error.message}`);
        }
    };

    const handleGlobalAuditViewer = () => {
        alert('Simulating global audit log view. (Requires a dedicated global audit log collection for all system events.)');
    };

    const handleMassRoleEditor = async () => {
        if (!massRoleUserId) {
            alert('Please enter a User ID for role assignment.');
            return;
        }
        try {
            const foundUser = await findUserByDiscordOrBankId(massRoleUserId);
            if (foundUser) {
                const userDocRef = doc(db, `artifacts/${appId}/users`, foundUser.id);
                await updateDoc(userDocRef, { specialRole: massRoleType, isVIP: massRoleType === 'VIP Client' });
                alert(`Role "${massRoleType}" assigned to ${massRoleUserId}.`);
                setMassRoleUserId('');
            } else {
                alert('User not found.');
            }
        } catch (error) {
            console.error("Error assigning mass role:", error);
            alert(`Failed to assign role: ${error.message}`);
        }
    };

    const handleBulkAccountExport = async () => {
        try {
            const usersRef = collection(db, `artifacts/${appId}/users`);
            const q = query(usersRef); // Get all users
            const snapshot = await getDocs(q);
            const dataToExport = snapshot.docs
                .map(doc => doc.data())
                .filter(user => {
                    if (exportType === 'Personal') return !user.isBusinessOwner && user.specialRole !== 'Government Official';
                    if (exportType === 'Gov') return user.specialRole === 'Government Official';
                    if (exportType === 'Business') return user.isBusinessOwner;
                    return true; // All
                });

            if (dataToExport.length === 0) {
                alert(`No ${exportType} accounts found to export.`);
                return;
            }

            // Simple CSV export
            const headers = Object.keys(dataToExport[0]).join(',');
            const csv = [
                headers,
                ...dataToExport.map(row => Object.values(row).map(value => {
                    if (typeof value === 'object' && value !== null) {
                        return JSON.stringify(value).replace(/"/g, '""'); // Handle nested objects/arrays
                    }
                    return String(value).replace(/"/g, '""'); // Escape quotes
                }).join(','))
            ].join('\n');

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.setAttribute('download', `${exportType.toLowerCase()}_accounts_export_${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            alert(`Exported ${dataToExport.length} ${exportType} accounts to CSV.`);

        } catch (error) {
            console.error("Error exporting accounts:", error);
            alert(`Failed to export accounts: ${error.message}`);
        }
    };

    const handleDashboardFilteringToggle = () => {
        const newStatus = filterToggleStatus === 'Off' ? 'On' : 'Off';
        setFilterToggleStatus(newStatus);
        alert(`Dashboard filtering toggle is now: ${newStatus}. (Conceptual: would enable/disable advanced filters on dashboard views)`);
    };

    const handleAutomationScript = (scriptName) => {
        alert(`Simulating execution of automation script: "${scriptName}". (These would typically run on a backend server.)`);
    };

    return (
        <div className="p-8 w-full">
            <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>Advanced Admin Tools</h3>
            <p className="text-sm text-gray-400 italic mb-6">These tools are typically reserved for Super Admins due to their powerful nature.</p>

            {/* Universal Search Bar */}
            <section className="mb-8">
                <h4 className="text-2xl font-semibold mb-4 flex items-center" style={{ color: COLORS.primaryAccent }}><Search size={24} className="mr-2" /> Universal Search Bar</h4>
                <GlassCard className="p-6">
                    <form onSubmit={handleUniversalSearch} className="space-y-4">
                        <input type="text" placeholder="Search User ID, Name, Account Type, Business Reg. ID..." value={universalSearchQuery} onChange={(e) => setUniversalSearchQuery(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        <button type="submit" className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-200" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Search All Users</button>
                    </form>
                    {universalSearchResults.length > 0 && (
                        <div className="mt-4 p-4 rounded-lg text-sm max-h-60 overflow-y-auto" style={{ backgroundColor: COLORS.tertiary, color: COLORS.typography }}>
                            <p className="font-semibold" style={{ color: COLORS.primaryAccent }}>Search Results:</p>
                            <ul className="list-disc list-inside">
                                {universalSearchResults.map(user => (
                                    <li key={user.id}>
                                        <strong>{user.name || 'N/A'}</strong> (Discord: {user.discordId || 'N/A'}, Bank ID: {user.bankId || 'N/A'})
                                        {user.specialRole && ` - Role: ${user.specialRole}`}
                                        {user.isBusinessOwner && ` - Business Owner (Reg: ${user.businessRegistrationId || 'N/A'})`}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </GlassCard>
            </section>

            {/* Global Audit Viewer */}
            <section className="mb-8">
                <h4 className="text-2xl font-semibold mb-4 flex items-center" style={{ color: COLORS.primaryAccent }}><Settings size={24} className="mr-2" /> Global Audit Viewer</h4>
                <GlassCard className="p-6">
                    <button onClick={handleGlobalAuditViewer} className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-300" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>View Global Audit Logs (Simulated)</button>
                    <p className="text-sm text-gray-400 italic mt-2">Filter logs by transaction, action, or risk flag across all users and system events.</p>
                </GlassCard>
            </section>

            {/* Mass Role Editor */}
            <section className="mb-8">
                <h4 className="text-2xl font-semibold mb-4 flex items-center" style={{ color: COLORS.primaryAccent }}><Users size={24} className="mr-2" /> Mass Role Editor</h4>
                <GlassCard className="p-6">
                    <input type="text" placeholder="User Discord ID or Bank ID (for single user)" value={massRoleUserId} onChange={(e) => setMassRoleUserId(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                    <select value={massRoleType} onChange={(e) => setMassRoleType(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }}>
                        <option value="VIP Client">VIP Client</option>
                        <option value="Government Official">Government Official</option>
                        <option value="Intelligence Agent">Intelligence Agent</option>
                        <option value="Super Admin">Super Admin</option>
                        <option value="">Remove Role</option>
                    </select>
                    <button onClick={handleMassRoleEditor} className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-200" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Assign Role (Single User)</button>
                    <p className="text-sm text-gray-400 italic mt-2">Batch assign or remove roles (e.g., VIP, Investor, Partner). Current implementation is for single user.</p>
                </GlassCard>
            </section>

            {/* Bulk Account Export */}
            <section className="mb-8">
                <h4 className="text-2xl font-semibold mb-4 flex items-center" style={{ color: COLORS.primaryAccent }}><Download size={24} className="mr-2" /> Bulk Account Export</h4>
                <GlassCard className="p-6">
                    <select value={exportType} onChange={(e) => setExportType(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }}>
                        <option value="Personal">Personal Accounts</option>
                        <option value="Gov">Government Accounts</option>
                        <option value="Business">Business Accounts</option>
                        <option value="All">All Accounts</option>
                    </select>
                    <button onClick={handleBulkAccountExport} className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-300" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Export to CSV</button>
                    <p className="text-sm text-gray-400 italic mt-2">Export user data by account type (CSV format).</p>
                </GlassCard>
            </section>

            {/* Dashboard Filtering Toggle */}
            <section className="mb-8">
                <h4 className="text-2xl font-semibold mb-4 flex items-center" style={{ color: COLORS.primaryAccent }}><Filter size={24} className="mr-2" /> Dashboard Filtering Toggle</h4>
                <GlassCard className="p-6 text-center">
                    <p className="text-lg font-semibold mb-4" style={{ color: COLORS.typography }}>Filtering Status: <span style={{ color: filterToggleStatus === 'On' ? COLORS.success : COLORS.danger }}>{filterToggleStatus}</span></p>
                    <button onClick={handleDashboardFilteringToggle} className={`w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-200 ${filterToggleStatus === 'On' ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'}`} style={{ boxShadow: `0 0 10px ${filterToggleStatus === 'On' ? 'rgba(255,0,0,0.5)' : 'rgba(0,255,0,0.5)'}` }}>
                        Toggle Filtering {filterToggleStatus === 'On' ? 'Off' : 'On'}
                    </button>
                    <p className="text-sm text-gray-400 italic mt-2">Conceptual: filter views by Account Type, Role Tier, Risk Status, Recent Activity.</p>
                </GlassCard>
            </section>

            {/* Automation Scripts */}
            <section className="mb-8">
                <h4 className="text-2xl font-semibold mb-4 flex items-center" style={{ color: COLORS.primaryAccent }}><Zap size={24} className="mr-2" /> Automation Scripts</h4>
                <GlassCard className="p-6">
                    <ul className="space-y-3 text-gray-400">
                        <li>
                            <span className="font-semibold" style={{ color: COLORS.primaryAccent }}>Daily Auto-Credits:</span> Deposits daily/weekly based on job ID or ministry payroll.
                            <button onClick={() => handleAutomationScript('Daily Auto-Credits')} className="ml-3 px-3 py-1 rounded-full bg-blue-600 text-white text-xs">Run (Simulated)</button>
                        </li>
                        <li>
                            <span className="font-semibold" style={{ color: COLORS.primaryAccent }}>Low Balance Alert Bot:</span> Alerts when account balance is low.
                            <button onClick={() => handleAutomationScript('Low Balance Alert Bot')} className="ml-3 px-3 py-1 rounded-full bg-blue-600 text-white text-xs">Run (Simulated)</button>
                        </li>
                        <li>
                            <span className="font-semibold" style={{ color: COLORS.primaryAccent }}>Monthly Tax Auto-Deduction:</span> Deducts a percentage of income or transfer at set intervals.
                            <button onClick={() => handleAutomationScript('Monthly Tax Auto-Deduction')} className="ml-3 px-3 py-1 rounded-full bg-blue-600 text-white text-xs">Run (Simulated)</button>
                        </li>
                        <li>
                            <span className="font-semibold" style={{ color: COLORS.primaryAccent }}>End-of-Month Audit Script:</span> Summarizes account health, credit rating, suspicious logs.
                            <button onClick={() => handleAutomationScript('End-of-Month Audit Script')} className="ml-3 px-3 py-1 rounded-full bg-blue-600 text-white text-xs">Run (Simulated)</button>
                        </li>
                        <li>
                            <span className="font-semibold" style={{ color: COLORS.primaryAccent }}>8-Hour Credit Tracker Update:</span> Cycle system that updates credit automatically.
                            <button onClick={() => handleAutomationScript('8-Hour Credit Tracker Update')} className="ml-3 px-3 py-1 rounded-full bg-blue-600 text-white text-xs">Run (Simulated)</button>
                        </li>
                    </ul>
                    <p className="text-sm text-gray-400 italic mt-4">Note: These automations typically run as scheduled tasks on a backend server.</p>
                </GlassCard>
            </section>
        </div>
    );
};

export default AdminAdvancedTools;
