import React, { useState } from 'react';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import GlassCard from './common/GlassCard';
import { COLORS } from '../constants';

const OpenSpecificAccountPage = ({ type, userProfile, setUserProfile, setCurrentView, db, appId, auth }) => {
    const [formData, setFormData] = useState({ initialDeposit: '', discordMessageLink: '' });
    const [loading, setLoading] = useState(false);

    const generateDebitCardDetails = () => {
        const num = Array(4).fill(0).map(() => Math.floor(1000 + Math.random() * 9000)).join(' ');
        const issueDate = new Date('2005-01-01'); // Start date for all cards
        const expiryDate = new Date(issueDate);
        expiryDate.setFullYear(issueDate.getFullYear() + 7); // 7 years expiration
        const expiryMonth = String(expiryDate.getMonth() + 1).padStart(2, '0');
        const expiryYear = String(expiryDate.getFullYear()).slice(-2);
        const cvv = String(Math.floor(100 + Math.random() * 900));
        const pin = String(Math.floor(1000 + Math.random() * 9000));
        return {
            number: num,
            expiry: `${expiryMonth}/${expiryYear}`,
            cvv,
            pin,
            issueDate: issueDate.toISOString(),
            expiryDate: expiryDate.toISOString(),
        };
    };

    const accountDetails = {
        Personal: {
            title: 'Open Personal Account (Standard)',
            info: 'The basic, default account for any citizen. Holds wages, transfers, and currency.',
            fields: [], // Info already collected during registration
            appliesTo: 'All verified users',
            infoRequired: 'Name, KYC ID, Initial Deposit, Discord Message Link',
            approval: 'Auto-approved',
            onOpen: async (data) => {
                setLoading(true);
                const depositAmount = parseFloat(data.initialDeposit);
                if (isNaN(depositAmount) || depositAmount <= 0) {
                    alert('Please enter a valid initial deposit amount.');
                    setLoading(false);
                    return false;
                }
                if (!data.discordMessageLink) {
                    alert('Please provide a Discord message link for fund verification.');
                    setLoading(false);
                    return false;
                }

                try {
                    const userDocRef = doc(db, `artifacts/${appId}/users`, auth.currentUser.uid);
                    await updateDoc(userDocRef, {
                        [`accounts.Personal`]: depositAmount,
                        balance: userProfile.balance + depositAmount,
                        transactions: [...userProfile.transactions, {
                            date: new Date().toLocaleDateString('en-US'),
                            description: `Personal Account Opened with Initial Deposit`,
                            amount: depositAmount,
                            status: 'Complete',
                            discordLink: data.discordMessageLink
                        }],
                        debitCard: generateDebitCardDetails(), // Generate debit card upon personal account opening
                    });
                    alert('Personal Account opened successfully with initial deposit!');
                    setCurrentView('dashboard');
                    return true;
                } catch (error) {
                    console.error("Error opening personal account:", error);
                    alert(`Failed to open Personal Account: ${error.message}`);
                    return false;
                } finally {
                    setLoading(false);
                }
            }
        },
        Savings: {
            title: 'Open Savings Account',
            info: 'Designed for long-term saving, interest accumulation, and stability.',
            fields: [{ name: 'accountLabel', label: 'Account Label (e.g., "My Holiday Savings")', type: 'text', required: true }],
            appliesTo: 'Users w/ Personal Account',
            infoRequired: 'Link to personal account, account label, Initial Deposit, Discord Message Link',
            approval: 'Auto-approved',
            onOpen: async (data) => {
                setLoading(true);
                if (userProfile.accounts.Personal === 0) {
                    alert('You must have a Personal Account to open a Savings Account.');
                    setLoading(false);
                    return false;
                }
                const depositAmount = parseFloat(data.initialDeposit);
                if (isNaN(depositAmount) || depositAmount <= 0) {
                    alert('Please enter a valid initial deposit amount.');
                    setLoading(false);
                    return false;
                }
                if (!data.discordMessageLink) {
                    alert('Please provide a Discord message link for fund verification.');
                    setLoading(false);
                    return false;
                }

                try {
                    const userDocRef = doc(db, `artifacts/${appId}/users`, auth.currentUser.uid);
                    await updateDoc(userDocRef, {
                        [`accounts.Savings`]: depositAmount,
                        balance: userProfile.balance + depositAmount,
                        transactions: [...userProfile.transactions, {
                            date: new Date().toLocaleDateString('en-US'),
                            description: `Savings Account Opened (${data.accountLabel}) with Initial Deposit`,
                            amount: depositAmount,
                            status: 'Complete',
                            discordLink: data.discordMessageLink
                        }],
                    });
                    alert(`Savings Account "${data.accountLabel}" opened successfully with initial deposit!`);
                    setCurrentView('dashboard');
                    return true;
                } catch (error) {
                    console.error("Error opening savings account:", error);
                    alert(`Failed to open Savings Account: ${error.message}`);
                    return false;
                } finally {
                    setLoading(false);
                }
            }
        },
        Business: {
            title: 'Open Business Account',
            info: 'For business owners or legal entities. Separate from personal account.',
            fields: [
                { name: 'businessName', label: 'Business Name', type: 'text', required: true },
                { name: 'licenseId', label: 'Business License ID', type: 'text', required: true },
                { name: 'directorName', label: 'Director Name', type: 'text', required: true },
            ],
            appliesTo: 'Business owners or verified legal entities',
            infoRequired: 'Business name, license ID, director name, Initial Deposit, Discord Message Link',
            approval: 'Admin approval',
            onOpen: async (data) => {
                setLoading(true);
                const depositAmount = parseFloat(data.initialDeposit);
                if (isNaN(depositAmount) || depositAmount <= 0) {
                    alert('Please enter a valid initial deposit amount.');
                    setLoading(false);
                    return false;
                }
                if (!data.discordMessageLink) {
                    alert('Please provide a Discord message link for fund verification.');
                    setLoading(false);
                    return false;
                }

                try {
                    // Add to a pending requests collection for admin approval
                    await addDoc(collection(db, `artifacts/${appId}/public/data/accountRequests`), {
                        userId: auth.currentUser.uid,
                        userName: userProfile.name,
                        accountType: 'Business',
                        initialDeposit: depositAmount,
                        discordMessageLink: data.discordMessageLink,
                        businessName: data.businessName,
                        licenseId: data.licenseId,
                        directorName: data.directorName,
                        status: 'Pending',
                        timestamp: new Date().toISOString()
                    });
                    alert(`Business Account application for "${data.businessName}" submitted. Awaiting admin approval. Initial deposit of ${depositAmount} RUB noted.`);
                    setCurrentView('dashboard');
                    return true;
                } catch (error) {
                    console.error("Error submitting business account application:", error);
                    alert(`Failed to submit Business Account application: ${error.message}`);
                    return false;
                } finally {
                    setLoading(false);
                }
            }
        },
        Government: {
            title: 'Open Government Account',
            info: 'Used by ministries, agencies, and state-owned enterprises. Receives treasury funds.',
            fields: [
                { name: 'ministryName', label: 'Ministry/Agency Name', type: 'text', required: true },
                { name: 'position', label: 'Your Position', type: 'text', required: true },
                { name: 'internalCode', label: 'Internal Code', type: 'text', required: true },
            ],
            appliesTo: 'Government ministers, agencies, SOEs',
            infoRequired: 'Ministry name, position, internal code, Initial Deposit, Discord Message Link',
            approval: 'Admin-only',
            onOpen: async (data) => {
                setLoading(true);
                const depositAmount = parseFloat(data.initialDeposit);
                if (isNaN(depositAmount) || depositAmount <= 0) {
                    alert('Please enter a valid initial deposit amount.');
                    setLoading(false);
                    return false;
                }
                if (!data.discordMessageLink) {
                    alert('Please provide a Discord message link for fund verification.');
                    setLoading(false);
                    return false;
                }

                try {
                    // Add to a pending requests collection for admin approval
                    await addDoc(collection(db, `artifacts/${appId}/public/data/accountRequests`), {
                        userId: auth.currentUser.uid,
                        userName: userProfile.name,
                        accountType: 'Government',
                        initialDeposit: depositAmount,
                        discordMessageLink: data.discordMessageLink,
                        ministryName: data.ministryName,
                        position: data.position,
                        internalCode: data.internalCode,
                        status: 'Pending',
                        timestamp: new Date().toISOString()
                    });
                    alert(`Government Account application for "${data.ministryName}" submitted. Awaiting admin approval. Initial deposit of ${depositAmount} RUB noted.`);
                    setCurrentView('dashboard');
                    return true;
                } catch (error) {
                    console.error("Error submitting government account application:", error);
                    alert(`Failed to submit Government Account application: ${error.message}`);
                    return false;
                } finally {
                    setLoading(false);
                }
            }
        },
        CreditCard: {
            title: 'Apply for Credit Card Account',
            info: 'A credit-based line account, not a physical wallet. Linked to credit score.',
            fields: [
                { name: 'employmentInfo', label: 'Employment Information', type: 'text', required: true },
                { name: 'creditAgreement', label: 'Credit Agreement (Type "AGREE")', type: 'text', required: true },
            ],
            appliesTo: 'Users w/ credit score ≥ 300',
            infoRequired: 'Employment info (IC), credit agreement',
            approval: 'Admin review or auto if score high',
            onOpen: async (data) => {
                setLoading(true);
                if (data.creditAgreement.toUpperCase() !== 'AGREE') {
                    alert('You must type "AGREE" to accept the credit agreement.');
                    setLoading(false);
                    return false;
                }
                if (userProfile.creditScore < 300) {
                    alert('Your credit score is too low to apply for a credit card. Minimum 300 required.');
                    setLoading(false);
                    return false;
                }
                // Credit card doesn't take initial deposit as it's a line of credit
                try {
                    const userDocRef = doc(db, `artifacts/${appId}/users`, auth.currentUser.uid);
                    await updateDoc(userDocRef, {
                        hasCreditCard: true,
                        [`accounts.CreditCard`]: 0.00, // Initial credit card balance is 0 (no credit used yet)
                        transactions: [...userProfile.transactions, {
                            date: new Date().toLocaleDateString('en-US'),
                            description: `Credit Card Application Submitted`,
                            amount: 0,
                            status: 'Pending Approval',
                        }],
                    });
                    alert('Credit Card application submitted. Check your dashboard for status updates (may be auto-approved based on score).');
                    setCurrentView('dashboard');
                    return true;
                } catch (error) {
                    console.error("Error submitting credit card application:", error);
                    alert(`Failed to submit Credit Card application: ${error.message}`);
                    return false;
                } finally {
                    setLoading(false);
                }
            }
        },
        Investment: {
            title: 'Open Investment Account (Coming Soon)',
            info: 'For advanced users. Used for purchasing bonds, stocks, and tracking returns.',
            fields: [],
            appliesTo: 'Verified, adult users',
            infoRequired: 'Risk profile, bank link, investment interest, Initial Deposit, Discord Message Link',
            approval: 'Auto-approved or flagged',
            onOpen: () => {
                alert('Investment Account is coming soon! Please check back later.');
                setCurrentView('dashboard');
                return false;
            }
        },
        Shadow: {
            title: 'Open Shadow Account',
            info: 'Classified/Hidden account for espionage, secret state funding, or corrupt actors.',
            fields: [{ name: 'reason', label: 'Reason for Shadow Account (Requires Admin Approval)', type: 'textarea', required: true }],
            appliesTo: 'Espionage, secret ops, or corruption RP',
            infoRequired: 'None (admin backend only), Initial Deposit, Discord Message Link',
            approval: 'Admin-only creation',
            onOpen: async (data) => {
                setLoading(true);
                if (!userProfile.isVIP) {
                    alert('You are not authorized to open a Shadow Account. This account type is restricted to VIP customers only.');
                    setLoading(false);
                    return false;
                }
                const depositAmount = parseFloat(data.initialDeposit);
                if (isNaN(depositAmount) || depositAmount <= 0) {
                    alert('Please enter a valid initial deposit amount.');
                    setLoading(false);
                    return false;
                }
                if (!data.discordMessageLink) {
                    alert('Please provide a Discord message link for fund verification.');
                    setLoading(false);
                    return false;
                }

                try {
                    // Add to a pending requests collection for admin approval
                    await addDoc(collection(db, `artifacts/${appId}/public/data/accountRequests`), {
                        userId: auth.currentUser.uid,
                        userName: userProfile.name,
                        accountType: 'Shadow',
                        initialDeposit: depositAmount,
                        discordMessageLink: data.discordMessageLink,
                        reason: data.reason,
                        status: 'Pending',
                        timestamp: new Date().toISOString()
                    });
                    alert(`Shadow Account application submitted for review. Reason: ${data.reason}. Initial deposit of ${depositAmount} RUB noted.`);
                    setCurrentView('dashboard');
                    return true;
                } catch (error) {
                    console.error("Error submitting shadow account application:", error);
                    alert(`Failed to submit Shadow Account application: ${error.message}`);
                    return false;
                } finally {
                    setLoading(false);
                }
            }
        },
    };

    const currentAccount = accountDetails[type];

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        await currentAccount.onOpen(formData);
    };

    if (currentAccount.comingSoon) {
        return (
            <div className="container mx-auto px-4 py-8 text-center">
                <h2 className="text-4xl font-extrabold mb-8 drop-shadow-sm" style={{ color: COLORS.primaryAccent }}>{currentAccount.title}</h2>
                <GlassCard className="p-8">
                    <p className="text-xl text-yellow-400 mb-4">{currentAccount.info}</p>
                    <p className="text-lg text-gray-400">This feature is currently under development. Please check back later!</p>
                </GlassCard>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h2 className="text-4xl font-extrabold mb-8 text-center drop-shadow-sm" style={{ color: COLORS.primaryAccent }}>{currentAccount.title}</h2>
            <GlassCard className="p-8 max-w-2xl mx-auto">
                <p className="text-lg mb-6" style={{ color: COLORS.typography }}>{currentAccount.info}</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {currentAccount.fields.map(field => (
                        <div key={field.name}>
                            <label htmlFor={field.name} className="block text-lg font-medium mb-2" style={{ color: COLORS.typography }}>{field.label}</label>
                            {field.type === 'textarea' ? (
                                <textarea id={field.name} name={field.name} value={formData[field.name] || ''} onChange={handleChange} placeholder={field.label} className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} required={field.required} rows="4"></textarea>
                            ) : (
                                <input type={field.type} id={field.name} name={field.name} value={formData[field.name] || ''} onChange={handleChange} placeholder={field.label} className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} required={field.required} />
                            )}
                        </div>
                    ))}
                    {type !== 'CreditCard' && ( // Credit card doesn't require initial deposit
                        <>
                            <div>
                                <label htmlFor="initialDeposit" className="block text-lg font-medium mb-2" style={{ color: COLORS.typography }}>Initial Deposit Amount (RUB)</label>
                                <input type="number" id="initialDeposit" name="initialDeposit" value={formData.initialDeposit} onChange={handleChange} placeholder="e.g., 500.00" step="0.01" className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} required />
                            </div>
                            <div>
                                <label htmlFor="discordMessageLink" className="block text-lg font-medium mb-2" style={{ color: COLORS.typography }}>Discord Message Link (Proof of Funds)</label>
                                <input type="url" id="discordMessageLink" name="discordMessageLink" value={formData.discordMessageLink} onChange={handleChange} placeholder="https://discord.com/channels/..." className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} required />
                            </div>
                        </>
                    )}
                    <button
                        type="submit"
                        className="w-full font-bold py-3 px-6 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-300"
                        style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 15px ${COLORS.buttonsGlow}` }}
                        disabled={loading}
                    >
                        {loading ? 'Submitting...' : 'Submit Application'}
                    </button>
                </form>

                <h3 className="text-2xl font-bold mt-8 mb-4" style={{ color: COLORS.primaryAccent }}>Application Details</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                        <thead style={{ color: COLORS.primaryAccent }}>
                            <tr>
                                <th className="py-2 px-3">Category</th>
                                <th className="py-2 px-3">Description</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            <tr><td className="py-2 px-3">👤 Who Can Apply</td><td className="py-2 px-3">{currentAccount.appliesTo}</td></tr>
                            <tr><td className="py-2 px-3">📄 Info Required</td><td className="py-2 px-3">{currentAccount.infoRequired}</td></tr>
                            <tr><td className="py-2 px-3">⚙️ Approval Method</td><td className="py-2 px-3">{currentAccount.approval}</td></tr>
                        </tbody>
                    </table>
                </div>
            </GlassCard>
        </div>
    );
};

export default OpenSpecificAccountPage;
