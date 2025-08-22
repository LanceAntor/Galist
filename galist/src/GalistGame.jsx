import React, { useState, useEffect, useRef, useCallback } from "react";
import styles from "./GalistGame.module.css";
import { ExerciseManager } from "./LinkedListExercise";
import { collisionDetection } from "./CollisionDetection";
import PortalComponent from "./PortalComponent";
import ModeSelect from "./ModeSelect";
import GameMenu from "./GameMenu";

function GalistGame() {
  // Game menu state
  const [showMenu, setShowMenu] = useState(true);
  const [address, setAddress] = useState("");
  const [value, setValue] = useState("");
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showInsertButton, setShowInsertButton] = useState(false);
  const [showInsertModal, setShowInsertModal] = useState(false);
  const [showIndexModal, setShowIndexModal] = useState(false);
  const [insertIndex, setInsertIndex] = useState("");
  const [hoverTimer, setHoverTimer] = useState(null);
  const [circles, setCircles] = useState([]);
  const [draggedCircle, setDraggedCircle] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedCircle, setSelectedCircle] = useState(null);
  const [connectToAddress, setConnectToAddress] = useState("");
  const [connections, setConnections] = useState([]);
  const animationRef = useRef();
  const mouseHistoryRef = useRef([]);
  const [suckingCircles, setSuckingCircles] = useState([]);
  const [suckedCircles, setSuckedCircles] = useState([]); // Track circles that have been sucked out
  const [currentEntryOrder, setCurrentEntryOrder] = useState([]); // Track entry order for current submission only
  const [originalSubmission, setOriginalSubmission] = useState(null); // Store original circles and connections for validation

  // Portal state management
  const [portalInfo, setPortalInfo] = useState({
    isVisible: false,
    canvasWidth: 45,
  });
  const [isPortalOpen, setIsPortalOpen] = useState(false); // New state for portal open/close

  // Wrap setPortalInfo in useCallback to prevent unnecessary re-renders
  const handlePortalStateChange = useCallback((newPortalInfo) => {
    setPortalInfo(newPortalInfo);
  }, []);

  // Portal toggle function
  const togglePortal = useCallback(() => {
    setIsPortalOpen(!isPortalOpen);
  }, [isPortalOpen]);

  // Exercise system states
  const exerciseManagerRef = useRef(new ExerciseManager());
  const [currentExercise, setCurrentExercise] = useState(null);
  const [showValidationResult, setShowValidationResult] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [showInstructionPopup, setShowInstructionPopup] = useState(false);
  const [selectedMode, setSelectedMode] = useState(null); // 'singly' | 'doubly'

  // Apply navigation state to UI
  const applyNavigationState = useCallback((st) => {
    const screen = st?.screen || "menu";
    const mode = st?.mode || null;
    setShowMenu(screen === "menu");
    setSelectedMode(screen === "play" ? mode : null);
  }, []);

  // Function to toggle instruction popup
  const toggleInstructionPopup = () => {
    setShowInstructionPopup(!showInstructionPopup);
  };

  // Game menu actions
  const startGame = useCallback(() => {
    const next = { screen: "mode", mode: null };
    window.history.pushState(next, "");
    // Clear any previous game state so this session is fresh
    setCircles([]);
    setConnections([]);
    setSuckingCircles([]);
    setSuckedCircles([]);
    setCurrentEntryOrder([]);
    setOriginalSubmission(null);
    setShowValidationResult(false);
    setValidationResult(null);
    setIsPortalOpen(false);
    setPortalInfo((prev) => ({ ...prev, isVisible: false }));
    setAddress("");
    setValue("");
    setShowDuplicateModal(false);
    setShowInsertButton(false);
    setShowInsertModal(false);
    setShowIndexModal(false);
    setInsertIndex("");
    setSelectedCircle(null);
    setConnectToAddress("");
    setShowInstructionPopup(false);
    setShowMenu(false);
    setSelectedMode(null);
  }, []);

  const handleSelectMode = useCallback((mode) => {
    const next = { screen: "play", mode };
    window.history.pushState(next, "");
    setSelectedMode(mode);
    setShowMenu(false);
  }, []);

  // Initialize history state and handle browser back/forward
  useEffect(() => {
    const state = window.history.state;
    if (state && state.screen) {
      applyNavigationState(state);
    } else {
      const initial = { screen: "menu", mode: null };
      window.history.replaceState(initial, "");
      applyNavigationState(initial);
    }

    const onPopState = (e) => {
      const st = e.state || { screen: "menu", mode: null };
      // If leaving gameplay via browser navigation, end the current game
      if (st.screen !== "play") {
        setCircles([]);
        setConnections([]);
        setSuckingCircles([]);
        setSuckedCircles([]);
        setCurrentEntryOrder([]);
        setOriginalSubmission(null);
        setShowValidationResult(false);
        setValidationResult(null);
        setIsPortalOpen(false);
        setPortalInfo((prev) => ({ ...prev, isVisible: false }));
        setAddress("");
        setValue("");
        setShowDuplicateModal(false);
        setShowInsertButton(false);
        setShowInsertModal(false);
        setShowIndexModal(false);
        setInsertIndex("");
        setSelectedCircle(null);
        setConnectToAddress("");
        setShowInstructionPopup(false);
      }
      applyNavigationState(st);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [applyNavigationState]);

  // Function to find all connected circles recursively
  const findConnectedCircles = useCallback(
    (circleId, visited = new Set()) => {
      if (visited.has(circleId)) return [];
      visited.add(circleId);

      const connected = [circleId];
      connections.forEach((connection) => {
        if (connection.from === circleId && !visited.has(connection.to)) {
          connected.push(...findConnectedCircles(connection.to, visited));
        }
        if (connection.to === circleId && !visited.has(connection.from)) {
          connected.push(...findConnectedCircles(connection.from, visited));
        }
      });

      return connected;
    },
    [connections]
  );

  // Function to check if a circle is a head node (has outgoing connections but no incoming)
  const isHeadNode = useCallback(
    (circleId) => {
      const hasOutgoing = connections.some((conn) => conn.from === circleId);
      const hasIncoming = connections.some((conn) => conn.to === circleId);
      return hasOutgoing && !hasIncoming;
    },
    [connections]
  );

  // Function to check if a circle is a tail node (has incoming connections but no outgoing)
  const isTailNode = useCallback(
    (circleId) => {
      const hasOutgoing = connections.some((conn) => conn.from === circleId);
      const hasIncoming = connections.some((conn) => conn.to === circleId);
      return hasIncoming && !hasOutgoing;
    },
    [connections]
  );

  // Check if portal button should be enabled (requires at least one head AND one tail node)
  const hasHeadNode = useCallback(() => {
    return circles.some((circle) => isHeadNode(circle.id));
  }, [circles, isHeadNode]);

  const hasTailNode = useCallback(() => {
    return circles.some((circle) => isTailNode(circle.id));
  }, [circles, isTailNode]);

  const isPortalButtonEnabled =
    isPortalOpen || (hasHeadNode() && hasTailNode());

  // Exercise management functions
  const resetWorkspace = useCallback(() => {
    setCircles([]);
    setConnections([]);
    setSuckingCircles([]);
    setSuckedCircles([]);
    setCurrentEntryOrder([]);
    setOriginalSubmission(null);
    setShowValidationResult(false);
    setValidationResult(null);
    exerciseManagerRef.current.reset();
  }, []);

  const loadExercise = useCallback(() => {
    const exercise = exerciseManagerRef.current.loadExercise("basic");
    setCurrentExercise(exercise);
    resetWorkspace();
  }, [resetWorkspace]);

  const startExercise = useCallback(() => {
    setShowInstructionPopup(false);
    if (!currentExercise) {
      loadExercise();
    }
  }, [loadExercise, currentExercise]);

  // Initialize exercise on component mount
  useEffect(() => {
    if (!currentExercise) {
      const exercise = exerciseManagerRef.current.loadExercise("basic");
      setCurrentExercise(exercise);
    }
  }, [currentExercise]);

  // Initialize with basic exercise when instruction popup is closed
  useEffect(() => {
    if (!showInstructionPopup && !currentExercise) {
      loadExercise();
    }
  }, [showInstructionPopup, currentExercise, loadExercise]);

  // Helper function to get the complete chain order from head to tail
  const getChainOrder = useCallback(
    (startCircleId) => {
      const chainOrder = [];
      let currentId = startCircleId;
      const visited = new Set();

      // If starting circle is not a head, find the head first
      if (!isHeadNode(startCircleId)) {
        // Traverse backwards to find the head
        let searchId = startCircleId;
        const backwardVisited = new Set();

        while (searchId && !backwardVisited.has(searchId)) {
          backwardVisited.add(searchId);
          const incomingConnection = connections.find(
            (conn) => conn.to === searchId
          );
          if (incomingConnection && !isHeadNode(incomingConnection.from)) {
            searchId = incomingConnection.from;
          } else if (incomingConnection) {
            currentId = incomingConnection.from; // Found the head
            break;
          } else {
            break;
          }
        }
      }

      // Now traverse from head to tail
      while (currentId && !visited.has(currentId)) {
        visited.add(currentId);
        chainOrder.push(currentId);

        // Find the next node in the chain
        const nextConnection = connections.find(
          (conn) => conn.from === currentId
        );
        currentId = nextConnection ? nextConnection.to : null;
      }

      return chainOrder;
    },
    [connections, isHeadNode]
  );

  // Function to start chain suction effect
  const startChainSuction = useCallback(
    (startCircleId) => {
      // Reset sucked circles and entry order for new submission
      setSuckedCircles([]);
      setCurrentEntryOrder([]);

      // Capture the original submission data before any circles are sucked
      setOriginalSubmission({
        circles: circles.map((c) => ({ ...c })), // Deep copy
        connections: connections.map((c) => ({ ...c })), // Deep copy
      });

      // Get the proper head-to-tail chain order
      const chainOrder = getChainOrder(startCircleId);

      // Add the triggering circle to sucking list (don't remove it immediately)
      setSuckingCircles((prev) => {
        if (!prev.includes(startCircleId)) {
          return [...prev, startCircleId];
        }
        return prev;
      });

      // Start the chain reaction in proper order (head first, tail last)
      const remainingCircles = chainOrder.filter((id) => id !== startCircleId);

      remainingCircles.forEach((circleId, index) => {
        // Head nodes get sucked first (faster), tail last (slower)
        const delay = (index + 1) * 150; // Start from 150ms for the first remaining circle

        setTimeout(() => {
          // Add circle to sucking list (this will make it get pulled toward entrance)
          setSuckingCircles((prev) => [...prev, circleId]);
        }, delay);
      });
    },
    [getChainOrder, circles, connections]
  );

  // PHYSICS SYSTEM - Simple animation loop adapted for portal
  useEffect(() => {
    let isAnimating = true;

    const gameLoop = () => {
      if (!isAnimating) return;

      setCircles((prevCircles) => {
        // First pass: Handle special behaviors (suction, portal interactions) without collision detection
        const circlesWithSpecialBehavior = prevCircles.map((circle) => {
          // Skip physics for dragged circle
          if (draggedCircle && circle.id === draggedCircle.id) {
            return circle;
          }

          // Special behavior for sucking circles - target portal center
          if (suckingCircles.includes(circle.id)) {
            // Portal center calculation (using portal canvas width)
            const portalCenterX = 10 + portalInfo.canvasWidth / 2; // Center of the portal canvas
            const portalCenterY = window.innerHeight / 2; // Center of entrance vertically
            const dx = portalCenterX - circle.x;
            const dy = portalCenterY - circle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Check if circle has reached the portal entrance area
            const portalTop = window.innerHeight / 2 - 50;
            const portalBottom = window.innerHeight / 2 + 50;
            const entranceTop = portalTop + 10;
            const entranceBottom = portalBottom - 10;

            if (
              circle.x >= 10 &&
              circle.x <= 35 &&
              circle.y >= entranceTop &&
              circle.y <= entranceBottom
            ) {
              // Circle has reached the portal entrance - remove it and mark as sucked
              setTimeout(() => {
                setCircles((prevCircles) => {
                  const newCircles = prevCircles.filter(
                    (c) => c.id !== circle.id
                  );

                  // Check if this was the last circle - if so, validate the submission
                  if (newCircles.length === 0 && currentExercise) {
                    // Ensure exercise is loaded
                    if (!exerciseManagerRef.current.currentExercise) {
                      exerciseManagerRef.current.loadExercise("basic");
                    }

                    // Get the order in which circles entered the portal (only for current submission)
                    // Add this circle to the current entry order
                    const finalEntryOrder = [...currentEntryOrder, circle.id];

                    // Use the original submission data captured when suction started
                    const submissionData = originalSubmission || {
                      circles: [...prevCircles], // Fallback to current circles
                      connections: [...connections], // Fallback to current connections
                    };

                    // Validate the submission
                    setTimeout(() => {
                      try {
                        const result =
                          exerciseManagerRef.current.validateSubmission(
                            submissionData.circles,
                            submissionData.connections,
                            finalEntryOrder
                          );

                        setValidationResult(result);
                        setShowValidationResult(true);
                      } catch (error) {
                        if (
                          error.message.includes("No exercise loaded") ||
                          error.message.includes("No submission data") ||
                          error.message.includes("Exercise template") ||
                          error.message.includes("Critical")
                        ) {
                          setValidationResult({
                            isCorrect: false,
                            message: "System Error",
                            details: error.message,
                            score: 0,
                            totalPoints: 100,
                          });
                          setShowValidationResult(true);
                        }
                      }
                    }, 500);
                  }

                  return newCircles;
                });

                // Mark this circle as sucked and add to entry order (only if not already added)
                setSuckedCircles((prev) => {
                  if (!prev.includes(circle.id)) {
                    return [...prev, circle.id];
                  }
                  return prev;
                });
                setCurrentEntryOrder((prev) => {
                  if (!prev.includes(circle.id)) {
                    return [...prev, circle.id];
                  }
                  return prev;
                });

                setSuckingCircles((prev) =>
                  prev.filter((id) => id !== circle.id)
                );
              }, 50);

              return circle;
            }

            // Strong suction force toward portal entrance
            const baseForce = 2.0;
            const headBoost = 1.5; // Extra boost when head node triggered the chain
            const suctionForce = baseForce + headBoost;
            const newVelocityX = (dx / distance) * suctionForce;
            const newVelocityY = (dy / distance) * suctionForce;

            return {
              ...circle,
              x: circle.x + newVelocityX,
              y: circle.y + newVelocityY,
              velocityX: newVelocityX,
              velocityY: newVelocityY,
            };
          }

          // Add gentle suction effect when portal is open
          if (portalInfo.isVisible && !suckingCircles.includes(circle.id)) {
            const portalCenter = {
              x: 10 + portalInfo.canvasWidth / 2,
              y: window.innerHeight / 2,
            };
            const dx = portalCenter.x - circle.x;
            const dy = portalCenter.y - circle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 80) {
              // Only apply suction if not too close
              const suctionForce = 0.1;
              // Apply suction to the circle's velocity
              circle.velocityX =
                (circle.velocityX || 0) + (dx / distance) * suctionForce;
              circle.velocityY =
                (circle.velocityY || 0) + (dy / distance) * suctionForce;
            }
          }

          // Handle special portal suction logic for manual triggers
          if (portalInfo.isVisible) {
            const portalRight = 10 + portalInfo.canvasWidth + 20;
            const portalTop = window.innerHeight / 2 - 50;
            const portalBottom = window.innerHeight / 2 + 50;
            const entranceTop = portalTop + 10;
            const entranceBottom = portalBottom - 10;
            const circleRadius = 30;

            const newX = circle.x + (circle.velocityX || 0);
            const newY = circle.y + (circle.velocityY || 0);

            // Check if circle is entering through the entrance
            if (
              newX - circleRadius <= portalRight &&
              newX - circleRadius >= portalRight - 20 &&
              newY >= entranceTop &&
              newY <= entranceBottom &&
              !suckingCircles.includes(circle.id)
            ) {
              const isHead = isHeadNode(circle.id);
              const hasAnyHeadNode = prevCircles.some((c) => isHeadNode(c.id));

              if (isHead || !hasAnyHeadNode) {
                startChainSuction(circle.id);
              }

              return circle; // Return unchanged for this frame
            }
          }

          return circle;
        });

        // Second pass: Apply collision detection and physics to ALL circles at once
        const allCirclesForCollision = circlesWithSpecialBehavior;
        const draggedCircleData = draggedCircle
          ? allCirclesForCollision.find(
              (circle) => circle.id === draggedCircle.id
            )
          : null;

        const updatedAllCircles =
          allCirclesForCollision.length > 0
            ? collisionDetection.updatePhysics(
                allCirclesForCollision,
                suckingCircles
              )
            : [];

        let finalCircles = updatedAllCircles;
        if (draggedCircleData) {
          finalCircles = updatedAllCircles.map((circle) => {
            if (circle.id === draggedCircle.id) {
              return {
                ...draggedCircleData,
                velocityX: circle.velocityX,
                velocityY: circle.velocityY,
              };
            }
            return circle;
          });
        }

        return finalCircles;
      });

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [
    portalInfo,
    suckingCircles,
    draggedCircle,
    isHeadNode,
    startChainSuction,
    findConnectedCircles,
    connections,
    currentExercise,
    suckedCircles,
    originalSubmission,
    currentEntryOrder,
  ]);

  // Handle connection removal when circles are sucked
  useEffect(() => {
    if (suckedCircles.length > 0) {
      const timer = setTimeout(() => {
        setConnections((prevConnections) =>
          prevConnections.filter((connection) => {
            const fromSucked = suckedCircles.includes(connection.from);
            const toSucked = suckedCircles.includes(connection.to);
            return !(fromSucked && toSucked);
          })
        );
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [suckedCircles]);

  // Auto-suction effect when portal opens - prioritize head nodes
  useEffect(() => {
    if (portalInfo.isVisible && circles.length > 0) {
      const headNodes = circles.filter((circle) => isHeadNode(circle.id));

      if (headNodes.length > 0) {
        headNodes.forEach((headNode, index) => {
          setTimeout(() => {
            startChainSuction(headNode.id);
          }, index * 1000);
        });
      } else {
        const isolatedNodes = circles.filter(
          (circle) =>
            !connections.some(
              (conn) => conn.from === circle.id || conn.to === circle.id
            )
        );

        if (isolatedNodes.length > 0) {
          isolatedNodes.forEach((node, index) => {
            setTimeout(() => {
              setSuckingCircles((prev) => {
                if (!prev.includes(node.id)) {
                  return [...prev, node.id];
                }
                return prev;
              });
            }, index * 200);
          });
        }
      }
    } else if (!portalInfo.isVisible) {
      setSuckingCircles([]);
    }
  }, [
    portalInfo.isVisible,
    circles,
    connections,
    isHeadNode,
    startChainSuction,
  ]);

  // Mouse event handlers for dragging
  const handleMouseDown = (e, circle) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setDraggedCircle(circle);
    setDragOffset({
      x: e.clientX - rect.left - 30,
      y: e.clientY - rect.top - 30,
    });

    mouseHistoryRef.current = [
      {
        x: e.clientX,
        y: e.clientY,
        time: Date.now(),
      },
    ];
  };

  const handleDoubleClick = (circle) => {
    setSelectedCircle(circle);
    setConnectToAddress("");
  };

  const handleConnect = () => {
    if (!selectedCircle || !connectToAddress.trim()) return;

    const targetCircle = circles.find(
      (c) => c.address === connectToAddress.trim()
    );
    if (targetCircle && targetCircle.id !== selectedCircle.id) {
      const newConnection = {
        id: Date.now(),
        from: selectedCircle.id,
        to: targetCircle.id,
      };
      setConnections((prev) => [...prev, newConnection]);
    }

    setSelectedCircle(null);
    setConnectToAddress("");
  };

  const closePopup = () => {
    setSelectedCircle(null);
    setConnectToAddress("");
  };

  const closeDuplicateModal = () => {
    setShowDuplicateModal(false);
  };

  const handleLunchHoverStart = () => {
    if (hoverTimer) {
      clearTimeout(hoverTimer);
    }
    const timer = setTimeout(() => {
      setShowInsertButton(true);
    }, 2000);
    setHoverTimer(timer);
  };

  const handleLunchHoverEnd = () => {
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      setHoverTimer(null);
    }

    const hideTimer = setTimeout(() => {
      setShowInsertButton(false);
    }, 100);
    setHoverTimer(hideTimer);
  };

  const handleInsertHover = () => {
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      setHoverTimer(null);
    }
  };

  const handleInsertLeave = () => {
    setShowInsertButton(false);
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      setHoverTimer(null);
    }
  };

  const handleInsert = () => {
    setShowInsertButton(false);
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      setHoverTimer(null);
    }
    setShowInsertModal(true);
  };

  const closeInsertModal = () => {
    setShowInsertModal(false);
  };

  const closeIndexModal = () => {
    setShowIndexModal(false);
    setInsertIndex("");
  };

  const handleIndexSubmit = () => {
    const index = parseInt(insertIndex.trim());
    if (isNaN(index) || index < 1) {
      alert("Please enter a valid index (must be >= 1)");
      return;
    }
    const maxIndex = circles.length;
    if (index > maxIndex) {
      alert(`Index too large. Maximum index is ${maxIndex}`);
      return;
    }
    handleSpecificInsertion(index);
    closeIndexModal();
    closeInsertModal();
  };

  const handleInsertOption = (option) => {
    if (!address.trim() || !value.trim()) {
      alert("Please enter both address and value before inserting");
      return;
    }

    const addressExists = circles.some(
      (circle) => circle.address === address.trim()
    );
    if (addressExists) {
      setShowDuplicateModal(true);
      closeInsertModal();
      return;
    }

    switch (option) {
      case "head":
        handleHeadInsertion();
        break;
      case "specific":
        setShowIndexModal(true);
        break;
      case "tail":
        handleTailInsertion();
        break;
      default:
        break;
    }

    closeInsertModal();
  };

  const handleHeadInsertion = () => {
    const newHead = {
      id: Date.now(),
      address: address.trim(),
      value: value.trim(),
      x: window.innerWidth - 10,
      y: window.innerHeight - 55,
      velocityX: -8 - Math.random() * 5,
      velocityY: -5 - Math.random() * 3,
    };

    const currentHeads = circles.filter((circle) => isHeadNode(circle.id));

    setCircles((prev) => [...prev, newHead]);

    if (currentHeads.length > 0) {
      const newConnections = currentHeads.map((head) => ({
        id: Date.now() + Math.random(),
        from: newHead.id,
        to: head.id,
      }));

      setConnections((prev) => [...prev, ...newConnections]);
    }

    setAddress("");
    setValue("");
  };

  const handleTailInsertion = () => {
    const newTail = {
      id: Date.now(),
      address: address.trim(),
      value: value.trim(),
      x: window.innerWidth - 10,
      y: window.innerHeight - 55,
      velocityX: -8 - Math.random() * 5,
      velocityY: -5 - Math.random() * 3,
    };

    const currentTails = circles.filter((circle) => isTailNode(circle.id));

    setCircles((prev) => [...prev, newTail]);

    if (currentTails.length > 0) {
      const newConnections = currentTails.map((tail) => ({
        id: Date.now() + Math.random(),
        from: tail.id,
        to: newTail.id,
      }));

      setConnections((prev) => [...prev, ...newConnections]);
    }

    setAddress("");
    setValue("");
  };

  const getChainOrderForHead = useCallback(
    (headId) => {
      const order = [];
      let currentId = headId;
      const visited = new Set();
      while (currentId && !visited.has(currentId)) {
        visited.add(currentId);
        order.push(currentId);
        const next = connections.find((c) => c.from === currentId);
        currentId = next ? next.to : null;
      }
      return order;
    },
    [connections]
  );

  const handleSpecificInsertion = (index) => {
    const targetIndex = parseInt(index);
    if (isNaN(targetIndex) || targetIndex < 0) {
      return;
    }

    const newNode = {
      id: Date.now(),
      address: address.trim(),
      value: value.trim(),
      x: window.innerWidth - 10,
      y: window.innerHeight - 55,
      velocityX: -8 - Math.random() * 5,
      velocityY: -5 - Math.random() * 3,
    };

    const headNodes = circles.filter((circle) => isHeadNode(circle.id));

    if (headNodes.length === 0) {
      setCircles((prev) => [...prev, newNode]);
    } else if (targetIndex === 0) {
      setCircles((prev) => [...prev, newNode]);
      const newConnections = headNodes.map((head) => ({
        id: Date.now() + Math.random(),
        from: newNode.id,
        to: head.id,
      }));
      setConnections((prev) => [...prev, ...newConnections]);
    } else {
      const startHead = headNodes[0];
      const chainOrder = getChainOrderForHead(startHead.id);

      if (targetIndex >= chainOrder.length) {
        const currentTails = circles.filter((circle) => isTailNode(circle.id));
        setCircles((prev) => [...prev, newNode]);
        if (currentTails.length > 0) {
          const newConnections = currentTails.map((tail) => ({
            id: Date.now() + Math.random(),
            from: tail.id,
            to: newNode.id,
          }));
          setConnections((prev) => [...prev, ...newConnections]);
        }
      } else {
        const prevNodeId = chainOrder[targetIndex - 1];
        const nextNodeId = chainOrder[targetIndex];
        setCircles((prev) => [...prev, newNode]);
        setConnections((prev) => {
          const updated = prev.filter(
            (conn) => !(conn.from === prevNodeId && conn.to === nextNodeId)
          );
          return [
            ...updated,
            {
              id: Date.now() + Math.random(),
              from: prevNodeId,
              to: newNode.id,
            },
            {
              id: Date.now() + Math.random() + 0.001,
              from: newNode.id,
              to: nextNodeId,
            },
          ];
        });
      }
    }

    setAddress("");
    setValue("");
    setInsertIndex("");
  };

  const optimizeConnectionsAfterDeletion = (connections) => {
    const connectionMap = new Map();
    connections.forEach((conn) => {
      const key = `${conn.from}-${conn.to}`;
      if (!connectionMap.has(key)) {
        connectionMap.set(key, conn);
      }
    });
    return Array.from(connectionMap.values());
  };

  const handleDeleteCircle = () => {
    if (!selectedCircle) return;
    const nodeToDelete = selectedCircle.id;
    const incomingConnections = connections.filter(
      (conn) => conn.to === nodeToDelete
    );
    const outgoingConnections = connections.filter(
      (conn) => conn.from === nodeToDelete
    );
    const isHead = isHeadNode(nodeToDelete);
    const isTail = isTailNode(nodeToDelete);
    const isMiddle =
      incomingConnections.length > 0 && outgoingConnections.length > 0;

    setCircles((prevCircles) =>
      prevCircles.filter((circle) => circle.id !== nodeToDelete)
    );

    setConnections((prevConnections) => {
      let updatedConnections = prevConnections.filter(
        (conn) => conn.from !== nodeToDelete && conn.to !== nodeToDelete
      );

      if (isMiddle) {
        const newConnections = [];
        incomingConnections.forEach((inConn) => {
          outgoingConnections.forEach((outConn) => {
            if (inConn.from !== outConn.to) {
              newConnections.push({
                id: Date.now() + Math.random(),
                from: inConn.from,
                to: outConn.to,
              });
            }
          });
        });
        updatedConnections = [...updatedConnections, ...newConnections];
      } else if (isHead && outgoingConnections.length > 0) {
        // next nodes become heads
      } else if (isTail && incomingConnections.length > 0) {
        // previous nodes become tails
      }

      return optimizeConnectionsAfterDeletion(updatedConnections);
    });

    closePopup();
  };

  useEffect(() => {
    const handleMouseMoveGlobal = (e) => {
      if (draggedCircle) {
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;

        const findValidPosition = (targetX, targetY, currentX, currentY) => {
          const circleRadius = 30;

          const isValid = (x, y) => {
            const controlsHeight = 55;
            const controlsWidth = 1320;
            const controlsLeft = window.innerWidth * 0.45 - controlsWidth / 2;
            const controlsRight = controlsLeft + controlsWidth;
            const controlsTop = window.innerHeight - 5 - controlsHeight;
            const controlsBottom = window.innerHeight - 10;

            if (
              x + circleRadius >= controlsLeft &&
              x - circleRadius <= controlsRight &&
              y + circleRadius >= controlsTop &&
              y - circleRadius <= controlsBottom
            ) {
              return false;
            }

            const rightSquareSize = 100;
            const rightSquareLeft = window.innerWidth - rightSquareSize;
            const rightSquareRight = window.innerWidth;
            const rightSquareTop = window.innerHeight - rightSquareSize;
            const rightSquareBottom = window.innerHeight;

            if (
              x + circleRadius >= rightSquareLeft &&
              x - circleRadius <= rightSquareRight &&
              y + circleRadius >= rightSquareTop &&
              y - circleRadius <= rightSquareBottom
            ) {
              return false;
            }

            if (
              x - circleRadius < 0 ||
              x + circleRadius > window.innerWidth ||
              y - circleRadius < 0 ||
              y + circleRadius > window.innerHeight
            ) {
              return false;
            }

            const otherCircles = circles.filter(
              (c) => c.id !== draggedCircle.id
            );
            for (let otherCircle of otherCircles) {
              const dx = x - otherCircle.x;
              const dy = y - otherCircle.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              if (distance < circleRadius * 2) {
                return false;
              }
            }

            return true;
          };

          if (isValid(targetX, targetY)) {
            return { x: targetX, y: targetY };
          }

          const deltaX = targetX - currentX;
          const deltaY = targetY - currentY;
          const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

          if (distance === 0) {
            return { x: currentX, y: currentY };
          }

          const dirX = deltaX / distance;
          const dirY = deltaY / distance;

          let validDistance = 0;
          let testDistance = distance;
          let step = distance / 2;

          for (let i = 0; i < 20; i++) {
            const testX = currentX + dirX * testDistance;
            const testY = currentY + dirY * testDistance;

            if (isValid(testX, testY)) {
              validDistance = testDistance;
              testDistance += step;
            } else {
              testDistance -= step;
            }
            step /= 2;

            if (step < 0.1) break;
          }

          return {
            x: currentX + dirX * validDistance,
            y: currentY + dirY * validDistance,
          };
        };

        const validPosition = findValidPosition(
          newX,
          newY,
          draggedCircle.x,
          draggedCircle.y
        );

        const now = Date.now();
        mouseHistoryRef.current.push({
          x: e.clientX,
          y: e.clientY,
          time: now,
        });

        mouseHistoryRef.current = mouseHistoryRef.current.filter(
          (entry) => now - entry.time < 100
        );

        setCircles((prevCircles) =>
          prevCircles.map((circle) =>
            circle.id === draggedCircle.id
              ? {
                  ...circle,
                  x: validPosition.x,
                  y: validPosition.y,
                  velocityX: 0,
                  velocityY: 0,
                }
              : circle
          )
        );
      }
    };

    const handleMouseUpGlobal = () => {
      if (draggedCircle) {
        let velocityX = 0;
        let velocityY = 0;

        if (mouseHistoryRef.current.length >= 2) {
          const recent =
            mouseHistoryRef.current[mouseHistoryRef.current.length - 1];
          const older = mouseHistoryRef.current[0];
          const timeDiff = recent.time - older.time;

          if (timeDiff > 0) {
            velocityX = ((recent.x - older.x) / timeDiff) * 16;
            velocityY = ((recent.y - older.y) / timeDiff) * 16;

            const maxVelocity = 15;
            velocityX = Math.max(
              -maxVelocity,
              Math.min(maxVelocity, velocityX)
            );
            velocityY = Math.max(
              -maxVelocity,
              Math.min(maxVelocity, velocityY)
            );
          }
        }

        setCircles((prevCircles) =>
          prevCircles.map((circle) =>
            circle.id === draggedCircle.id
              ? { ...circle, velocityX, velocityY }
              : circle
          )
        );
      }

      setDraggedCircle(null);
      setDragOffset({ x: 0, y: 0 });
      mouseHistoryRef.current = [];
    };

    document.addEventListener("mousemove", handleMouseMoveGlobal);
    document.addEventListener("mouseup", handleMouseUpGlobal);

    return () => {
      document.removeEventListener("mousemove", handleMouseMoveGlobal);
      document.removeEventListener("mouseup", handleMouseUpGlobal);
    };
  }, [draggedCircle, dragOffset, findConnectedCircles, circles]);

  const launchCircle = () => {
    if (!address.trim() || !value.trim()) return;

    const addressExists = circles.some(
      (circle) => circle.address === address.trim()
    );
    if (addressExists) {
      setShowDuplicateModal(true);
      return;
    }

    const newCircle = {
      id: Date.now(),
      address: address.trim(),
      value: value.trim(),
      x: window.innerWidth - 10,
      y: window.innerHeight - 55,
      velocityX: -8 - Math.random() * 5,
      velocityY: -5 - Math.random() * 3,
    };

    setCircles((prev) => [...prev, newCircle]);
    setAddress("");
    setValue("");
  };

  return (
    <div className={styles.app}>
      {selectedMode && (
        <video
          className={styles.videoBackground}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onError={(e) => console.error("Video error:", e)}
          onLoadedData={() => console.log("Video loaded successfully")}
        >
          <source src="./video/space.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      )}

      {showMenu && <GameMenu onStart={startGame} />}
      {!showMenu && !selectedMode && <ModeSelect onSelect={handleSelectMode} />}

      {!showMenu && selectedMode && (
        <button
          className={styles.instructionButton}
          onClick={toggleInstructionPopup}
        >
          i
        </button>
      )}

      {showInstructionPopup &&
        currentExercise &&
        currentExercise.expectedStructure && (
          <div className={styles.instructionPopup}>
            <div className={styles.instructionContent}>
              <h1>{currentExercise.title}</h1>
              <div className={styles.instructionList}>
                {currentExercise.expectedStructure.map((node, index) => (
                  <div key={index} className={styles.instructionItem}>
                    <span className={styles.instructionValue}>
                      Value: {node.value}
                    </span>
                    <span className={styles.instructionArrow}>→</span>
                    <span className={styles.instructionAddress}>
                      Address: {node.address}
                    </span>
                  </div>
                ))}
              </div>
              <button className={styles.startButton} onClick={startExercise}>
                Start
              </button>
            </div>
          </div>
        )}

      {!showMenu && (
        <>
          {selectedMode && (
            <>
              <PortalComponent
                onPortalStateChange={handlePortalStateChange}
                isOpen={isPortalOpen}
              />
              <div
                className={styles.rightSquare}
                style={{ outlineOffset: "5px" }}
              />
            </>
          )}
        </>
      )}

      {!showMenu && selectedMode && (
        <div className={styles.controls}>
          <input
            type="text"
            placeholder="ENTER ADDRESS"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={styles.inputField}
          />
          <input
            type="text"
            placeholder="ENTER VALUE"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={styles.inputField}
          />
          <div className={styles.buttonContainer}>
            {showInsertButton && (
              <button
                onClick={handleInsert}
                className={styles.insertButton}
                onMouseEnter={handleInsertHover}
                onMouseLeave={handleInsertLeave}
              >
                INSERT
              </button>
            )}
            <button
              onClick={launchCircle}
              className={styles.launchButton}
              onMouseEnter={handleLunchHoverStart}
              onMouseLeave={handleLunchHoverEnd}
            >
              LUNCH
            </button>
          </div>
          <button
            onClick={isPortalButtonEnabled ? togglePortal : undefined}
            className={`${styles.portalButton} ${
              !isPortalButtonEnabled ? styles.portalButtonDisabled : ""
            } ${isPortalOpen ? styles.portalButtonOpen : ""}`}
            disabled={!isPortalButtonEnabled}
          >
            {isPortalOpen ? "CLOSE PORTAL" : "OPEN PORTAL"}
          </button>
        </div>
      )}

      {!showMenu &&
        selectedMode &&
        circles.map((circle) => {
          const isHead = isHeadNode(circle.id);
          const isTail = isTailNode(circle.id);

          return (
            <div
              key={circle.id}
              className={`${styles.animatedCircle} ${
                suckingCircles.includes(circle.id) ? styles.beingSucked : ""
              }`}
              style={{
                left: `${circle.x - 30}px`,
                top: `${circle.y - 30}px`,
                cursor:
                  draggedCircle && circle.id === draggedCircle.id
                    ? "grabbing"
                    : "grab",
              }}
              onMouseDown={(e) => handleMouseDown(e, circle)}
              onDoubleClick={() => handleDoubleClick(circle)}
            >
              {(isHead || isTail) && (
                <span className={styles.nodeTypeLabel}>
                  {isHead ? "Head" : "Tail"}
                </span>
              )}
              <span className={styles.circleValue}>{circle.value}</span>
              <span className={styles.circleAddress}>{circle.address}</span>
            </div>
          );
        })}

      {!showMenu && selectedMode && (
        <svg className={styles.connectionLines}>
          {connections.map((connection) => {
            const fromCircle = circles.find((c) => c.id === connection.from);
            const toCircle = circles.find((c) => c.id === connection.to);

            if (!fromCircle && !toCircle) return null;

            const entranceX = 10 + portalInfo.canvasWidth / 2;
            const entranceY = window.innerHeight / 2;

            const fromX = fromCircle ? fromCircle.x : entranceX;
            const fromY = fromCircle ? fromCircle.y : entranceY;
            const toX = toCircle ? toCircle.x : entranceX;
            const toY = toCircle ? toCircle.y : entranceY;

            return (
              <g key={connection.id}>
                <line
                  x1={fromX}
                  y1={fromY}
                  x2={toX}
                  y2={toY}
                  className={styles.animatedLine}
                  markerEnd="url(#arrowhead)"
                />
              </g>
            );
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
      )}

      {showValidationResult && validationResult && (
        <div className={styles.validationOverlay}>
          <div className={styles.validationContent}>
            <div className={styles.validationHeader}>
              <div className={styles.scoreSection}>
                <span className={styles.scoreLabel}>
                  Score: {validationResult.score}/100
                </span>
              </div>
            </div>

            <div className={styles.expectedResultsSection}>
              <div className={styles.expectedLabel}>
                Expected <br /> Results
              </div>

              {currentExercise &&
                currentExercise.expectedStructure &&
                originalSubmission &&
                originalSubmission.circles && (
                  <table className={styles.validationTable}>
                    <tbody>
                      <tr className={styles.expectedRow}>
                        {currentExercise.expectedStructure.map(
                          (expectedNode, index) => (
                            <React.Fragment
                              key={`expected-${expectedNode.value}`}
                            >
                              <td className={styles.expectedCell}>
                                <div className={styles.expectedValue}>
                                  {expectedNode.value}
                                </div>
                                <div className={styles.expectedAddress}>
                                  {expectedNode.address}
                                </div>
                              </td>
                              {index <
                                currentExercise.expectedStructure.length -
                                  1 && (
                                <td className={styles.arrowCellEmpty}></td>
                              )}
                            </React.Fragment>
                          )
                        )}
                      </tr>

                      <tr className={styles.userRow}>
                        {(() => {
                          const userCircles = originalSubmission.circles;
                          const userConnections =
                            originalSubmission.connections;

                          const userChain = [];
                          const visited = new Set();

                          let headCircle = userCircles.find((circle) => {
                            const hasOutgoing = userConnections.some(
                              (conn) => conn.from === circle.id
                            );
                            const hasIncoming = userConnections.some(
                              (conn) => conn.to === circle.id
                            );
                            return hasOutgoing && !hasIncoming;
                          });

                          if (headCircle) {
                            let currentId = headCircle.id;
                            while (currentId && !visited.has(currentId)) {
                              visited.add(currentId);
                              const currentCircle = userCircles.find(
                                (c) => c.id === currentId
                              );
                              if (currentCircle) {
                                userChain.push(currentCircle);
                              }
                              const nextConnection = userConnections.find(
                                (conn) => conn.from === currentId
                              );
                              currentId = nextConnection
                                ? nextConnection.to
                                : null;
                            }
                          }

                          userCircles.forEach((circle) => {
                            if (!visited.has(circle.id)) {
                              userChain.push(circle);
                            }
                          });

                          return currentExercise.expectedStructure.map(
                            (expectedNode, index) => {
                              const userNode = userChain.find(
                                (circle) =>
                                  parseInt(circle.value) === expectedNode.value
                              );

                              return (
                                <React.Fragment
                                  key={`user-${expectedNode.value}`}
                                >
                                  <td className={styles.userCell}>
                                    {userNode ? (
                                      <div
                                        className={`${styles.userNode} ${
                                          validationResult.isCorrect
                                            ? styles.userNodeCorrect
                                            : styles.userNodeIncorrect
                                        }`}
                                      >
                                        <div className={styles.userNodeValue}>
                                          {userNode.value}
                                        </div>
                                        <div className={styles.userNodeAddress}>
                                          {userNode.address}
                                        </div>
                                      </div>
                                    ) : (
                                      <div
                                        className={`${styles.userNode} ${styles.userNodeMissing}`}
                                      >
                                        <div className={styles.userNodeValue}>
                                          ?
                                        </div>
                                        <div className={styles.userNodeAddress}>
                                          ?
                                        </div>
                                      </div>
                                    )}
                                  </td>
                                  {index <
                                    currentExercise.expectedStructure.length -
                                      1 && (
                                    <td className={styles.arrowCell}>→</td>
                                  )}
                                </React.Fragment>
                              );
                            }
                          );
                        })()}
                      </tr>
                    </tbody>
                  </table>
                )}
            </div>

            <div className={styles.validationButtons}>
              <button
                onClick={() => setShowValidationResult(false)}
                className={styles.continueButton}
              >
                CONTINUE
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedCircle && (
        <div className={styles.popupOverlay} onClick={closePopup}>
          <div
            className={styles.popupContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button className={styles.popupCloseBtn} onClick={closePopup}>
              ×
            </button>

            <div className={styles.popupCircle}>
              <span className={styles.popupCircleValue}>
                {selectedCircle.value}
              </span>
              <span className={styles.popupCircleAddress}>
                {selectedCircle.address}
              </span>
            </div>
            <div className={styles.popupFormContainer}>
              <div className={styles.popupText}>Connect to?</div>
              <input
                type="text"
                placeholder="Enter Address"
                value={connectToAddress}
                onChange={(e) => setConnectToAddress(e.target.value)}
                className={styles.popupInput}
                autoFocus
              />
              <div className={styles.popupButtons}>
                <button
                  onClick={handleConnect}
                  className={`${styles.popupButton} ${styles.connectBtn}`}
                >
                  CONNECT
                </button>
                <button
                  onClick={handleDeleteCircle}
                  className={`${styles.popupButton} ${styles.deleteBtn}`}
                >
                  DELETE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDuplicateModal && (
        <div className={styles.errorModalOverlay} onClick={closeDuplicateModal}>
          <div
            className={styles.errorModalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={styles.errorModalCloseBtn}
              onClick={closeDuplicateModal}
            >
              ×
            </button>
            <div className={styles.errorIcon}>
              <span className={styles.exclamation}>!</span>
            </div>
            <div className={styles.errorTitle}>Duplicate Address</div>
            <div className={styles.errorMessageText}>
              Nodes cannot have the same address
            </div>
          </div>
        </div>
      )}

      {showInsertModal && (
        <div className={styles.insertModalOverlay} onClick={closeInsertModal}>
          <div
            className={styles.insertModalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={styles.insertModalCloseBtn}
              onClick={closeInsertModal}
            >
              ×
            </button>

            <div className={styles.insertOptions}>
              <button
                className={`${styles.insertOptionBtn} head-btn`}
                onClick={() => handleInsertOption("head")}
              >
                <div className={styles.optionTitle}>HEAD</div>
                <div className={styles.optionSubtitle}>i = 0 (Head)</div>
              </button>

              <button
                className={`${styles.insertOptionBtn} specific-btn`}
                onClick={() => handleInsertOption("specific")}
              >
                <div className={styles.optionTitle}>SPECIFIC</div>
                <div className={styles.optionSubtitle}>
                  specify both i in [1, N-1]
                </div>
              </button>

              <button
                className={`${styles.insertOptionBtn} tail-btn`}
                onClick={() => handleInsertOption("tail")}
              >
                <div className={styles.optionTitle}>TAIL</div>
                <div className={styles.optionSubtitle}>i = N (After Tail)</div>
              </button>
            </div>
          </div>
        </div>
      )}

      {showIndexModal && (
        <div className={styles.indexModalOverlay} onClick={closeIndexModal}>
          <div
            className={styles.indexModalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={styles.indexModalCloseBtn}
              onClick={closeIndexModal}
            >
              ×
            </button>
            <div className={styles.indexModalTitle}>Index</div>
            <div className={styles.indexInputContainer}>
              <input
                type="text"
                placeholder="Enter Index"
                value={insertIndex}
                onChange={(e) => setInsertIndex(e.target.value)}
                className={styles.indexInput}
                autoFocus
              />
              <button onClick={handleIndexSubmit} className={styles.indexGoBtn}>
                Go
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GalistGame;
