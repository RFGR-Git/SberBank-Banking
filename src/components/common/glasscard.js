import React from 'react';

const GlassCard = ({ children, className = '', onClick = () => {} }) => {
    return (
        <div onClick={onClick} className={`bg-white bg-opacity-5 backdrop-filter backdrop-blur-lg rounded-xl shadow-lg border border-opacity-10 border-white ${className}`}>
            {children}
        </div>
    );
};

export default GlassCard;
