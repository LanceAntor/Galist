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
   * @param {Array} circles - Array of circle objects
   * @param {Array} connections - Array of connection objects
   * @param {Array} suckingCircles - Array of circle IDs being sucked
   * @returns {Array} Updated circles with new positions and velocities
   */
  updatePhysics(circles, connections, suckingCircles) {
    return circles.map(circle => {
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

      const leftSquareCollision = this.checkLeftSquareCollision(newX, newY, circle, newVelocityX, newVelocityY);
      newX = leftSquareCollision.x;
      newY = leftSquareCollision.y;
      newVelocityX = leftSquareCollision.velocityX;
      newVelocityY = leftSquareCollision.velocityY;

      const controlsCollision = this.checkControlsCollision(newX, newY, circle, newVelocityX, newVelocityY);
      newX = controlsCollision.x;
      newY = controlsCollision.y;
      newVelocityX = controlsCollision.velocityX;
      newVelocityY = controlsCollision.velocityY;

      // Circle-to-circle collisions
      const circleCollision = this.checkCircleCollisions(newX, newY, newVelocityX, newVelocityY, circle, circles, suckingCircles);
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
   */
  checkLeftSquareCollision(x, y, circle, velocityX, velocityY) {
    const leftSquareLeft = 0
    const leftSquareRight = 130
    const leftSquareTop = (window.innerHeight / 2) - 50
    const leftSquareBottom = (window.innerHeight / 2) + 50
    const entranceTop = leftSquareTop + 10
    const entranceBottom = leftSquareBottom - 10

    let newX = x
    let newY = y
    let newVelocityX = velocityX
    let newVelocityY = velocityY

    // Check if circle is colliding with left square
    if (newX - this.circleRadius <= leftSquareRight && 
        newX + this.circleRadius >= leftSquareLeft && 
        newY - this.circleRadius <= leftSquareBottom && 
        newY + this.circleRadius >= leftSquareTop) {
      
      // Check if circle is at the entrance (right side, middle area)
      const isAtEntrance = newX - this.circleRadius <= leftSquareRight && 
                          newX - this.circleRadius >= leftSquareRight - 20 && 
                          newY >= entranceTop && 
                          newY <= entranceBottom

      if (!isAtEntrance) {
        // Bounce off walls if not at entrance
        if (newX - this.circleRadius <= leftSquareRight && circle.x - this.circleRadius > leftSquareRight) {
          // Hit right wall
          newVelocityX = Math.abs(newVelocityX) * this.wallBounceEnergyLoss
          newX = leftSquareRight + this.circleRadius
        }
        if (newY - this.circleRadius <= leftSquareBottom && newY + this.circleRadius >= leftSquareTop) {
          // Hit top or bottom wall
          if (newY < leftSquareTop + 50) {
            // Hit top wall
            newVelocityY = -Math.abs(newVelocityY) * this.wallBounceEnergyLoss
            newY = leftSquareTop - this.circleRadius
          } else {
            // Hit bottom wall
            newVelocityY = Math.abs(newVelocityY) * this.wallBounceEnergyLoss
            newY = leftSquareBottom + this.circleRadius
          }
        }
      }
    }

    return { x: newX, y: newY, velocityX: newVelocityX, velocityY: newVelocityY }
  }

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
          
          // Calculate elastic collision response
          const relativeVelocityX = newVelocityX - (otherCircle.velocityX || 0);
          const relativeVelocityY = newVelocityY - (otherCircle.velocityY || 0);
          const velocityAlongCollision = (relativeVelocityX * dx + relativeVelocityY * dy) / distance;
          
          if (velocityAlongCollision > 0) return; // Objects are separating
          
          const collisionForce = velocityAlongCollision * this.restitution;
          
          newVelocityX -= collisionForce * (dx / distance);
          newVelocityY -= collisionForce * (dy / distance);
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
