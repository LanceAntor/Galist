/**
 * Collision Detection System
 * Handles all collision detection and physics calculations for circles
 */

export class CollisionDetection {
  constructor() {
    this.circleRadius = 30;
    this.restitution = 0.8; // Energy retention on collision
    this.airResistance = 0.998;
    this.wallBounceEnergyLoss = 0.8;
  }

  /**
   * Main collision detection and physics update function
   * @param {Object|Array} circles - Single circle object or array of circle objects
   * @param {Array} suckingCircles - Array of circle IDs being sucked
   * @returns {Object|Array} Updated circle(s) with new positions and velocities
   */
  updatePhysics(circles, suckingCircles = []) {
    const isArray = Array.isArray(circles)
    const circleArray = isArray ? circles : [circles]
    
    const updatedCircles = circleArray.map(circle => {
      if (suckingCircles.includes(circle.id)) {
        return circle; // Skip physics for sucking circles
      }

      let newVelocityX = circle.velocityX || 0;
      let newVelocityY = circle.velocityY || 0;
      let newX = circle.x + newVelocityX;
      let newY = circle.y + newVelocityY;

      // Apply collision detections
      const rightSquareCollision = this.checkRightSquareCollision(newX, newY, circle, newVelocityX, newVelocityY);
      newX = rightSquareCollision.x;
      newY = rightSquareCollision.y;
      newVelocityX = rightSquareCollision.velocityX;
      newVelocityY = rightSquareCollision.velocityY;

      const controlsCollision = this.checkControlsCollision(newX, newY, circle, newVelocityX, newVelocityY);
      newX = controlsCollision.x;
      newY = controlsCollision.y;
      newVelocityX = controlsCollision.velocityX;
      newVelocityY = controlsCollision.velocityY;

      // Circle-to-circle collisions
      const circleCollision = this.checkCircleCollisions(newX, newY, newVelocityX, newVelocityY, circle, circleArray, suckingCircles);
      newX = circleCollision.x;
      newY = circleCollision.y;
      newVelocityX = circleCollision.velocityX;
      newVelocityY = circleCollision.velocityY;

      // Apply air resistance
      newVelocityX *= this.airResistance;
      newVelocityY *= this.airResistance;

      // Wall bouncing
      const wallCollision = this.checkWallCollisions(newX, newY, newVelocityX, newVelocityY);
      newX = wallCollision.x;
      newY = wallCollision.y;
      newVelocityX = wallCollision.velocityX;
      newVelocityY = wallCollision.velocityY;

      // Stop very slow movement
      if (Math.abs(newVelocityX) < 0.1) newVelocityX = 0;
      if (Math.abs(newVelocityY) < 0.1) newVelocityY = 0;

      return {
        ...circle,
        x: newX,
        y: newY,
        velocityX: newVelocityX,
        velocityY: newVelocityY
      };
    });
    
    // Return single object if input was single object, array if input was array
    return isArray ? updatedCircles : updatedCircles[0];
  }

  /**
   * Check collision with right square
   */
  checkRightSquareCollision(x, y, circle, velocityX, velocityY) {
    const rightSquareLeft = window.innerWidth + 15 - 95;
    const rightSquareRight = rightSquareLeft + 100;
    const rightSquareTop = window.innerHeight - 55;
    const rightSquareBottom = rightSquareTop + 90;

    let newX = x;
    let newY = y;
    let newVelocityX = velocityX;
    let newVelocityY = velocityY;

    if (newX + this.circleRadius >= rightSquareLeft && 
        newX - this.circleRadius <= rightSquareRight && 
        newY - this.circleRadius <= rightSquareBottom && 
        newY + this.circleRadius >= rightSquareTop) {
      
      if (newX + this.circleRadius >= rightSquareLeft && circle.x + this.circleRadius < rightSquareLeft) {
        newVelocityX = -Math.abs(newVelocityX) * this.wallBounceEnergyLoss;
        newX = rightSquareLeft - this.circleRadius;
      }
      if (newX - this.circleRadius <= rightSquareRight && circle.x - this.circleRadius > rightSquareRight) {
        newVelocityX = Math.abs(newVelocityX) * this.wallBounceEnergyLoss;
        newX = rightSquareRight + this.circleRadius;
      }
      if (newY + this.circleRadius >= rightSquareTop && circle.y + this.circleRadius < rightSquareTop) {
        newVelocityY = -Math.abs(newVelocityY) * this.wallBounceEnergyLoss;
        newY = rightSquareTop - this.circleRadius;
      }
      if (newY - this.circleRadius <= rightSquareBottom && circle.y - this.circleRadius > rightSquareBottom) {
        newVelocityY = Math.abs(newVelocityY) * this.wallBounceEnergyLoss;
        newY = rightSquareBottom + this.circleRadius;
      }
    }

    return { x: newX, y: newY, velocityX: newVelocityX, velocityY: newVelocityY };
  }

  /**
   * Check collision with left square (suction box)
   * @param {number} x - Circle x position
   * @param {number} y - Circle y position
   * @param {Object} circle - Circle object
   * @param {number} velocityX - Circle x velocity
   * @param {number} velocityY - Circle y velocity
   * @param {Object} portalInfo - Portal state information (isVisible, canvasWidth)
   */

  /**
   * Check collision with controls area
   */
  checkControlsCollision(x, y, circle, velocityX, velocityY) {
    const controlsHeight = 60;
    const controlsWidth = 1060;
    const controlsLeft = window.innerWidth * 0.39 - controlsWidth / 2;
    const controlsRight = controlsLeft + controlsWidth;
    const controlsTop = window.innerHeight - 10 - controlsHeight;
    const controlsBottom = window.innerHeight - 10;

    let newX = x;
    let newY = y;
    let newVelocityX = velocityX;
    let newVelocityY = velocityY;

    if (newX + this.circleRadius >= controlsLeft && 
        newX - this.circleRadius <= controlsRight && 
        newY + this.circleRadius >= controlsTop && 
        newY - this.circleRadius <= controlsBottom) {
      
      const distanceToLeft = Math.abs((newX + this.circleRadius) - controlsLeft);
      const distanceToRight = Math.abs((newX - this.circleRadius) - controlsRight);
      const distanceToTop = Math.abs((newY + this.circleRadius) - controlsTop);
      const distanceToBottom = Math.abs((newY - this.circleRadius) - controlsBottom);
      
      const minDistance = Math.min(distanceToLeft, distanceToRight, distanceToTop, distanceToBottom);
      
      if (minDistance === distanceToLeft && newVelocityX > 0) {
        newVelocityX = -Math.abs(newVelocityX) * this.wallBounceEnergyLoss;
        newX = controlsLeft - this.circleRadius;
      } else if (minDistance === distanceToRight && newVelocityX < 0) {
        newVelocityX = Math.abs(newVelocityX) * this.wallBounceEnergyLoss;
        newX = controlsRight + this.circleRadius;
      } else if (minDistance === distanceToTop && newVelocityY > 0) {
        newVelocityY = -Math.abs(newVelocityY) * this.wallBounceEnergyLoss;
        newY = controlsTop - this.circleRadius;
      } else if (minDistance === distanceToBottom && newVelocityY < 0) {
        newVelocityY = Math.abs(newVelocityY) * this.wallBounceEnergyLoss;
        newY = controlsBottom + this.circleRadius;
      }
    }

    return { x: newX, y: newY, velocityX: newVelocityX, velocityY: newVelocityY };
  }

  /**
   * Check collisions between circles
   */
  checkCircleCollisions(x, y, velocityX, velocityY, currentCircle, allCircles, suckingCircles) {
    let newX = x;
    let newY = y;
    let newVelocityX = velocityX;
    let newVelocityY = velocityY;

    allCircles.forEach(otherCircle => {
      if (otherCircle.id !== currentCircle.id && !suckingCircles.includes(otherCircle.id)) {
        const dx = newX - otherCircle.x;
        const dy = newY - otherCircle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = this.circleRadius * 2;
        
        if (distance < minDistance && distance > 0) {
          // Separate overlapping circles
          const overlap = minDistance - distance;
          const separationX = (dx / distance) * (overlap / 2);
          const separationY = (dy / distance) * (overlap / 2);
          
          newX += separationX;
          newY += separationY;
          
          // Calculate masses (assuming equal mass for simplicity)
          const mass1 = 1;
          const mass2 = 1;
          
          // Get velocities
          const v1x = newVelocityX;
          const v1y = newVelocityY;
          const v2x = otherCircle.velocityX || 0;
          const v2y = otherCircle.velocityY || 0;
          
          // Calculate relative velocity
          const relativeVelocityX = v1x - v2x;
          const relativeVelocityY = v1y - v2y;
          const velocityAlongCollision = (relativeVelocityX * dx + relativeVelocityY * dy) / distance;
          
          // Only resolve collision if objects are approaching
          if (velocityAlongCollision > 0) return;
          
          // Calculate collision impulse
          const impulse = (2 * velocityAlongCollision) / (mass1 + mass2) * this.restitution;
          
          // Update current circle's velocity
          newVelocityX -= impulse * mass2 * (dx / distance);
          newVelocityY -= impulse * mass2 * (dy / distance);
          
          // Update other circle's velocity (this is important for proper bouncing)
          // Note: This modifies the other circle directly, which is okay since we're processing all circles
          if (otherCircle.velocityX !== undefined && otherCircle.velocityY !== undefined) {
            otherCircle.velocityX += impulse * mass1 * (dx / distance);
            otherCircle.velocityY += impulse * mass1 * (dy / distance);
          } else {
            otherCircle.velocityX = impulse * mass1 * (dx / distance);
            otherCircle.velocityY = impulse * mass1 * (dy / distance);
          }
        }
      }
    });

    return { x: newX, y: newY, velocityX: newVelocityX, velocityY: newVelocityY };
  }

  /**
   * Check collision with screen boundaries
   */
  checkWallCollisions(x, y, velocityX, velocityY) {
    let newX = x;
    let newY = y;
    let newVelocityX = velocityX;
    let newVelocityY = velocityY;

    // Left and right walls
    if (newX <= this.circleRadius || newX >= window.innerWidth - this.circleRadius) {
      newVelocityX = -newVelocityX * this.wallBounceEnergyLoss;
      newX = newX <= this.circleRadius ? this.circleRadius : window.innerWidth - this.circleRadius;
    }
    
    // Top and bottom walls
    if (newY <= this.circleRadius || newY >= window.innerHeight - this.circleRadius) {
      newVelocityY = -newVelocityY * this.wallBounceEnergyLoss;
      newY = newY <= this.circleRadius ? this.circleRadius : window.innerHeight - this.circleRadius;
    }

    return { x: newX, y: newY, velocityX: newVelocityX, velocityY: newVelocityY };
  }
}

// Export singleton instance
export const collisionDetection = new CollisionDetection();
