import React, { useState } from 'react';

const Folder = ({ title, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const handleClick = (e) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <div className={`gui-folder ${!isOpen ? 'closed' : ''}`}>
      <div 
        className="gui-title" 
        onClick={handleClick}
        onTouchEnd={handleClick}
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        {title}
      </div>
      {isOpen && (
        <div className="gui-content">
          {children}
        </div>
      )}
    </div>
  );
};

export default Folder;