import { useState, useEffect, useRef, useCallback } from 'react'
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
  const [leftSquareOpen, setLeftSquareOpen] = useState(false)
  const [suckingCircles, setSuckingCircles] = useState([])
  const [suckedCircles, setSuckedCircles] = useState([]) // Track circles that have been sucked out

  // Function to find all connected circles recursively
  const findConnectedCircles = useCallback((circleId, visited = new Set()) => {
    if (visited.has(circleId)) return []
    visited.add(circleId)
    
    const connected = [circleId]
    connections.forEach(connection => {
      if (connection.from === circleId && !visited.has(connection.to)) {
        connected.push(...findConnectedCircles(connection.to, visited))
      }
      if (connection.to === circleId && !visited.has(connection.from)) {
        connected.push(...findConnectedCircles(connection.from, visited))
      }
    })
    
    return connected
  }, [connections])

  // Toggle left square state
  const toggleLeftSquare = () => {
    setLeftSquareOpen(!leftSquareOpen)
  }

  // Function to start chain suction effect
  const startChainSuction = useCallback((startCircleId) => {
    const connectedIds = findConnectedCircles(startCircleId)
    
    // Check if this is the head node (has outgoing connections but no incoming)
    const isHeadNode = connections.some(conn => conn.from === startCircleId) && 
                      !connections.some(conn => conn.to === startCircleId)
    
    // Remove the triggering circle immediately and mark it as sucked
    setCircles(prevCircles => 
      prevCircles.filter(c => c.id !== startCircleId)
    )
    setSuckedCircles(prev => [...prev, startCircleId])
    
    // Start the chain reaction for remaining connected circles
    const remainingCircles = connectedIds.filter(id => id !== startCircleId)
    
    remainingCircles.forEach((circleId, index) => {
      const delay = isHeadNode ? index * 150 : index * 400 // Faster if head node, slower otherwise
      
      setTimeout(() => {
        // Add circle to sucking list (this will make it get pulled toward entrance)
        setSuckingCircles(prev => [...prev, circleId])
      }, delay)
    })
  }, [findConnectedCircles, connections])

  // Animation loop for floating circles with momentum
  useEffect(() => {
    const animate = () => {
      setCircles(prevCircles => 
        prevCircles.map(circle => {
          // Skip physics for dragged circle
          if (draggedCircle && circle.id === draggedCircle.id) {
            return circle
          }

          // Special behavior for sucking circles
          if (suckingCircles.includes(circle.id)) {
            // Target the entrance area of the left square
            const entranceX = 130 // Right edge of left square
            const entranceY = window.innerHeight / 2 // Center of entrance vertically
            const dx = entranceX - circle.x
            const dy = entranceY - circle.y
            const distance = Math.sqrt(dx * dx + dy * dy)
            
            // Check if circle has reached the entrance area
            const leftSquareTop = (window.innerHeight / 2) - 50
            const leftSquareBottom = (window.innerHeight / 2) + 50
            const entranceTop = leftSquareTop + 10
            const entranceBottom = leftSquareBottom - 10
            
            if (circle.x >= 110 && circle.x <= 135 && 
                circle.y >= entranceTop && circle.y <= entranceBottom) {
              // Circle has reached the entrance - remove it and mark as sucked
              setTimeout(() => {
                setCircles(prevCircles => 
                  prevCircles.filter(c => c.id !== circle.id)
                )
                
                // Mark this circle as sucked
                setSuckedCircles(prev => [...prev, circle.id])
                
                setSuckingCircles(prev => prev.filter(id => id !== circle.id))
              }, 50)
              
              return circle
            }
            
            // Strong suction force toward entrance
            const suctionForce = 1.2
            const newVelocityX = (dx / distance) * suctionForce
            const newVelocityY = (dy / distance) * suctionForce
            
            return {
              ...circle,
              x: circle.x + newVelocityX,
              y: circle.y + newVelocityY,
              velocityX: newVelocityX,
              velocityY: newVelocityY
            }
          }

          let newX = circle.x + circle.velocityX
          let newY = circle.y + circle.velocityY
          let newVelocityX = circle.velocityX
          let newVelocityY = circle.velocityY

          // Add suction effect when left square is open
          if (leftSquareOpen) {
            const leftSquareCenter = { x: 65, y: window.innerHeight / 2 }
            const dx = leftSquareCenter.x - circle.x
            const dy = leftSquareCenter.y - circle.y
            const distance = Math.sqrt(dx * dx + dy * dy)
            
            if (distance > 80) { // Only apply suction if not too close
              const suctionForce = 0.1
              newVelocityX += (dx / distance) * suctionForce
              newVelocityY += (dy / distance) * suctionForce
            }
          }

          // Update positions with velocities
          newX = circle.x + newVelocityX
          newY = circle.y + newVelocityY

          // Check collision with left square (suction box)
          const leftSquareLeft = 0
          const leftSquareRight = 130
          const leftSquareTop = (window.innerHeight / 2) - 50
          const leftSquareBottom = (window.innerHeight / 2) + 50
          const entranceTop = leftSquareTop + 10  // x2 position (10px from top)
          const entranceBottom = leftSquareBottom - 10  // y2 position (10px from bottom)
          const circleRadius = 30

          // Check if circle is colliding with left square
          if (newX - circleRadius <= leftSquareRight && 
              newX + circleRadius >= leftSquareLeft && 
              newY - circleRadius <= leftSquareBottom && 
              newY + circleRadius >= leftSquareTop) {
            
            // Check if circle is entering through the entrance (right side between x2 and y2)
            if (leftSquareOpen && 
                newX - circleRadius <= leftSquareRight && 
                newX - circleRadius >= leftSquareRight - 20 && 
                newY >= entranceTop && 
                newY <= entranceBottom &&
                !suckingCircles.includes(circle.id)) {
              
              // Start chain suction effect
              startChainSuction(circle.id)
              
              return circle // Return unchanged for this frame
            } else {
              // Bounce off the walls of the left square
              if (newX - circleRadius <= leftSquareRight && circle.x - circleRadius > leftSquareRight) {
                // Hit right wall
                newVelocityX = Math.abs(newVelocityX) * 0.8
                newX = leftSquareRight + circleRadius
              }
              if (newY - circleRadius <= leftSquareBottom && newY + circleRadius >= leftSquareTop) {
                // Hit top or bottom wall
                if (newY < leftSquareTop + 50) {
                  // Hit top wall
                  newVelocityY = -Math.abs(newVelocityY) * 0.8
                  newY = leftSquareTop - circleRadius
                } else {
                  // Hit bottom wall
                  newVelocityY = Math.abs(newVelocityY) * 0.8
                  newY = leftSquareBottom + circleRadius
                }
              }
            }
          }

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
  }, [circles.length, draggedCircle, leftSquareOpen, findConnectedCircles, suckingCircles, startChainSuction, suckedCircles])

  // Handle connection removal when circles are sucked
  useEffect(() => {
    if (suckedCircles.length > 0) {
      // Add a delay to allow the visual chain effect to be seen
      const timer = setTimeout(() => {
        setConnections(prevConnections => 
          prevConnections.filter(connection => {
            const fromSucked = suckedCircles.includes(connection.from)
            const toSucked = suckedCircles.includes(connection.to)
            // Only remove connection if BOTH endpoints have been sucked
            return !(fromSucked && toSucked)
          })
        )
      }, 500) // 500ms delay to allow visual effect
      
      return () => clearTimeout(timer)
    }
  }, [suckedCircles])

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
        // Normal velocity calculation for all cases
        let velocityX = 0
        let velocityY = 0
        
        if (mouseHistoryRef.current.length >= 2) {
          const recent = mouseHistoryRef.current[mouseHistoryRef.current.length - 1]
          const older = mouseHistoryRef.current[0]
          const timeDiff = recent.time - older.time
          
          if (timeDiff > 0) {
            velocityX = (recent.x - older.x) / timeDiff * 16
            velocityY = (recent.y - older.y) / timeDiff * 16
            
            const maxVelocity = 15
            velocityX = Math.max(-maxVelocity, Math.min(maxVelocity, velocityX))
            velocityY = Math.max(-maxVelocity, Math.min(maxVelocity, velocityY))
          }
        }
        
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
  }, [draggedCircle, dragOffset, leftSquareOpen, findConnectedCircles])

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
      <div className={`left-square ${leftSquareOpen ? 'open' : 'closed'}`}>
        <button 
          onClick={toggleLeftSquare}
          className="toggle-button"
        >
          {leftSquareOpen ? 'OPEN' : 'CLOSED'}
        </button>
      </div>
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
          className={`animated-circle ${suckingCircles.includes(circle.id) ? 'being-sucked' : ''}`}
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
          
          // Skip connection if both circles are missing (shouldn't happen)
          if (!fromCircle && !toCircle) return null
          
          // If one circle is missing (sucked), use the entrance position
          const entranceX = 130
          const entranceY = window.innerHeight / 2
          
          const fromX = fromCircle ? fromCircle.x : entranceX
          const fromY = fromCircle ? fromCircle.y : entranceY
          const toX = toCircle ? toCircle.x : entranceX
          const toY = toCircle ? toCircle.y : entranceY
          
          return (
            <g key={connection.id}>
              {/* Animated connection line */}
              <line
                x1={fromX}
                y1={fromY}
                x2={toX}
                y2={toY}
                className="animated-line"
                markerEnd="url(#arrowhead)"
              />
            </g>
          )
        })}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="8"
            refX="16"
            refY="4"
            orient="auto"
            fill="#fff"
            stroke="#fff"
            strokeWidth="0.5"
          >
            <path d="M0,0 L0,8 L8,4 z" fill="#fff" />
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
