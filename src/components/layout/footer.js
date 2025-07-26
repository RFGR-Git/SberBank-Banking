import React from 'react';
import { COLORS } from '../../constants';

const Footer = () => {
    return (
        <footer className="bg-[#1A1A1A] text-white p-4 text-center text-sm rounded-t-lg shadow-inner" style={{ color: COLORS.typography }}>
            <p>&copy; {new Date().getFullYear()} Sberbank. All rights reserved.</p>
            <p className="mt-1 opacity-80">Legal Compliance Center: Adherence to Banking Regulations</p>
            <p className="mt-1 opacity-80">Government Treasury Integration</p>
        </footer>
    );
};

export default Footer;
