import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import GlassCard from './common/GlassCard';
import { COLORS } from '../constants';

const FinancialReportsAndToolsLayout = ({ userProfile, setUserProfile, db, appId, auth }) => {
    // State for budget and investment inputs
    const [budgetIncome, setBudgetIncome] = useState(userProfile.budget.income);
    const [expenseCategory, setExpenseCategory] = useState('');
    const [expenseAmount, setExpenseAmount] = useState('');
    const [investmentName, setInvestmentName] = useState('');
    const [investmentQuantity, setInvestmentQuantity] = useState('');
    const [investmentPrice, setInvestmentPrice] = useState('');

    // Handle setting monthly income
    const handleSetIncome = async (e) => {
        e.preventDefault();
        const income = parseFloat(budgetIncome);
        if (isNaN(income) || income < 0) {
            alert('Please enter a valid income amount.');
            return;
        }
        try {
            const userDocRef = doc(db, `artifacts/${appId}/users`, auth.currentUser.uid);
            // Update user's budget income in Firestore
            await updateDoc(userDocRef, { 'budget.income': income });
            alert(`Monthly income set to ${income.toFixed(2)} RUB.`);
        } catch (error) {
            console.error("Error setting income:", error);
            alert(`Failed to set income: ${error.message}`);
        }
    };

    // Handle adding an expense
    const handleAddExpense = async (e) => {
        e.preventDefault();
        const amount = parseFloat(expenseAmount);
        if (isNaN(amount) || amount <= 0 || !expenseCategory) {
            alert('Please enter a valid category and amount.');
            return;
        }
        try {
            const userDocRef = doc(db, `artifacts/${appId}/users`, auth.currentUser.uid);
            // Add new expense to the user's budget expenses array in Firestore
            await updateDoc(userDocRef, {
                'budget.expenses': [...userProfile.budget.expenses, { category: expenseCategory, amount: amount }]
            });
            alert(`Expense "${expenseCategory}" of ${amount.toFixed(2)} RUB added.`);
            setExpenseCategory('');
            setExpenseAmount('');
        } catch (error) {
            console.error("Error adding expense:", error);
            alert(`Failed to add expense: ${error.message}`);
        }
    };

    // Handle adding a fictional investment
    const handleAddInvestment = async (e) => {
        e.preventDefault();
        const quantity = parseFloat(investmentQuantity);
        const price = parseFloat(investmentPrice);
        if (isNaN(quantity) || quantity <= 0 || isNaN(price) || price <= 0 || !investmentName) {
            alert('Please enter valid investment details.');
            return;
        }
        try {
            const userDocRef = doc(db, `artifacts/${appId}/users`, auth.currentUser.uid);
            // Add new investment to the user's investments array in Firestore
            await updateDoc(userDocRef, {
                investments: [...userProfile.investments, { name: investmentName, quantity, price }]
            });
            alert(`Investment in ${investmentName} added.`);
            setInvestmentName('');
            setInvestmentQuantity('');
            setInvestmentPrice('');
        } catch (error) {
            console.error("Error adding investment:", error);
            alert(`Failed to add investment: ${error.message}`);
        }
    };

    // Calculate total expenses and remaining budget
    const totalExpenses = userProfile.budget.expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const remainingBudget = userProfile.budget.income - totalExpenses;
    // Calculate total investment value
    const totalInvestmentValue = userProfile.investments.reduce((sum, inv) => sum + (inv.quantity * inv.price), 0);

    return (
        <div className="container mx-auto px-4 py-8">
            <h2 className="text-4xl font-extrabold mb-8 text-center drop-shadow-sm" style={{ color: COLORS.primaryAccent }}>📈 Financial Reports and Tools</h2>

            {/* Monthly Bank Statements Section */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>Monthly Bank Statements</h3>
                <GlassCard className="p-8">
                    <div className="flex space-x-4 mb-6">
                        <input type="number" placeholder="Month" className="p-2 border border-gray-600 rounded-lg w-24" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                        <input type="number" placeholder="Year" className="p-2 border border-gray-600 rounded-lg w-24" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} />
                    </div>
                    <button className="font-bold py-3 px-6 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-300" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 15px ${COLORS.buttonsGlow}` }}>Download Statement (PDF/TXT)</button>
                    <div className="mt-4 p-4 rounded-lg text-sm" style={{ backgroundColor: COLORS.tertiary, color: COLORS.typography }}>
                        <p className="font-semibold" style={{ color: COLORS.primaryAccent }}>Mock Statement for {new Date().toLocaleDateString('en-US')}</p>
                        <p>Opening Balance: {userProfile.balance.toFixed(2)} RUB</p>
                        {userProfile.transactions.map((tx, idx) => (
                            <p key={idx}>{tx.date}: {tx.description} - {tx.amount.toFixed(2)} RUB</p>
                        ))}
                        <p>Closing Balance: {userProfile.balance.toFixed(2)} RUB</p>
                    </div>
                </GlassCard>
            </section>

            {/* Budget Planner Tool Section */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>Budget Planner Tool</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <GlassCard className="p-6">
                        <h4 className="text-2xl font-semibold mb-4" style={{ color: COLORS.primaryAccent }}>Set Income & Expenses</h4>
                        <form onSubmit={handleSetIncome} className="space-y-4 mb-4">
                            <input type="number" placeholder="Monthly Income (RUB)" value={budgetIncome} onChange={(e) => setBudgetIncome(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} required />
                            <button type="submit" className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-200" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Set Income</button>
                        </form>
                        <form onSubmit={handleAddExpense} className="space-y-4">
                            <input type="text" placeholder="Expense Category" value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} required />
                            <input type="number" placeholder="Amount" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} required />
                            <button type="submit" className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-200" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Add Expense</button>
                        </form>
                    </GlassCard>
                    <GlassCard className="p-6">
                        <h4 className="text-2xl font-semibold mb-4" style={{ color: COLORS.primaryAccent }}>Budget Summary</h4>
                        <p className="text-lg">Monthly Income: {userProfile.budget.income.toFixed(2)} RUB</p>
                        <p className="text-lg">Total Expenses: {totalExpenses.toFixed(2)} RUB</p>
                        <p className="text-lg font-bold">Remaining Budget: {remainingBudget.toFixed(2)} RUB</p>
                        <h5 className="text-xl font-semibold mt-4" style={{ color: COLORS.primaryAccent }}>Expenses:</h5>
                        <ul className="mt-2 space-y-1 text-sm">
                            {userProfile.budget.expenses.map((exp, idx) => (
                                <li key={idx}>{exp.category}: {exp.amount.toFixed(2)} RUB</li>
                            ))}
                            {userProfile.budget.expenses.length === 0 && <li className="text-gray-400">No expenses added.</li>}
                        </ul>
                    </GlassCard>
                </div>
            </section>

            {/* Investment Portfolio Tracking Section */}
            <section className="mb-12">
                <h3 className="text-3xl font-bold mb-6" style={{ color: COLORS.typography }}>Investment Portfolio Tracking</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <GlassCard className="p-6">
                        <h4 className="text-2xl font-semibold mb-4" style={{ color: COLORS.primaryAccent }}>Add Fictional Investment</h4>
                        <form onSubmit={handleAddInvestment} className="space-y-4">
                            <input type="text" placeholder="Stock/Venture Name" value={investmentName} onChange={(e) => setInvestmentName(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} required />
                            <input type="number" placeholder="Quantity" value={investmentQuantity} onChange={(e) => setInvestmentQuantity(e.target.value)} className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} required />
                            <input type="number" placeholder="Purchase Price (per unit, RUB)" value={investmentPrice} onChange={(e) => setInvestmentPrice(e.target.value)} step="0.01" className="w-full p-3 border border-gray-600 rounded-lg mb-4" style={{ backgroundColor: COLORS.secondaryAccent, color: COLORS.typography }} required />
                            <button type="submit" className="w-full font-bold py-2 px-6 rounded-lg shadow-md transition-all duration-200" style={{ backgroundColor: COLORS.primaryAccent, color: COLORS.background, boxShadow: `0 0 10px ${COLORS.buttonsGlow}` }}>Add Investment</button>
                        </form>
                    </GlassCard>
                    <GlassCard className="p-6">
                        <h4 className="text-2xl font-semibold mb-4" style={{ color: COLORS.primaryAccent }}>Portfolio Summary</h4>
                        <p className="text-lg font-bold">Total Portfolio Value: {totalInvestmentValue.toFixed(2)} RUB</p>
                        <h5 className="text-xl font-semibold mt-4" style={{ color: COLORS.primaryAccent }}>Your Investments:</h5>
                        <ul className="mt-2 space-y-2">
                            {userProfile.investments.map((inv, idx) => (
                                <li key={idx} className="p-3 rounded-lg" style={{ backgroundColor: COLORS.tertiary }}>
                                    {inv.name} ({inv.quantity} units) - Value: {(inv.quantity * inv.price).toFixed(2)} RUB
                                </li>
                            ))}
                            {userProfile.investments.length === 0 && <li className="text-gray-400">No investments added.</li>}
                        </ul>
                    </GlassCard>
                </div>
            </section>
        </div>
    );
};

export default FinancialReportsAndToolsLayout;
