import React, { useState, useEffect, useRef } from 'react';
import { Portal } from './portal.js';

const PortalComponent = ({ onPortalStateChange }) => {
  const [portal] = useState(new Portal());
  const [isOpen, setIsOpen] = useState(false); // Start as closed
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const imageRef = useRef(null);

  const handleToggle = () => {
    if (isOpen) {
      // Close the portal (go to row 3, then back to row 1)
      portal.closePortal();
      setIsOpen(false);
    } else {
      // Open the portal (go to row 2, then to row 1)
      portal.openPortal();
      setIsOpen(true);
    }
  };

  // Notify parent component about portal state changes
  useEffect(() => {
    if (onPortalStateChange) {
      onPortalStateChange({
        isVisible: portal.isVisible(),
        canvasWidth: 45 // Fixed canvas width from the portal component
      });
    }
  }, [isOpen, onPortalStateChange, portal]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      console.log('Portal image loaded successfully');
      imageRef.current = img;
      
      let lastTime = 0;
      
      function animate(timeStamp) {
        const deltaTime = timeStamp - lastTime;
        lastTime = timeStamp;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Update portal
        portal.update(deltaTime);
        
        // Notify parent about portal state changes during animation
        if (onPortalStateChange) {
          onPortalStateChange({
            isVisible: portal.isVisible(),
            canvasWidth: 45
          });
        }
        
        // Only draw if portal is visible
        if (portal.isVisible()) {
          // Get frame position
          const framePos = portal.getFramePosition();
          
          // Draw ONLY the current frame (crucial for proper animation)
          // Set fixed portal size that fits within canvas
          const portalWidth = 190;   // Fixed width that fits in 70px canvas
          const portalHeight = 200; // Fixed height that fits in 250px canvas
          const offsetX = (canvas.width - portalWidth) / 2;
          const offsetY = (canvas.height - portalHeight) / 2;
          
          ctx.drawImage(
            img,
            framePos.x, framePos.y,           // source x, y (which frame to pick)
            portal.width, portal.height,     // source width, height (size of ONE frame)
            offsetX, offsetY - 15,               // dest x, y (centered)
            portalWidth, portalHeight       // dest width, height (fixed size)
          );
        }
        
        animationRef.current = requestAnimationFrame(animate);
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    img.onerror = () => {
      console.error('Failed to load portal image at /images/close_portal.png');
    };
    
    img.src = '/images/close_portal.png';
    console.log('Attempting to load portal image from:', img.src);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [portal, onPortalStateChange]);

  return (
    <div 
      style={{
        position: 'absolute',
        left: '10px',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 10
      }}
    >
      {/* Toggle Button */}
      <button
        onClick={handleToggle}
        style={{
          display: 'block',
          marginBottom: '10px',
          padding: '8px 16px',
          backgroundColor: isOpen ? '#ff4444' : '#44ff44',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 'bold'
        }}
      >
        {isOpen ? 'Close Portal' : 'Open Portal'}
      </button>
      
      {/* Portal Canvas - Always visible */}
      <canvas
        ref={canvasRef}
        width={45}  // Small canvas - exactly ONE frame size scaled down
        height={140} // Increased height to prevent bottom cutoff
        style={{
          imageRendering: 'pixelated',
          border: '1px solid red'
        }}
      />
    </div>
  );
};

export default PortalComponent;
