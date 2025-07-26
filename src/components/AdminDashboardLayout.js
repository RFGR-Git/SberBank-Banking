import React, { useState, useEffect } from 'react';
import { doc, updateDoc, collection, query, where, getDocs, getDoc, deleteDoc, onSnapshot } from 'firebase/firestore'; // Added onSnapshot
import GlassCard from './common/GlassCard';
import { COLORS } from '../constants';
import { CheckCircle, Search, CreditCard, DollarSign, FileText, User, Shield, Settings, Zap, BarChart, Lock, Ban, Award, ClipboardList, TrendingUp, Landmark, Truck, Building, FileBadge, Coins, Package, MapPin } from 'lucide-react'; // Added more Lucide icons for new sections

const AdminDashboardLayout = ({ setUserProfile, db, appId, auth }) => {
    const [targetUserId, setTargetUserId] = useState(''); // For targeting users by Discord ID
    const [newCreditScore, setNewCreditScore] = useState('');
    const [penaltyType, setPenaltyType] = useState('Missed Payment');
    const [kycSearchId, setKycSearchId] = useState(''); // For searching by Discord ID or KYC Code
    const [assignRoleUserId, setAssignRoleUserId] = useState(''); // Separate state for role assignment
    const [specialAccountType, setSpecialAccountType] = useState('VIP Client');
    const [accountRequests, setAccountRequests] = useState([]); // State for pending account requests
    const [creditCardRequests, setCreditCardRequests] = useState([]); // State for pending credit card requests
    const [depositRequests, setDepositRequests] = useState([]); // State for pending deposit requests
    const [withdrawalRequests, setWithdrawalRequests] = useState([]); // State for pending withdrawal requests
    const [loanRequests, setLoanRequests] = useState([]); // State for pending loan requests

    const [searchedUserKyc, setSearchedUserKyc] = useState(null); // State for displaying searched user's KYC info
    const [govAccountId, setGovAccountId] = useState(''); // For government deposits/withdrawals
    const [govAmount, setGovAmount] = useState(''); // For government deposits/withdrawals
    const [businessLinkUserId, setBusinessLinkUserId] = useState(''); // For linking business to user
    const [businessRegId, setBusinessRegId] = useState(''); // For linking business to user
    const [youthAccountId, setYouthAccountId] = useState(''); // For youth account graduation (removed from UI, but state exists)

    // Helper to generate debit card details (copied from OpenSpecificAccountPage)
    const generateDebitCardDetails = () => {
        const num = Array(4).fill(0).map(() => Math.floor(1000 + Math.random() * 9000)).join(' ');
        const issueDate = new Date('2005-01-01');
        const expiryDate = new Date(issueDate);
        expiryDate.setFullYear(issueDate.getFullYear() + 7);
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

    // Fetch all types of pending requests
    useEffect(() => {
        if (!db || !auth.currentUser) {
            console.log("AdminDashboardLayout: DB or auth.currentUser not ready for fetching requests.");
            return;
        }
        console.log("AdminDashboardLayout: Current authenticated user UID:", auth.currentUser.uid); // <-- ADDED LOG

        // Set up real-time listeners for all request types
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
        };

    }, [db, appId, auth.currentUser]); // Depend on db and appId to re-run if they change

    // Generic function to find user by Discord ID or Bank ID
    const findUserByDiscordOrBankId = async (id) => {
        const usersRef = collection(db, `artifacts/${appId}/users`);
        let q;
        if (id.includes('#') || id.length < 8) { // Heuristic: Discord ID contains # or is shorter than typical Bank ID
            q = query(usersRef, where("discordId", "==", id));
        } else { // Assume it's a Bank ID
            q = query(usersRef, where("bankId", "==", id));
        }
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            return { id: querySnapshot.docs[0].id, data: querySnapshot.docs[0].data() };
        }
        return null;
    };


    // Handle approval or denial of an account request
    const handleApproveDenyAccountRequest = async (requestId, status) => {
        try {
            const requestDocRef = doc(db, `artifacts/${appId}/public/data/accountRequests`, requestId);
            const requestSnap = await getDoc(requestDocRef);
            if (!requestSnap.exists()) {
                alert('Account request not found.');
                return;
            }
            const requestData = requestSnap.data();
            const userDocRef = doc(db, `artifacts/${appId}/users`, requestData.userId);
            const currentUserSnap = await getDoc(userDocRef);

            if (!currentUserSnap.exists()) {
                alert('User for this request not found. Request cannot be processed.');
                await deleteDoc(requestDocRef); // Clean up orphaned request
                return;
            }
            const currentUserData = currentUserSnap.data();

            if (status === 'Approved') {
                const depositAmount = requestData.initialDeposit;
                const newBalance = currentUserData.balance + depositAmount;
                const newAccounts = { ...currentUserData.accounts, [requestData.accountType]: (currentUserData.accounts[requestData.accountType] || 0) + depositAmount };
                const newTransactions = [...currentUserData.transactions, {
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

                // Only generate debit card if it's a Personal account AND they don't already have one
                if (requestData.accountType === 'Personal' && !currentUserData.debitCard) {
                    updateData.debitCard = generateDebitCardDetails();
                }
                await updateDoc(userDocRef, updateData);
                alert(`${requestData.accountType} account for ${requestData.userName} approved. Balance updated.`);
            } else {
                alert(`${requestData.accountType} account for ${requestData.userName} denied.`);
            }
            await updateDoc(requestDocRef, { status: status }); // Update request status
            // No need to manually filter state, onSnapshot will handle it
        } catch (error) {
            console.error(`Error ${status.toLowerCase()} account request:`, error);
            alert(`Failed to ${status.toLowerCase()} account request: ${error.message}`);
        }
    };

    // Handle approval/denial of Credit Card Requests
    const handleApproveDenyCreditCardRequest = async (requestId, status) => {
        try {
            const requestDocRef = doc(db, `artifacts/${appId}/public/data/creditCardRequests`, requestId);
            const requestSnap = await getDoc(requestDocRef);
            if (!requestSnap.exists()) {
                alert('Credit Card request not found.');
                return;
            }
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
                // Determine credit limit based on credit score
                if (requestData.creditScore >= 750) {
                    creditLimit = 20000; // Premium
                    approvalMessage = `Credit Card approved for ${requestData.userName} with a ₽${creditLimit.toLocaleString()} limit (Premium).`;
                } else if (requestData.creditScore >= 600) {
                    creditLimit = 15000; // Standard
                    approvalMessage = `Credit Card approved for ${requestData.userName} with a ₽${creditLimit.toLocaleString()} limit.`;
                } else if (requestData.creditScore >= 500) {
                    creditLimit = 5000; // Low Limit / Manual Review
                    approvalMessage = `Credit Card approved for ${requestData.userName} with a ₽${creditLimit.toLocaleString()} limit (Manual Review).`;
                } else {
                    status = 'Denied'; // Override to denied if score is too low
                    approvalMessage = `Credit Card denied for ${requestData.userName} (Score too low: ${requestData.creditScore}).`;
                }

                if (status === 'Approved') {
                    await updateDoc(userDocRef, {
                        hasCreditCard: true,
                        'accounts.CreditCard': creditLimit, // Set the initial credit limit as balance
                        transactions: [...currentUserData.transactions, {
                            date: new Date().toLocaleDateString('en-US'),
                            description: `Credit Card Approved (Limit: ₽${creditLimit.toLocaleString()})`,
                            amount: 0, // No direct fund transfer
                            status: 'Complete'
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

    // Handle approval/denial of Deposit Requests
    const handleApproveDenyDepositRequest = async (requestId, status) => {
        try {
            const requestDocRef = doc(db, `artifacts/${appId}/public/data/depositRequests`, requestId);
            const requestSnap = await getDoc(requestDocRef);
            if (!requestSnap.exists()) {
                alert('Deposit request not found.');
                return;
            }
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
                    balance: currentUserData.balance + depositAmount,
                    'accounts.Personal': (currentUserData.accounts.Personal || 0) + depositAmount, // Assume deposit to personal
                    transactions: [...currentUserData.transactions, {
                        date: new Date().toLocaleDateString('en-US'),
                        description: `Deposit Approved (Proof: ${requestData.discordLink})`,
                        amount: depositAmount,
                        status: 'Complete'
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

    // Handle approval/denial of Withdrawal Requests
    const handleApproveDenyWithdrawalRequest = async (requestId, status) => {
        try {
            const requestDocRef = doc(db, `artifacts/${appId}/public/data/withdrawalRequests`, requestId);
            const requestSnap = await getDoc(requestDocRef);
            if (!requestSnap.exists()) {
                alert('Withdrawal request not found.');
                return;
            }
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
                    status = 'Denied'; // Force deny if funds are truly insufficient
                } else {
                    await updateDoc(userDocRef, {
                        [`accounts.${sourceAccount}`]: (currentUserData.accounts[sourceAccount] || 0) - withdrawalAmount,
                        balance: currentUserData.balance - withdrawalAmount,
                        transactions: [...currentUserData.transactions, {
                            date: new Date().toLocaleDateString('en-US'),
                            description: `Withdrawal Approved from ${sourceAccount}`,
                            amount: -withdrawalAmount,
                            status: 'Complete'
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

    // Handle approval/denial of Loan Requests
    const handleApproveDenyLoanRequest = async (requestId, status) => {
        try {
            const requestDocRef = doc(db, `artifacts/${appId}/public/data/loanRequests`, requestId);
            const requestSnap = await getDoc(requestDocRef);
            if (!requestSnap.exists()) {
                alert('Loan request not found.');
                return;
            }
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
                // Check if user already has an active loan of this type (if limited)
                if (requestData.loanType === 'Personal Loan' && (currentUserData.loanHistory || []).some(loan => loan.type === 'Personal Loan' && loan.status === 'Active')) {
                    alert(`User ${requestData.userName} already has an active Personal Loan. Denying this request.`);
                    status = 'Denied'; // Force deny if already has an active personal loan
                } else {
                    const loanAmount = requestData.amount;
                    const newLoanEntry = {
                        id: requestId, // Link loan history to request ID
                        type: requestData.loanType,
                        amount: loanAmount,
                        repaymentPeriod: requestData.repaymentPeriod,
                        interestRate: requestData.interestRate,
                        collateralLink: requestData.collateralLink || null,
                        downPayment: requestData.downPayment || 0,
                        propertyRegion: requestData.propertyRegion || '',
                        dateIssued: new Date().toLocaleDateString('en-US'),
                        status: 'Active', // Mark as active
                        // Simulate monthly payment calculation for display
                        monthlyPayment: (loanAmount * (requestData.interestRate / 12 * Math.pow(1 + requestData.interestRate / 12, requestData.repaymentPeriod)) / (Math.pow(1 + requestData.interestRate / 12, requestData.repaymentPeriod) - 1)) || 0,
                    };

                    await updateDoc(userDocRef, {
                        balance: currentUserData.balance + loanAmount,
                        'accounts.Personal': (currentUserData.accounts.Personal || 0) + loanAmount, // Loans typically go to personal account
                        transactions: [...currentUserData.transactions, {
                            date: new Date().toLocaleDateString('en-US'),
                            description: `Loan Approved: ${requestData.loanType} (ID: ${requestId})`,
                            amount: loanAmount,
                            status: 'Complete'
                        }],
                        loanHistory: [...(currentUserData.loanHistory || []), newLoanEntry] // Add to loan history
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


    const handleFetchKycInfo = async (e) => {
        e.preventDefault();
        if (!kycSearchId) {
            alert('Please enter a Discord ID or KYC Code.');
            return;
        }
        try {
            const foundUser = await findUserByDiscordOrBankId(kycSearchId);
            if (foundUser) {
                setSearchedUserKyc(foundUser.data); // Set found user data to state
            } else {
                setSearchedUserKyc(null); // Reset if not found
                alert('User not found.');
            }
        } catch (error) {
            console.error("Error fetching KYC info:", error);
            alert(`Failed to fetch KYC info: ${error.message}`);
        }
    };

    // Handle updating a user's credit score
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
                await updateDoc(userDocRef, { creditScore: score }); // Update credit score in Firestore
                alert(`Credit score for ${targetUserId} updated to ${score}.`);
                setNewCreditScore('');
                setTargetUserId('');
                // If the searched user's KYC info is displayed, update it
                if (searchedUserKyc && (searchedUserKyc.discordId === targetUserId || searchedUserKyc.bankId === targetUserId)) {
                    setSearchedUserKyc(prev => ({ ...prev, creditScore: score }));
                }
            } else {
                alert('User not found.');
            }
        } catch (error) {
            console.error("Error updating credit score:", error);
            alert(`Failed to update credit score: ${error.message}`);
        }
    };

    // Handle freezing a user's account
    const handleFreezeAccount = async () => {
        if (!targetUserId) {
            alert('Please enter a User ID to freeze.');
            return;
        }
        try {
            const foundUser = await findUserByDiscordOrBankId(targetUserId);
            if (foundUser) {
                const userDocRef = doc(db, `artifacts/${appId}/users`, foundUser.id);
                await updateDoc(userDocRef, { isFrozen: true }); // Set isFrozen flag to true
                alert(`Account for ${targetUserId} frozen.`);
                setTargetUserId('');
            } else {
                alert('User not found.');
            }
        } catch (error) {
            console.error("Error freezing account:", error);
            alert(`Failed to freeze account: ${error.message}`);
        }
    };

    // Handle applying a penalty to a user's credit score
    const handleApplyPenalty = async () => {
        if (!targetUserId) {
            alert('Please enter a User ID to apply penalty.');
            return;
        }
        try {
            const foundUser = await findUserByDiscordOrBankId(targetUserId);
            if (foundUser) {
                const userDocRef = doc(db, `artifacts/${appId}/users`, foundUser.id);
                const currentScore = foundUser.data.creditScore;
                let penaltyAmount = 0;
                // Determine penalty amount based on type
                switch (penaltyType) {
                    case 'Missed Payment': penaltyAmount = 15; break;
                    case 'Loan Default': penaltyAmount = 25; break;
                    case 'Overused Credit': penaltyAmount = 10; break;
                    case 'Flagged by Auditor': penaltyAmount = 30; break;
                    default: break;
                }
                const newScore = Math.max(300, currentScore - penaltyAmount); // Ensure score doesn't go below 300
                await updateDoc(userDocRef, { creditScore: newScore }); // Update credit score
                alert(`Penalty "${penaltyType}" applied to ${targetUserId}. Credit score updated to ${newScore}.`);
                setTargetUserId('');
                // If the searched user's KYC info is displayed, update it
                if (searchedUserKyc && (searchedUserKyc.discordId === targetUserId || searchedUserKyc.bankId === targetUserId)) {
                    setSearchedUserKyc(prev => ({ ...prev, creditScore: newScore }));
                }
            } else {
                alert('User not found.');
            }
        } catch (error) {
            console.error("Error applying penalty:", error);
            alert(`Failed to apply penalty: ${error.message}`);
        }
    };

    // Handle assigning a special role to a user
    const handleAssignRole = async () => {
        if (!assignRoleUserId) {
            alert('Please enter a User ID to assign role.');
            return;
        }
        try {
            const foundUser = await findUserByDiscordOrBankId(assignRoleUserId);
            if (foundUser) {
                const userDocRef = doc(db, `artifacts/${appId}/users`, foundUser.id);
                // Update specialRole and isVIP flag
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

    // Handle banning a user
    const handleBanUser = async () => {
        if (!targetUserId) {
            alert('Please enter a User ID to ban.');
            return;
        }
        try {
            const foundUser = await findUserByDiscordOrBankId(targetUserId);
            if (foundUser) {
                const userDocRef = doc(db, `artifacts/${appId}/users`, foundUser.id);
                await updateDoc(userDocRef, { isBanned: true }); // Set isBanned flag to true
                alert(`User ${targetUserId} banned.`);
                setTargetUserId('');
            } else {
                alert('User not found.');
            }
        } catch (error) {
            console.error("Error banning user:", error);
            alert(`Failed to ban user: ${error.message}`);
        }
    };

    // Handle Government Deposit/Withdrawal
    const handleGovTransaction = async (type) => {
        const amount = parseFloat(govAmount);
        if (isNaN(amount) || amount <= 0 || !govAccountId) {
            alert('Please enter a valid amount and Government Account ID.');
            return;
        }
        try {
            const foundUser = await findUserByDiscordOrBankId(govAccountId); // Assuming gov accounts also have a bankId or discordId
            // A more robust check would be to verify if the foundUser.data.accountType is indeed 'Government'
            // For now, we'll proceed if user is found.
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
            } else { // withdrawal
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

    // Handle linking business to user
    const handleLinkBusiness = async () => {
        if (!businessLinkUserId || !businessRegId) {
            alert('Please enter both User ID and Business Registration ID.');
            return;
        }
        try {
            const foundUser = await findUserByDiscordOrBankId(businessLinkUserId);
            if (foundUser) {
                const userDocRef = doc(db, `artifacts/${appId}/users`, foundUser.id);
                await updateDoc(userDocRef, {
                    businessRegistrationId: businessRegId, // Add a new field for business registration
                    // Optionally, set a flag if this user is a business owner
                    isBusinessOwner: true
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

    // Handle Youth Account Graduation (Placeholder - removed from UI but keeping function for now)
    // const handleGraduateYouthAccount = async () => {
    //     if (!youthAccountId) {
    //         alert('Please enter a Youth Account ID.');
    //         return;
    //     }
    //     alert(`Simulating graduation for Youth Account ${youthAccountId}. (Functionality not fully implemented)`);
    //     setYouthAccountId('');
    // };


    return (
        <div className="container mx-auto px-4 py-8">
            <h2 className="text-4xl font-extrabold mb-8 text-center drop-shadow-sm" style={{ color: COLORS.primaryAccent }}>🛠️ Administrative Dashboard (Main Panel)</h2>

            {/* Account Requests Queue */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6 flex items-center" style={{ color: COLORS.typography }}><ClipboardList size={30} className="mr-3" /> Account Requests Queue</h3>
                <GlassCard className="p-8">
                    {accountRequests.length === 0 ? (
                        <p className="text-gray-400 text-center">No pending account requests.</p>
                    ) : (
                        <ul className="space-y-3 mb-4">
                            {accountRequests.map(request => (
                                <li key={request.id} className="p-3 rounded-lg flex justify-between items-center" style={{ backgroundColor: COLORS.tertiary }}>
                                    <span>{request.userName} - {request.accountType} Account (Deposit: {request.initialDeposit?.toFixed(2) || 0} RUB)</span>
                                    <div className="space-x-2">
                                        <button onClick={() => handleApproveDenyAccountRequest(request.id, 'Approved')} className="px-4 py-1 rounded-full bg-green-600 text-white text-sm">Approve</button>
                                        <button onClick={() => handleApproveDenyAccountRequest(request.id, 'Denied')} className="px-4 py-1 rounded-full bg-red-600 text-white text-sm">Deny</button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                    <p className="text-sm text-gray-400 italic mt-4">Review applications for Personal, Savings, Business, Government, and Shadow accounts here.</p>
                </GlassCard>
            </section>

            {/* Credit Card Requests Queue */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6 flex items-center" style={{ color: COLORS.typography }}><CreditCard size={30} className="mr-3" /> Credit Card Requests Queue</h3>
                <GlassCard className="p-8">
                    {creditCardRequests.length === 0 ? (
                        <p className="text-gray-400 text-center">No pending credit card requests.</p>
                    ) : (
                        <ul className="space-y-3 mb-4">
                            {creditCardRequests.map(request => (
                                <li key={request.id} className="p-3 rounded-lg flex justify-between items-center" style={{ backgroundColor: COLORS.tertiary }}>
                                    <span>{request.userName} - Credit Card (Score: {request.creditScore})</span>
                                    <div className="space-x-2">
                                        <button onClick={() => handleApproveDenyCreditCardRequest(request.id, 'Approved')} className="px-4 py-1 rounded-full bg-green-600 text-white text-sm">Approve</button>
                                        <button onClick={() => handleApproveDenyCreditCardRequest(request.id, 'Denied')} className="px-4 py-1 rounded-full bg-red-600 text-white text-sm">Deny</button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                    <p className="text-sm text-gray-400 italic mt-4">Credit card applications are reviewed here. Approval based on credit score tiers.</p>
                </GlassCard>
            </section>

            {/* Deposit Requests Queue */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6 flex items-center" style={{ color: COLORS.typography }}><Coins size={30} className="mr-3" /> Deposit Requests Queue</h3>
                <GlassCard className="p-8">
                    {depositRequests.length === 0 ? (
                        <p className="text-gray-400 text-center">No pending deposit requests.</p>
                    ) : (
                        <ul className="space-y-3 mb-4">
                            {depositRequests.map(request => (
                                <li key={request.id} className="p-3 rounded-lg flex justify-between items-center" style={{ backgroundColor: COLORS.tertiary }}>
                                    <span>{request.userName} - Deposit of {request.amount?.toFixed(2) || 0} RUB (Proof: <a href={request.discordLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Link</a>)</span>
                                    <div className="space-x-2">
                                        <button onClick={() => handleApproveDenyDepositRequest(request.id, 'Approved')} className="px-4 py-1 rounded-full bg-green-600 text-white text-sm">Approve</button>
                                        <button onClick={() => handleApproveDenyDepositRequest(request.id, 'Denied')} className="px-4 py-1 rounded-full bg-red-600 text-white text-sm">Deny</button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                    <p className="text-sm text-gray-400 italic mt-4">Review user deposit requests with provided Discord proof of payment.</p>
                </GlassCard>
            </section>

            {/* Withdrawal Requests Queue */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6 flex items-center" style={{ color: COLORS.typography }}><DollarSign size={30} className="mr-3" /> Withdrawal Requests Queue</h3>
                <GlassCard className="p-8">
                    {withdrawalRequests.length === 0 ? (
                        <p className="text-gray-400 text-center">No pending withdrawal requests.</p>
                    ) : (
                        <ul className="space-y-3 mb-4">
                            {withdrawalRequests.map(request => (
                                <li key={request.id} className="p-3 rounded-lg flex justify-between items-center" style={{ backgroundColor: COLORS.tertiary }}>
                                    <span>{request.userName} - Withdrawal of {request.amount?.toFixed(2) || 0} RUB from {request.sourceAccount}</span>
                                    <div className="space-x-2">
                                        <button onClick={() => handleApproveDenyWithdrawalRequest(request.id, 'Approved')} className="px-4 py-1 rounded-full bg-green-600 text-white text-sm">Approve</button>
                                        <button onClick={() => handleApproveDenyWithdrawalRequest(request.id, 'Denied')} className="px-4 py-1 rounded-full bg-red-600 text-white text-sm">Deny</button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                    <p className="text-sm text-gray-400 italic mt-4">Review user withdrawal requests. Funds will be deducted from the specified source account upon approval.</p>
                </GlassCard>
            </section>

            {/* Loan Requests Queue */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6 flex items-center" style={{ color: COLORS.typography }}><FileText size={30} className="mr-3" /> Loan Requests Queue</h3>
                <GlassCard className="p-8">
                    {loanRequests.length === 0 ? (
                        <p className="text-gray-400 text-center">No pending loan requests.</p>
                    ) : (
                        <ul className="space-y-3 mb-4">
                            {loanRequests.map(request => (
                                <li key={request.id} className="p-3 rounded-lg flex flex-col items-start" style={{ backgroundColor: COLORS.tertiary }}>
                                    <div className="flex justify-between w-full mb-2">
                                        <span>{request.userName} - {request.loanType} Request: {request.amount?.toFixed(2) || 0} RUB</span>
                                        <div className="space-x-2">
                                            <button onClick={() => handleApproveDenyLoanRequest(request.id, 'Approved')} className="px-4 py-1 rounded-full bg-green-600 text-white text-sm">Approve</button>
                                            <button onClick={() => handleApproveDenyLoanRequest(request.id, 'Denied')} className="px-4 py-1 rounded-full bg-red-600 text-white text-sm">Deny</button>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-400">Credit Score: {request.creditScore}, Term: {request.repaymentPeriod} months, Rate: {(request.interestRate * 100).toFixed(2)}%</p>
                                    {request.collateralLink && (
                                        <p className="text-sm text-gray-400">Collateral: <a href={request.collateralLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Link to Asset Proof</a></p>
                                    )}
                                    {request.loanType === 'Mortgage Loan' && (
                                        <p className="text-sm text-gray-400">Down Payment: {request.downPayment?.toFixed(2) || 0} RUB, Property Region: {request.propertyRegion}</p>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                    <p className="text-sm text-gray-400 italic mt-4">Review loan applications. Approval is based on credit score, loan type, and collateral requirements.</p>
                </GlassCard>
            </section>


            {/* KYC & Identity Management */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6 flex items-center" style={{ color: COLORS.typography }}><User size={30} className="mr-3" /> KYC & Identity Management</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <GlassCard className="p-6">
                        <h4 className="text-2xl font-semibold mb-4" style={{ color: COLORS.primaryAccent }}>Fetch KYC Info</h4>
                        <form onSubmit={handleFetchKycInfo} className="space-y-4">
                            <input type="text" placeholder="User Discord ID or Bank ID" value={kycSearchId} onChange={(e) => setKycSearchId(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                            <button type="submit" className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-200" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Fetch Info</button>
                        </form>
                        {searchedUserKyc && ( // Display KYC info if a user is found
                            <div className="mt-4 p-4 rounded-lg text-sm" style={{ backgroundColor: COLORS.tertiary, color: COLORS.typography }}>
                                <p className="font-semibold" style={{ color: COLORS.primaryAccent }}>KYC Details for {searchedUserKyc.discordId}:</p>
                                <p>Full Name: {searchedUserKyc.name}</p>
                                <p>Bank ID: {searchedUserKyc.bankId || 'N/A'}</p>
                                <p className="flex items-center">KYC Code: {searchedUserKyc.kycCode} {searchedUserKyc.kycCode && <CheckCircle size={16} color="green" className="ml-2" />}</p>
                                <p>Region: {searchedUserKyc.region}</p>
                                <p>Date Joined: {searchedUserKyc.dateJoined}</p>
                                <p>Credit Score: {searchedUserKyc.creditScore}</p>
                                {/* <button className="mt-3 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-sm">Edit KYC</button> */}
                            </div>
                        )}
                    </GlassCard>
                    <GlassCard className="p-6">
                        <h4 className="text-2xl font-semibold mb-4" style={{ color: COLORS.primaryAccent }}>Update Credit Score</h4>
                        <form onSubmit={handleUpdateCreditScore} className="space-y-4">
                            <input type="text" placeholder="User Discord ID or Bank ID" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                            <input type="number" placeholder="New Score (300-850)" value={newCreditScore} onChange={(e) => setNewCreditScore(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                            <button type="submit" className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-200" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Update Score</button>
                        </form>
                    </GlassCard>
                </div>
            </section>

            {/* Role & Access Management */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6 flex items-center" style={{ color: COLORS.typography }}><Award size={30} className="mr-3" /> Role & Access Management</h3>
                <GlassCard className="p-8">
                    <h4 className="text-2xl font-semibold mb-4" style={{ color: COLORS.primaryAccent }}>Assign Tier Roles (VIP/Black/Partner)</h4>
                    <input type="text" placeholder="User Discord ID or Bank ID" value={assignRoleUserId} onChange={(e) => setAssignRoleUserId(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                    <select value={specialAccountType} onChange={(e) => setSpecialAccountType(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }}>
                        <option value="VIP Client">VIP Client</option>
                        <option value="Government Official">Government Official</option>
                        <option value="Intelligence Agent">Intelligence Agent</option>
                    </select>
                    <button onClick={handleAssignRole} className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-200" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Assign Role</button>
                    <p className="text-sm text-gray-400 italic mt-4">Restricted Access Controls: Shadow & Government account access limited to Super Admins (conceptual).</p>
                </GlassCard>
            </section>

            {/* User Account Controls */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6 flex items-center" style={{ color: COLORS.typography }}><Settings size={30} className="mr-3" /> User Account Controls</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <GlassCard className="p-6">
                        <h4 className="text-2xl font-semibold mb-4" style={{ color: COLORS.primaryAccent }}>Auto-Created Personal Accounts</h4>
                        <p className="text-sm text-gray-400 mb-4">Personal accounts are auto-created upon initial registration (if approved by admin).</p>
                        <button onClick={() => alert('Viewing auto-creation logs...')} className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-200" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>View Logs</button>
                    </GlassCard>
                    <GlassCard className="p-6">
                        <h4 className="text-2xl font-semibold mb-4" style={{ color: COLORS.primaryAccent }}>Create / Approve Special Accounts</h4>
                        <select className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography}}>
                            <option>Savings Account</option>
                            <option>Business Account</option>
                            <option>Government Account</option>
                            <option>Credit Card Account</option>
                            <option>Investment Account</option>
                            <option>Shadow Account</option>
                        </select>
                        <input type="text" placeholder="User Discord ID or Bank ID" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        <button onClick={() => alert('Granting special account access... (Handled via specific request queues)')} className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-200" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Grant Access</button>
                    </GlassCard>
                    <GlassCard className="p-6">
                        <h4 className="text-2xl font-semibold mb-4" style={{ color: COLORS.primaryAccent }}>Account Security Options</h4>
                        <input type="text" placeholder="User Discord ID or Bank ID" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        <button onClick={handleFreezeAccount} className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-200 bg-red-600 hover:bg-red-500" style={{ boxShadow: `0 0 10px rgba(255,0,0,0.5)` }}>Lock / Freeze Account</button>
                        <p className="text-sm text-gray-400 italic mt-2">Temporary Hold: Freezes all transactions for the user.</p>
                    </GlassCard>
                </div>
            </section>

            {/* Loans & Credit Tools */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6 flex items-center" style={{ color: COLORS.typography }}><FileText size={30} className="mr-3" /> Loans & Credit Tools</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <GlassCard className="p-6">
                        <h4 className="text-2xl font-semibold mb-4" style={{ color: COLORS.primaryAccent }}>Loan Review Dashboard</h4>
                        <p className="text-sm text-gray-400 mb-4">View pending loan requests by type (Personal, Business, Mortgage, Government-backed).</p>
                        <button onClick={() => alert('Viewing loan requests by type... (See "Loan Requests Queue" above)')} className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-200" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>View Requests by Type</button>
                    </GlassCard>
                    <GlassCard className="p-6">
                        <h4 className="text-2xl font-semibold mb-4" style={{ color: COLORS.primaryAccent }}>Apply Penalties</h4>
                        <input type="text" placeholder="User Discord ID or Bank ID" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        <select value={penaltyType} onChange={(e) => setPenaltyType(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }}>
                            <option>Missed Payment</option>
                            <option>Loan Default</option>
                            <option>Overused Credit</option>
                            <option>Flagged by Auditor</option>
                        </select>
                        <button onClick={handleApplyPenalty} className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-200 bg-red-600 hover:bg-red-500" style={{ boxShadow: `0 0 10px rgba(255,0,0,0.5)` }}>Apply Penalty</button>
                    </GlassCard>
                </div>
            </section>

            {/* Transactions & Reports */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6 flex items-center" style={{ color: COLORS.typography }}><BarChart size={30} className="mr-3" /> Transactions & Reports</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <GlassCard className="p-6">
                        <h4 className="text-2xl font-semibold mb-4" style={{ color: COLORS.primaryAccent }}>Generate Tax Reports</h4>
                        <input type="text" placeholder="User Discord ID / Entity ID" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        <button onClick={() => alert('Generating tax report...')} className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-300" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Generate Report</button>
                    </GlassCard>
                    <GlassCard className="p-6">
                        <h4 className="text-2xl font-semibold mb-4" style={{ color: COLORS.primaryAccent }}>View Audit Logs (Detailed)</h4>
                        <input type="text" placeholder="User Discord ID / Transaction ID" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        <button onClick={() => alert('Fetching audit logs...')} className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-300" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Fetch Logs</button>
                    </GlassCard>
                    <GlassCard className="p-6">
                        <h4 className="text-2xl font-semibold mb-4" style={{ color: COLORS.primaryAccent }}>Undo / Fix Transactions</h4>
                        <input type="text" placeholder="Transaction ID / Error Log ID" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        <button onClick={() => alert('Correcting entry...')} className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-300" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Correct Entry</button>
                    </GlassCard>
                </div>
            </section>

            {/* Government Finance & Linkage */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6 flex items-center" style={{ color: COLORS.typography }}><Landmark size={30} className="mr-3" /> Government Finance & Linkage</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <GlassCard className="p-6">
                        <h4 className="text-2xl font-semibold mb-4" style={{ color: COLORS.primaryAccent }}>Deposit / Withdraw (Gov)</h4>
                        <input type="text" placeholder="Government Account ID" value={govAccountId} onChange={(e) => setGovAccountId(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        <input type="number" placeholder="Amount" value={govAmount} onChange={(e) => setGovAmount(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        <div className="flex space-x-4">
                            <button onClick={() => handleGovTransaction('deposit')} className="w-1/2 font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-200" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Deposit</button>
                            <button onClick={() => handleGovTransaction('withdraw')} className="w-1/2 font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-200 bg-orange-600 hover:bg-orange-500" style={{ boxShadow: `0 0 10px rgba(255,165,0,0.5)` }}>Withdraw</button>
                        </div>
                    </GlassCard>
                    <GlassCard className="p-6">
                        <h4 className="text-2xl font-semibold mb-4" style={{ color: COLORS.primaryAccent }}>Setup Ministry / Agency Account</h4>
                        <input type="text" placeholder="Ministry/Agency Name" className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        <button onClick={() => alert('Setting up government account... (Handled via Account Requests Queue)')} className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-200" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Setup Gov Account</button>
                    </GlassCard>
                    <GlassCard className="p-6">
                        <h4 className="text-2xl font-semibold mb-4" style={{ color: COLORS.primaryAccent }}>Link Business to User</h4>
                        <input type="text" placeholder="User Discord ID or Bank ID" value={businessLinkUserId} onChange={(e) => setBusinessLinkUserId(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        <input type="text" placeholder="Business Reg. ID" value={businessRegId} onChange={(e) => setBusinessRegId(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        <button onClick={handleLinkBusiness} className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-200" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Link Business</button>
                    </GlassCard>
                </div>
            </section>

            {/* Intelligence & Security */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6 flex items-center" style={{ color: COLORS.typography }}><Shield size={30} className="mr-3" /> Intelligence & Security</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <GlassCard className="p-6">
                        <h4 className="text-2xl font-semibold mb-4" style={{ color: COLORS.primaryAccent }}>Flag Suspicious Behavior</h4>
                        <input type="text" placeholder="User Discord ID / Transaction ID" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        <button onClick={() => alert('Flagging for review...')} className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-300" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Flag for Review</button>
                    </GlassCard>
                    <GlassCard className="p-6">
                        <h4 className="text-2xl font-semibold mb-4" style={{ color: COLORS.primaryAccent }}>Ban User Access</h4>
                        <input type="text" placeholder="User Discord ID or Bank ID" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        <button onClick={handleBanUser} className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-300 bg-red-800 hover:bg-red-700" style={{ boxShadow: `0 0 10px rgba(255,0,0,0.7)` }}>Ban Account</button>
                    </GlassCard>
                </div>
            </section>

            {/* Automation Scripts (Read-Only) */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6 flex items-center" style={{ color: COLORS.typography }}><Zap size={30} className="mr-3" /> Automation Scripts (Read-Only)</h3>
                <GlassCard className="p-8">
                    <ul className="space-y-3 text-gray-400">
                        <li><span className="font-semibold" style={{ color: COLORS.primaryAccent }}>Daily Auto-Credits:</span> Deposits daily/weekly based on job ID or ministry payroll.</li>
                        <li><span className="font-semibold" style={{ color: COLORS.primaryAccent }}>Low Balance Alert Bot:</span> Alerts when account balance is low.</li>
                        <li><span className="font-semibold" style={{ color: COLORS.primaryAccent }}>Monthly Tax Auto-Deduction:</span> Deducts a percentage of income or transfer at set intervals.</li>
                        <li><span className="font-semibold" style={{ color: COLORS.primaryAccent }}>End-of-Month Audit Script:</span> Summarizes account health, credit rating, suspicious logs.</li>
                        <li><span className="font-semibold" style={{ color: COLORS.primaryAccent }}>8-Hour Credit Tracker Update:</span> Cycle system that updates credit automatically.</li>
                    </ul>
                </GlassCard>
            </section>

            {/* Advanced Admin Tools (Read-Only) */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6 flex items-center" style={{ color: COLORS.typography }}><Settings size={30} className="mr-3" /> Advanced Admin Tools (Info Only)</h3>
                <GlassCard className="p-8">
                    <ul className="space-y-3 text-gray-400">
                        <li><span className="font-semibold" style={{ color: COLORS.primaryAccent }}>Universal Search Bar:</span> Search users by ID, name, or account type.</li>
                        <li><span className="font-semibold" style={{ color: COLORS.primaryAccent }}>Global Audit Viewer:</span> Filter logs by transaction, action, or risk flag.</li>
                        <li><span className="font-semibold" style={{ color: COLORS.primaryAccent }}>Balance Adjust Tool:</span> Manually increase/decrease any user or account balance.</li>
                        <li><span className="font-semibold" style={{ color: COLORS.primaryAccent }}>Mass Role Editor:</span> Batch assign or remove roles (e.g., VIP, Investor, Partner).</li>
                        <li><span className="font-semibold" style={{ color: COLORS.primaryAccent }}>Bulk Account Export:</span> Export data by type: Personal / Gov / Business (Formats: CSV, XLSX).</li>
                        <li><span className="font-semibold" style={{ color: COLORS.primaryAccent }}>Interbank Transfer Log Viewer:</span> View pending, approved, and flagged transfers.</li>
                        <li><span className="font-semibold" style={{ color: COLORS.primaryAccent }}>Dashboard Filtering Toggle:</span> Filter views by Account Type, Role Tier, Risk Status, Recent Activity.</li>
                        <li><span className="font-semibold" style={{ color: COLORS.primaryAccent }}>Transaction Freeze Override:</span> Approve or deny auto-frozen transactions on flagged accounts.</li>
                        <li><span className="font-semibold" style={{ color: COLORS.primaryAccent }}>Force Emergency Lockdown:</span> Temporarily lock all transfers system-wide for emergency review.</li>
                        <button onClick={() => alert('Activating global lock... (Simulated)')} className="mt-4 font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-200 bg-red-800 hover:bg-red-700" style={{ boxShadow: `0 0 10px rgba(255,0,0,0.7)` }}>Activate Global Lock</button>
                    </ul>
                </GlassCard>
            </section>
        </div>
    );
};

export default AdminDashboardLayout;
