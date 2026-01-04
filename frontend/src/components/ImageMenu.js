import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import './ImageMenu.css';
import { ReactComponent as DeleteIcon } from '../assets/icons/ic_delete.svg';
import { ReactComponent as FolderIcon } from '../assets/icons/ic_folder.svg';

function ImageMenu({ onDelete, onRevealInFinder, onClose, triggerRef }) {
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target) &&
          triggerRef.current && !triggerRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose, triggerRef]);

  // Position menu relative to trigger button
  const [position, setPosition] = React.useState({ top: 0, left: 0 });

  useEffect(() => {
    if (triggerRef?.current && menuRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const menuRect = menuRef.current.getBoundingClientRect();

      // Position to the right of the button
      setPosition({
        top: rect.top,
        left: rect.right + 8,
      });
    }
  }, [triggerRef]);

  const menuContent = (
    <div
      ref={menuRef}
      className="image-menu"
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      <button className="image-menu-item" onClick={onRevealInFinder}>
        <FolderIcon />
        <span>Show in Finder</span>
      </button>
      <button className="image-menu-item" onClick={onDelete}>
        <DeleteIcon />
        <span>Delete</span>
      </button>
    </div>
  );

  return ReactDOM.createPortal(menuContent, document.body);
}

export default ImageMenu;
