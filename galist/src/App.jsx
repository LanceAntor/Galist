import { useState, useEffect, useRef } from 'react'
import './App.css'

function App() {
  const [address, setAddress] = useState('')
  const [value, setValue] = useState('')
  const [circles, setCircles] = useState([])
  const [draggedCircle, setDraggedCircle] = useState(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [selectedCircle, setSelectedCircle] = useState(null)
  const [connectToAddress, setConnectToAddress] = useState('')
  const [connections, setConnections] = useState([])
  const animationRef = useRef()
  const mouseHistoryRef = useRef([])

  // Animation loop for floating circles with momentum
  useEffect(() => {
    const animate = () => {
      setCircles(prevCircles => 
        prevCircles.map(circle => {
          // Skip physics for dragged circle
          if (draggedCircle && circle.id === draggedCircle.id) {
            return circle
          }

          let newX = circle.x + circle.velocityX
          let newY = circle.y + circle.velocityY
          let newVelocityX = circle.velocityX
          let newVelocityY = circle.velocityY

          // Apply air resistance to gradually slow down movement
          newVelocityX *= 0.998
          newVelocityY *= 0.998

          // Bounce off walls (accounting for circle radius)
          if (newX <= 30 || newX >= window.innerWidth - 30) {
            newVelocityX = -newVelocityX * 0.8 // Energy loss on bounce
            newX = newX <= 30 ? 30 : window.innerWidth - 30
          }
          
          // Bounce off top and bottom
          if (newY <= 30 || newY >= window.innerHeight - 30) {
            newVelocityY = -newVelocityY * 0.8 // Energy loss on bounce
            newY = newY <= 30 ? 30 : window.innerHeight - 30
          }

          // Stop movement if velocity is very low
          if (Math.abs(newVelocityX) < 0.1) {
            newVelocityX = 0
          }
          if (Math.abs(newVelocityY) < 0.1) {
            newVelocityY = 0
          }

          return {
            ...circle,
            x: newX,
            y: newY,
            velocityX: newVelocityX,
            velocityY: newVelocityY
          }
        })
      )
      animationRef.current = requestAnimationFrame(animate)
    }

    if (circles.length > 0) {
      animationRef.current = requestAnimationFrame(animate)
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [circles.length, draggedCircle])

  // Mouse event handlers for dragging
  const handleMouseDown = (e, circle) => {
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    setDraggedCircle(circle)
    setDragOffset({
      x: e.clientX - rect.left - 30,
      y: e.clientY - rect.top - 30
    })
    
    // Initialize mouse history for velocity tracking
    mouseHistoryRef.current = [{
      x: e.clientX,
      y: e.clientY,
      time: Date.now()
    }]
  }

  // Double click handler for connection popup
  const handleDoubleClick = (circle) => {
    setSelectedCircle(circle)
    setConnectToAddress('')
  }

  // Handle connection
  const handleConnect = () => {
    if (!selectedCircle || !connectToAddress.trim()) return

    const targetCircle = circles.find(c => c.address === connectToAddress.trim())
    if (targetCircle && targetCircle.id !== selectedCircle.id) {
      const newConnection = {
        id: Date.now(),
        from: selectedCircle.id,
        to: targetCircle.id
      }
      setConnections(prev => [...prev, newConnection])
    }
    
    setSelectedCircle(null)
    setConnectToAddress('')
  }

  // Close popup
  const closePopup = () => {
    setSelectedCircle(null)
    setConnectToAddress('')
  }

  // Add global mouse event listeners
  useEffect(() => {
    const handleMouseMoveGlobal = (e) => {
      if (draggedCircle) {
        const newX = e.clientX - dragOffset.x
        const newY = e.clientY - dragOffset.y
        
        // Track mouse history for velocity calculation
        const now = Date.now()
        mouseHistoryRef.current.push({
          x: e.clientX,
          y: e.clientY,
          time: now
        })
        
        // Keep only recent history (last 100ms)
        mouseHistoryRef.current = mouseHistoryRef.current.filter(
          entry => now - entry.time < 100
        )
        
        setCircles(prevCircles =>
          prevCircles.map(circle =>
            circle.id === draggedCircle.id
              ? { ...circle, x: newX, y: newY, velocityX: 0, velocityY: 0 }
              : circle
          )
        )
      }
    }

    const handleMouseUpGlobal = () => {
      if (draggedCircle) {
        // Calculate velocity from mouse history
        let velocityX = 0
        let velocityY = 0
        
        if (mouseHistoryRef.current.length >= 2) {
          const recent = mouseHistoryRef.current[mouseHistoryRef.current.length - 1]
          const older = mouseHistoryRef.current[0]
          const timeDiff = recent.time - older.time
          
          if (timeDiff > 0) {
            velocityX = (recent.x - older.x) / timeDiff * 16 // Scale for smooth movement
            velocityY = (recent.y - older.y) / timeDiff * 16
            
            // Limit maximum velocity
            const maxVelocity = 15
            velocityX = Math.max(-maxVelocity, Math.min(maxVelocity, velocityX))
            velocityY = Math.max(-maxVelocity, Math.min(maxVelocity, velocityY))
          }
        }
        
        // Apply calculated velocity to the released circle
        setCircles(prevCircles =>
          prevCircles.map(circle =>
            circle.id === draggedCircle.id
              ? { ...circle, velocityX, velocityY }
              : circle
          )
        )
      }
      
      setDraggedCircle(null)
      setDragOffset({ x: 0, y: 0 })
      mouseHistoryRef.current = []
    }

    document.addEventListener('mousemove', handleMouseMoveGlobal)
    document.addEventListener('mouseup', handleMouseUpGlobal)
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMoveGlobal)
      document.removeEventListener('mouseup', handleMouseUpGlobal)
    }
  }, [draggedCircle, dragOffset])

  const launchCircle = () => {
    if (!address.trim() || !value.trim()) return

    const newCircle = {
      id: Date.now(),
      address: address.trim(),
      value: value.trim(),
      x: window.innerWidth - 100, // Start from right square position
      y: window.innerHeight / 2,
      velocityX: -3 - Math.random() * 2, // Random velocity to the left
      velocityY: (Math.random() - 0.5) * 4 // Random vertical velocity (up or down)
    }

    setCircles(prev => [...prev, newCircle])
    setAddress('')
    setValue('')
  }

  return (
    <div className="app">
      <div className="header">
        <h1>CREATE A LINKED LIST THAT CONSISTS: [10, 20, 50, 30].</h1>
        <h2>ADDRESS OF EACH NODE: 10 → a10, 20 → a30, 50 → a50, 30 → a70</h2>
      </div>

      {/* Left and right squares */}
      <div className="left-square"></div>
      <div className="right-square"></div>

      {/* Input controls */}
      <div className="controls">
        <input
          type="text"
          placeholder="ENTER ADDRESS"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="input-field"
        />
        <input
          type="text"
          placeholder="ENTER VALUE"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="input-field"
        />
        <button onClick={launchCircle} className="launch-button">
          LUNCH
        </button>
      </div>

      {/* Animated circles */}
      {circles.map(circle => (
        <div
          key={circle.id}
          className="animated-circle"
          style={{
            left: `${circle.x - 30}px`,
            top: `${circle.y - 30}px`,
            cursor: draggedCircle && circle.id === draggedCircle.id ? 'grabbing' : 'grab'
          }}
          onMouseDown={(e) => handleMouseDown(e, circle)}
          onDoubleClick={() => handleDoubleClick(circle)}
        >
          <span className="circle-value">{circle.value}</span>
          <span className="circle-address">{circle.address}</span>
        </div>
      ))}

      {/* Connection lines */}
      <svg className="connection-lines">
        {connections.map(connection => {
          const fromCircle = circles.find(c => c.id === connection.from)
          const toCircle = circles.find(c => c.id === connection.to)
          
          if (!fromCircle || !toCircle) return null
          
          return (
            <line
              key={connection.id}
              x1={fromCircle.x}
              y1={fromCircle.y}
              x2={toCircle.x}
              y2={toCircle.y}
              stroke="#fff"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
            />
          )
        })}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#fff" />
          </marker>
        </defs>
      </svg>

      {/* Connection popup */}
      {selectedCircle && (
        <div className="popup-overlay" onClick={closePopup}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <div className="popup-circle">
              <span className="popup-circle-value">{selectedCircle.value}</span>
              <span className="popup-circle-address">{selectedCircle.address}</span>
            </div>
            <div className="popup-text">Connect to?</div>
            <input
              type="text"
              placeholder="ENTER ADDRESS"
              value={connectToAddress}
              onChange={(e) => setConnectToAddress(e.target.value)}
              className="popup-input"
              autoFocus
            />
            <div className="popup-buttons">
              <button onClick={handleConnect} className="popup-button">Connect</button>
              <button onClick={closePopup} className="popup-button">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
