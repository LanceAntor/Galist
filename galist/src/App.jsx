import React, { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'
import { ExerciseManager, EXERCISE_TEMPLATES } from './LinkedListExercise'
import { collisionDetection } from './CollisionDetection'
import PortalComponent from './PortalComponent'

function App() {
  const [address, setAddress] = useState('')
  const [value, setValue] = useState('')
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [showInsertButton, setShowInsertButton] = useState(false)
  const [showInsertModal, setShowInsertModal] = useState(false)
  const [showIndexModal, setShowIndexModal] = useState(false)
  const [insertIndex, setInsertIndex] = useState('')
  const [hoverTimer, setHoverTimer] = useState(null)
  const [circles, setCircles] = useState([])
  const [draggedCircle, setDraggedCircle] = useState(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [selectedCircle, setSelectedCircle] = useState(null)
  const [connectToAddress, setConnectToAddress] = useState('')
  const [connections, setConnections] = useState([])
  const animationRef = useRef()
  const mouseHistoryRef = useRef([])
  const [suckingCircles, setSuckingCircles] = useState([])
  const [suckedCircles, setSuckedCircles] = useState([]) // Track circles that have been sucked out
  const [currentEntryOrder, setCurrentEntryOrder] = useState([]) // Track entry order for current submission only
  const [originalSubmission, setOriginalSubmission] = useState(null) // Store original circles and connections for validation

  // Portal state management
  const [portalInfo, setPortalInfo] = useState({ 
    isVisible: false, 
    canvasWidth: 45 
  })
  const [isPortalOpen, setIsPortalOpen] = useState(false) // New state for portal open/close

  // Wrap setPortalInfo in useCallback to prevent unnecessary re-renders
  const handlePortalStateChange = useCallback((newPortalInfo) => {
    setPortalInfo(newPortalInfo);
  }, []);

  // Portal toggle function
  const togglePortal = useCallback(() => {
    setIsPortalOpen(!isPortalOpen);
  }, [isPortalOpen]);

  // Exercise system states
  const exerciseManagerRef = useRef(new ExerciseManager())
  const [currentExercise, setCurrentExercise] = useState(null)
  const [showValidationResult, setShowValidationResult] = useState(false)
  const [validationResult, setValidationResult] = useState(null)
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

  // Check if portal button should be enabled (requires at least one head AND one tail node)
  const hasHeadNode = useCallback(() => {
    return circles.some(circle => isHeadNode(circle.id));
  }, [circles, isHeadNode]);

  const hasTailNode = useCallback(() => {
    return circles.some(circle => isTailNode(circle.id));
  }, [circles, isTailNode]);

  const isPortalButtonEnabled = isPortalOpen || (hasHeadNode() && hasTailNode());

  // Exercise management functions
  const resetWorkspace = useCallback(() => {
    setCircles([])
    setConnections([])
    setSuckingCircles([])
    setSuckedCircles([])
    setCurrentEntryOrder([])
    setOriginalSubmission(null)
    setShowValidationResult(false)
    setValidationResult(null)
    exerciseManagerRef.current.reset()
  }, [])

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

  // Note: Validation is now handled directly when the last circle enters the portal
  // This useEffect has been removed to prevent duplicate validation modals

  // Helper function to get the complete chain order from head to tail
  const getChainOrder = useCallback((startCircleId) => {
    const chainOrder = []
    let currentId = startCircleId
    const visited = new Set()
    
    // If starting circle is not a head, find the head first
    if (!isHeadNode(startCircleId)) {
      // Traverse backwards to find the head
      let searchId = startCircleId
      const backwardVisited = new Set()
      
      while (searchId && !backwardVisited.has(searchId)) {
        backwardVisited.add(searchId)
        const incomingConnection = connections.find(conn => conn.to === searchId)
        if (incomingConnection && !isHeadNode(incomingConnection.from)) {
          searchId = incomingConnection.from
        } else if (incomingConnection) {
          currentId = incomingConnection.from // Found the head
          break
        } else {
          break
        }
      }
    }
    
    // Now traverse from head to tail
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId)
      chainOrder.push(currentId)
      
      // Find the next node in the chain
      const nextConnection = connections.find(conn => conn.from === currentId)
      currentId = nextConnection ? nextConnection.to : null
    }
    
    return chainOrder
  }, [connections, isHeadNode])

  // Function to start chain suction effect
  const startChainSuction = useCallback((startCircleId) => {
    // Reset sucked circles and entry order for new submission
    setSuckedCircles([]);
    setCurrentEntryOrder([]);
    
    // Capture the original submission data before any circles are sucked
    setOriginalSubmission({
      circles: circles.map(c => ({ ...c })), // Deep copy
      connections: connections.map(c => ({ ...c })) // Deep copy
    });
    
    // Get the proper head-to-tail chain order
    const chainOrder = getChainOrder(startCircleId)
    
    // Add the triggering circle to sucking list (don't remove it immediately)
    setSuckingCircles(prev => {
      if (!prev.includes(startCircleId)) {
        return [...prev, startCircleId]
      }
      return prev
    })
    
    // Start the chain reaction in proper order (head first, tail last)
    const remainingCircles = chainOrder.filter(id => id !== startCircleId)
    
    remainingCircles.forEach((circleId, index) => {
      // Head nodes get sucked first (faster), tail last (slower)
      const delay = (index + 1) * 150 // Start from 150ms for the first remaining circle
      
      setTimeout(() => {
        // Add circle to sucking list (this will make it get pulled toward entrance)
        setSuckingCircles(prev => [...prev, circleId])
      }, delay)
    })
  }, [getChainOrder, circles, connections])

  // PHYSICS SYSTEM - Simple animation loop adapted for portal
  useEffect(() => {
    let isAnimating = true

    const gameLoop = () => {
      if (!isAnimating) return

      setCircles(prevCircles => {
        // First pass: Handle special behaviors (suction, portal interactions) without collision detection
        const circlesWithSpecialBehavior = prevCircles.map(circle => {
          // Skip physics for dragged circle
          if (draggedCircle && circle.id === draggedCircle.id) {
            return circle
          }

          // Special behavior for sucking circles - target portal center
          if (suckingCircles.includes(circle.id)) {
            // Portal center calculation (using portal canvas width)
            const portalCenterX = 10 + (portalInfo.canvasWidth / 2) // Center of the portal canvas
            const portalCenterY = window.innerHeight / 2 // Center of entrance vertically
            const dx = portalCenterX - circle.x
            const dy = portalCenterY - circle.y
            const distance = Math.sqrt(dx * dx + dy * dy)
            
            // Check if circle has reached the portal entrance area
            const portalTop = (window.innerHeight / 2) - 50
            const portalBottom = (window.innerHeight / 2) + 50
            const entranceTop = portalTop + 10
            const entranceBottom = portalBottom - 10
            
            if (circle.x >= 10 && circle.x <= 35 && 
                circle.y >= entranceTop && circle.y <= entranceBottom) {
              // Circle has reached the portal entrance - remove it and mark as sucked
              setTimeout(() => {
                setCircles(prevCircles => {
                  const newCircles = prevCircles.filter(c => c.id !== circle.id);
                  
                  // Check if this was the last circle - if so, validate the submission
                  if (newCircles.length === 0 && currentExercise) {
                    console.log('All circles entered portal - validating submission...');
                    
                    // Ensure exercise is loaded
                    if (!exerciseManagerRef.current.currentExercise) {
                      console.warn('No exercise loaded, loading basic exercise...');
                      exerciseManagerRef.current.loadExercise('basic');
                    }
                    
                    // Get the order in which circles entered the portal (only for current submission)
                    // Add this circle to the current entry order
                    const finalEntryOrder = [...currentEntryOrder, circle.id];
                    
                    // Use the original submission data captured when suction started
                    const submissionData = originalSubmission || {
                      circles: [...prevCircles], // Fallback to current circles
                      connections: [...connections] // Fallback to current connections
                    };
                    
                    // Validate the submission
                    setTimeout(() => {
                      try {
                        console.log('Current exercise:', currentExercise);
                        console.log('ExerciseManager currentExercise:', exerciseManagerRef.current.currentExercise);
                        console.log('Submission data:', submissionData);
                        console.log('Original circles length:', submissionData.circles.length);
                        console.log('Current connections length:', submissionData.connections.length);
                        console.log('Entry order:', finalEntryOrder);
                        console.log('About to call validateSubmission with parameters:', {
                          circles: submissionData.circles,
                          connections: submissionData.connections,
                          entryOrder: finalEntryOrder
                        });
                        
                        const result = exerciseManagerRef.current.validateSubmission(
                          submissionData.circles, 
                          submissionData.connections, 
                          finalEntryOrder
                        );
                        
                        setValidationResult(result);
                        setShowValidationResult(true);
                        
                        console.log('Validation result:', result);
                      } catch (error) {
                        console.error('Portal validation error:', error);
                        // Only show error for critical failures
                        if (error.message.includes('No exercise loaded') || 
                            error.message.includes('No submission data') ||
                            error.message.includes('Exercise template') ||
                            error.message.includes('Critical')) {
                          setValidationResult({
                            isCorrect: false,
                            message: 'System Error',
                            details: error.message,
                            score: 0,
                            totalPoints: 100
                          });
                          setShowValidationResult(true);
                        } else {
                          // For validation logic errors, don't override the actual result
                          console.warn('Non-critical validation error, continuing:', error);
                        }
                      }
                    }, 500);
                  }
                  
                  return newCircles;
                });
                
                // Mark this circle as sucked and add to entry order (only if not already added)
                setSuckedCircles(prev => {
                  if (!prev.includes(circle.id)) {
                    return [...prev, circle.id];
                  }
                  return prev;
                });
                setCurrentEntryOrder(prev => {
                  if (!prev.includes(circle.id)) {
                    return [...prev, circle.id];
                  }
                  return prev;
                });
                
                setSuckingCircles(prev => prev.filter(id => id !== circle.id));
              }, 50);
              
              return circle;
            }
            
            // Strong suction force toward portal entrance
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

          // Add gentle suction effect when portal is open
          if (portalInfo.isVisible && !suckingCircles.includes(circle.id)) {
            const portalCenter = { x: 10 + (portalInfo.canvasWidth / 2), y: window.innerHeight / 2 }
            const dx = portalCenter.x - circle.x
            const dy = portalCenter.y - circle.y
            const distance = Math.sqrt(dx * dx + dy * dy)
            
            if (distance > 80) { // Only apply suction if not too close
              const suctionForce = 0.1
              // Apply suction to the circle's velocity
              circle.velocityX = (circle.velocityX || 0) + (dx / distance) * suctionForce
              circle.velocityY = (circle.velocityY || 0) + (dy / distance) * suctionForce
            }
          }

          // Handle special portal suction logic for manual triggers
          if (portalInfo.isVisible) {
            const portalRight = 10 + portalInfo.canvasWidth + 20
            const portalTop = (window.innerHeight / 2) - 50
            const portalBottom = (window.innerHeight / 2) + 50
            const entranceTop = portalTop + 10
            const entranceBottom = portalBottom - 10
            const circleRadius = 30

            const newX = circle.x + (circle.velocityX || 0)
            const newY = circle.y + (circle.velocityY || 0)

            // Check if circle is entering through the entrance
            if (newX - circleRadius <= portalRight && 
                newX - circleRadius >= portalRight - 20 && 
                newY >= entranceTop && 
                newY <= entranceBottom &&
                !suckingCircles.includes(circle.id)) {
              
              const isHead = isHeadNode(circle.id)
              const hasAnyHeadNode = prevCircles.some(c => isHeadNode(c.id))
              
              if (isHead || !hasAnyHeadNode) {
                startChainSuction(circle.id)
              }
              
              return circle // Return unchanged for this frame
            }
          }

          return circle
        })

        // Second pass: Apply collision detection and physics to ALL circles at once
        // This ensures proper collision interactions between all circles
        // Note: Include dragged circle in collision detection so other circles can bounce off it
        const allCirclesForCollision = circlesWithSpecialBehavior
        const draggedCircleData = draggedCircle ? 
          allCirclesForCollision.find(circle => circle.id === draggedCircle.id) : null
        
        // Apply collision detection to all circles (including dragged one for collision purposes)
        // but only update physics for non-dragged circles
        const updatedAllCircles = allCirclesForCollision.length > 0 ? 
          collisionDetection.updatePhysics(allCirclesForCollision, suckingCircles) : []
        
        // For the final result, keep the dragged circle's position but allow its velocity updates from collisions
        let finalCircles = updatedAllCircles
        if (draggedCircleData) {
          finalCircles = updatedAllCircles.map(circle => {
            if (circle.id === draggedCircle.id) {
              // Keep dragged circle's position but preserve velocity changes from collisions
              return {
                ...draggedCircleData,
                velocityX: circle.velocityX, // Keep collision-affected velocity
                velocityY: circle.velocityY  // Keep collision-affected velocity
              }
            }
            return circle
          })
        }
          
        return finalCircles
      })

      animationRef.current = requestAnimationFrame(gameLoop)
    }

    animationRef.current = requestAnimationFrame(gameLoop)

    return () => {
      isAnimating = false
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [portalInfo, suckingCircles, draggedCircle, isHeadNode, startChainSuction, findConnectedCircles, connections, currentExercise, suckedCircles, originalSubmission, currentEntryOrder])

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

  // Auto-suction effect when portal opens - prioritize head nodes
  useEffect(() => {
    if (portalInfo.isVisible && circles.length > 0) {
      // Find all head nodes
      const headNodes = circles.filter(circle => isHeadNode(circle.id))
      
      if (headNodes.length > 0) {
        // Start chain suction for each head node with proper head-to-tail ordering
        headNodes.forEach((headNode, index) => {
          setTimeout(() => {
            // Start the complete chain suction from this head node
            startChainSuction(headNode.id)
          }, index * 1000) // 1 second delay between different chains
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
    } else if (!portalInfo.isVisible) {
      // Clear sucking circles when portal is closed
      setSuckingCircles([])
    }
  }, [portalInfo.isVisible, circles, connections, isHeadNode, startChainSuction])

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

  // Close duplicate address modal
  const closeDuplicateModal = () => {
    setShowDuplicateModal(false)
  }

  // Handle LUNCH button hover events
  const handleLunchHoverStart = () => {
    console.log('Hover started on LUNCH button')
    if (hoverTimer) {
      clearTimeout(hoverTimer)
    }
    const timer = setTimeout(() => {
      console.log('2 seconds passed, showing INSERT button')
      setShowInsertButton(true)
    }, 2000) // 2 seconds
    setHoverTimer(timer)
  }

  const handleLunchHoverEnd = () => {
    console.log('Hover ended on LUNCH button')
    if (hoverTimer) {
      clearTimeout(hoverTimer)
      setHoverTimer(null)
    }
    
    // Set a very short delay to allow mouse to move to INSERT button
    const hideTimer = setTimeout(() => {
      setShowInsertButton(false)
    }, 100) // Very short delay (100ms) to allow transition to INSERT
    setHoverTimer(hideTimer)
  }

  // Keep INSERT button visible when hovering over it
  const handleInsertHover = () => {
    console.log('Hover started on INSERT button')
    // Cancel any pending hide timer
    if (hoverTimer) {
      clearTimeout(hoverTimer)
      setHoverTimer(null)
    }
  }

  // Hide INSERT button when leaving the insert button area
  const handleInsertLeave = () => {
    console.log('Hover ended on INSERT button')
    // Immediately hide when leaving INSERT button
    setShowInsertButton(false)
    if (hoverTimer) {
      clearTimeout(hoverTimer)
      setHoverTimer(null)
    }
  }

  // Handle INSERT button click
  const handleInsert = () => {
    console.log('Insert button clicked')
    
    // Immediately hide the INSERT button when clicked
    setShowInsertButton(false)
    if (hoverTimer) {
      clearTimeout(hoverTimer)
      setHoverTimer(null)
    }
    
    // Open the insert modal
    setShowInsertModal(true)
  }

  // Close insert modal
  const closeInsertModal = () => {
    setShowInsertModal(false)
  }

  // Close index modal
  const closeIndexModal = () => {
    setShowIndexModal(false)
    setInsertIndex('')
  }

  // Handle index submission
  const handleIndexSubmit = () => {
    const index = parseInt(insertIndex.trim())
    
    // Validate index
    if (isNaN(index) || index < 1) {
      alert('Please enter a valid index (must be >= 1)')
      return
    }
    
    // Get the total number of nodes in the longest chain
    const maxIndex = circles.length
    if (index > maxIndex) {
      alert(`Index too large. Maximum index is ${maxIndex}`)
      return
    }
    
    // Handle specific insertion
    handleSpecificInsertion(index)
    
    // Close both modals
    closeIndexModal()
    closeInsertModal()
  }

  // Handle insert option selection
  const handleInsertOption = (option) => {
    console.log('Insert option selected:', option)
    
    // Check if address and value are provided
    if (!address.trim() || !value.trim()) {
      alert('Please enter both address and value before inserting')
      return
    }
    
    // Check for duplicate address
    const addressExists = circles.some(circle => circle.address === address.trim())
    if (addressExists) {
      setShowDuplicateModal(true)
      closeInsertModal()
      return
    }
    
    switch(option) {
      case 'head':
        handleHeadInsertion()
        break
      case 'specific':
        // Open the index input modal for specific position
        setShowIndexModal(true)
        break
      case 'tail':
        handleTailInsertion()
        break
      default:
        break
    }
    
    closeInsertModal()
  }
  
  // Handle HEAD insertion
  const handleHeadInsertion = () => {
    // Create the new head node
    const newHead = {
      id: Date.now(),
      address: address.trim(),
      value: value.trim(),
      x: window.innerWidth - 10, // Right edge of right square
      y: window.innerHeight - 55, // Center of right square vertically
      velocityX: -8 - Math.random() * 5, // Launch leftward with random velocity
      velocityY: -5 - Math.random() * 3 // Launch upward with random velocity
    }
    
    // Find current head node(s)
    const currentHeads = circles.filter(circle => isHeadNode(circle.id))
    
    // Add the new circle
    setCircles(prev => [...prev, newHead])
    
    // Create connections from new head to all current heads
    if (currentHeads.length > 0) {
      const newConnections = currentHeads.map(head => ({
        id: Date.now() + Math.random(), // Ensure unique IDs
        from: newHead.id,
        to: head.id
      }))
      
      setConnections(prev => [...prev, ...newConnections])
    }
    
    // Clear input fields
    setAddress('')
    setValue('')
    
    console.log('New head node created:', newHead)
    console.log('Connected to previous heads:', currentHeads)
  }
  
  // Handle TAIL insertion
  const handleTailInsertion = () => {
    // Create the new tail node
    const newTail = {
      id: Date.now(),
      address: address.trim(),
      value: value.trim(),
      x: window.innerWidth - 10, // Right edge of right square
      y: window.innerHeight - 55, // Center of right square vertically
      velocityX: -8 - Math.random() * 5, // Launch leftward with random velocity
      velocityY: -5 - Math.random() * 3 // Launch upward with random velocity
    }
    
    // Find current tail node(s)
    const currentTails = circles.filter(circle => isTailNode(circle.id))
    
    // Add the new circle
    setCircles(prev => [...prev, newTail])
    
    // Create connections from all current tails to the new tail
    if (currentTails.length > 0) {
      const newConnections = currentTails.map(tail => ({
        id: Date.now() + Math.random(), // Ensure unique IDs
        from: tail.id,
        to: newTail.id
      }))
      
      setConnections(prev => [...prev, ...newConnections])
    }
    
    // Clear input fields
    setAddress('')
    setValue('')
    
    console.log('New tail node created:', newTail)
    console.log('Connected from previous tails:', currentTails)
  }
  
  // Handle SPECIFIC insertion at given index
  const handleSpecificInsertion = (index) => {
    const targetIndex = parseInt(index)
    
    // Validate index
    if (isNaN(targetIndex) || targetIndex < 0) {
      console.error('Invalid index for insertion')
      return
    }
    
    // Create the new node
    const newNode = {
      id: Date.now(),
      address: address.trim(),
      value: value.trim(),
      x: window.innerWidth - 10, // Right edge of right square
      y: window.innerHeight - 55, // Center of right square vertically
      velocityX: -8 - Math.random() * 5, // Launch leftward with random velocity
      velocityY: -5 - Math.random() * 3 // Launch upward with random velocity
    }
    
    // Find the head node(s) to start traversal
    const headNodes = circles.filter(circle => isHeadNode(circle.id))
    
    if (headNodes.length === 0) {
      // No existing linked list - this becomes the first node
      setCircles(prev => [...prev, newNode])
      console.log('First node created:', newNode)
    } else if (targetIndex === 0) {
      // Insert at head position
      setCircles(prev => [...prev, newNode])
      
      // Connect new node to all current heads
      const newConnections = headNodes.map(head => ({
        id: Date.now() + Math.random(),
        from: newNode.id,
        to: head.id
      }))
      
      setConnections(prev => [...prev, ...newConnections])
      console.log('Inserted at head position (index 0):', newNode)
    } else {
      // Insert at specific position > 0
      // Use the first head node for traversal
      const startHead = headNodes[0]
      const chainOrder = getChainOrder(startHead.id)
      
      if (targetIndex >= chainOrder.length) {
        // Insert at tail position
        const currentTails = circles.filter(circle => isTailNode(circle.id))
        setCircles(prev => [...prev, newNode])
        
        if (currentTails.length > 0) {
          const newConnections = currentTails.map(tail => ({
            id: Date.now() + Math.random(),
            from: tail.id,
            to: newNode.id
          }))
          setConnections(prev => [...prev, ...newConnections])
        }
        console.log('Inserted at tail position (index >= length):', newNode)
      } else {
        // Insert in the middle of the chain
        const prevNodeId = chainOrder[targetIndex - 1]
        const nextNodeId = chainOrder[targetIndex]
        
        setCircles(prev => [...prev, newNode])
        
        // Find and remove the existing connection between prev and next
        setConnections(prev => {
          const updatedConnections = prev.filter(conn => 
            !(conn.from === prevNodeId && conn.to === nextNodeId)
          )
          
          // Add new connections: prev -> newNode -> next
          const newConnections = [
            {
              id: Date.now() + Math.random(),
              from: prevNodeId,
              to: newNode.id
            },
            {
              id: Date.now() + Math.random() + 0.001,
              from: newNode.id,
              to: nextNodeId
            }
          ]
          
          return [...updatedConnections, ...newConnections]
        })
        
        console.log(`Inserted at index ${targetIndex} between nodes:`, prevNodeId, 'and', nextNodeId)
      }
    }
    
    // Clear input fields
    setAddress('')
    setValue('')
    setInsertIndex('')
    
    console.log('New node created at specific position:', newNode)
  }

  // Helper function to analyze and optimize connections after deletion
  const optimizeConnectionsAfterDeletion = (connections) => {
    // Remove any duplicate connections that might be created
    const connectionMap = new Map()
    
    connections.forEach(conn => {
      const key = `${conn.from}-${conn.to}`
      if (!connectionMap.has(key)) {
        connectionMap.set(key, conn)
      }
    })
    
    return Array.from(connectionMap.values())
  }

  // Handle circle deletion from popup
  const handleDeleteCircle = () => {
    if (!selectedCircle) return
    
    const nodeToDelete = selectedCircle.id
    
    // Find all connections involving this node
    const incomingConnections = connections.filter(conn => conn.to === nodeToDelete)
    const outgoingConnections = connections.filter(conn => conn.from === nodeToDelete)
    
    // Determine what type of node this is
    const isHead = isHeadNode(nodeToDelete)
    const isTail = isTailNode(nodeToDelete)
    const isMiddle = incomingConnections.length > 0 && outgoingConnections.length > 0
    const isIsolated = incomingConnections.length === 0 && outgoingConnections.length === 0
    
    console.log(`Deleting node ${nodeToDelete}:`, { isHead, isTail, isMiddle, isIsolated })
    
    // Remove the circle
    setCircles(prevCircles => prevCircles.filter(circle => circle.id !== nodeToDelete))
    
    // Handle connection adjustments based on node type
    setConnections(prevConnections => {
      // Remove all connections involving the deleted node
      let updatedConnections = prevConnections.filter(conn => 
        conn.from !== nodeToDelete && conn.to !== nodeToDelete
      )
      
      if (isMiddle) {
        // Middle node: connect all incoming nodes to all outgoing nodes
        const newConnections = []
        incomingConnections.forEach(inConn => {
          outgoingConnections.forEach(outConn => {
            // Avoid creating self-loops
            if (inConn.from !== outConn.to) {
              newConnections.push({
                id: Date.now() + Math.random(),
                from: inConn.from,
                to: outConn.to
              })
            }
          })
        })
        
        updatedConnections = [...updatedConnections, ...newConnections]
        console.log(`Middle node deleted: Created ${newConnections.length} bridge connections`)
        
      } else if (isHead && outgoingConnections.length > 0) {
        // Head node: the next nodes become new heads (no additional connections needed)
        // If there are multiple outgoing connections, all target nodes become independent heads
        const newHeadIds = outgoingConnections.map(conn => conn.to)
        console.log('Head node deleted: Next nodes become new heads:', newHeadIds)
        
      } else if (isTail && incomingConnections.length > 0) {
        // Tail node: the previous nodes become new tails (no additional connections needed)
        // If there are multiple incoming connections, all source nodes become independent tails
        const newTailIds = incomingConnections.map(conn => conn.from)
        console.log('Tail node deleted: Previous nodes become new tails:', newTailIds)
        
      } else if (incomingConnections.length > 0 && outgoingConnections.length === 0) {
        // Node with only incoming connections (like a tail but might be in a branched structure)
        console.log('End node deleted: Previous nodes become new endpoints')
        
      } else if (incomingConnections.length === 0 && outgoingConnections.length > 0) {
        // Node with only outgoing connections (like a head but might be in a branched structure)
        console.log('Start node deleted: Next nodes become new starting points')
        
      } else if (isIsolated) {
        // Isolated node: no connection adjustments needed
        console.log('Isolated node deleted: No connection adjustments needed')
      }
      
      // Optimize connections to remove any duplicates
      return optimizeConnectionsAfterDeletion(updatedConnections)
    })
    
    // Close the popup
    closePopup()
    
    console.log(`Node ${nodeToDelete} successfully deleted with connection adjustments`)
  }

  // Add global mouse event listeners
  useEffect(() => {
    const handleMouseMoveGlobal = (e) => {
      if (draggedCircle) {
        const newX = e.clientX - dragOffset.x
        const newY = e.clientY - dragOffset.y
        
        // Create a function to find the closest valid position to the target
        const findValidPosition = (targetX, targetY, currentX, currentY) => {
          const circleRadius = 30
          
          // Check if target position is already valid
          const isValid = (x, y) => {
            // Check controls area collision
            const controlsHeight = 55
            const controlsWidth = 1320
            const controlsLeft = window.innerWidth * 0.45 - controlsWidth / 2
            const controlsRight = controlsLeft + controlsWidth
            const controlsTop = window.innerHeight - 5 - controlsHeight
            const controlsBottom = window.innerHeight - 10
            
            if (x + circleRadius >= controlsLeft && 
                x - circleRadius <= controlsRight && 
                y + circleRadius >= controlsTop && 
                y - circleRadius <= controlsBottom) {
              return false
            }
            
            // Check right square collision  
            const rightSquareSize = 100
            const rightSquareLeft = window.innerWidth - rightSquareSize
            const rightSquareRight = window.innerWidth
            const rightSquareTop = window.innerHeight - rightSquareSize
            const rightSquareBottom = window.innerHeight
            
            if (x + circleRadius >= rightSquareLeft && 
                x - circleRadius <= rightSquareRight && 
                y + circleRadius >= rightSquareTop && 
                y - circleRadius <= rightSquareBottom) {
              return false
            }
            
            // Check screen boundaries
            if (x - circleRadius < 0 || 
                x + circleRadius > window.innerWidth || 
                y - circleRadius < 0 || 
                y + circleRadius > window.innerHeight) {
              return false
            }
            
            // Check collision with other circles
            const otherCircles = circles.filter(c => c.id !== draggedCircle.id)
            for (let otherCircle of otherCircles) {
              const dx = x - otherCircle.x
              const dy = y - otherCircle.y
              const distance = Math.sqrt(dx * dx + dy * dy)
              if (distance < circleRadius * 2) {
                return false
              }
            }
            
            return true
          }
          
          // If target position is valid, use it
          if (isValid(targetX, targetY)) {
            return { x: targetX, y: targetY }
          }
          
          // Find the closest valid position along the movement path
          const deltaX = targetX - currentX
          const deltaY = targetY - currentY
          const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
          
          if (distance === 0) {
            return { x: currentX, y: currentY }
          }
          
          // Normalize the direction vector
          const dirX = deltaX / distance
          const dirY = deltaY / distance
          
          // Binary search for the furthest valid position along the movement path
          let validDistance = 0
          let testDistance = distance
          let step = distance / 2
          
          for (let i = 0; i < 20; i++) { // Limit iterations for performance
            const testX = currentX + dirX * testDistance
            const testY = currentY + dirY * testDistance
            
            if (isValid(testX, testY)) {
              validDistance = testDistance
              testDistance += step
            } else {
              testDistance -= step
            }
            step /= 2
            
            if (step < 0.1) break // Good enough precision
          }
          
          return {
            x: currentX + dirX * validDistance,
            y: currentY + dirY * validDistance
          }
        }
        
        // Get the valid position for the new coordinates
        const validPosition = findValidPosition(newX, newY, draggedCircle.x, draggedCircle.y)
        
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
              ? { ...circle, x: validPosition.x, y: validPosition.y, velocityX: 0, velocityY: 0 }
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
  }, [draggedCircle, dragOffset, findConnectedCircles, circles])

  const launchCircle = () => {
    if (!address.trim() || !value.trim()) return

    // Check if address already exists
    const addressExists = circles.some(circle => circle.address === address.trim())
    if (addressExists) {
      setShowDuplicateModal(true)
      return
    }

    const newCircle = {
      id: Date.now(),
      address: address.trim(),
      value: value.trim(),
      x: window.innerWidth - 10, // Right edge of right square
      y: window.innerHeight - 55, // Center of right square vertically
      velocityX: -8 - Math.random() * 5, // Launch leftward with random velocity
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
        <source src="./video/space.mp4" type="video/mp4" />
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

      {/* Portal and right square */}
      <PortalComponent 
        onPortalStateChange={handlePortalStateChange} 
        isOpen={isPortalOpen}
      />
      <div className="right-square" style={{
        outlineOffset: '5px'
      }}></div>

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
        <div className="button-container">
          {showInsertButton && (
            <button 
              onClick={handleInsert} 
              className="insert-button"
              onMouseEnter={handleInsertHover}
              onMouseLeave={handleInsertLeave}
            >
              INSERT
            </button>
          )}
          <button 
            onClick={launchCircle} 
            className="launch-button"
            onMouseEnter={handleLunchHoverStart}
            onMouseLeave={handleLunchHoverEnd}
          >
            LUNCH
          </button>
        </div>
        <button 
          onClick={isPortalButtonEnabled ? togglePortal : undefined} 
          className={`portal-button ${!isPortalButtonEnabled ? 'disabled' : ''} ${isPortalOpen ? 'open' : ''}`}
          disabled={!isPortalButtonEnabled}
        >
          {isPortalOpen ? 'CLOSE PORTAL' : 'OPEN PORTAL'}
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
          const entranceX = 10 + (portalInfo.canvasWidth / 2) // Portal center
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
            <div className="validation-header">
              <div className="score-section">
                <span className="score-label">Score: {validationResult.score}/100</span>
              </div>
            </div>
            
            <div className="expected-results-section">
              <div className="expected-label">Expected <br></br> Results</div>
              
              {/* Show expected results and user answers in table format */}
              {currentExercise && currentExercise.expectedStructure && originalSubmission && originalSubmission.circles && (
                <table className="validation-table">
                  <tbody>
                    {/* Expected Results Row */}
                    <tr className="expected-row">
                      {currentExercise.expectedStructure.map((expectedNode, index) => (
                        <React.Fragment key={`expected-${expectedNode.value}`}>
                          <td className="expected-cell">
                            <div className="expected-value">{expectedNode.value}</div>
                            <div className="expected-address">{expectedNode.address}</div>
                          </td>
                          {index < currentExercise.expectedStructure.length - 1 && (
                            <td className="arrow-cell-empty"></td>
                          )}
                        </React.Fragment>
                      ))}
                    </tr>
                    
                    {/* User Answers Row */}
                    <tr className="user-row">
                      {(() => {
                        // Build the user's actual submission chain
                        const userCircles = originalSubmission.circles;
                        const userConnections = originalSubmission.connections;
                        
                        // Build user chain from their nodes
                        const userChain = [];
                        const visited = new Set();
                        
                        // Find head node in user's submission
                        let headCircle = userCircles.find(circle => {
                          const hasOutgoing = userConnections.some(conn => conn.from === circle.id);
                          const hasIncoming = userConnections.some(conn => conn.to === circle.id);
                          return hasOutgoing && !hasIncoming;
                        });
                        
                        // Build user chain
                        if (headCircle) {
                          let currentId = headCircle.id;
                          while (currentId && !visited.has(currentId)) {
                            visited.add(currentId);
                            const currentCircle = userCircles.find(c => c.id === currentId);
                            if (currentCircle) {
                              userChain.push(currentCircle);
                            }
                            const nextConnection = userConnections.find(conn => conn.from === currentId);
                            currentId = nextConnection ? nextConnection.to : null;
                          }
                        }
                        
                        // Add any remaining unconnected user nodes
                        userCircles.forEach(circle => {
                          if (!visited.has(circle.id)) {
                            userChain.push(circle);
                          }
                        });
                        
                        // Create cells for all expected positions
                        return currentExercise.expectedStructure.map((expectedNode, index) => {
                          // Find corresponding user node (if any)
                          const userNode = userChain.find(circle => parseInt(circle.value) === expectedNode.value);
                          
                          return (
                            <React.Fragment key={`user-${expectedNode.value}`}>
                              <td className="user-cell">
                                {userNode ? (
                                  <div className={`user-node ${validationResult.isCorrect ? 'correct' : 'incorrect'}`}>
                                    <div className="user-node-value">{userNode.value}</div>
                                    <div className="user-node-address">{userNode.address}</div>
                                  </div>
                                ) : (
                                  <div className="user-node missing">
                                    <div className="user-node-value">?</div>
                                    <div className="user-node-address">?</div>
                                  </div>
                                )}
                              </td>
                              {index < currentExercise.expectedStructure.length - 1 && (
                                <td className="arrow-cell">→</td>
                              )}
                            </React.Fragment>
                          );
                        });
                      })()}
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
            
            <div className="validation-buttons">
              <button 
                onClick={() => setShowValidationResult(false)}
                className="continue-button"
              >
                CONTINUE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connection popup */}
      {selectedCircle && (
        <div className="popup-overlay" onClick={closePopup}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            {/* X button to close modal */}
            <button className="popup-close-btn" onClick={closePopup}>×</button>
            
            <div className="popup-circle">
              <span className="popup-circle-value">{selectedCircle.value}</span>
              <span className="popup-circle-address">{selectedCircle.address}</span>
            </div>
            <div className="popup-form-container">
              <div className="popup-text">Connect to?</div>
              <input
                type="text"
                placeholder="Enter Address"
                value={connectToAddress}
                onChange={(e) => setConnectToAddress(e.target.value)}
                className="popup-input"
                autoFocus
              />
              <div className="popup-buttons">
                <button onClick={handleConnect} className="popup-button connect-btn">CONNECT</button>
                <button onClick={handleDeleteCircle} className="popup-button delete-btn">DELETE</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Address Error Modal */}
      {showDuplicateModal && (
        <div className="error-modal-overlay" onClick={closeDuplicateModal}>
          <div className="error-modal-content" onClick={(e) => e.stopPropagation()}>
            {/* X button to close modal */}
            <button className="error-modal-close-btn" onClick={closeDuplicateModal}>×</button>
            
            <div className="error-icon">
              <span className="exclamation">!</span>
            </div>
            <div className="error-title">Duplicate Address</div>
            <div className="error-message-text">Nodes cannot have the same address</div>
          </div>
        </div>
      )}

      {/* Insert Position Modal */}
      {showInsertModal && (
        <div className="insert-modal-overlay" onClick={closeInsertModal}>
          <div className="insert-modal-content" onClick={(e) => e.stopPropagation()}>
            {/* X button to close modal */}
            <button className="insert-modal-close-btn" onClick={closeInsertModal}>×</button>
            
            <div className="insert-options">
              <button 
                className="insert-option-btn head-btn" 
                onClick={() => handleInsertOption('head')}
              >
                <div className="option-title">HEAD</div>
                <div className="option-subtitle">i = 0 (Head)</div>
              </button>
              
              <button 
                className="insert-option-btn specific-btn" 
                onClick={() => handleInsertOption('specific')}
              >
                <div className="option-title">SPECIFIC</div>
                <div className="option-subtitle">specify both i in [1, N-1]</div>
              </button>
              
              <button 
                className="insert-option-btn tail-btn" 
                onClick={() => handleInsertOption('tail')}
              >
                <div className="option-title">TAIL</div>
                <div className="option-subtitle">i = N (After Tail)</div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Index Input Modal */}
      {showIndexModal && (
        <div className="index-modal-overlay" onClick={closeIndexModal}>
          <div className="index-modal-content" onClick={(e) => e.stopPropagation()}>
            {/* X button to close modal */}
            <button className="index-modal-close-btn" onClick={closeIndexModal}>×</button>
            
            <div className="index-modal-title">Index</div>
            <div className="index-input-container">
              <input
                type="text"
                placeholder="Enter Index"
                value={insertIndex}
                onChange={(e) => setInsertIndex(e.target.value)}
                className="index-input"
                autoFocus
              />
              <button onClick={handleIndexSubmit} className="index-go-btn">Go</button>
            </div>
            <div className="index-subtitle">specify both i in [1, N-1]</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
