import React, { useState, useEffect } from 'react';
import { doc, updateDoc, collection, query, where, getDocs, getDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth'; // Import signOut
import { COLORS } from '../constants';
import AdminSidebar from './admin/AdminSidebar';
import AdminDashboardOverview from './admin/AdminDashboardOverview';
import AdminAccountQueues from './admin/AdminAccountQueues';
import AdminCreditLoans from './admin/AdminCreditLoans';
import AdminUserManagement from './admin/AdminUserManagement';
import AdminReportsAudits from './admin/AdminReportsAudits';
import AdminGovernmentTools from './admin/AdminGovernmentTools';
import AdminSecurityTools from './admin/AdminSecurityTools';
import AdminAdvancedTools from './admin/AdminAdvancedTools';

const AdminDashboardLayout = ({ setUserProfile, db, appId, auth, userProfile }) => {
    const [activeSection, setActiveSection] = useState('dashboard-overview');
    const [accountRequests, setAccountRequests] = useState([]);
    const [creditCardRequests, setCreditCardRequests] = useState([]);
    const [depositRequests, setDepositRequests] = useState([]);
    const [withdrawalRequests, setWithdrawalRequests] = useState([]);
    const [loanRequests, setLoanRequests] = useState([]);
    const [isSystemLocked, setIsSystemLocked] = useState(false); // Global system lock state

    // Function to find user by Discord ID or Bank ID
    const findUserByDiscordOrBankId = async (id) => {
        const usersRef = collection(db, `artifacts/${appId}/users`);
        let q;

        if (/^\d+$/.test(id)) { // Check if ID is purely numeric (likely Discord ID)
            q = query(usersRef, where("discordId", "==", id));
            const discordSnapshot = await getDocs(q);
            if (!discordSnapshot.empty) {
                return { id: discordSnapshot.docs[0].id, data: discordSnapshot.docs[0].data() };
            }
            // If not found by Discord ID, try Bank ID (which can also be numeric)
            q = query(usersRef, where("bankId", "==", id));
            const bankIdSnapshot = await getDocs(q);
            if (!bankIdSnapshot.empty) {
                return { id: bankIdSnapshot.docs[0].id, data: bankIdSnapshot.docs[0].data() };
            }
        } else { // Assume it's a Bank ID (alphanumeric)
            q = query(usersRef, where("bankId", "==", id));
            const bankIdSnapshot = await getDocs(q);
            if (!bankIdSnapshot.empty) {
                return { id: bankIdSnapshot.docs[0].id, data: bankIdSnapshot.docs[0].data() };
            }
        }
        return null;
    };

    // Fetch requests and global lock status on mount
    useEffect(() => {
        if (!db || !auth.currentUser) {
            console.log("AdminDashboardLayout: DB or auth.currentUser not ready for fetching requests.");
            return;
        }
        console.log("AdminDashboardLayout: Current authenticated user UID:", auth.currentUser.uid);

        // Listen to global system lock status
        const adminSettingsRef = doc(db, `artifacts/${appId}/public/data/adminSettings`, 'global');
        const unsubscribeGlobalLock = onSnapshot(adminSettingsRef, (docSnap) => {
            if (docSnap.exists()) {
                setIsSystemLocked(docSnap.data().isSystemLocked || false);
            } else {
                // If the document doesn't exist, create it with default false
                updateDoc(adminSettingsRef, { isSystemLocked: false }, { merge: true });
                setIsSystemLocked(false);
            }
        }, (error) => console.error("Error listening to global lock status:", error));


        const unsubscribeAccountRequests = onSnapshot(query(collection(db, `artifacts/${appId}/public/data/accountRequests`), where("status", "==", "Pending")), (snapshot) => {
            setAccountRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => console.error("AdminDashboardLayout: Error listening to account requests:", error));

        const unsubscribeCreditCardRequests = onSnapshot(query(collection(db, `artifacts/${appId}/public/data/creditCardRequests`), where("status", "==", "Pending")), (snapshot) => {
            setCreditCardRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => console.error("AdminDashboardLayout: Error listening to credit card requests:", error));

        const unsubscribeDepositRequests = onSnapshot(query(collection(db, `artifacts/${appId}/public/data/depositRequests`), where("status", "==", "Pending")), (snapshot) => {
            setDepositRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => console.error("AdminDashboardLayout: Error listening to deposit requests:", error));

        const unsubscribeWithdrawalRequests = onSnapshot(query(collection(db, `artifacts/${appId}/public/data/withdrawalRequests`), where("status", "==", "Pending")), (snapshot) => {
            setWithdrawalRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => console.error("AdminDashboardLayout: Error listening to withdrawal requests:", error));

        const unsubscribeLoanRequests = onSnapshot(query(collection(db, `artifacts/${appId}/public/data/loanRequests`), where("status", "==", "Pending")), (snapshot) => {
            setLoanRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => console.error("AdminDashboardLayout: Error listening to loan requests:", error));

        return () => {
            unsubscribeAccountRequests();
            unsubscribeCreditCardRequests();
            unsubscribeDepositRequests();
            unsubscribeWithdrawalRequests();
            unsubscribeLoanRequests();
            unsubscribeGlobalLock();
        };

    }, [db, appId, auth.currentUser]);

    // --- Request Approval/Denial Handlers (Moved from AdminDashboardLayout, now passed as props) ---
    const handleApproveDenyAccountRequest = async (requestId, status) => {
        try {
            const requestDocRef = doc(db, `artifacts/${appId}/public/data/accountRequests`, requestId);
            const requestSnap = await getDoc(requestDocRef);
            if (!requestSnap.exists()) { alert('Account request not found.'); return; }
            const requestData = requestSnap.data();
            const userDocRef = doc(db, `artifacts/${appId}/users`, requestData.userId);
            const currentUserSnap = await getDoc(userDocRef);

            if (!currentUserSnap.exists()) {
                alert('User for this request not found. Request cannot be processed.');
                await deleteDoc(requestDocRef);
                return;
            }
            const currentUserData = currentUserSnap.data();

            if (status === 'Approved') {
                const depositAmount = requestData.initialDeposit;
                const newBalance = (currentUserData.balance || 0) + depositAmount;
                const newAccounts = { ...currentUserData.accounts, [requestData.accountType]: (currentUserData.accounts[requestData.accountType] || 0) + depositAmount };
                const newTransactions = [...(currentUserData.transactions || []), {
                    date: new Date().toLocaleDateString('en-US'),
                    description: `${requestData.accountType} Account Opened (Admin Approved)`,
                    amount: depositAmount,
                    status: 'Complete',
                    discordLink: requestData.discordMessageLink
                }];

                const updateData = {
                    balance: newBalance,
                    accounts: newAccounts,
                    transactions: newTransactions,
                };

                if (requestData.accountType === 'Personal' && !currentUserData.debitCard) {
                    updateData.debitCard = {
                        number: Array(4).fill(0).map(() => Math.floor(1000 + Math.random() * 9000)).join(' '),
                        expiry: `${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(new Date().getFullYear() + 7).slice(-2)}`,
                        cvv: String(Math.floor(100 + Math.random() * 900)),
                        pin: String(Math.floor(1000 + Math.random() * 9000)),
                    };
                }
                await updateDoc(userDocRef, updateData);
                alert(`${requestData.accountType} account for ${requestData.userName} approved. Balance updated.`);
            } else {
                alert(`${requestData.accountType} account for ${requestData.userName} denied.`);
            }
            await updateDoc(requestDocRef, { status: status });
        } catch (error) {
            console.error(`Error ${status.toLowerCase()} account request:`, error);
            alert(`Failed to ${status.toLowerCase()} account request: ${error.message}`);
        }
    };

    const handleApproveDenyCreditCardRequest = async (requestId, status) => {
        try {
            const requestDocRef = doc(db, `artifacts/${appId}/public/data/creditCardRequests`, requestId);
            const requestSnap = await getDoc(requestDocRef);
            if (!requestSnap.exists()) { alert('Credit Card request not found.'); return; }
            const requestData = requestSnap.data();
            const userDocRef = doc(db, `artifacts/${appId}/users`, requestData.userId);
            const currentUserSnap = await getDoc(userDocRef);
            if (!currentUserSnap.exists()) {
                alert('User for this request not found. Request cannot be processed.');
                await deleteDoc(requestDocRef);
                return;
            }
            const currentUserData = currentUserSnap.data();

            let approvalMessage = '';
            let creditLimit = 0;

            if (status === 'Approved') {
                if (requestData.creditScore >= 750) {
                    creditLimit = 20000;
                    approvalMessage = `Credit Card approved for ${requestData.userName} with a ₽${creditLimit.toLocaleString()} limit (Premium).`;
                } else if (requestData.creditScore >= 600) {
                    creditLimit = 15000;
                    approvalMessage = `Credit Card approved for ${requestData.userName} with a ₽${creditLimit.toLocaleString()} limit.`;
                } else if (requestData.creditScore >= 500) {
                    creditLimit = 5000;
                    approvalMessage = `Credit Card approved for ${requestData.userName} with a ₽${creditLimit.toLocaleString()} limit (Manual Review).`;
                } else {
                    status = 'Denied';
                    approvalMessage = `Credit Card denied for ${requestData.userName} (Score too low: ${requestData.creditScore}).`;
                }

                if (status === 'Approved') {
                    await updateDoc(userDocRef, {
                        hasCreditCard: true,
                        'accounts.CreditCard': creditLimit,
                        transactions: [...(currentUserData.transactions || []), {
                            date: new Date().toLocaleDateString('en-US'),
                            description: `Credit Card Approved (Limit: ₽${creditLimit.toLocaleString()})`,
                            amount: 0,
                            status: 'Complete',
                            discordLink: requestData.discordLink
                        }]
                    });
                }
            } else {
                approvalMessage = `Credit Card denied for ${requestData.userName}.`;
            }

            await updateDoc(requestDocRef, { status: status, creditLimit: creditLimit });
            alert(approvalMessage);
        } catch (error) {
            console.error(`Error ${status.toLowerCase()} credit card request:`, error);
            alert(`Failed to ${status.toLowerCase()} credit card request: ${error.message}`);
        }
    };

    const handleApproveDenyDepositRequest = async (requestId, status) => {
        try {
            const requestDocRef = doc(db, `artifacts/${appId}/public/data/depositRequests`, requestId);
            const requestSnap = await getDoc(requestDocRef);
            if (!requestSnap.exists()) { alert('Deposit request not found.'); return; }
            const requestData = requestSnap.data();
            const userDocRef = doc(db, `artifacts/${appId}/users`, requestData.userId);
            const currentUserSnap = await getDoc(userDocRef);
            if (!currentUserSnap.exists()) {
                alert('User for this request not found. Request cannot be processed.');
                await deleteDoc(requestDocRef);
                return;
            }
            const currentUserData = currentUserSnap.data();

            if (status === 'Approved') {
                const depositAmount = requestData.amount;
                await updateDoc(userDocRef, {
                    balance: (currentUserData.balance || 0) + depositAmount,
                    'accounts.Personal': (currentUserData.accounts?.Personal || 0) + depositAmount,
                    transactions: [...(currentUserData.transactions || []), {
                        date: new Date().toLocaleDateString('en-US'),
                        description: `Deposit Approved (Proof: ${requestData.discordLink})`,
                        amount: depositAmount,
                        status: 'Complete',
                        discordLink: requestData.discordLink
                    }]
                });
                alert(`Deposit of ${depositAmount.toFixed(2)} RUB for ${requestData.userName} approved.`);
            } else {
                alert(`Deposit request for ${requestData.userName} denied.`);
            }
            await updateDoc(requestDocRef, { status: status });
        } catch (error) {
            console.error(`Error ${status.toLowerCase()} deposit request:`, error);
            alert(`Failed to ${status.toLowerCase()} deposit request: ${error.message}`);
        }
    };

    const handleApproveDenyWithdrawalRequest = async (requestId, status) => {
        try {
            const requestDocRef = doc(db, `artifacts/${appId}/public/data/withdrawalRequests`, requestId);
            const requestSnap = await getDoc(requestDocRef);
            if (!requestSnap.exists()) { alert('Withdrawal request not found.'); return; }
            const requestData = requestSnap.data();
            const userDocRef = doc(db, `artifacts/${appId}/users`, requestData.userId);
            const currentUserSnap = await getDoc(userDocRef);
            if (!currentUserSnap.exists()) {
                alert('User for this request not found. Request cannot be processed.');
                await deleteDoc(requestDocRef);
                return;
            }
            const currentUserData = currentUserSnap.data();

            if (status === 'Approved') {
                const withdrawalAmount = requestData.amount;
                const sourceAccount = requestData.sourceAccount;

                if ((currentUserData.accounts[sourceAccount] || 0) < withdrawalAmount) {
                    alert(`User ${requestData.userName} has insufficient funds in ${sourceAccount} for this withdrawal. Denying.`);
                    status = 'Denied';
                } else {
                    await updateDoc(userDocRef, {
                        [`accounts.${sourceAccount}`]: (currentUserData.accounts[sourceAccount] || 0) - withdrawalAmount,
                        balance: (currentUserData.balance || 0) - withdrawalAmount,
                        transactions: [...(currentUserData.transactions || []), {
                            date: new Date().toLocaleDateString('en-US'),
                            description: `Withdrawal Approved from ${sourceAccount}`,
                            amount: -withdrawalAmount,
                            status: 'Complete',
                            discordLink: requestData.discordLink // Add discordLink if available
                        }]
                    });
                    alert(`Withdrawal of ${withdrawalAmount.toFixed(2)} RUB from ${sourceAccount} for ${requestData.userName} approved.`);
                }
            } else {
                alert(`Withdrawal request for ${requestData.userName} denied.`);
            }
            await updateDoc(requestDocRef, { status: status });
        } catch (error) {
            console.error(`Error ${status.toLowerCase()} withdrawal request:`, error);
            alert(`Failed to ${status.toLowerCase()} withdrawal request: ${error.message}`);
        }
    };

    const handleApproveDenyLoanRequest = async (requestId, status) => {
        try {
            const requestDocRef = doc(db, `artifacts/${appId}/public/data/loanRequests`, requestId);
            const requestSnap = await getDoc(requestDocRef);
            if (!requestSnap.exists()) { alert('Loan request not found.'); return; }
            const requestData = requestSnap.data();
            const userDocRef = doc(db, `artifacts/${appId}/users`, requestData.userId);
            const currentUserSnap = await getDoc(userDocRef);
            if (!currentUserSnap.exists()) {
                alert('User for this request not found. Request cannot be processed.');
                await deleteDoc(requestDocRef);
                return;
            }
            const currentUserData = currentUserSnap.data();

            if (status === 'Approved') {
                if (requestData.loanType === 'Personal Loan' && (currentUserData.loanHistory || []).some(loan => loan.type === 'Personal Loan' && loan.status === 'Active')) {
                    alert(`User ${requestData.userName} already has an active Personal Loan. Denying this request.`);
                    status = 'Denied';
                } else {
                    const loanAmount = requestData.amount;
                    const newLoanEntry = {
                        id: requestId,
                        type: requestData.loanType,
                        amount: loanAmount,
                        repaymentPeriod: requestData.repaymentPeriod,
                        interestRate: requestData.interestRate,
                        collateralLink: requestData.collateralLink || null,
                        downPayment: requestData.downPayment || 0,
                        propertyRegion: requestData.propertyRegion || '',
                        dateIssued: new Date().toLocaleDateString('en-US'),
                        status: 'Active',
                        monthlyPayment: (loanAmount * (requestData.interestRate / 12 * Math.pow(1 + requestData.interestRate / 12, requestData.repaymentPeriod)) / (Math.pow(1 + requestData.interestRate / 12, requestData.repaymentPeriod) - 1)) || 0,
                        discordLink: requestData.discordLink // Add discordLink if available
                    };

                    await updateDoc(userDocRef, {
                        balance: (currentUserData.balance || 0) + loanAmount,
                        'accounts.Personal': (currentUserData.accounts?.Personal || 0) + loanAmount,
                        transactions: [...(currentUserData.transactions || []), {
                            date: new Date().toLocaleDateString('en-US'),
                            description: `Loan Approved: ${requestData.loanType} (ID: ${requestId})`,
                            amount: loanAmount,
                            status: 'Complete',
                            discordLink: requestData.discordLink // Add discordLink if available
                        }],
                        loanHistory: [...(currentUserData.loanHistory || []), newLoanEntry]
                    });
                    alert(`${requestData.loanType} loan for ${requestData.userName} approved for ₽${loanAmount.toLocaleString()}.`);
                }
            } else {
                alert(`Loan request for ${requestData.userName} denied.`);
            }
            await updateDoc(requestDocRef, { status: status });
        } catch (error) {
            console.error(`Error ${status.toLowerCase()} loan request:`, error);
            alert(`Failed to ${status.toLowerCase()} loan request: ${error.message}`);
        }
    };

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            setUserProfile(null); // Clear user profile on sign out
            alert('Signed out successfully!');
        } catch (error) {
            console.error("Error signing out:", error);
            alert(`Failed to sign out: ${error.message}`);
        }
    };

    const renderMainContent = () => {
        switch (activeSection) {
            case 'dashboard-overview':
                return <AdminDashboardOverview
                    accountRequests={accountRequests}
                    creditCardRequests={creditCardRequests}
                    depositRequests={depositRequests}
                    withdrawalRequests={withdrawalRequests}
                    loanRequests={loanRequests}
                />;
            case 'account-queues':
                return <AdminAccountQueues
                    accountRequests={accountRequests}
                    creditCardRequests={creditCardRequests}
                    depositRequests={depositRequests}
                    withdrawalRequests={withdrawalRequests}
                    loanRequests={loanRequests}
                    handleApproveDenyAccountRequest={handleApproveDenyAccountRequest}
                    handleApproveDenyCreditCardRequest={handleApproveDenyCreditCardRequest}
                    handleApproveDenyDepositRequest={handleApproveDenyDepositRequest}
                    handleApproveDenyWithdrawalRequest={handleApproveDenyWithdrawalRequest}
                    handleApproveDenyLoanRequest={handleApproveDenyLoanRequest}
                />;
            case 'credit-loans':
                return <AdminCreditLoans
                    db={db}
                    appId={appId}
                    findUserByDiscordOrBankId={findUserByDiscordOrBankId}
                />;
            case 'user-management':
                return <AdminUserManagement
                    db={db}
                    appId={appId}
                    findUserByDiscordOrBankId={findUserByDiscordOrBankId}
                />;
            case 'reports-audits':
                return <AdminReportsAudits
                    db={db}
                    appId={appId}
                    findUserByDiscordOrBankId={findUserByDiscordOrBankId}
                />;
            case 'government-tools':
                return <AdminGovernmentTools
                    db={db}
                    appId={appId}
                    findUserByDiscordOrBankId={findUserByDiscordOrBankId}
                />;
            case 'security-tools':
                return <AdminSecurityTools
                    db={db}
                    appId={appId}
                    findUserByDiscordOrBankId={findUserByDiscordOrBankId}
                    isSystemLocked={isSystemLocked}
                    setIsSystemLocked={setIsSystemLocked}
                />;
            case 'advanced-admin':
                return <AdminAdvancedTools
                    db={db}
                    appId={appId}
                    findUserByDiscordOrBankId={findUserByDiscordOrBankId}
                    userProfile={userProfile}
                />;
            case 'sign-out':
                handleSignOut();
                return null; // Or a loading/signed out message
            default:
                return <AdminDashboardOverview
                    accountRequests={accountRequests}
                    creditCardRequests={creditCardRequests}
                    depositRequests={depositRequests}
                    withdrawalRequests={withdrawalRequests}
                    loanRequests={loanRequests}
                />;
        }
    };

    return (
        <div className="flex h-screen bg-gray-900" style={{ backgroundColor: COLORS.background }}>
            <AdminSidebar activeSection={activeSection} setActiveSection={setActiveSection} userProfile={userProfile} />
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top Bar */}
                <header className="flex items-center justify-between p-4 shadow-md" style={{ backgroundColor: COLORS.secondaryBackground, color: COLORS.typography }}>
                    <div className="flex items-center space-x-4">
                        <span className="font-semibold text-lg">👤 {userProfile?.discordId || userProfile?.bankId || 'Admin'}</span>
                        <span className="text-sm text-gray-400">📍 Headquarters</span>
                        <span className="text-sm text-gray-400">🕒 Joined: {userProfile?.dateJoined || 'N/A'}</span>
                        <span className="text-sm text-gray-400">🔒 KYC-{userProfile?.kycCode || 'ADMIN-SBR-2025'}</span>
                        {isSystemLocked && (
                            <span className="text-sm font-bold text-red-500 ml-4">SYSTEM LOCKED!</span>
                        )}
                    </div>
                </header>

                {/* Main Content Area */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto">
                    {renderMainContent()}
                </main>
            </div>
        </div>
    );
};

export default AdminDashboardLayout;
