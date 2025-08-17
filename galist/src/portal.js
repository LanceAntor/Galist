export class Portal {
  constructor() {
    // Sprite sheet analysis: 8 columns, 3 rows (512x192 total)
    this.totalColumns = 8;
    this.totalRows = 3;
    this.width = 512 / this.totalColumns;  // 64px per frame width
    this.height = 192 / this.totalRows;   // 64px per frame height
    this.frameX = 0;
    this.frameY = 0;
    this.fps = 8; // 8 frames per second for smooth animation
    this.frameInterval = 1000 / this.fps;
    this.frameTimer = 0;
    this.isAnimating = false; // Start hidden, not animating
    
    // Portal states - Start hidden
    this.state = 'hidden'; // 'hidden', 'closed_loop', 'opening', 'closing'
    this.maxFrameInRow = this.totalColumns - 1; // 7 (0-7)
  }

  update(deltaTime) {
    if (!this.isAnimating) return;

    this.frameTimer += deltaTime;
    
    if (this.frameTimer >= this.frameInterval) {
      this.frameTimer = 0;
      this.nextFrame();
    }
  }

  nextFrame() {
    if (this.state === 'closed_loop') {
      // Loop through row 1 (first row)
      this.frameY = 0;
      if (this.frameX < this.maxFrameInRow) {
        this.frameX++;
      } else {
        this.frameX = 0;
      }
    } else if (this.state === 'opening') {
      // Go through row 2 once, then switch to closed_loop
      this.frameY = 1;
      if (this.frameX < this.maxFrameInRow) {
        this.frameX++;
      } else {
        this.frameX = 0;
        this.state = 'closed_loop';
        this.frameY = 0;
      }
    } else if (this.state === 'closing') {
      // Go through row 3 once, then become hidden
      this.frameY = 2;
      if (this.frameX < this.maxFrameInRow) {
        this.frameX++;
      } else {
        this.frameX = 0;
        this.state = 'hidden';
        this.isAnimating = false; // Stop animating when hidden
      }
    }
  }

  startAnimation() {
    this.isAnimating = true;
    this.frameTimer = 0;
  }

  stopAnimation() {
    this.isAnimating = false;
  }

  openPortal() {
    if (this.state === 'hidden') {
      this.state = 'opening';
      this.frameX = 0;
      this.frameY = 1; // Row 2 for opening
      this.startAnimation();
    }
  }

  closePortal() {
    if (this.state === 'closed_loop') {
      this.state = 'closing';
      this.frameX = 0;
      this.frameY = 2; // Row 3 for closing
      this.startAnimation();
    }
  }

  isVisible() {
    return this.state !== 'hidden'; // Portal is visible unless hidden
  }

  getFramePosition() {
    const result = {
      x: this.frameX * this.width,
      y: this.frameY * this.height
    };
    return result;
  }
}