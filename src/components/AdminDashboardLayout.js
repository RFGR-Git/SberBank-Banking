import React, { useState, useEffect } from 'react';
import { doc, updateDoc, collection, query, where, getDocs, getDoc, deleteDoc } from 'firebase/firestore';
import GlassCard from './common/GlassCard';
import { COLORS } from '../constants';
import { CheckCircle } from 'lucide-react'; // Keep Lucide icons

const AdminDashboardLayout = ({ setUserProfile, db, appId, auth }) => {
    const [targetUserId, setTargetUserId] = useState(''); // For targeting users by Discord ID
    const [newCreditScore, setNewCreditScore] = useState('');
    const [penaltyType, setPenaltyType] = useState('Missed Payment');
    const [kycSearchId, setKycSearchId] = useState(''); // For searching by Discord ID or KYC Code
    const [specialAccountType, setSpecialAccountType] = useState('VIP Client');
    const [accountRequests, setAccountRequests] = useState([]); // State for pending account requests
    const [creditCardRequests, setCreditCardRequests] = useState([]); // New: State for pending credit card requests
    const [depositRequests, setDepositRequests] = useState([]); // New: State for pending deposit requests
    const [withdrawalRequests, setWithdrawalRequests] = useState([]); // New: State for pending withdrawal requests
    const [loanRequests, setLoanRequests] = useState([]); // New: State for pending loan requests

    const [searchedUserKyc, setSearchedUserKyc] = useState(null); // State for displaying searched user's KYC info

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
        if (!db) return;

        const fetchAllRequests = async () => {
            try {
                // Account Requests (Personal, Savings, Business, Government, Shadow)
                const accountQ = query(collection(db, `artifacts/${appId}/public/data/accountRequests`), where("status", "==", "Pending"));
                const accountSnapshot = await getDocs(accountQ);
                setAccountRequests(accountSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

                // Credit Card Requests
                const creditCardQ = query(collection(db, `artifacts/${appId}/public/data/creditCardRequests`), where("status", "==", "Pending"));
                const creditCardSnapshot = await getDocs(creditCardQ);
                setCreditCardRequests(creditCardSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

                // Deposit Requests
                const depositQ = query(collection(db, `artifacts/${appId}/public/data/depositRequests`), where("status", "==", "Pending"));
                const depositSnapshot = await getDocs(depositQ);
                setDepositRequests(depositSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

                // Withdrawal Requests
                const withdrawalQ = query(collection(db, `artifacts/${appId}/public/data/withdrawalRequests`), where("status", "==", "Pending"));
                const withdrawalSnapshot = await getDocs(withdrawalQ);
                setWithdrawalRequests(withdrawalSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

                // Loan Requests
                const loanQ = query(collection(db, `artifacts/${appId}/public/data/loanRequests`), where("status", "==", "Pending"));
                const loanSnapshot = await getDocs(loanQ);
                setLoanRequests(loanSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

            } catch (error) {
                console.error("Error fetching all requests:", error);
            }
        };
        fetchAllRequests();
    }, [db, appId]);

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

            if (status === 'Approved') {
                const currentUserData = (await getDoc(userDocRef)).data();
                const newBalance = currentUserData.balance + requestData.initialDeposit;
                const newAccounts = { ...currentUserData.accounts, [requestData.accountType]: requestData.initialDeposit };
                const newTransactions = [...currentUserData.transactions, {
                    date: new Date().toLocaleDateString('en-US'),
                    description: `${requestData.accountType} Account Opened (Admin Approved)`,
                    amount: requestData.initialDeposit,
                    status: 'Complete',
                    discordLink: requestData.discordMessageLink
                }];

                const updateData = {
                    balance: newBalance,
                    accounts: newAccounts,
                    transactions: newTransactions,
                };

                if (requestData.accountType === 'Personal' && !currentUserData.debitCard) {
                    updateData.debitCard = generateDebitCardDetails();
                }
                await updateDoc(userDocRef, updateData);
                alert(`${requestData.accountType} account for ${requestData.userName} approved.`);
            } else {
                alert(`${requestData.accountType} account for ${requestData.userName} denied.`);
            }
            await updateDoc(requestDocRef, { status: status });
            setAccountRequests(prev => prev.filter(req => req.id !== requestId));
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
            const currentUserData = (await getDoc(userDocRef)).data();

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
            setCreditCardRequests(prev => prev.filter(req => req.id !== requestId));
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
            const currentUserData = (await getDoc(userDocRef)).data();

            if (status === 'Approved') {
                const depositAmount = requestData.amount;
                await updateDoc(userDocRef, {
                    balance: currentUserData.balance + depositAmount,
                    'accounts.Personal': currentUserData.accounts.Personal + depositAmount, // Assume deposit to personal
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
            setDepositRequests(prev => prev.filter(req => req.id !== requestId));
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
            const currentUserData = (await getDoc(userDocRef)).data();

            if (status === 'Approved') {
                const withdrawalAmount = requestData.amount;
                const sourceAccount = requestData.sourceAccount;

                if (currentUserData.accounts[sourceAccount] < withdrawalAmount) {
                    alert(`User ${requestData.userName} has insufficient funds in ${sourceAccount} for this withdrawal. Denying.`);
                    status = 'Denied'; // Force deny if funds are truly insufficient
                } else {
                    await updateDoc(userDocRef, {
                        [`accounts.${sourceAccount}`]: currentUserData.accounts[sourceAccount] - withdrawalAmount,
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
            setWithdrawalRequests(prev => prev.filter(req => req.id !== requestId));
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
            const currentUserData = (await getDoc(userDocRef)).data();

            if (status === 'Approved') {
                // Check if user already has an active loan of this type (if limited)
                if (requestData.loanType === 'Personal Loan' && currentUserData.loanHistory.some(loan => loan.type === 'Personal Loan' && loan.status === 'Active')) {
                    alert(`User ${requestData.userName} already has an active Personal Loan. Denying this request.`);
                    status = 'Denied';
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
                        'accounts.Personal': currentUserData.accounts.Personal + loanAmount, // Loans go to personal account
                        transactions: [...currentUserData.transactions, {
                            date: new Date().toLocaleDateString('en-US'),
                            description: `Loan Approved: ${requestData.loanType} (ID: ${requestId})`,
                            amount: loanAmount,
                            status: 'Complete'
                        }],
                        loanHistory: [...currentUserData.loanHistory, newLoanEntry] // Add to loan history
                    });
                    alert(`${requestData.loanType} loan for ${requestData.userName} approved for ₽${loanAmount.toLocaleString()}.`);
                }
            } else {
                alert(`Loan request for ${requestData.userName} denied.`);
            }
            await updateDoc(requestDocRef, { status: status });
            setLoanRequests(prev => prev.filter(req => req.id !== requestId));
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
            const usersRef = collection(db, `artifacts/${appId}/users`);
            let q;
            // Determine if search is by KYC code or Discord ID
            if (kycSearchId.startsWith('KYC-')) {
                q = query(usersRef, where("kycCode", "==", kycSearchId));
            } else {
                q = query(usersRef, where("discordId", "==", kycSearchId));
            }
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const userData = querySnapshot.docs[0].data();
                setSearchedUserKyc(userData); // Set found user data to state
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
            const usersRef = collection(db, `artifacts/${appId}/users`);
            const q = query(usersRef, where("discordId", "==", targetUserId));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const userDocRef = doc(db, `artifacts/${appId}/users`, querySnapshot.docs[0].id);
                await updateDoc(userDocRef, { creditScore: score }); // Update credit score in Firestore
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

    // Handle freezing a user's account
    const handleFreezeAccount = async () => {
        if (!targetUserId) {
            alert('Please enter a User ID to freeze.');
            return;
        }
        try {
            const usersRef = collection(db, `artifacts/${appId}/users`);
            const q = query(usersRef, where("discordId", "==", targetUserId));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const userDocRef = doc(db, `artifacts/${appId}/users`, querySnapshot.docs[0].id);
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
            const usersRef = collection(db, `artifacts/${appId}/users`);
            const q = query(usersRef, where("discordId", "==", targetUserId));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const userDocRef = doc(db, `artifacts/${appId}/users`, querySnapshot.docs[0].id);
                const currentScore = querySnapshot.docs[0].data().creditScore;
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
        if (!targetUserId) {
            alert('Please enter a User ID to assign role.');
            return;
        }
        try {
            const usersRef = collection(db, `artifacts/${appId}/users`);
            const q = query(usersRef, where("discordId", "==", targetUserId));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const userDocRef = doc(db, `artifacts/${appId}/users`, querySnapshot.docs[0].id);
                // Update specialRole and isVIP flag
                await updateDoc(userDocRef, { specialRole: specialAccountType, isVIP: specialAccountType === 'VIP Client' });
                alert(`Special role "${specialAccountType}" assigned to ${targetUserId}.`);
                setTargetUserId('');
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
            const usersRef = collection(db, `artifacts/${appId}/users`);
            const q = query(usersRef, where("discordId", "==", targetUserId));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const userDocRef = doc(db, `artifacts/${appId}/users`, querySnapshot.docs[0].id);
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

    return (
        <div className="container mx-auto px-4 py-8">
            <h2 className="text-4xl font-extrabold mb-8 text-center drop-shadow-sm" style={{ color: COLORS.primaryAccent }}>Administrative Dashboard</h2>

            {/* Account Requests Queue */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>Account Requests Queue</h3>
                <GlassCard className="p-8">
                    {accountRequests.length === 0 ? (
                        <p className="text-gray-400 text-center">No pending account requests.</p>
                    ) : (
                        <ul className="space-y-3 mb-4">
                            {accountRequests.map(request => (
                                <li key={request.id} className="p-3 rounded-lg flex justify-between items-center" style={{ backgroundColor: COLORS.tertiary }}>
                                    <span>{request.userName} - {request.accountType} Account Request (Deposit: {request.initialDeposit} RUB)</span>
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
                <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>Credit Card Requests Queue</h3>
                <GlassCard className="p-8">
                    {creditCardRequests.length === 0 ? (
                        <p className="text-gray-400 text-center">No pending credit card requests.</p>
                    ) : (
                        <ul className="space-y-3 mb-4">
                            {creditCardRequests.map(request => (
                                <li key={request.id} className="p-3 rounded-lg flex justify-between items-center" style={{ backgroundColor: COLORS.tertiary }}>
                                    <span>{request.userName} - Credit Card Request (Score: {request.creditScore})</span>
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
                <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>Deposit Requests Queue</h3>
                <GlassCard className="p-8">
                    {depositRequests.length === 0 ? (
                        <p className="text-gray-400 text-center">No pending deposit requests.</p>
                    ) : (
                        <ul className="space-y-3 mb-4">
                            {depositRequests.map(request => (
                                <li key={request.id} className="p-3 rounded-lg flex justify-between items-center" style={{ backgroundColor: COLORS.tertiary }}>
                                    <span>{request.userName} - Deposit of {request.amount.toFixed(2)} RUB (Proof: <a href={request.discordLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Link</a>)</span>
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
                <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>Withdrawal Requests Queue</h3>
                <GlassCard className="p-8">
                    {withdrawalRequests.length === 0 ? (
                        <p className="text-gray-400 text-center">No pending withdrawal requests.</p>
                    ) : (
                        <ul className="space-y-3 mb-4">
                            {withdrawalRequests.map(request => (
                                <li key={request.id} className="p-3 rounded-lg flex justify-between items-center" style={{ backgroundColor: COLORS.tertiary }}>
                                    <span>{request.userName} - Withdrawal of {request.amount.toFixed(2)} RUB from {request.sourceAccount}</span>
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
                <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>Loan Requests Queue</h3>
                <GlassCard className="p-8">
                    {loanRequests.length === 0 ? (
                        <p className="text-gray-400 text-center">No pending loan requests.</p>
                    ) : (
                        <ul className="space-y-3 mb-4">
                            {loanRequests.map(request => (
                                <li key={request.id} className="p-3 rounded-lg flex flex-col items-start" style={{ backgroundColor: COLORS.tertiary }}>
                                    <div className="flex justify-between w-full mb-2">
                                        <span>{request.userName} - {request.loanType} Request: {request.amount.toFixed(2)} RUB</span>
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
                                        <p className="text-sm text-gray-400">Down Payment: {request.downPayment.toFixed(2)} RUB, Property Region: {request.propertyRegion}</p>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                    <p className="text-sm text-gray-400 italic mt-4">Review loan applications. Approval is based on credit score, loan type, and collateral requirements.</p>
                </GlassCard>
            </section>


            {/* View/Edit KYC Info Section */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>View/Edit KYC Info</h3>
                <GlassCard className="p-8">
                    <form onSubmit={handleFetchKycInfo} className="space-y-4">
                        <input type="text" placeholder="User Discord ID or KYC Code" value={kycSearchId} onChange={(e) => setKycSearchId(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        <button type="submit" className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-200" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Fetch KYC Info</button>
                    </form>
                    {searchedUserKyc && ( // Display KYC info if a user is found
                        <div className="mt-4 p-4 rounded-lg text-sm" style={{ backgroundColor: COLORS.tertiary, color: COLORS.typography }}>
                            <p className="font-semibold" style={{ color: COLORS.primaryAccent }}>KYC Details for {searchedUserKyc.discordId}:</p>
                            <p>Full Name: {searchedUserKyc.name}</p>
                            <p>Bank ID: {searchedUserKyc.bankId || 'N/A'}</p> {/* Display Bank ID here too */}
                            <p className="flex items-center">KYC Code: {searchedUserKyc.kycCode} {searchedUserKyc.kycCode && <CheckCircle size={16} color="green" className="ml-2" />}</p>
                            <p>Region: {searchedUserKyc.region}</p>
                            <p>Date Joined: {searchedUserKyc.dateJoined}</p>
                            <button className="mt-3 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-sm">Edit KYC</button>
                        </div>
                    )}
                </GlassCard>
            </section>

            {/* Credit Score Checker Section */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>Credit Score Checker</h3>
                <GlassCard className="p-8">
                    <form onSubmit={handleUpdateCreditScore} className="space-y-4">
                        <input type="text" placeholder="User Discord ID" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        <input type="number" placeholder="New Score Value (300-850)" value={newCreditScore} onChange={(e) => setNewCreditScore(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        <button type="submit" onClick={handleUpdateCreditScore} className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-200" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Update Score</button>
                    </form>
                    <div className="mt-4 p-4 rounded-lg text-sm" style={{ backgroundColor: COLORS.tertiary, color: COLORS.typography }}>
                        <p className="font-semibold" style={{ color: COLORS.primaryAccent }}>Current Score for {targetUserId || 'Selected User'}:</p>
                        <p>Current Score: {searchedUserKyc?.creditScore || 'N/A'}</p>
                        <p>Recommendation: {searchedUserKyc ? (searchedUserKyc.creditScore >= 650 ? 'Eligible for standard loans/credit cards' : 'Not eligible for standard loans/credit cards') : 'N/A'}</p>
                    </div>
                </GlassCard>
            </section>

            {/* Role-Based Access Section */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>Role-Based Access</h3>
                <GlassCard className="p-8">
                    <input type="text" placeholder="User Discord ID" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                    <select value={specialAccountType} onChange={(e) => setSpecialAccountType(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }}>
                        <option value="VIP Client">VIP Client</option>
                        <option value="Government Official">Government Official</option>
                        <option value="Intelligence Agent">Intelligence Agent</option>
                    </select>
                    <button onClick={handleAssignRole} className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-200" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Assign Role</button>
                    <p className="text-sm text-gray-400 italic mt-4">Only special admins can create Shadow or Government accounts.</p>
                </GlassCard>
            </section>

            {/* User Accounts Management Section */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>User Accounts</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <GlassCard className="p-6">
                        <h4 className="text-2xl font-semibold mb-4" style={{ color: COLORS.primaryAccent }}>Create Personal Account</h4>
                        <p className="text-sm text-gray-400 mb-4">Automated after initial registration.</p>
                        <button onClick={() => alert('Viewing auto-creation logs...')} className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-200" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>View Auto-Creation Logs</button>
                    </GlassCard>
                    <GlassCard className="p-6">
                        <h4 className="text-2xl font-semibold mb-4" style={{ color: COLORS.primaryAccent }}>Approve Business Account</h4>
                        <input type="text" placeholder="User ID / Business Name" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        <button onClick={() => alert('This action is handled via Account Requests Queue.')} className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-200" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Approve (See Queue)</button>
                    </GlassCard>
                    <GlassCard className="p-6">
                        <h4 className="text-2xl font-semibold mb-4" style={{ color: COLORS.primaryAccent }}>Open Special Account</h4>
                        <select className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography}}>
                            <option>Savings Account</option>
                            <option>Credit Card Account</option>
                            <option>Investment Account</option>
                            <option>Shadow Account</option>
                        </select>
                        <input type="text" placeholder="User ID" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        <button onClick={() => alert('Granting special account access...')} className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-200" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Grant Access</button>
                    </GlassCard>
                    <GlassCard className="p-6">
                        <h4 className="text-2xl font-semibold mb-4" style={{ color: COLORS.primaryAccent }}>Update User Credit Score</h4>
                        <input type="text" placeholder="User ID" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        <input type="number" placeholder="New Score Value (300-850)" value={newCreditScore} onChange={(e) => setNewCreditScore(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        <button type="submit" onClick={handleUpdateCreditScore} className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-200" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Manual Override</button>
                    </GlassCard>
                    <GlassCard className="p-6">
                        <h4 className="text-2xl font-semibold mb-4" style={{ color: COLORS.primaryAccent }}>Lock/Freeze Account</h4>
                        <input type="text" placeholder="User ID" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        <button onClick={handleFreezeAccount} className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-200 bg-red-600 hover:bg-red-500" style={{ boxShadow: `0 0 10px rgba(255,0,0,0.5)` }}>Freeze Account</button>
                    </GlassCard>
                </div>
            </section>

            {/* Credit System Management */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>Credit System</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <GlassCard className="p-6">
                        <h4 className="text-2xl font-semibold mb-4" style={{ color: COLORS.primaryAccent }}>Credit Card Approval</h4>
                        <input type="text" placeholder="User ID" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        <button onClick={() => alert('Approving credit card...')} className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-200" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Approve Credit Card</button>
                    </GlassCard>
                    <GlassCard className="p-6">
                        <h4 className="text-2xl font-semibold mb-4" style={{ color: COLORS.primaryAccent }}>Apply Penalties</h4>
                        <input type="text" placeholder="User ID" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
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

            {/* Money Management */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>Money Management</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <GlassCard className="p-6">
                        <h4 className="text-2xl font-semibold mb-4" style={{ color: COLORS.primaryAccent }}>Government Deposits/Withdrawals</h4>
                        <input type="text" placeholder="Government Account ID" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        <input type="number" placeholder="Amount" className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        <div className="flex space-x-4">
                            <button onClick={() => alert('Simulating government deposit...')} className="w-1/2 font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-200" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Deposit</button>
                            <button onClick={() => alert('Simulating government withdrawal...')} className="w-1/2 font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-200 bg-orange-600 hover:bg-orange-500" style={{ boxShadow: `0 0 10px rgba(255,165,0,0.5)` }}>Withdraw</button>
                        </div>
                    </GlassCard>
                    <GlassCard className="p-6">
                        <h4 className="text-2xl font-semibold mb-4" style={{ color: COLORS.primaryAccent }}>Inter-bank Transfers Approval</h4>
                        <input type="text" placeholder="Transaction ID" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        <button onClick={() => alert('Approving inter-bank transfer...')} className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-200" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Approve Transfer</button>
                    </GlassCard>
                </div>
            </section>

            {/* Account Approvals */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>Account Approvals</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <GlassCard className="p-6">
                        <h4 className="text-2xl font-semibold mb-4" style={{ color: COLORS.primaryAccent }}>Business Registration Linkage</h4>
                        <input type="text" placeholder="User ID / Business Reg. ID" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        <button onClick={() => alert('Linking business registration...')} className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-200" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Link Business</button>
                    </GlassCard>
                    <GlassCard className="p-6">
                        <h4 className="text-2xl font-semibold mb-4" style={{ color: COLORS.primaryAccent }}>Government Account Setup</h4>
                        <input type="text" placeholder="Ministry/Agency Name" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        <button onClick={() => alert('Setting up government account...')} className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-200" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Setup Gov Account</button>
                    </GlassCard>
                    <GlassCard className="p-6">
                        <h4 className="text-2xl font-semibold mb-4" style={{ color: COLORS.primaryAccent }}>Youth Account Graduation</h4>
                        <input type="text" placeholder="Youth Account ID" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        <button onClick={() => alert('Graduating youth account...')} className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-200" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Graduate Youth Account</button>
                    </GlassCard>
                </div>
            </section>

            {/* Loans & Credit Lines */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>Loans & Credit Lines</h3>
                <GlassCard className="p-8">
                    <h4 className="text-2xl font-semibold mb-4" style={{ color: COLORS.primaryAccent }}>Loan Applications Review</h4>
                    <ul className="space-y-3 mb-4">
                        <li className="p-3 rounded-lg flex justify-between items-center" style={{ backgroundColor: COLORS.tertiary }}>
                            <span>User_C - Loan Request: 5000 RUB (Simulated)</span>
                            <div className="space-x-2">
                                <button onClick={() => alert('Approved Loan for User_C')} className="px-4 py-1 rounded-full bg-green-600 text-white text-sm">Approve</button>
                                <button onClick={() => alert('Denied Loan for User_C')} className="px-4 py-1 rounded-full bg-red-600 text-white text-sm">Deny</button>
                            </div>
                        </li>
                    </ul>
                    <p className="text-sm text-gray-400 italic">Automated checks apply, but manual review is possible.</p>
                </GlassCard>
            </section>

            {/* Transactions & Reports */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>Transactions & Reports</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <GlassCard className="p-6">
                        <h4 className="text-2xl font-semibold mb-4" style={{ color: COLORS.primaryAccent }}>Generate Tax Reports</h4>
                        <input type="text" placeholder="User ID / Entity ID" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        <button onClick={() => alert('Generating tax report...')} className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-300" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Generate Report</button>
                    </GlassCard>
                    <GlassCard className="p-6">
                        <h4 className="text-2xl font-semibold mb-4" style={{ color: COLORS.primaryAccent }}>View Audit Logs (Detailed)</h4>
                        <input type="text" placeholder="User ID / Transaction ID" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        <button onClick={() => alert('Fetching audit logs...')} className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-300" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Fetch Logs</button>
                    </GlassCard>
                </div>
            </section>

            {/* Security & Admin Actions */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>Security & Admin Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <GlassCard className="p-6">
                        <h4 className="text-2xl font-semibold mb-4" style={{ color: COLORS.primaryAccent }}>Flag Suspicious Behavior</h4>
                        <input type="text" placeholder="User ID / Transaction ID" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        <button onClick={() => alert('Flagging for review...')} className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-300" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Flag for Review</button>
                    </GlassCard>
                    <GlassCard className="p-6">
                        <h4 className="text-2xl font-semibold mb-4" style={{ color: COLORS.primaryAccent }}>Undo/Fix Errors</h4>
                        <input type="text" placeholder="Transaction ID / Error Log ID" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        <button onClick={() => alert('Correcting entry...')} className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-300" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Correct Entry</button>
                    </GlassCard>
                    <GlassCard className="p-6">
                        <h4 className="text-2xl font-semibold mb-4" style={{ color: COLORS.primaryAccent }}>Assign Special Accounts</h4>
                        <input type="text" placeholder="User ID" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        <select value={specialAccountType} onChange={(e) => setSpecialAccountType(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }}>
                            <option>VIP Client</option>
                            <option>Government Official</option>
                            <option>Intelligence Agent</option>
                        </select>
                        <button onClick={handleAssignRole} className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-300" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Assign Role</button>
                    </GlassCard>
                    <GlassCard className="p-6">
                        <h4 className="text-2xl font-semibold mb-4" style={{ color: COLORS.primaryAccent }}>Ban User</h4>
                        <input type="text" placeholder="User ID" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        <button onClick={handleBanUser} className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-300 bg-red-800 hover:bg-red-700" style={{ boxShadow: `0 0 10px rgba(255,0,0,0.7)` }}>Ban User</button>
                    </GlassCard>
                </div>
            </section>

            {/* Bonus Automations (Placeholder) */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>Bonus Automations (Info Only)</h3>
                <GlassCard className="p-8">
                    <ul className="space-y-3 text-gray-400">
                        <li><span className="font-semibold" style={{ color: COLORS.primaryAccent }}>Daily Auto-Credits:</span> Deposits daily/weekly based on job ID or ministry payroll.</li>
                        <li><span className="font-semibold" style={{ color: COLORS.primaryAccent }}>Low Balance Warning Bot:</span> Alerts when account balance is low.</li>
                        <li><span className="font-semibold" style={{ color: COLORS.primaryAccent }}>Tax Deduction Auto-Run:</span> Deducts a percentage of income or transfer at set intervals.</li>
                        <li><span className="font-semibold" style={{ color: COLORS.primaryAccent }}>End-of-Month Audit Script:</span> Summarizes account health, credit rating, suspicious logs.</li>
                        <li><span className="font-semibold" style={{ color: COLORS.primaryAccent }}>Cycle-Based Credit Tracker:</span> 8-hour cycle system that updates credit automatically.</li>
                    </ul>
                </GlassCard>
            </section>

            {/* Recommended Admin Panel Features (Placeholder) */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>Recommended Admin Panel Features (Info Only)</h3>
                <GlassCard className="p-8">
                    <ul className="space-y-3 text-gray-400">
                        <li><span className="font-semibold" style={{ color: COLORS.primaryAccent }}>Search:</span> Search any user by ID, name, or account type.</li>
                        <li><span className="font-semibold" style={{ color: COLORS.primaryAccent }}>Force Adjust:</span> Force adjust balances or scores manually.</li>
                        <li><span className="font-semibold" style={{ color: COLORS.primaryAccent }}>Lock/Freeze/Ban:</span> Lock/freeze/ban user account access.</li>
                        <li><span className="font-semibold" style={{ color: COLORS.primaryAccent }}>View Audit Logs:</span> View audit logs for any account.</li>
                        <li><span className="font-semibold" style={{ color: COLORS.primaryAccent }}>Dashboard by Type:</span> See dashboard by account type (Gov, Business, etc.).</li>
                        <li><span className="font-semibold" style={{ color: COLORS.primaryAccent }}>Export Reports:</span> Export reports or stats (Excel/CSV).</li>
                    </ul>
                </GlassCard>
            </section>
        </div>
    );
};

export default AdminDashboardLayout;
