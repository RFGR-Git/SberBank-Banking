import React from 'react';
import GlassCard from '../common/GlassCard';
import { COLORS } from '../../constants';
import { ClipboardList, CreditCard, Coins, DollarSign, FileText } from 'lucide-react';

const AdminAccountQueues = ({
    accountRequests, creditCardRequests, depositRequests, withdrawalRequests, loanRequests,
    handleApproveDenyAccountRequest, handleApproveDenyCreditCardRequest,
    handleApproveDenyDepositRequest, handleApproveDenyWithdrawalRequest, handleApproveDenyLoanRequest
}) => {
    return (
        <div className="p-8 w-full">
            <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>Account Queues</h3>

            {/* Account Requests Queue */}
            <section className="mb-8">
                <h4 className="text-2xl font-semibold mb-4 flex items-center" style={{ color: COLORS.primaryAccent }}><ClipboardList size={24} className="mr-2" /> Account Requests</h4>
                <GlassCard className="p-6">
                    {accountRequests.length === 0 ? (
                        <p className="text-gray-400 text-center">No pending account requests.</p>
                    ) : (
                        <ul className="space-y-3">
                            {accountRequests.map(request => (
                                <li key={request.id} className="p-3 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center" style={{ backgroundColor: COLORS.tertiary }}>
                                    <span>{request.userName} - {request.accountType} Account (Deposit: {request.initialDeposit?.toFixed(2) || 0} RUB)
                                        {request.discordMessageLink && (
                                            <span className="ml-2 text-sm text-blue-400 hover:underline">
                                                (Proof: <a href={request.discordMessageLink} target="_blank" rel="noopener noreferrer">Link</a>)
                                            </span>
                                        )}
                                    </span>
                                    <div className="space-x-2 mt-2 sm:mt-0">
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
            <section className="mb-8">
                <h4 className="text-2xl font-semibold mb-4 flex items-center" style={{ color: COLORS.primaryAccent }}><CreditCard size={24} className="mr-2" /> Credit Card Requests</h4>
                <GlassCard className="p-6">
                    {creditCardRequests.length === 0 ? (
                        <p className="text-gray-400 text-center">No pending credit card requests.</p>
                    ) : (
                        <ul className="space-y-3">
                            {creditCardRequests.map(request => (
                                <li key={request.id} className="p-3 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center" style={{ backgroundColor: COLORS.tertiary }}>
                                    <span>{request.userName} - Credit Card (Score: {request.creditScore})
                                        {request.discordLink && (
                                            <span className="ml-2 text-sm text-blue-400 hover:underline">
                                                (Proof: <a href={request.discordLink} target="_blank" rel="noopener noreferrer">Link</a>)
                                            </span>
                                        )}
                                    </span>
                                    <div className="space-x-2 mt-2 sm:mt-0">
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
            <section className="mb-8">
                <h4 className="text-2xl font-semibold mb-4 flex items-center" style={{ color: COLORS.primaryAccent }}><Coins size={24} className="mr-2" /> Deposit Requests</h4>
                <GlassCard className="p-6">
                    {depositRequests.length === 0 ? (
                        <p className="text-gray-400 text-center">No pending deposit requests.</p>
                    ) : (
                        <ul className="space-y-3">
                            {depositRequests.map(request => (
                                <li key={request.id} className="p-3 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center" style={{ backgroundColor: COLORS.tertiary }}>
                                    <span>{request.userName} - Deposit of {request.amount?.toFixed(2) || 0} RUB
                                        {request.discordLink && (
                                            <span className="ml-2 text-sm text-blue-400 hover:underline">
                                                (Proof: <a href={request.discordLink} target="_blank" rel="noopener noreferrer">Link</a>)
                                            </span>
                                        )}
                                    </span>
                                    <div className="space-x-2 mt-2 sm:mt-0">
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
            <section className="mb-8">
                <h4 className="text-2xl font-semibold mb-4 flex items-center" style={{ color: COLORS.primaryAccent }}><DollarSign size={24} className="mr-2" /> Withdrawal Requests</h4>
                <GlassCard className="p-6">
                    {withdrawalRequests.length === 0 ? (
                        <p className="text-gray-400 text-center">No pending withdrawal requests.</p>
                    ) : (
                        <ul className="space-y-3">
                            {withdrawalRequests.map(request => (
                                <li key={request.id} className="p-3 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center" style={{ backgroundColor: COLORS.tertiary }}>
                                    <span>{request.userName} - Withdrawal of {request.amount?.toFixed(2) || 0} RUB from {request.sourceAccount}
                                        {request.discordLink && (
                                            <span className="ml-2 text-sm text-blue-400 hover:underline">
                                                (Proof: <a href={request.discordLink} target="_blank" rel="noopener noreferrer">Link</a>)
                                            </span>
                                        )}
                                    </span>
                                    <div className="space-x-2 mt-2 sm:mt-0">
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
            <section className="mb-8">
                <h4 className="text-2xl font-semibold mb-4 flex items-center" style={{ color: COLORS.primaryAccent }}><FileText size={24} className="mr-2" /> Loan Requests</h4>
                <GlassCard className="p-6">
                    {loanRequests.length === 0 ? (
                        <p className="text-gray-400 text-center">No pending loan requests.</p>
                    ) : (
                        <ul className="space-y-3">
                            {loanRequests.map(request => (
                                <li key={request.id} className="p-3 rounded-lg flex flex-col items-start" style={{ backgroundColor: COLORS.tertiary }}>
                                    <div className="flex justify-between w-full mb-2">
                                        <span>{request.userName} - {request.loanType} Request: {request.amount?.toFixed(2) || 0} RUB</span>
                                    </div>
                                    <p className="text-sm text-gray-400">Credit Score: {request.creditScore}, Term: {request.repaymentPeriod} months, Rate: {(request.interestRate * 100).toFixed(2)}%</p>
                                    {request.collateralLink && (
                                        <p className="text-sm text-gray-400">Collateral: <a href={request.collateralLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Link to Asset Proof</a></p>
                                    )}
                                    {request.discordLink && ( // Added discordLink for loan requests if applicable
                                        <p className="text-sm text-gray-400">Discord Proof: <a href={request.discordLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Link</a></p>
                                    )}
                                    {request.loanType === 'Mortgage Loan' && (
                                        <p className="text-sm text-gray-400">Down Payment: {request.downPayment?.toFixed(2) || 0} RUB, Property Region: {request.propertyRegion}</p>
                                    )}
                                    <div className="space-x-2 mt-2">
                                        <button onClick={() => handleApproveDenyLoanRequest(request.id, 'Approved')} className="px-4 py-1 rounded-full bg-green-600 text-white text-sm">Approve</button>
                                        <button onClick={() => handleApproveDenyLoanRequest(request.id, 'Denied')} className="px-4 py-1 rounded-full bg-red-600 text-white text-sm">Deny</button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                    <p className="text-sm text-gray-400 italic mt-4">Review loan applications. Approval is based on credit score, loan type, and collateral requirements.</p>
                </GlassCard>
            </section>
        </div>
    );
};

export default AdminAccountQueues;
