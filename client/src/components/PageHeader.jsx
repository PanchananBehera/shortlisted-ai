// client/src/components/PageHeader.jsx
import React from 'react';

const PageHeader = ({ 
  icon, 
  title, 
  subtitle, 
  actionButton = null,
  gradient = 'from-blue-400 via-purple-400 to-pink-400'
}) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
      <div>
        <h1 className={`text-4xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
          {icon && <span className="mr-2">{icon}</span>}
          {title}
        </h1>
        {subtitle && (
          <p className="text-slate-400 mt-2 text-lg">{subtitle}</p>
        )}
      </div>
      {actionButton && (
        <div className="flex gap-3">
          {actionButton}
        </div>
      )}
    </div>
  );
};

export default PageHeader;