import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'
import { ExerciseManager, EXERCISE_TEMPLATES } from './LinkedListExercise'

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

  // Exercise system states
  const exerciseManagerRef = useRef(new ExerciseManager())
  const [currentExercise, setCurrentExercise] = useState(null)
  const [showValidationResult, setShowValidationResult] = useState(false)
  const [validationResult, setValidationResult] = useState(null)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [showInstructionPopup, setShowInstructionPopup] = useState(false)

  // Function to toggle instruction popup
  const toggleInstructionPopup = () => {
    setShowInstructionPopup(!showInstructionPopup)
  }

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

  // Function to check if a circle is a head node (has outgoing connections but no incoming)
  const isHeadNode = useCallback((circleId) => {
    const hasOutgoing = connections.some(conn => conn.from === circleId)
    const hasIncoming = connections.some(conn => conn.to === circleId)
    return hasOutgoing && !hasIncoming
  }, [connections])

  // Function to check if a circle is a tail node (has incoming connections but no outgoing)
  const isTailNode = useCallback((circleId) => {
    const hasOutgoing = connections.some(conn => conn.from === circleId)
    const hasIncoming = connections.some(conn => conn.to === circleId)
    return hasIncoming && !hasOutgoing
  }, [connections])

  // Toggle left square state
  const toggleLeftSquare = () => {
    if (!isSubmitted && circles.length > 0) {
      // Opening the suction submits the answer
      submitExerciseAnswer()
    }
    setLeftSquareOpen(!leftSquareOpen)
  }

  // Exercise management functions
  const resetWorkspace = useCallback(() => {
    setCircles([])
    setConnections([])
    setSuckingCircles([])
    setSuckedCircles([])
    setLeftSquareOpen(false)
    setShowValidationResult(false)
    setValidationResult(null)
    setIsSubmitted(false)
    exerciseManagerRef.current.reset()
  }, [])

  const submitExerciseAnswer = useCallback(() => {
    if (!currentExercise || circles.length === 0) return
    
    try {
      exerciseManagerRef.current.submitAnswer(circles, connections)
      setIsSubmitted(true)
    } catch (error) {
      console.error('Error submitting answer:', error)
    }
  }, [currentExercise, circles, connections])

  const loadExercise = useCallback(() => {
    const exercise = exerciseManagerRef.current.loadExercise('basic')
    setCurrentExercise(exercise)
    resetWorkspace()
  }, [resetWorkspace])

  const startExercise = useCallback(() => {
    setShowInstructionPopup(false)
    if (!currentExercise) {
      loadExercise()
    }
  }, [loadExercise, currentExercise])

  // Initialize exercise on component mount
  useEffect(() => {
    if (!currentExercise) {
      const exercise = exerciseManagerRef.current.loadExercise('basic')
      setCurrentExercise(exercise)
    }
  }, [currentExercise])

  // Initialize with basic exercise when instruction popup is closed
  useEffect(() => {
    if (!showInstructionPopup && !currentExercise) {
      loadExercise()
    }
  }, [showInstructionPopup, currentExercise, loadExercise])

  // Check when all circles are gone and validate
  useEffect(() => {
    if (isSubmitted && circles.length === 0 && suckedCircles.length > 0) {
      // All circles have been sucked - validate the submission
      setTimeout(() => {
        try {
          const result = exerciseManagerRef.current.validateSubmission()
          setValidationResult(result)
          setShowValidationResult(true)
        } catch (error) {
          setValidationResult({
            isCorrect: false,
            message: 'Validation Error',
            details: error.message,
            score: 0
          })
          setShowValidationResult(true)
        }
      }, 1500) // Wait 1.5 seconds after all circles are gone
    }
  }, [isSubmitted, circles.length, suckedCircles.length])

  // Function to start chain suction effect
  const startChainSuction = useCallback((startCircleId) => {
    const connectedIds = findConnectedCircles(startCircleId)
    
    // Check if this is the head node using the helper function
    const isHead = isHeadNode(startCircleId)
    
    // Remove the triggering circle immediately and mark it as sucked
    setCircles(prevCircles => 
      prevCircles.filter(c => c.id !== startCircleId)
    )
    setSuckedCircles(prev => [...prev, startCircleId])
    
    // Start the chain reaction for remaining connected circles
    const remainingCircles = connectedIds.filter(id => id !== startCircleId)
    
    remainingCircles.forEach((circleId, index) => {
      const delay = isHead ? index * 50 : index * 400 // Much faster if head node (50ms vs 150ms)
      
      setTimeout(() => {
        // Add circle to sucking list (this will make it get pulled toward entrance)
        setSuckingCircles(prev => [...prev, circleId])
      }, delay)
    })
  }, [findConnectedCircles, isHeadNode])

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
            
            // Strong suction force toward entrance - boost if triggered by head node
            const baseForce = 2.0
            const headBoost = 1.5 // Extra boost when head node triggered the chain
            const suctionForce = baseForce + headBoost
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

          // Right square collision detection (make it a solid block) - positioned with bottom: 10px, right: -40px, rotated -40deg
          // Using the same coordinates as the debug visualization
          const rightSquareLeft = window.innerWidth + 15 - 95 // matches debug left position
          const rightSquareRight = rightSquareLeft + 100      // add width (100px)
          const rightSquareTop = window.innerHeight - 55      // matches debug top position
          const rightSquareBottom = rightSquareTop + 90       // add height (90px)
          const circleRadius = 30

          // Check collision with right square
          if (newX + circleRadius >= rightSquareLeft && 
              newX - circleRadius <= rightSquareRight && 
              newY - circleRadius <= rightSquareBottom && 
              newY + circleRadius >= rightSquareTop) {
            
            // Bounce off the walls of the right square
            if (newX + circleRadius >= rightSquareLeft && circle.x + circleRadius < rightSquareLeft) {
              // Hit left wall of right square
              newVelocityX = -Math.abs(newVelocityX) * 0.8
              newX = rightSquareLeft - circleRadius
            }
            if (newX - circleRadius <= rightSquareRight && circle.x - circleRadius > rightSquareRight) {
              // Hit right wall of right square
              newVelocityX = Math.abs(newVelocityX) * 0.8
              newX = rightSquareRight + circleRadius
            }
            if (newY + circleRadius >= rightSquareTop && circle.y + circleRadius < rightSquareTop) {
              // Hit top wall of right square
              newVelocityY = -Math.abs(newVelocityY) * 0.8
              newY = rightSquareTop - circleRadius
            }
            if (newY - circleRadius <= rightSquareBottom && circle.y - circleRadius > rightSquareBottom) {
              // Hit bottom wall of right square
              newVelocityY = Math.abs(newVelocityY) * 0.8
              newY = rightSquareBottom + circleRadius
            }
          }

          // Check collision with left square (suction box)
          const leftSquareLeft = 0
          const leftSquareRight = 130
          const leftSquareTop = (window.innerHeight / 2) - 50
          const leftSquareBottom = (window.innerHeight / 2) + 50
          const entranceTop = leftSquareTop + 10  // x2 position (10px from top)
          const entranceBottom = leftSquareBottom - 10  // y2 position (10px from bottom)

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
              
              // Only allow head nodes to trigger chain suction, or any node if no head exists
              const isHead = isHeadNode(circle.id)
              const hasAnyHeadNode = circles.some(c => isHeadNode(c.id))
              
              if (isHead || !hasAnyHeadNode) {
                // Start chain suction effect
                startChainSuction(circle.id)
              }
              
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

          // Circle-to-circle collision detection
          prevCircles.forEach(otherCircle => {
            if (otherCircle.id !== circle.id && !suckingCircles.includes(otherCircle.id)) {
              const dx = newX - otherCircle.x
              const dy = newY - otherCircle.y
              const distance = Math.sqrt(dx * dx + dy * dy)
              const minDistance = circleRadius * 2 // Two circle radii
              
              if (distance < minDistance && distance > 0) {
                // Circles are colliding - calculate collision response
                const overlap = minDistance - distance
                const separationX = (dx / distance) * (overlap / 2)
                const separationY = (dy / distance) * (overlap / 2)
                
                // Separate the circles
                newX += separationX
                newY += separationY
                
                // Calculate collision velocities (elastic collision)
                const relativeVelocityX = newVelocityX - otherCircle.velocityX
                const relativeVelocityY = newVelocityY - otherCircle.velocityY
                const velocityAlongCollision = (relativeVelocityX * dx + relativeVelocityY * dy) / distance
                
                if (velocityAlongCollision > 0) return // Objects are separating
                
                // Apply collision response with energy loss
                const restitution = 0.8 // Energy retention (0.8 = 80% energy kept)
                const collisionForce = velocityAlongCollision * restitution
                
                newVelocityX -= collisionForce * (dx / distance)
                newVelocityY -= collisionForce * (dy / distance)
              }
            }
          })

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
  }, [circles, draggedCircle, leftSquareOpen, findConnectedCircles, suckingCircles, startChainSuction, suckedCircles, isHeadNode])

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

  // Auto-suction effect when left square opens - prioritize head nodes
  useEffect(() => {
    if (leftSquareOpen && circles.length > 0) {
      // Find all head nodes
      const headNodes = circles.filter(circle => isHeadNode(circle.id))
      
      if (headNodes.length > 0) {
        // Start pulling head nodes toward entrance (not instant suction)
        headNodes.forEach((headNode, index) => {
          setTimeout(() => {
            setSuckingCircles(prev => {
              if (!prev.includes(headNode.id)) {
                return [...prev, headNode.id]
              }
              return prev
            })
          }, index * 200) // 200ms delay between head nodes if multiple exist
        })
      } else {
        // If no head nodes exist, find isolated nodes (no connections)
        const isolatedNodes = circles.filter(circle => 
          !connections.some(conn => conn.from === circle.id || conn.to === circle.id)
        )
        
        if (isolatedNodes.length > 0) {
          // Start pulling isolated nodes toward entrance
          isolatedNodes.forEach((node, index) => {
            setTimeout(() => {
              setSuckingCircles(prev => {
                if (!prev.includes(node.id)) {
                  return [...prev, node.id]
                }
                return prev
              })
            }, index * 200)
          })
        }
      }
    } else if (!leftSquareOpen) {
      // Clear sucking circles when suction box is closed
      setSuckingCircles([])
    }
  }, [leftSquareOpen, circles, connections, isHeadNode])

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
      x: window.innerWidth - 10, // Right edge of right square (right: -40px means 40px beyond right edge, center would be -40 + 50)
      y: window.innerHeight - 55, // Center of right square vertically (bottom: 10px + 45px to center of 90px height)
      velocityX: -8 - Math.random() * 5, // Launch leftward with random velocity (since square is angled)
      velocityY: -5 - Math.random() * 3 // Launch upward with random velocity
    }

    setCircles(prev => [...prev, newCircle])
    setAddress('')
    setValue('')
  }

  return (
    <div className="app">
      {/* Video background */}
      <video 
        className="video-background"
        autoPlay 
        loop 
        muted 
        playsInline
        preload="auto"
        onError={(e) => console.error('Video error:', e)}
        onLoadedData={() => console.log('Video loaded successfully')}
      >
        <source src="/video/selection_bg.mp4" type="video/mp4" />
        <source src="./video/selection_bg.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Instruction button in top left */}
      <button className="instruction-button" onClick={toggleInstructionPopup}>
        i
      </button>

      {/* Instruction popup */}
      {showInstructionPopup && currentExercise && currentExercise.expectedStructure && (
        <div className="instruction-popup">
          <div className="instruction-content">
            <h1>{currentExercise.title}</h1>
            <div className="instruction-list">
              {currentExercise.expectedStructure.map((node, index) => (
                <div key={index} className="instruction-item">
                  <span className="instruction-value">Value: {node.value}</span>
                  <span className="instruction-arrow">→</span>
                  <span className="instruction-address">Address: {node.address}</span>
                </div>
              ))}
            </div>
            <button className="start-button" onClick={startExercise}>
              Start
            </button>
          </div>
        </div>
      )}

      

      {/* Left and right squares */}
      <div className={`left-square ${leftSquareOpen ? 'open' : 'closed'}`}>
        <button 
          onClick={toggleLeftSquare}
          className="toggle-button"
        >
          {leftSquareOpen ? 'OPEN' : 'CLOSED'}
        </button>
      </div>
      <div className="right-square" style={{
        
        outlineOffset: '5px'
      }}></div>

      {/* DEBUG: Collision detection boundaries
      <div style={{
        position: 'absolute',
        left: `${window.innerWidth + 15 - 95}px`, // rightSquareLeft
        top: `${window.innerHeight - 55}px`,  // rightSquareTop
        width: `100px`, // square width
        height: `90px`, // square height
        border: '2px solid cyan',
        transform: 'rotate(-40deg)',
        background: 'rgba(0, 255, 255, 0.1)',
        pointerEvents: 'none',
        zIndex: 15
      }}></div> */}

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
      {circles.map(circle => {
        const isHead = isHeadNode(circle.id)
        const isTail = isTailNode(circle.id)
        
        return (
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
            {(isHead || isTail) && (
              <span className="node-type-label">
                {isHead ? 'Head' : 'Tail'}
              </span>
            )}
            <span className="circle-value">{circle.value}</span>
            <span className="circle-address">{circle.address}</span>
          </div>
        )
      })}

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

      {/* Validation Result Overlay */}
      {showValidationResult && validationResult && (
        <div className="validation-overlay">
          <div className="validation-content">
            <div className={`validation-header ${validationResult.isCorrect ? 'correct' : 'incorrect'}`}>
              <h2>{validationResult.isCorrect ? '✓ Correct!' : '✗ Incorrect'}</h2>
              <div className="score">Score: {validationResult.score}%</div>
            </div>
            <div className="validation-message">
              {validationResult.message}
            </div>
            {validationResult.details && (
              <div className="validation-details">
                {validationResult.details}
              </div>
            )}
            <div className="validation-buttons">
              <button 
                onClick={() => setShowValidationResult(false)}
                className="close-validation"
              >
                Close
              </button>
              <button 
                onClick={resetWorkspace}
                className="try-again"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

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
