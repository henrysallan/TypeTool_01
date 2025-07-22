import React, { useState } from 'react';

const Folder = ({ title, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`gui-folder ${!isOpen ? 'closed' : ''}`}>
      <div className="gui-title" onClick={() => setIsOpen(!isOpen)}>
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