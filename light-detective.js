/**
 * Light Detective - A physics-based puzzle game about reflections
 * 
 * This game randomly places a ball and mirrors, with an eye fixed at the center bottom
 * of the canvas to observe the reflections.
 */

// Game constants
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;
const BALL_RADIUS = 25;
const MIRROR_COUNT = 1;
const MIRROR_LENGTH = BALL_RADIUS * 10; // Fixed mirror length (5 times ball diameter)
const MIRROR_THICKNESS = 4;
const REFLECTIVE_THICKNESS = 6; // Thicker for the reflective side
const NON_REFLECTIVE_THICKNESS = 3; // Thinner for the non-reflective side
const MIRROR_WIDTH = 4; // Width of the mirror object (distance between blue and black sides)
const EYE_SIZE = 40;
const MAX_REFLECTIONS = 10; // Maximum number of reflections to prevent infinite loops
const MIN_REFLECTION_SIZE_RATIO = 0.05; // Minimum size ratio to original ball (10%)

// Game objects
let ball; 
let mirrors = [];
let eye;
let eyePosition = {x: 0, y: 0}; // Will be set in setup
let reflections = []; // Array to store calculated reflections
let showRayPaths = false; // Flag to toggle ray path visualization - default to off
let currentRayIndex = -1; // Index of the current ray being displayed (-1 means no rays shown)

// Dragging state
let isDragging = false;
let draggedObject = null;
let draggedMirrorPoint = null; // Which endpoint of a mirror is being dragged
let draggedMirrorIndex = null; // Index of the mirror being dragged for middle dragging

// Puzzle variables
let currentPuzzle = null;
let currentPuzzleFilename = null; // Store the filename for easier reference
let isPuzzleMode = false;
let puzzleStartTime = null;
let isPuzzleSolved = false;
let isPuzzleFailed = false;
let timeLimitInterval = null; // For tracking the timer interval

// This function runs when the page loads
window.onload = function() {
  console.log("Window loaded, starting initialization");
  
  // Initialize reset button immediately
  const resetBtn = document.getElementById('resetGame');
  if (resetBtn) {
    console.log("Reset button found, setting up click handler");
    resetBtn.onclick = function() {
      console.log("Reset button clicked");
      
      // Create a ball at a random position
      ball = {
        x: random(BALL_RADIUS, width - BALL_RADIUS),
        y: random(BALL_RADIUS, height * 0.7),  // Keep ball in upper 70% of screen
        radius: BALL_RADIUS
      };
      console.log("New ball created at:", ball.x, ball.y);
      
      // Create random mirrors with fixed length
      mirrors = [];
      for (let i = 0; i < MIRROR_COUNT; i++) {
        // Random position for first endpoint, with safety margin from edges
        const safetyMargin = MIRROR_LENGTH / 2;
        const x1 = random(safetyMargin, width - safetyMargin);
        const y1 = random(safetyMargin, height * 0.8 - safetyMargin); // Keep mirrors in upper 80% of screen
        
        // Random angle
        const angle = random(TWO_PI);
        
        // Calculate second endpoint with fixed length
        let x2 = x1 + cos(angle) * MIRROR_LENGTH;
        let y2 = y1 + sin(angle) * MIRROR_LENGTH;
        
        // Ensure endpoints are within canvas bounds
        x2 = constrain(x2, 0, width);
        y2 = constrain(y2, 0, height * 0.8);
        
        // Calculate the mirror's normal vector
        const mirrorVector = { 
          x: x2 - x1, 
          y: y2 - y1 
        };
        const mirrorLength = Math.sqrt(mirrorVector.x * mirrorVector.x + mirrorVector.y * mirrorVector.y);
        
        // Get normalized normal vector
        const normal = {
          x: -mirrorVector.y / mirrorLength,
          y: mirrorVector.x / mirrorLength
        };
        
        // Calculate the sides of the mirror
        const halfWidth = MIRROR_WIDTH / 2;
        
        // Blue side coordinates
        const blueX1 = x1 + normal.x * halfWidth;
        const blueY1 = y1 + normal.y * halfWidth;
        const blueX2 = x2 + normal.x * halfWidth;
        const blueY2 = y2 + normal.y * halfWidth;
        
        // Black side coordinates
        const blackX1 = x1 - normal.x * halfWidth;
        const blackY1 = y1 - normal.y * halfWidth;
        const blackX2 = x2 - normal.x * halfWidth;
        const blackY2 = y2 - normal.y * halfWidth;
        
        // Add mirror
        mirrors.push({
          x1, y1, x2, y2,
          blueX1, blueY1, blueX2, blueY2,
          blackX1, blackY1, blackX2, blackY2,
          thickness: MIRROR_THICKNESS,
          normal: normal,
          width: MIRROR_WIDTH
        });
      }
      console.log("Created", mirrors.length, "mirrors");
      
      // Clear reflections
      reflections = [];
      
      // Reset ray visibility
      showRayPaths = false;
      currentRayIndex = -1;
      
      // Recalculate reflections
      calculateReflections();
      console.log("Reset complete with", reflections.length, "reflections");
    };
    console.log("Reset button handler setup complete");
  } else {
    console.error("Reset button not found in the DOM!");
  }
  
  // Get the cycle button and add a click event handler
  const cycleBtn = document.getElementById('cycleRay');
  if (cycleBtn) {
    cycleBtn.onclick = function() {
      // If rays are currently hidden, show the first ray
      if (currentRayIndex === -1) {
        currentRayIndex = 0;
        showRayPaths = true;
      } else {
        // Cycle to the next ray, wrapping around if at the end
        currentRayIndex = (currentRayIndex + 1) % reflections.length;
        // Ensure rays stay visible
        showRayPaths = true;
      }
    };
  }
  
  // Get the hide rays button and add a click event handler
  const hideRayBtn = document.getElementById('hideRay');
  if (hideRayBtn) {
    hideRayBtn.onclick = function() {
      // Hide all rays
      showRayPaths = false;
      currentRayIndex = -1;
    };
  }
  
  // Get the add mirror button and add a click event handler
  const addMirrorBtn = document.getElementById('addMirror');
  if (addMirrorBtn) {
    addMirrorBtn.onclick = function() {
      addNewMirror(); // Add a new mirror
    };
  }
  
  // Set up export button
  const exportBtn = document.getElementById('exportArrangement');
  if (exportBtn) {
    exportBtn.onclick = function() {
      exportArrangement(); // Export the current arrangement to JSON
    };
  }
  
  console.log("Window onload completed, all buttons initialized");
};

// Function to export the current arrangement to a JSON file
function exportArrangement() {
  // Create a JSON object with the current state
  const arrangement = {
    ball: {
      x: ball.x,
      y: ball.y,
      radius: ball.radius
    },
    eye: {
      x: eyePosition.x,
      y: eyePosition.y
    },
    mirrors: mirrors.map(mirror => ({
      x1: mirror.x1,
      y1: mirror.y1,
      x2: mirror.x2,
      y2: mirror.y2,
      normal: mirror.normal,
      width: mirror.width
    }))
  };
  
  // Convert to JSON string
  const jsonString = JSON.stringify(arrangement, null, 2);
  
  // Create a timestamp for the filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `arrangement-${timestamp}.json`;
  
  // Create a blob with the JSON data
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  // Create a temporary anchor element to trigger the download
  const a = document.createElement('a');
  a.href = url;
  
  // Set download path to include arrangements folder
  a.download = filename;
  
  // Append to the body, click, and clean up
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  // Clean up the URL object
  URL.revokeObjectURL(url);
  
  console.log(`Exported arrangement to ${filename}`);
}

// Function to import an arrangement from a JSON file
function importArrangement(arrangement) {
  try {
    // No need to parse the JSON again, the data is already an object
    
    // Import ball data
    ball = {
      x: arrangement.ball.x,
      y: arrangement.ball.y,
      radius: arrangement.ball.radius || BALL_RADIUS
    };
    
    // Import eye position
    eyePosition = {
      x: arrangement.eye.x,
      y: arrangement.eye.y
    };
    
    // Import mirrors
    mirrors = [];
    for (let mirrorData of arrangement.mirrors) {
      // Extract basic mirror data
      const { x1, y1, x2, y2, normal, width } = mirrorData;
      const mirrorWidth = width || MIRROR_WIDTH;
      
      // Calculate the sides of the mirror
      const halfWidth = mirrorWidth / 2;
      
      // Blue side coordinates
      const blueX1 = x1 + normal.x * halfWidth;
      const blueY1 = y1 + normal.y * halfWidth;
      const blueX2 = x2 + normal.x * halfWidth;
      const blueY2 = y2 + normal.y * halfWidth;
      
      // Black side coordinates
      const blackX1 = x1 - normal.x * halfWidth;
      const blackY1 = y1 - normal.y * halfWidth;
      const blackX2 = x2 - normal.x * halfWidth;
      const blackY2 = y2 - normal.y * halfWidth;
      
      // Add mirror
      mirrors.push({
        x1, y1, x2, y2,
        blueX1, blueY1, blueX2, blueY2,
        blackX1, blackY1, blackX2, blackY2,
        thickness: MIRROR_THICKNESS,
        normal: normal,
        width: mirrorWidth
      });
    }
    
    // Reset reflections and calculate new ones
    reflections = [];
    showRayPaths = false;
    currentRayIndex = -1;
    calculateReflections();
    
    console.log("Imported arrangement with", mirrors.length, "mirrors");
    return true;
  } catch (error) {
    console.error("Error importing arrangement:", error);
    return false;
  }
}

function setup() {
  // Create a fixed-size canvas
  createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  
  // Load the eye image
  eye = loadImage('eye.svg');
  
  // Set eye position
  eyePosition = {
    x: width / 2,
    y: height - 30
  };
  
  // Initialize game objects with random positions
  initializeGame();
  
  // Initial calculation of reflections
  calculateReflections();
}

function draw() {
  // Clear the canvas
  background(240);
  
  // Draw all mirrors
  drawMirrors();
  
  // Draw ray paths if enabled
  if (showRayPaths) {
    drawRayPaths();
  }
  
  // Draw all reflections (green balls)
  drawReflections();
  
  // Draw the ball
  drawBall();
  
  // Draw the eye at the center bottom
  drawEye();
  
  // Check puzzle conditions if in puzzle mode
  if (isPuzzleMode && currentPuzzle && !isPuzzleSolved && !isPuzzleFailed) {
    checkPuzzleConditions();
  }
}

function initializeGame() {
  console.log("Initializing game with random positions");
  
  // Create a ball at a random position
  ball = {
    x: random(BALL_RADIUS, width - BALL_RADIUS),
    y: random(BALL_RADIUS, height * 0.7),  // Keep ball in upper 70% of screen
    radius: BALL_RADIUS
  };
  console.log("Ball created at:", ball.x, ball.y);
  
  // Create random mirrors with fixed length
  mirrors = [];
  for (let i = 0; i < MIRROR_COUNT; i++) {
    // Random position for first endpoint, with safety margin from edges
    const safetyMargin = MIRROR_LENGTH / 2;
    const x1 = random(safetyMargin, width - safetyMargin);
    const y1 = random(safetyMargin, height * 0.8 - safetyMargin); // Keep mirrors in upper 80% of screen
    
    // Random angle
    const angle = random(TWO_PI);
    
    // Calculate second endpoint with fixed length
    let x2 = x1 + cos(angle) * MIRROR_LENGTH;
    let y2 = y1 + sin(angle) * MIRROR_LENGTH;
    
    // If second endpoint is outside canvas, adjust angle until it fits
    let attempts = 0;
    while ((x2 < 0 || x2 > width || y2 < 0 || y2 > height * 0.8) && attempts < 20) {
      // Try a different angle
      const newAngle = random(TWO_PI);
      x2 = x1 + cos(newAngle) * MIRROR_LENGTH;
      y2 = y1 + sin(newAngle) * MIRROR_LENGTH;
      attempts++;
    }
    
    // If we still couldn't fit it after attempts, place it in the center with horizontal orientation
    if (x2 < 0 || x2 > width || y2 < 0 || y2 > height * 0.8) {
      const centerX = width / 2;
      const centerY = height / 2;
      x1 = centerX - MIRROR_LENGTH / 2;
      y1 = centerY;
      x2 = centerX + MIRROR_LENGTH / 2;
      y2 = centerY;
    }
    
    // Calculate the mirror's normal vector (perpendicular to mirror, pointing to reflective side)
    const mirrorVector = { 
      x: x2 - x1, 
      y: y2 - y1 
    };
    const mirrorLength = Math.sqrt(mirrorVector.x * mirrorVector.x + mirrorVector.y * mirrorVector.y);
    
    // Get normalized normal vector (perpendicular to mirror)
    const normal = {
      x: -mirrorVector.y / mirrorLength,
      y: mirrorVector.x / mirrorLength
    };
    
    // Calculate the actual positions of both sides of the mirror
    // Center line is between the blue and black sides
    const halfWidth = MIRROR_WIDTH / 2;
    
    // Blue side coordinates
    const blueX1 = x1 + normal.x * halfWidth;
    const blueY1 = y1 + normal.y * halfWidth;
    const blueX2 = x2 + normal.x * halfWidth;
    const blueY2 = y2 + normal.y * halfWidth;
    
    // Black side coordinates
    const blackX1 = x1 - normal.x * halfWidth;
    const blackY1 = y1 - normal.y * halfWidth;
    const blackX2 = x2 - normal.x * halfWidth;
    const blackY2 = y2 - normal.y * halfWidth;
    
    // Add mirror with both sides' coordinates
    mirrors.push({
      // Center line (for calculation purposes)
      x1, y1, x2, y2,
      // Blue reflective side
      blueX1, blueY1, blueX2, blueY2,
      // Black non-reflective side
      blackX1, blackY1, blackX2, blackY2,
      // Properties
      thickness: MIRROR_THICKNESS,
      normal: normal, // Normal vector points from black to blue side
      width: MIRROR_WIDTH
    });
    console.log("Mirror created at:", x1, y1, "to", x2, y2);
  }
  
  // Clear reflections
  reflections = [];
  console.log("Game initialization complete");
}

function drawMirrors() {
  for (let mirror of mirrors) {
    // Draw black non-reflective side
    stroke(0);
    strokeWeight(NON_REFLECTIVE_THICKNESS);
    line(
      mirror.blackX1,
      mirror.blackY1,
      mirror.blackX2,
      mirror.blackY2
    );
    
    // Draw light blue reflective side
    stroke(100, 200, 255);
    strokeWeight(REFLECTIVE_THICKNESS);
    line(
      mirror.blueX1,
      mirror.blueY1,
      mirror.blueX2,
      mirror.blueY2
    );
  }
}

function drawBall() {
  // Draw the ball as a blue circle
  fill(50, 100, 255);
  noStroke();
  ellipse(ball.x, ball.y, ball.radius * 2);
}

function drawReflections() {
  // Draw all reflections as colored balls based on their reflection order
  noStroke();
  
  for (let reflection of reflections) {
    // Check if this reflection is visible from current eye position
    if (!isReflectionVisible(reflection)) continue;
    
    // Choose color based on reflection depth (order)
    switch(reflection.depth) {
      case 1:
        // First-order reflections - Green
        fill(50, 200, 100, 200);
        break;
      case 2:
        // Second-order reflections - Purple
        fill(180, 100, 255, 200);
        break;
      case 3:
        // Third-order reflections - Orange
        fill(255, 150, 50, 200);
        break;
      case 4:
        // Fourth-order reflections - Teal
        fill(0, 200, 200, 200);
        break;
      default:
        // Higher orders - Red
        fill(255, 100, 100, 200);
        break;
    }
    
    ellipse(reflection.x, reflection.y, reflection.radius * 2);
  }
}

function drawEye() {
  // Position the eye at the center bottom of the canvas
  const eyeX = eyePosition.x - EYE_SIZE / 2;
  const eyeY = eyePosition.y - EYE_SIZE / 2;
  
  // Draw the eye image
  image(eye, eyeX, eyeY, EYE_SIZE, EYE_SIZE);
}

function drawRayPaths() {
  // If no rays should be shown or there are no reflections, return early
  if (!showRayPaths || reflections.length === 0 || currentRayIndex === -1) return;
  
  // Ensure the currentRayIndex is within bounds
  currentRayIndex = constrain(currentRayIndex, 0, reflections.length - 1);
  
  // Get the current reflection to display
  const reflection = reflections[currentRayIndex];
  
  // Only show the ray if the reflection is visible
  if (!isReflectionVisible(reflection)) {
    // Try to find another visible reflection
    let found = false;
    let startIndex = currentRayIndex;
    
    for (let i = 0; i < reflections.length; i++) {
      currentRayIndex = (startIndex + i) % reflections.length;
      if (isReflectionVisible(reflections[currentRayIndex])) {
        found = true;
        break;
      }
    }
    
    // If no visible reflections found, don't draw anything
    if (!found) return;
  }
  
  // Get the current reflection after potential adjustment
  const currentReflection = reflections[currentRayIndex];
  
  // Color based on reflection depth/order
  let strokeColor;
  switch (currentReflection.depth) {
      case 1:
        // First-order paths - Green
      strokeColor = color(50, 200, 100, 220);
        break;
      case 2:
        // Second-order paths - Purple
      strokeColor = color(180, 100, 255, 220);
        break;
      case 3:
        // Third-order paths - Orange
      strokeColor = color(255, 150, 50, 220);
        break;
      case 4:
        // Fourth-order paths - Teal
      strokeColor = color(0, 200, 200, 220);
        break;
      default:
        // Higher orders - Red
      strokeColor = color(255, 100, 100, 220);
        break;
    }
    
  // Prepare stroke settings
  stroke(strokeColor);
  strokeWeight(3);
    noFill();
  
  // SPECIAL CASE: First-order reflection (single mirror)
  if (currentReflection.depth === 1) {
    const mirror = currentReflection.sourceMirror;
    
    // 1. Draw line from eye to virtual image
    // Find where this line intersects the mirror
    const hitPoint = lineIntersection(
      eyePosition.x, eyePosition.y,
      currentReflection.x, currentReflection.y,
      mirror.x1, mirror.y1,
      mirror.x2, mirror.y2
    );
    
    if (hitPoint) {
      // Draw solid line from eye to hit point
      line(eyePosition.x, eyePosition.y, hitPoint.x, hitPoint.y);
  
      // Draw dashed line from hit point to virtual image
      drawDashedLine(
        hitPoint.x, hitPoint.y,
        currentReflection.x, currentReflection.y,
        strokeColor, 5, 5
      );
      
      // Draw solid line from hit point to ball
      line(hitPoint.x, hitPoint.y, ball.x, ball.y);
      
      // Draw hit point
  fill(255);
  noStroke();
      ellipse(hitPoint.x, hitPoint.y, 8, 8);
    }
    
    // Done with first-order
    return;
  }
  
  // GENERAL CASE: Higher-order reflections (multiple mirrors)
  // Build the complete chain of reflections
  const reflectionChain = [];
  let current = currentReflection;
  
  while (current) {
    reflectionChain.push(current);
    current = current.parentReflection;
  }
  
  // Reverse to order from ball to eye
  reflectionChain.reverse();
    
  // Collect hit points and virtual images
  const hitPoints = [];
  
  // STEP 1: Start from the eye, find the first hit point
  const lastMirror = reflectionChain[reflectionChain.length - 1].sourceMirror;
  const lastVirtualImage = reflectionChain[reflectionChain.length - 1];
  
  // Find where line from eye to virtual image hits the mirror
  const firstHitPoint = lineIntersection(
    eyePosition.x, eyePosition.y,
    lastVirtualImage.x, lastVirtualImage.y,
    lastMirror.x1, lastMirror.y1,
    lastMirror.x2, lastMirror.y2
  );
  
  if (!firstHitPoint) return; // Can't find first hit point, exit
  
  // Add the first hit point
  hitPoints.push(firstHitPoint);
  
  // Draw solid line: eye to first hit point
  line(eyePosition.x, eyePosition.y, firstHitPoint.x, firstHitPoint.y);
  
  // Draw dashed line: first hit point to virtual image
  drawDashedLine(
    firstHitPoint.x, firstHitPoint.y,
    lastVirtualImage.x, lastVirtualImage.y,
    strokeColor, 5, 5
  );
  
  // STEP 2: For each reflection in the chain (working backwards)
  // Find the hit point on its mirror and draw appropriate lines
  let previousHitPoint = firstHitPoint;
  
  for (let i = reflectionChain.length - 2; i >= 0; i--) {
    const currentReflectionInChain = reflectionChain[i];
    const currentMirror = currentReflectionInChain.sourceMirror;
    
    // Find where line from previous hit point to this reflection's virtual image 
    // intersects with this mirror
    const hitPoint = lineIntersection(
      previousHitPoint.x, previousHitPoint.y,
      currentReflectionInChain.x, currentReflectionInChain.y,
      currentMirror.x1, currentMirror.y1,
      currentMirror.x2, currentMirror.y2
    );
    
    if (!hitPoint) continue; // Skip if can't find hit point
    
    // Add this hit point
    hitPoints.push(hitPoint);
    
    // Draw solid line: previous hit point to this hit point
    line(previousHitPoint.x, previousHitPoint.y, hitPoint.x, hitPoint.y);
    
    // Draw dashed line: this hit point to virtual image
    drawDashedLine(
      hitPoint.x, hitPoint.y,
      currentReflectionInChain.x, currentReflectionInChain.y,
      strokeColor, 5, 5
    );
    
    // Update previous hit point for next iteration
    previousHitPoint = hitPoint;
  }
  
  // Finally, draw line from last hit point to ball
  if (hitPoints.length > 0) {
    line(hitPoints[hitPoints.length - 1].x, hitPoints[hitPoints.length - 1].y, ball.x, ball.y);
  }
  
  // Draw white dots at all hit points
  fill(255);
  noStroke();
  for (const hp of hitPoints) {
    ellipse(hp.x, hp.y, 8, 8);
  }
  
  // Display information about the current reflection
  fill(0);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(16);
  let orderText = "1st";
  if (currentReflection.depth === 2) orderText = "2nd";
  if (currentReflection.depth === 3) orderText = "3rd";
  if (currentReflection.depth > 3) orderText = currentReflection.depth + "th";
  
  text(orderText + " order reflection (" + (currentRayIndex + 1) + " of " + reflections.length + ")", 20, 20);
}

// Helper function to find a hit point on a mirror that obeys the law of reflection
function findHitPoint(source, destination, virtualImage, mirror) {
  // First, try the intersection of source-virtualImage line with the mirror
  // This is the correct hit point for simple first-order reflections
  const hitPoint = lineIntersection(
    source.x, source.y,
    virtualImage.x, virtualImage.y,
    mirror.x1, mirror.y1,
    mirror.x2, mirror.y2
  );
  
  if (hitPoint) return hitPoint;
  
  // Second approach: try line from eye to virtual image
  const hitPoint2 = lineIntersection(
    eyePosition.x, eyePosition.y,
    virtualImage.x, virtualImage.y,
    mirror.x1, mirror.y1,
    mirror.x2, mirror.y2
  );
  
  if (hitPoint2) return hitPoint2;
  
  // Third approach: try source-destination midpoint to virtual image
  const midpoint = {
    x: (source.x + destination.x) / 2,
    y: (source.y + destination.y) / 2
  };
  
  const hitPoint3 = lineIntersection(
    midpoint.x, midpoint.y,
    virtualImage.x, virtualImage.y,
    mirror.x1, mirror.y1,
    mirror.x2, mirror.y2
  );
  
  if (hitPoint3) return hitPoint3;
  
  // Last resort: just return a point on the mirror
  return {
    x: (mirror.x1 + mirror.x2) / 2,
    y: (mirror.y1 + mirror.y2) / 2
  };
}

// Helper function to build the reflection chain from eye to ball
function buildReflectionChain(reflection) {
  const chain = [];
  let current = reflection;
  
  while (current) {
    chain.push(current);
    current = current.parentReflection;
  }
  
  // Return the chain in reverse order (ball to eye)
  return chain.reverse();
}

// Helper function to create a virtual image of a point reflected in a mirror
function createVirtualImage(point, mirror) {
  // Get the mirror normal
  const mirrorNormal = mirror.normal;
  
  // Calculate the reflection of the point
  const pointToMirrorVec = {
    x: point.x - mirror.x1,
    y: point.y - mirror.y1
  };
  
  // Project the vector onto the normal to get the displacement from the mirror
  const normalDistance = dotProduct(pointToMirrorVec, mirrorNormal);
  
  // Reflect the point across the mirror by moving it twice the distance in the normal direction
  return {
    x: point.x - 2 * normalDistance * mirrorNormal.x,
    y: point.y - 2 * normalDistance * mirrorNormal.y
  };
}

// Helper function to draw a dashed line
function drawDashedLine(x1, y1, x2, y2, strokeColor, dashLength, gapLength) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const dashCount = Math.floor(distance / (dashLength + gapLength));
  const unitX = dx / distance;
  const unitY = dy / distance;
  
  stroke(strokeColor);
  
  let currX = x1;
  let currY = y1;
  
  for (let i = 0; i < dashCount; i++) {
    const nextX = currX + unitX * dashLength;
    const nextY = currY + unitY * dashLength;
    
    line(currX, currY, nextX, nextY);
    
    currX = nextX + unitX * gapLength;
    currY = nextY + unitY * gapLength;
  }
  
  // Draw the remaining dash if any
  if (currX < x2) {
    line(currX, currY, x2, y2);
  }
}

// Function to trace a single ray path from the ball to the eye via reflections
function traceSingleRayPath(reflection) {
  let physicalPath = [];
  let virtualPaths = []; // Array to store multiple virtual paths for each reflection
  
  // For first-order reflections, we use a direct approach:
  if (!reflection.parentReflection) {
    // 1. Get the mirror
    const mirror = reflection.sourceMirror;
    
    // 2. Calculate the mirror normal vector
    const mirrorVec = {
      x: mirror.x2 - mirror.x1,
      y: mirror.y2 - mirror.y1
    };
    const mirrorLength = Math.sqrt(mirrorVec.x * mirrorVec.x + mirrorVec.y * mirrorVec.y);
    const normal = {
      x: -mirrorVec.y / mirrorLength,
      y: mirrorVec.x / mirrorLength
    };
    
    // 3. Calculate the virtual image of the ball across the mirror
    const ballToMirrorX = ball.x - mirror.x1;
    const ballToMirrorY = ball.y - mirror.y1;
    const ballDotProduct = ballToMirrorX * normal.x + ballToMirrorY * normal.y;
    
    const virtualBall = {
      x: ball.x - 2 * ballDotProduct * normal.x,
      y: ball.y - 2 * ballDotProduct * normal.y
    };
    
    // 4. Find where the line from eye to virtual ball intersects the mirror
    const hitPoint = lineIntersection(
      eyePosition.x, eyePosition.y,
      virtualBall.x, virtualBall.y,
      mirror.x1, mirror.y1,
      mirror.x2, mirror.y2
    );
    
    if (hitPoint) {
      // 5. Construct the physical path: ball → hit point → eye
      physicalPath.push({ x: ball.x, y: ball.y, type: 'solid' });
      physicalPath.push({ x: hitPoint.x, y: hitPoint.y, type: 'solid' });
      physicalPath.push({ x: eyePosition.x, y: eyePosition.y, type: 'solid' });
      
      // 6. Construct the virtual path: hit point → virtual ball (dashed)
      virtualPaths.push([
        { x: hitPoint.x, y: hitPoint.y, type: 'solid' },
        { x: virtualBall.x, y: virtualBall.y, type: 'dashed' }
      ]);
    }
  }
  // For higher-order reflections, we need to trace the entire path
  else {
    // Get the chain of reflections
  let reflectionChain = [];
  let currentReflection = reflection;
  
  while (currentReflection) {
    reflectionChain.push(currentReflection);
    currentReflection = currentReflection.parentReflection;
  }
  
    // Reverse the chain to go from ball to eye
    reflectionChain.reverse();
    
    // Calculate all physical hit points and virtual images
    let hitPoints = [];
    let virtualImages = [];
    
    // Start with the ball
    let lastPoint = { x: ball.x, y: ball.y };
    virtualImages.push(lastPoint);
    
    // Process each mirror in sequence
  for (let i = 0; i < reflectionChain.length; i++) {
      const mirror = reflectionChain[i].sourceMirror;
      
      // Calculate normal to this mirror
      const mirrorVec = {
        x: mirror.x2 - mirror.x1,
        y: mirror.y2 - mirror.y1
      };
      const mirrorLength = Math.sqrt(mirrorVec.x * mirrorVec.x + mirrorVec.y * mirrorVec.y);
      const normal = {
        x: -mirrorVec.y / mirrorLength,
        y: mirrorVec.x / mirrorLength
      };
    
      // For first mirror in chain, find hit point using ball and eye
      let hitPoint;
      
      if (i === 0) {
        // First mirror - find intersection between ball-mirror-eye
        // Calculate virtual image of ball in this mirror
        const objToMirrorX = lastPoint.x - mirror.x1;
        const objToMirrorY = lastPoint.y - mirror.y1;
        const dotProduct = objToMirrorX * normal.x + objToMirrorY * normal.y;
        
        const virtualImage = {
          x: lastPoint.x - 2 * dotProduct * normal.x,
          y: lastPoint.y - 2 * dotProduct * normal.y
        };
        
        virtualImages.push(virtualImage);
        
        // Find where line from next point to virtual image intersects mirror
        if (reflectionChain.length === 1) {
          // Only one mirror - next point is eye
          hitPoint = lineIntersection(
            eyePosition.x, eyePosition.y,
            virtualImage.x, virtualImage.y,
    mirror.x1, mirror.y1, 
    mirror.x2, mirror.y2
  );
        } else {
          // More mirrors - need to find next mirror's hit point first
          // (we'll do this later in a second pass)
          hitPoint = createPointOnMirror(mirror, 0.5); // Temporary point on mirror
        }
      } else {
        // Not first mirror - use previous hit point and next point
        // Calculate virtual image of previous hit point in this mirror
        const objToMirrorX = lastPoint.x - mirror.x1;
        const objToMirrorY = lastPoint.y - mirror.y1;
        const dotProduct = objToMirrorX * normal.x + objToMirrorY * normal.y;
        
        const virtualImage = {
          x: lastPoint.x - 2 * dotProduct * normal.x,
          y: lastPoint.y - 2 * dotProduct * normal.y
        };
        
        virtualImages.push(virtualImage);
        
        // Find where line from next point to virtual image intersects mirror
    if (i === reflectionChain.length - 1) {
          // Last mirror - next point is eye
          hitPoint = lineIntersection(
            eyePosition.x, eyePosition.y,
            virtualImage.x, virtualImage.y,
            mirror.x1, mirror.y1,
            mirror.x2, mirror.y2
          );
        } else {
          // More mirrors - need to find next mirror's hit point first
          // (we'll do this later in a second pass)
          hitPoint = createPointOnMirror(mirror, 0.5); // Temporary point on mirror
        }
      }
      
      if (hitPoint) {
        hitPoints.push(hitPoint);
        lastPoint = hitPoint;
      } else {
        break; // Error - can't find hit point
      }
    }
    
    // Second pass - fix all hit points starting from the eye
    if (hitPoints.length === reflectionChain.length) {
      // Start with the last hit point (already correctly placed near eye)
      let currentPoint = hitPoints[hitPoints.length - 1];
      
      // Work backwards from second-to-last hit point
      for (let i = reflectionChain.length - 2; i >= 0; i--) {
        const mirror = reflectionChain[i + 1].sourceMirror;
        const prevMirror = reflectionChain[i].sourceMirror;
        
        // Calculate virtual image of current hit point in previous mirror
        const normal = mirrorNormal(prevMirror);
        
        const pointToMirrorX = currentPoint.x - prevMirror.x1;
        const pointToMirrorY = currentPoint.y - prevMirror.y1;
        const dotProduct = pointToMirrorX * normal.x + pointToMirrorY * normal.y;
        
        const virtualPoint = {
          x: currentPoint.x - 2 * dotProduct * normal.x,
          y: currentPoint.y - 2 * dotProduct * normal.y
        };
        
        // Find where line from virtual point to previous point intersects mirror
        const prevHitPoint = lineIntersection(
          virtualPoint.x, virtualPoint.y,
          i === 0 ? ball.x : hitPoints[i - 1].x,
          i === 0 ? ball.y : hitPoints[i - 1].y,
          prevMirror.x1, prevMirror.y1,
          prevMirror.x2, prevMirror.y2
        );
        
        if (prevHitPoint) {
          hitPoints[i] = prevHitPoint;
          currentPoint = prevHitPoint;
        } else {
          break; // Error - can't find hit point
        }
      }
      
      // Create the physical path
      physicalPath.push({ x: ball.x, y: ball.y, type: 'solid' });
      
      for (const hitPoint of hitPoints) {
        physicalPath.push({ x: hitPoint.x, y: hitPoint.y, type: 'solid' });
      }
      
      physicalPath.push({ x: eyePosition.x, y: eyePosition.y, type: 'solid' });
      
      // Create virtual paths for each hit point
      // First mirror
      virtualPaths.push([
        { x: hitPoints[0].x, y: hitPoints[0].y, type: 'solid' },
        { x: virtualImages[1].x, y: virtualImages[1].y, type: 'dashed' }
      ]);
      
      // Additional mirrors
      for (let i = 1; i < hitPoints.length; i++) {
        const mirror = reflectionChain[i].sourceMirror;
        const normal = mirrorNormal(mirror);
        
        // Calculate the virtual image of the previous hit point through this mirror
        const prevPoint = hitPoints[i-1];
        const prevToMirrorX = prevPoint.x - mirror.x1;
        const prevToMirrorY = prevPoint.y - mirror.y1;
        const dotProduct = prevToMirrorX * normal.x + prevToMirrorY * normal.y;
        
        const virtualImage = {
          x: prevPoint.x - 2 * dotProduct * normal.x,
          y: prevPoint.y - 2 * dotProduct * normal.y
        };
        
        virtualPaths.push([
          { x: hitPoints[i].x, y: hitPoints[i].y, type: 'solid' },
          { x: virtualImage.x, y: virtualImage.y, type: 'dashed' }
        ]);
      }
    }
  }
  
  return { physical: physicalPath, virtuals: virtualPaths };
}

// Helper function to create a point on a mirror at given t (0-1)
function createPointOnMirror(mirror, t) {
  return {
    x: mirror.x1 + t * (mirror.x2 - mirror.x1),
    y: mirror.y1 + t * (mirror.y2 - mirror.y1)
  };
}

// Helper function to get a mirror's normal vector
function mirrorNormal(mirror) {
  const mirrorVec = {
    x: mirror.x2 - mirror.x1,
    y: mirror.y2 - mirror.y1
  };
  const mirrorLength = Math.sqrt(mirrorVec.x * mirrorVec.x + mirrorVec.y * mirrorVec.y);
  
  return {
    x: -mirrorVec.y / mirrorLength,
    y: mirrorVec.x / mirrorLength
  };
}

// Helper function to check if a point lies on a line segment
function isPointOnLineSegment(px, py, x1, y1, x2, y2) {
  // Calculate the distance from point to line segment
  const lineLength = dist(x1, y1, x2, y2);
  const d1 = dist(px, py, x1, y1);
  const d2 = dist(px, py, x2, y2);
  
  // Point is on segment if the sum of distances to endpoints equals the segment length
  // Add a small epsilon for floating point precision
  const epsilon = 0.001;
  return Math.abs(d1 + d2 - lineLength) < epsilon;
}

// Improved function to check if a reflection is visible from current eye position
function isReflectionVisible(reflection) {
  // First check if the reflection is within the canvas bounds
  if (reflection.x - reflection.radius < 0 || 
      reflection.x + reflection.radius > width ||
      reflection.y - reflection.radius < 0 || 
      reflection.y + reflection.radius > height) {
    // Reflection is outside or partially outside the canvas
    return false;
  }
  
  // Get the source mirror that created this reflection
  const mirror = reflection.sourceMirror;
  const mirrorNormal = mirror.normal;
  
  // Get the source object (either the original ball or the parent reflection)
  const sourceObject = reflection.parentReflection || ball;
  
  // PART 1: Check if the eye can see the reflection through the mirror
  
  // Create a line from eye to reflection
  const eye = eyePosition;
  
  // Find intersection of eye-to-reflection line with the mirror
  const eyeToMirrorIntersection = lineIntersection(
    eye.x, eye.y,
    reflection.x, reflection.y,
    mirror.x1, mirror.y1,
    mirror.x2, mirror.y2
  );
  
  // If no intersection, the reflection is not visible
  if (!eyeToMirrorIntersection) return false;
  
  // Check if the intersection point is within the mirror segment
  const mirrorLength = dist(mirror.x1, mirror.y1, mirror.x2, mirror.y2);
  const dist1 = dist(eyeToMirrorIntersection.x, eyeToMirrorIntersection.y, mirror.x1, mirror.y1);
  const dist2 = dist(eyeToMirrorIntersection.x, eyeToMirrorIntersection.y, mirror.x2, mirror.y2);
  
  // Allow for a small margin of error due to floating point
  const epsilon = 0.001;
  if (dist1 + dist2 > mirrorLength * (1 + epsilon)) {
    return false;
  }
  
  // Calculate the direction from eye to intersection
  const eyeToIntersection = {
    x: eyeToMirrorIntersection.x - eye.x,
    y: eyeToMirrorIntersection.y - eye.y
  };
  
  // When dot product of normal and eyeToIntersection is negative,
  // the eye is looking at the blue side of the mirror first
  const lookingAtBlueSideFirst = dotProduct(mirrorNormal, eyeToIntersection) < 0;
  
  // If not looking at the blue side first, reflection is not visible
  if (!lookingAtBlueSideFirst) return false;
  
  // Check if the ray passes through the mirror FIRST before reaching the reflection
  // Calculate the distance from eye to intersection and from eye to reflection
  const distToIntersection = Math.sqrt(
    eyeToIntersection.x * eyeToIntersection.x + 
    eyeToIntersection.y * eyeToIntersection.y
  );
  
  const eyeToReflection = {
    x: reflection.x - eye.x,
    y: reflection.y - eye.y
  };
  
  const distToReflection = Math.sqrt(
    eyeToReflection.x * eyeToReflection.x + 
    eyeToReflection.y * eyeToReflection.y
  );
  
  // The ray should hit the mirror first, then the reflection
  const intersectsBeforeReflection = distToIntersection < distToReflection;
  
  if (!intersectsBeforeReflection) return false;
  
  // Check if there are any obstructions between eye and mirror intersection
  for (let otherMirror of mirrors) {
    // Skip the mirror we're testing for
    if (otherMirror === mirror) continue;
    
    // Check if the ray from eye to intersection crosses this other mirror
    const blockingIntersection = lineIntersection(
      eye.x, eye.y,
      eyeToMirrorIntersection.x, eyeToMirrorIntersection.y,
      otherMirror.x1, otherMirror.y1,
      otherMirror.x2, otherMirror.y2
    );
    
    if (blockingIntersection) {
      // Calculate how far along the ray this blocking intersection occurs
      const eyeToBlockingIntersection = {
        x: blockingIntersection.x - eye.x,
        y: blockingIntersection.y - eye.y
      };
      
      const distToBlockingIntersection = Math.sqrt(
        eyeToBlockingIntersection.x * eyeToBlockingIntersection.x + 
        eyeToBlockingIntersection.y * eyeToBlockingIntersection.y
      );
      
      // If the blocking intersection is closer than our mirror intersection,
      // this means another mirror is blocking the view
      if (distToBlockingIntersection < distToIntersection * 0.99) { // Add a small margin for floating point errors
        return false;
      }
    }
  }
  
  // PART 2: Check if the mirror can see the source object (ball or parent reflection)
  
  // For higher-order reflections (depth > 1), we need to check if the path is physically valid
  if (reflection.depth > 1) {
    // Calculate the reflection point on the mirror
    const reflectionPoint = eyeToMirrorIntersection;
    
    // For reflections of reflections, the reflection should be visible from the mirror
    // but only if the source of this reflection (parent) is also visible from the mirror
    const parentReflection = reflection.parentReflection;
    
    // Check if there's a clear path from the parent reflection to the reflection point
    for (let otherMirror of mirrors) {
      // Skip the mirror we're testing for and the parent's mirror
      if (otherMirror === mirror || (parentReflection && otherMirror === parentReflection.sourceMirror)) continue;
      
      // Check if any mirror blocks the path from parent reflection to reflection point
      const blockingIntersection = lineIntersection(
        parentReflection.x, parentReflection.y,
        reflectionPoint.x, reflectionPoint.y,
        otherMirror.x1, otherMirror.y1,
        otherMirror.x2, otherMirror.y2
      );
      
      if (blockingIntersection) {
        // Calculate distances to determine if there's a blockage
        const parentToBlockingDist = dist(parentReflection.x, parentReflection.y, blockingIntersection.x, blockingIntersection.y);
        const parentToReflectionPointDist = dist(parentReflection.x, parentReflection.y, reflectionPoint.x, reflectionPoint.y);
        
        // If there's a mirror between the parent and the reflection point, this reflection isn't possible
        if (parentToBlockingDist < parentToReflectionPointDist * 0.99) { // Small margin for floating point errors
          return false;
        }
      }
    }
  } else {
    // For first-order reflections, check if the original ball is visible from the mirror
    
    // Calculate the reflection point on the mirror
    const reflectionPoint = eyeToMirrorIntersection;
    
    // Check if there's a clear path from the ball to the reflection point
    for (let otherMirror of mirrors) {
      // Skip the mirror we're testing for
      if (otherMirror === mirror) continue;
      
      // Check if any mirror blocks the path from ball to reflection point
      const blockingIntersection = lineIntersection(
        ball.x, ball.y,
        reflectionPoint.x, reflectionPoint.y,
        otherMirror.x1, otherMirror.y1,
        otherMirror.x2, otherMirror.y2
      );
      
      if (blockingIntersection) {
        // Calculate distances to determine if there's a blockage
        const ballToBlockingDist = dist(ball.x, ball.y, blockingIntersection.x, blockingIntersection.y);
        const ballToReflectionPointDist = dist(ball.x, ball.y, reflectionPoint.x, reflectionPoint.y);
        
        // If there's a mirror between the ball and the reflection point, the reflection isn't physically possible
        if (ballToBlockingDist < ballToReflectionPointDist * 0.99) { // Small margin for floating point errors
          return false;
        }
      }
    }
  }
  
  // For a reflection to be visible, all checks must pass
  return true;
}

// Modified higher-order reflection calculation with better sizing
function calculateHigherOrderReflection(mirror, object, objectRadius, depth, allMirrors) {
  // Don't go beyond max reflection depth
  if (depth > MAX_REFLECTIONS) return;
  
  // Don't calculate reflections that are too small
  if (objectRadius / BALL_RADIUS < MIN_REFLECTION_SIZE_RATIO) return;
  
  // Use the stored normal vector for this mirror
  const mirrorNormal = mirror.normal;
  
  // Calculate reflection of object across mirror line
  // First find distance from object to mirror along normal
  const objectToMirrorVec = {
    x: object.x - mirror.x1,
    y: object.y - mirror.y1
  };
  const normalDistance = dotProduct(objectToMirrorVec, mirrorNormal);
  
  // Only create reflections if object is on the reflective side of the mirror
  if (normalDistance <= 0) return;
  
  // Calculate distance from object to mirror
  const distToMirror = Math.abs(normalDistance);
  
  // Calculate reflection size:
  // For each order of reflection, reduce size by a modest fixed percentage
  let reflectionRadius;
  
  // Size reduction factors by reflection depth:
  // depth 1 = 100% (original size)
  // depth 2 = 85% of original
  // depth 3 = 70% of original
  // depth 4+ = 60% of original
  const sizeFactors = [1, 0.85, 0.7, 0.6, 0.6, 0.6];
  const sizeFactor = sizeFactors[Math.min(depth - 1, sizeFactors.length - 1)];
  
  reflectionRadius = BALL_RADIUS * sizeFactor;
  
  // Don't show reflections that would be too small
  if (reflectionRadius < BALL_RADIUS * MIN_REFLECTION_SIZE_RATIO) return;
  
  // Reflection of object position is on opposite side of mirror, same distance from mirror
  const virtualObject = {
    x: object.x - 2 * normalDistance * mirrorNormal.x,
    y: object.y - 2 * normalDistance * mirrorNormal.y,
    radius: reflectionRadius,
    depth: depth,
    sourceMirror: mirror,
    // For higher-order reflections, parent is the reflection that generated this one
    parentReflection: object
  };
  
  // Skip reflections that are outside the canvas bounds
  if (virtualObject.x - virtualObject.radius < 0 || 
      virtualObject.x + virtualObject.radius > width ||
      virtualObject.y - virtualObject.radius < 0 || 
      virtualObject.y + virtualObject.radius > height) {
    return;
  }
  
  // Only add if this reflection is actually visible from current eye position
  if (isReflectionVisible(virtualObject)) {
    reflections.push(virtualObject);
    
    // Recursively calculate next level reflections
    for (let otherMirror of allMirrors) {
      // Skip the mirror that created this reflection
      if (otherMirror === mirror) continue;
      
      calculateHigherOrderReflection(otherMirror, virtualObject, reflectionRadius, depth + 1, allMirrors);
    }
  }
}

// Improved function to check mirror visibility and handle partial visibility
function calculateReflections() {
  // Clear previous reflections
  reflections = [];

  // For each mirror, check visibility and calculate first-order reflections
  for (let mirror of mirrors) {
    // Calculate reflection of ball across mirror line
    // Use the stored normal vector for this mirror
    const mirrorNormal = mirror.normal;
    
    // First find distance from ball to mirror along normal
    const ballToMirrorVec = {
      x: ball.x - mirror.x1,
      y: ball.y - mirror.y1
    };
    const normalDistance = dotProduct(ballToMirrorVec, mirrorNormal);
    
    // Only create reflections if ball is on the reflective side of the mirror (normal points toward ball)
    if (normalDistance <= 0) continue;
    
    // Calculate distance from ball to mirror
    const distToMirror = Math.abs(normalDistance);
    
    // For first-order reflections, maintain the same size as the original ball
    const reflectionRadius = ball.radius;
    
    // Reflection of ball position is on opposite side of mirror, same distance from mirror
    const virtualBall = {
      x: ball.x - 2 * normalDistance * mirrorNormal.x,
      y: ball.y - 2 * normalDistance * mirrorNormal.y,
      radius: reflectionRadius,
      depth: 1,
      sourceMirror: mirror,
      parentReflection: null // First-order reflections don't have parent reflections
    };
    
    // Skip reflections that are outside the canvas bounds
    if (virtualBall.x - virtualBall.radius < 0 || 
        virtualBall.x + virtualBall.radius > width ||
        virtualBall.y - virtualBall.radius < 0 || 
        virtualBall.y + virtualBall.radius > height) {
      continue;
    }
    
    // Check if this specific reflection is visible from the eye position
    if (isReflectionVisible(virtualBall)) {
      reflections.push(virtualBall);
    }
  }

  // Calculate higher-order reflections
  const processedReflections = [...reflections]; // Copy the array of first-order reflections
  for (let reflection of processedReflections) {
    // Calculate reflection of this reflection in other mirrors
    for (let otherMirror of mirrors) {
      // Skip the mirror that created this reflection
      if (otherMirror === reflection.sourceMirror) continue;
      
      calculateHigherOrderReflection(otherMirror, reflection, reflection.radius, 2, mirrors);
    }
  }
}

function findClosestReflection(ray) {
  let closestIntersection = null;
  let closestDistance = Infinity;
  
  // Check each mirror for intersection
  for (let mirror of mirrors) {
    // Calculate mirror line segments
    const mirrorLine = {
      x1: mirror.x1, 
      y1: mirror.y1,
      x2: mirror.x2,
      y2: mirror.y2
    };
    
    // Find intersection point between ray and mirror
    const intersection = lineIntersection(
      ray.start.x, ray.start.y, ray.end.x, ray.end.y,
      mirrorLine.x1, mirrorLine.y1, mirrorLine.x2, mirrorLine.y2
    );
    
    // If intersection found
    if (intersection) {
      // Calculate distance from ray start to intersection
      const distance = dist(ray.start.x, ray.start.y, intersection.x, intersection.y);
      
      // If this is closer than previous intersections, save it
      if (distance < closestDistance) {
        // Calculate reflection vector
        const incidentVector = {
          x: ray.end.x - ray.start.x,
          y: ray.end.y - ray.start.y
        };
        const normalizedIncident = normalizeVector(incidentVector);
        
        // Get mirror normal (perpendicular to mirror line)
        const mirrorVector = {
          x: mirror.x2 - mirror.x1,
          y: mirror.y2 - mirror.y1
        };
        const mirrorNormal = {
          x: -mirrorVector.y,
          y: mirrorVector.x
        };
        const normalizedNormal = normalizeVector(mirrorNormal);
        
        // Calculate reflection vector using formula: r = i - 2(i·n)n
        // Where i is incident vector, n is normal vector, and r is reflection vector
        const dot = dotProduct(normalizedIncident, normalizedNormal);
        const reflectionVector = {
          x: normalizedIncident.x - 2 * dot * normalizedNormal.x,
          y: normalizedIncident.y - 2 * dot * normalizedNormal.y
        };
        
        closestIntersection = {
          point: intersection,
          reflection: reflectionVector
        };
        closestDistance = distance;
      }
    }
  }
  
  return closestIntersection;
}

// Calculate line-line intersection
function lineIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
  // Calculate denominator
  const den = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  
  // If lines are parallel
  if (den === 0) {
    return null;
  }
  
  // Calculate ua and ub
  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / den;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / den;
  
  // If intersection is within both line segments
  if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
    const x = x1 + ua * (x2 - x1);
    const y = y1 + ua * (y2 - y1);
    return {x, y};
  }
  
  return null;
}

// Vector helper functions
function normalizeVector(v) {
  const length = Math.sqrt(v.x * v.x + v.y * v.y);
  return {
    x: v.x / length,
    y: v.y / length
  };
}

function dotProduct(v1, v2) {
  return v1.x * v2.x + v1.y * v2.y;
}

// Function to check if objects can be moved in the current game state
function canMoveObjects() {
  // In sandbox mode, everything is movable
  if (!isPuzzleMode) return true;
  
  // In puzzle mode, objects are movable if:
  // 1. We have a valid puzzle loaded AND
  // 2. The puzzle is not yet solved or failed
  return currentPuzzle && !(isPuzzleSolved || isPuzzleFailed);
  }
  
// Override mouseDragged to check if objects can be moved
mouseDragged = function() {
  // If not dragging anything, no need to proceed
  if (!isDragging) return;
  
  // Check if objects can be moved
  if (!canMoveObjects()) {
    return; // Don't allow movement if the puzzle is solved/failed
  }
  
  if (draggedObject === 'ball') {
    // Move the ball to the mouse position
    ball.x = mouseX;
    ball.y = mouseY;
    
    // Keep ball within canvas bounds
    ball.x = constrain(ball.x, ball.radius, width - ball.radius);
    ball.y = constrain(ball.y, ball.radius, height - ball.radius);
    
    // Recalculate reflections
    calculateReflections();
  } 
  else if (draggedObject === 'mirror') {
    if (draggedMirrorPoint) {
      // Get the mirror being dragged by endpoint
    const mirror = mirrors[draggedMirrorPoint.index];
    
      // Update the appropriate endpoint of the center line
    if (draggedMirrorPoint.point === 1) {
      mirror.x1 = mouseX;
      mirror.y1 = mouseY;
    } else {
      mirror.x2 = mouseX;
      mirror.y2 = mouseY;
    }
    
    // Keep endpoints within canvas bounds
    mirror.x1 = constrain(mirror.x1, 0, width);
    mirror.y1 = constrain(mirror.y1, 0, height);
    mirror.x2 = constrain(mirror.x2, 0, width);
    mirror.y2 = constrain(mirror.y2, 0, height);
      
      // Recalculate the mirror's normal vector
      const mirrorVector = { 
        x: mirror.x2 - mirror.x1, 
        y: mirror.y2 - mirror.y1 
      };
      const mirrorLength = Math.sqrt(mirrorVector.x * mirrorVector.x + mirrorVector.y * mirrorVector.y);
      
      // Get normalized normal vector
      mirror.normal = {
        x: -mirrorVector.y / mirrorLength,
        y: mirrorVector.x / mirrorLength
      };
    }
    else if (draggedMirrorIndex !== null) {
      // Get the mirror being dragged from the middle
      const mirror = mirrors[draggedMirrorIndex];
      
      // Calculate the displacement from last frame
      const dx = mouseX - pmouseX;
      const dy = mouseY - pmouseY;
      
      // Move both endpoints by the same amount to preserve orientation
      mirror.x1 += dx;
      mirror.y1 += dy;
      mirror.x2 += dx;
      mirror.y2 += dy;
      
      // Keep within canvas bounds
      if (mirror.x1 < 0) {
        mirror.x2 += (0 - mirror.x1);
        mirror.x1 = 0;
      } else if (mirror.x1 > width) {
        mirror.x2 -= (mirror.x1 - width);
        mirror.x1 = width;
      }
      
      if (mirror.y1 < 0) {
        mirror.y2 += (0 - mirror.y1);
        mirror.y1 = 0;
      } else if (mirror.y1 > height) {
        mirror.y2 -= (mirror.y1 - height);
        mirror.y1 = height;
      }
      
      if (mirror.x2 < 0) {
        mirror.x1 += (0 - mirror.x2);
        mirror.x2 = 0;
      } else if (mirror.x2 > width) {
        mirror.x1 -= (mirror.x2 - width);
        mirror.x2 = width;
      }
      
      if (mirror.y2 < 0) {
        mirror.y1 += (0 - mirror.y2);
        mirror.y2 = 0;
      } else if (mirror.y2 > height) {
        mirror.y1 -= (mirror.y2 - height);
        mirror.y1 = height;
      }
    }
    
    // For both endpoint and middle dragging, update the mirror sides
    const mirror = draggedMirrorPoint ? mirrors[draggedMirrorPoint.index] : mirrors[draggedMirrorIndex];
    
    // Update both sides' coordinates
    const halfWidth = mirror.width / 2;
    
    // Update blue side coordinates
    mirror.blueX1 = mirror.x1 + mirror.normal.x * halfWidth;
    mirror.blueY1 = mirror.y1 + mirror.normal.y * halfWidth;
    mirror.blueX2 = mirror.x2 + mirror.normal.x * halfWidth;
    mirror.blueY2 = mirror.y2 + mirror.normal.y * halfWidth;
    
    // Update black side coordinates
    mirror.blackX1 = mirror.x1 - mirror.normal.x * halfWidth;
    mirror.blackY1 = mirror.y1 - mirror.normal.y * halfWidth;
    mirror.blackX2 = mirror.x2 - mirror.normal.x * halfWidth;
    mirror.blackY2 = mirror.y2 - mirror.normal.y * halfWidth;
    
    // Recalculate reflections
    calculateReflections();
  }
  else if (draggedObject === 'eye') {
    // Move the eye to the mouse position
    eyePosition.x = mouseX;
    eyePosition.y = mouseY;
    
    // Keep eye within canvas bounds
    eyePosition.x = constrain(eyePosition.x, EYE_SIZE / 2, width - EYE_SIZE / 2);
    eyePosition.y = constrain(eyePosition.y, EYE_SIZE / 2, height - EYE_SIZE / 2);
    
    // Recalculate reflections
    calculateReflections();
  }
};

// Reset mousePressed to use a cleaner approach
mousePressed = function() {
  // Don't allow interaction if the puzzle is solved or failed
  if (isPuzzleMode && (isPuzzleSolved || isPuzzleFailed)) {
    return;
  }
  
  // In puzzle mode, check which objects are movable
  if (isPuzzleMode && currentPuzzle) {
    const movable = currentPuzzle.movableObjects;
    
    // Check if clicked on the ball
    if (dist(mouseX, mouseY, ball.x, ball.y) < ball.radius) {
      if (movable.ball) {
        isDragging = true;
        draggedObject = 'ball';
      }
      return;
    }
    
    // Check if clicked on a mirror
    for (let i = 0; i < mirrors.length; i++) {
      const mirror = mirrors[i];
      
      // Check if clicked near any part of the mirror
      if (dist(mouseX, mouseY, mirror.x1, mirror.y1) < 10 ||
          dist(mouseX, mouseY, mirror.blueX1, mirror.blueY1) < 10 ||
          dist(mouseX, mouseY, mirror.blackX1, mirror.blackY1) < 10 ||
          dist(mouseX, mouseY, mirror.x2, mirror.y2) < 10 ||
          dist(mouseX, mouseY, mirror.blueX2, mirror.blueY2) < 10 ||
          dist(mouseX, mouseY, mirror.blackX2, mirror.blackY2) < 10 ||
          isPointNearLineSegment(mouseX, mouseY, mirror.x1, mirror.y1, mirror.x2, mirror.y2, 10) ||
          isPointNearLineSegment(mouseX, mouseY, mirror.blueX1, mirror.blueY1, mirror.blueX2, mirror.blueY2, 10) ||
          isPointNearLineSegment(mouseX, mouseY, mirror.blackX1, mirror.blackY1, mirror.blackX2, mirror.blackY2, 10)) {
        
        if (movable.mirrors) {
          isDragging = true;
          draggedObject = 'mirror';
          
          // Check if endpoint or middle
          if (dist(mouseX, mouseY, mirror.x1, mirror.y1) < 10 ||
              dist(mouseX, mouseY, mirror.blueX1, mirror.blueY1) < 10 ||
              dist(mouseX, mouseY, mirror.blackX1, mirror.blackY1) < 10) {
            draggedMirrorPoint = {index: i, point: 1};
            draggedMirrorIndex = null;
          } else if (dist(mouseX, mouseY, mirror.x2, mirror.y2) < 10 ||
                     dist(mouseX, mouseY, mirror.blueX2, mirror.blueY2) < 10 ||
                     dist(mouseX, mouseY, mirror.blackX2, mirror.blackY2) < 10) {
            draggedMirrorPoint = {index: i, point: 2};
            draggedMirrorIndex = null;
          } else {
  draggedMirrorPoint = null;
            draggedMirrorIndex = i;
          }
        }
        return;
      }
    }
    
    // Check if clicked on the eye
    if (dist(mouseX, mouseY, eyePosition.x, eyePosition.y) < EYE_SIZE / 2) {
      if (movable.eye) {
        isDragging = true;
        draggedObject = 'eye';
      }
      return;
    }
  } else {
    // In sandbox mode, everything is movable
    
    // Check if clicked on the ball
    if (dist(mouseX, mouseY, ball.x, ball.y) < ball.radius) {
      isDragging = true;
      draggedObject = 'ball';
      return;
    }
    
    // Check if clicked on a mirror endpoint or middle
    for (let i = 0; i < mirrors.length; i++) {
      const mirror = mirrors[i];
      
      // Check first endpoint of either side
      if (dist(mouseX, mouseY, mirror.x1, mirror.y1) < 10 ||
          dist(mouseX, mouseY, mirror.blueX1, mirror.blueY1) < 10 ||
          dist(mouseX, mouseY, mirror.blackX1, mirror.blackY1) < 10) {
        isDragging = true;
        draggedObject = 'mirror';
        draggedMirrorPoint = {index: i, point: 1};
  draggedMirrorIndex = null;
        return;
      }
      
      // Check second endpoint of either side
      if (dist(mouseX, mouseY, mirror.x2, mirror.y2) < 10 ||
          dist(mouseX, mouseY, mirror.blueX2, mirror.blueY2) < 10 ||
          dist(mouseX, mouseY, mirror.blackX2, mirror.blackY2) < 10) {
        isDragging = true;
        draggedObject = 'mirror';
        draggedMirrorPoint = {index: i, point: 2};
        draggedMirrorIndex = null;
        return;
      }
      
      // Check if clicked on the middle of a mirror
      // First calculate the midpoint
      const midX = (mirror.x1 + mirror.x2) / 2;
      const midY = (mirror.y1 + mirror.y2) / 2;
      
      // Check if clicked near the midpoint or along the line segment
      if (dist(mouseX, mouseY, midX, midY) < 15 || 
          isPointNearLineSegment(mouseX, mouseY, mirror.x1, mirror.y1, mirror.x2, mirror.y2, 10) ||
          isPointNearLineSegment(mouseX, mouseY, mirror.blueX1, mirror.blueY1, mirror.blueX2, mirror.blueY2, 10) ||
          isPointNearLineSegment(mouseX, mouseY, mirror.blackX1, mirror.blackY1, mirror.blackX2, mirror.blackY2, 10)) {
        isDragging = true;
        draggedObject = 'mirror';
        draggedMirrorPoint = null;
        draggedMirrorIndex = i;
        return;
      }
    }
    
    // Check if clicked on the eye
    if (dist(mouseX, mouseY, eyePosition.x, eyePosition.y) < EYE_SIZE / 2) {
      isDragging = true;
      draggedObject = 'eye';
      return;
    }
  }
};

// Helper function to check if a point is near a line segment
function isPointNearLineSegment(px, py, x1, y1, x2, y2, threshold) {
  // Vector from line start to point
  const dx = px - x1;
  const dy = py - y1;
  
  // Vector representing the line
  const lineVectorX = x2 - x1;
  const lineVectorY = y2 - y1;
  
  // Calculate squared length of the line vector (to avoid sqrt)
  const lineLengthSquared = lineVectorX * lineVectorX + lineVectorY * lineVectorY;
  
  // If the line is very short, treat it as a point
  if (lineLengthSquared < 0.0001) {
    return dist(px, py, x1, y1) < threshold;
  }
  
  // Calculate dot product of (point - line start) and line vector
  const dotProduct = dx * lineVectorX + dy * lineVectorY;
  
  // Calculate projection ratio (0 = at start point, 1 = at end point)
  const projectionRatio = constrain(dotProduct / lineLengthSquared, 0, 1);
  
  // Find the closest point on the line segment
  const closestX = x1 + projectionRatio * lineVectorX;
  const closestY = y1 + projectionRatio * lineVectorY;
  
  // Check if the point is within the threshold distance
  return dist(px, py, closestX, closestY) < threshold;
}

// Function to add a new mirror to the scene
function addNewMirror() {
  // Place in top right corner
  const topRightX = width * 0.95;
  const topRightY = height * 0.05;
  
  // Fixed horizontal orientation
  const angle = 0; // Horizontal
  
  // Calculate endpoints
  const x1 = topRightX - MIRROR_LENGTH / 2;
  const y1 = topRightY;
  const x2 = topRightX + MIRROR_LENGTH / 2;
  const y2 = topRightY;
  
  // Calculate the mirror's normal vector (perpendicular to mirror)
  const mirrorVector = { 
    x: x2 - x1, 
    y: y2 - y1 
  };
  const mirrorLength = Math.sqrt(mirrorVector.x * mirrorVector.x + mirrorVector.y * mirrorVector.y);
  
  // Get normalized normal vector
  const normal = {
    x: -mirrorVector.y / mirrorLength,
    y: mirrorVector.x / mirrorLength
  };
  
  // Calculate the actual positions of both sides of the mirror
  const halfWidth = MIRROR_WIDTH / 2;
  
  // Blue side coordinates
  const blueX1 = x1 + normal.x * halfWidth;
  const blueY1 = y1 + normal.y * halfWidth;
  const blueX2 = x2 + normal.x * halfWidth;
  const blueY2 = y2 + normal.y * halfWidth;
  
  // Black side coordinates
  const blackX1 = x1 - normal.x * halfWidth;
  const blackY1 = y1 - normal.y * halfWidth;
  const blackX2 = x2 - normal.x * halfWidth;
  const blackY2 = y2 - normal.y * halfWidth;
  
  // Add the new mirror to the mirrors array
  mirrors.push({
    // Center line (for calculation purposes)
    x1, y1, x2, y2,
    // Blue reflective side
    blueX1, blueY1, blueX2, blueY2,
    // Black non-reflective side
    blackX1, blackY1, blackX2, blackY2,
    // Properties
    thickness: MIRROR_THICKNESS,
    normal: normal,
    width: MIRROR_WIDTH
  });
  
  // Recalculate reflections with the new mirror
  calculateReflections();
}

// Improved function to check which mirrors are visible from the eye
function getVisibleMirrors() {
  const visibleMirrors = [];
  
  for (let mirror of mirrors) {
    // To check if a mirror is visible, sample multiple points along the blue side
    const numSamples = 5;
    let anyPointVisible = false;
    
    for (let i = 0; i <= numSamples; i++) {
      // Sample points along the blue side of the mirror
      const t = i / numSamples;
      const sampleX = mirror.blueX1 * (1 - t) + mirror.blueX2 * t;
      const sampleY = mirror.blueY1 * (1 - t) + mirror.blueY2 * t;
      
      // Check if there's a clear line of sight from eye to this sample point
      let hasDirectSight = true;
      
      for (let otherMirror of mirrors) {
        // Skip the mirror we're testing
        if (otherMirror === mirror) continue;
        
        // Check if any other mirror blocks the view
        const intersection = lineIntersection(
          eyePosition.x, eyePosition.y,
          sampleX, sampleY,
          otherMirror.x1, otherMirror.y1,
          otherMirror.x2, otherMirror.y2
        );
        
        if (intersection) {
          // Calculate distance to the intersection and to the sample point
          const distToIntersection = dist(eyePosition.x, eyePosition.y, intersection.x, intersection.y);
          const distToSample = dist(eyePosition.x, eyePosition.y, sampleX, sampleY);
          
          // If the intersection is closer than the sample, view is blocked
          if (distToIntersection < distToSample * 0.99) { // Small margin for floating point errors
            hasDirectSight = false;
            break;
          }
        }
      }
      
      // Check if we're looking at the blue side
      if (hasDirectSight) {
        const eyeToSample = {
          x: sampleX - eyePosition.x,
          y: sampleY - eyePosition.y
        };
        
        // If dot product is negative, we're looking at the blue side
        const lookingAtBlueSide = dotProduct(mirror.normal, eyeToSample) < 0;
        
        if (lookingAtBlueSide) {
          anyPointVisible = true;
          break;
        }
      }
    }
    
    if (anyPointVisible) {
      visibleMirrors.push(mirror);
    }
  }
  
  return visibleMirrors;
}

// Function to load a puzzle from the puzzles folder
function loadPuzzle(puzzleFilename) {
  isPuzzleMode = true;
  isPuzzleSolved = false;
  isPuzzleFailed = false;
  currentPuzzleFilename = puzzleFilename; // Store the filename
  
  // Clear any existing timer
  if (timeLimitInterval) {
    clearInterval(timeLimitInterval);
    timeLimitInterval = null;
  }
  
  // Reset puzzle start time
  puzzleStartTime = new Date().getTime();
  
  console.log(`Loading puzzle: ${puzzleFilename}`);
  
  // Load the puzzle JSON file
  fetch(`puzzles/${puzzleFilename}`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to fetch puzzle: ${response.status} ${response.statusText}`);
      }
      return response.json();
    })
    .then(puzzleData => {
      currentPuzzle = puzzleData;
      console.log(`Loaded puzzle: ${currentPuzzle.name}`);
      
      // Load the associated arrangement
      return fetch(`arrangements/${currentPuzzle.arrangement}`)
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to fetch arrangement: ${response.status} ${response.statusText}`);
          }
          return response.json();
        });
    })
    .then(arrangementData => {
      // If the puzzle has randomization settings, apply them
      if (currentPuzzle.randomize) {
        applyRandomization(arrangementData);
      }

      // Import the arrangement
      const success = importArrangement(arrangementData);
      if (!success) {
        throw new Error("Failed to import arrangement");
      }
      
      // Display puzzle information
      displayPuzzleInfo();
    })
    .catch(error => {
      console.error(`Error loading puzzle: ${error.message}`);
      
      // Show error message to user
      const errorMsg = document.createElement('div');
      errorMsg.className = 'error-message';
      errorMsg.textContent = `Error loading puzzle: ${error.message}`;
      errorMsg.style.position = 'fixed';
      errorMsg.style.top = '10px';
      errorMsg.style.left = '50%';
      errorMsg.style.transform = 'translateX(-50%)';
      errorMsg.style.backgroundColor = '#ffebee';
      errorMsg.style.color = '#f44336';
      errorMsg.style.padding = '10px';
      errorMsg.style.borderRadius = '4px';
      errorMsg.style.zIndex = '1000';
      document.body.appendChild(errorMsg);
      
      // Remove the error message after 5 seconds
      setTimeout(() => {
        errorMsg.remove();
      }, 5000);
      
      // Exit puzzle mode on error
      exitPuzzleMode();
    });
}

// Function to apply randomization to an arrangement based on puzzle settings
function applyRandomization(arrangementData) {
  const randomize = currentPuzzle.randomize;
  
  // Randomize ball position if specified
  if (randomize.ball) {
    const ballSettings = randomize.ball;
    
    // If specific region is provided, use it
    if (ballSettings.region) {
      const region = ballSettings.region;
      arrangementData.ball.x = random(region.x || 0, region.width || width);
      arrangementData.ball.y = random(region.y || 0, region.height || height * 0.7);
    } 
    // Otherwise randomize within safe bounds
    else {
      const ballRadius = arrangementData.ball.radius || BALL_RADIUS;
      arrangementData.ball.x = random(ballRadius, width - ballRadius);
      arrangementData.ball.y = random(ballRadius, height * 0.7); // Keep ball in upper 70% of screen
    }
  }
  
  // Randomize eye position if specified
  if (randomize.eye) {
    const eyeSettings = randomize.eye;
    
    // If specific region is provided, use it
    if (eyeSettings.region) {
      const region = eyeSettings.region;
      arrangementData.eye.x = random(region.x || 0, region.width || width);
      arrangementData.eye.y = random(region.y || height * 0.5, region.height || height);
    } 
    // Otherwise randomize within safe bounds
    else {
      arrangementData.eye.x = random(EYE_SIZE, width - EYE_SIZE);
      arrangementData.eye.y = random(height * 0.5, height - EYE_SIZE); // Keep eye in lower half of screen
    }
  }
  
  // Randomize mirrors if specified
  if (randomize.mirrors) {
    const mirrorSettings = randomize.mirrors;
    
    // For each mirror in the arrangement
    for (let i = 0; i < arrangementData.mirrors.length; i++) {
      const mirror = arrangementData.mirrors[i];
      
      // Randomize position if specified
      if (mirrorSettings.position) {
        let region = mirrorSettings.region || {
          x: 0, 
          y: 0, 
          width: width, 
          height: height * 0.8 // Keep mirrors in upper 80% of screen
        };
        
        // Calculate center point for the mirror
        const centerX = random(region.x + MIRROR_LENGTH/2, region.width - MIRROR_LENGTH/2);
        const centerY = random(region.y + MIRROR_LENGTH/2, region.height - MIRROR_LENGTH/2);
        
        // Randomize rotation angle if specified
        let angle = 0;
        if (mirrorSettings.rotation) {
          if (typeof mirrorSettings.rotation === 'object') {
            angle = random(mirrorSettings.rotation.min || 0, mirrorSettings.rotation.max || TWO_PI);
          } else {
            angle = random(TWO_PI);
          }
        }
        
        // Calculate mirror length
        let mirrorLength = MIRROR_LENGTH;
        if (mirrorSettings.size) {
          if (typeof mirrorSettings.size === 'object') {
            mirrorLength = random(mirrorSettings.size.min || MIRROR_LENGTH/2, 
                                mirrorSettings.size.max || MIRROR_LENGTH*2);
          } else {
            // Random variation of +/- 25% from standard length
            mirrorLength = random(MIRROR_LENGTH * 0.75, MIRROR_LENGTH * 1.25);
          }
        }
        
        // Calculate new endpoint positions based on center, angle, and length
        const halfLength = mirrorLength / 2;
        mirror.x1 = centerX - cos(angle) * halfLength;
        mirror.y1 = centerY - sin(angle) * halfLength;
        mirror.x2 = centerX + cos(angle) * halfLength;
        mirror.y2 = centerY + sin(angle) * halfLength;
        
        // Calculate the mirror's normal vector
        const mirrorVector = { 
          x: mirror.x2 - mirror.x1, 
          y: mirror.y2 - mirror.y1 
        };
        const mirrorActualLength = Math.sqrt(mirrorVector.x * mirrorVector.x + mirrorVector.y * mirrorVector.y);
        
        // Get normalized normal vector
        mirror.normal = {
          x: -mirrorVector.y / mirrorActualLength,
          y: mirrorVector.x / mirrorActualLength
        };
      }
      
      // Randomize mirror width if specified
      if (mirrorSettings.width) {
        if (typeof mirrorSettings.width === 'object') {
          mirror.width = random(mirrorSettings.width.min || 2, 
                              mirrorSettings.width.max || 8);
        } else {
          // Random variation of +/- 50% from standard width
          mirror.width = random(MIRROR_WIDTH * 0.5, MIRROR_WIDTH * 1.5);
        }
      }
    }
  }
  
  // If specified, randomize the number of mirrors
  if (randomize.mirrors && randomize.mirrors.count) {
    const countSettings = randomize.mirrors.count;
    let targetCount;
    
    if (typeof countSettings === 'object') {
      targetCount = Math.floor(random(countSettings.min || 1, (countSettings.max || 5) + 1));
    } else {
      targetCount = Math.max(1, Math.floor(random(1, 6))); // 1-5 mirrors
    }
    
    // Current count
    const currentCount = arrangementData.mirrors.length;
    
    // If we need more mirrors, add them
    if (targetCount > currentCount) {
      for (let i = currentCount; i < targetCount; i++) {
        addRandomMirror(arrangementData, randomize.mirrors);
      }
    }
    // If we need fewer mirrors, remove some
    else if (targetCount < currentCount) {
      // Remove random mirrors until we reach target count
      while (arrangementData.mirrors.length > targetCount) {
        const indexToRemove = Math.floor(random(arrangementData.mirrors.length));
        arrangementData.mirrors.splice(indexToRemove, 1);
      }
    }
  }
}

// Helper function to add a random mirror to an arrangement
function addRandomMirror(arrangementData, mirrorSettings) {
  // Define region for new mirror
  let region = mirrorSettings.region || {
    x: 0, 
    y: 0, 
    width: width, 
    height: height * 0.8 // Keep mirrors in upper 80% of screen
  };
  
  // Calculate center point for the mirror
  const centerX = random(region.x + MIRROR_LENGTH/2, region.width - MIRROR_LENGTH/2);
  const centerY = random(region.y + MIRROR_LENGTH/2, region.height - MIRROR_LENGTH/2);
  
  // Randomize rotation angle
  let angle = 0;
  if (mirrorSettings.rotation) {
    if (typeof mirrorSettings.rotation === 'object') {
      angle = random(mirrorSettings.rotation.min || 0, mirrorSettings.rotation.max || TWO_PI);
    } else {
      angle = random(TWO_PI);
    }
  } else {
    angle = random(TWO_PI);
  }
  
  // Calculate mirror length
  let mirrorLength = MIRROR_LENGTH;
  if (mirrorSettings.size) {
    if (typeof mirrorSettings.size === 'object') {
      mirrorLength = random(mirrorSettings.size.min || MIRROR_LENGTH/2, 
                          mirrorSettings.size.max || MIRROR_LENGTH*2);
    } else {
      // Random variation of +/- 25% from standard length
      mirrorLength = random(MIRROR_LENGTH * 0.75, MIRROR_LENGTH * 1.25);
    }
  }
  
  // Calculate mirror width
  let mirrorWidth = MIRROR_WIDTH;
  if (mirrorSettings.width) {
    if (typeof mirrorSettings.width === 'object') {
      mirrorWidth = random(mirrorSettings.width.min || 2, 
                        mirrorSettings.width.max || 8);
    } else {
      // Random variation of +/- 50% from standard width
      mirrorWidth = random(MIRROR_WIDTH * 0.5, MIRROR_WIDTH * 1.5);
    }
  }
  
  // Calculate endpoints
  const halfLength = mirrorLength / 2;
  const x1 = centerX - cos(angle) * halfLength;
  const y1 = centerY - sin(angle) * halfLength;
  const x2 = centerX + cos(angle) * halfLength;
  const y2 = centerY + sin(angle) * halfLength;
  
  // Calculate the mirror's normal vector
  const mirrorVector = { 
    x: x2 - x1, 
    y: y2 - y1 
  };
  const mirrorVectorLength = Math.sqrt(mirrorVector.x * mirrorVector.x + mirrorVector.y * mirrorVector.y);
  
  // Get normalized normal vector
  const normal = {
    x: -mirrorVector.y / mirrorVectorLength,
    y: mirrorVector.x / mirrorVectorLength
  };
  
  // Add the new mirror to the arrangement
  arrangementData.mirrors.push({
    x1, y1, x2, y2,
    normal: normal,
    width: mirrorWidth
  });
}

// Function to display puzzle information
function displayPuzzleInfo() {
  if (!currentPuzzle) return;
  
  // Create or update the puzzle info panel
  let puzzleInfoPanel = document.getElementById('puzzleInfoPanel');
  if (!puzzleInfoPanel) {
    puzzleInfoPanel = document.createElement('div');
    puzzleInfoPanel.id = 'puzzleInfoPanel';
    puzzleInfoPanel.className = 'puzzle-panel';
    document.body.appendChild(puzzleInfoPanel);
  }
  
  // Check if this puzzle has a time limit
  const hasTimeLimit = hasTimeLimitCondition();
  const timerElement = hasTimeLimit ? '<div id="puzzleTimer"></div>' : '';
  
  // Set the content
  puzzleInfoPanel.innerHTML = `
    <h3>${currentPuzzle.name}</h3>
    <p>${currentPuzzle.description}</p>
    <p class="movable-objects">Movable: ${getMovableObjectsText()}</p>
    ${timerElement}
    <div id="puzzleStatus"></div>
    <button id="showHintBtn">Show Hint</button>
    <button id="resetPuzzleBtn">Reset Puzzle</button>
    <button id="exitPuzzleBtn">Exit Puzzle</button>
  `;
  
  // Set up button event listeners
  document.getElementById('showHintBtn').onclick = showPuzzleHint;
  document.getElementById('resetPuzzleBtn').onclick = resetPuzzle;
  document.getElementById('exitPuzzleBtn').onclick = exitPuzzleMode;
  
  // Start timer if needed
  if (hasTimeLimit) {
    startPuzzleTimer();
  }
}

// Helper function to get text description of movable objects
function getMovableObjectsText() {
  if (!currentPuzzle) return "";
  
  const movable = currentPuzzle.movableObjects;
  const parts = [];
  
  if (movable.mirrors) parts.push("Mirrors");
  if (movable.ball) parts.push("Ball");
  if (movable.eye) parts.push("Eye");
  
  return parts.join(", ");
}

// Function to show a random hint from the puzzle
function showPuzzleHint() {
  if (!currentPuzzle || !currentPuzzle.hints || currentPuzzle.hints.length === 0) return;
  
  // Pick a random hint
  const randomIndex = Math.floor(Math.random() * currentPuzzle.hints.length);
  const hint = currentPuzzle.hints[randomIndex];
  
  // Create or update the hint element
  let hintElement = document.getElementById('puzzleHint');
  if (!hintElement) {
    hintElement = document.createElement('div');
    hintElement.id = 'puzzleHint';
    hintElement.className = 'puzzle-hint';
    document.getElementById('puzzleInfoPanel').appendChild(hintElement);
  }
  
  hintElement.textContent = `Hint: ${hint}`;
  hintElement.style.display = 'block';
  
  // Hide the hint after 10 seconds
  setTimeout(() => {
    hintElement.style.display = 'none';
  }, 10000);
}

// Function to reset the current puzzle
function resetPuzzle() {
  if (!currentPuzzle) return;
  
  // Reset puzzle state
  isPuzzleSolved = false;
  isPuzzleFailed = false;
  
  // Clear any status messages
  const statusElement = document.getElementById('puzzleStatus');
  if (statusElement) {
    statusElement.innerHTML = '';
  }
  
  // Clear any existing timer
  if (timeLimitInterval) {
    clearInterval(timeLimitInterval);
    timeLimitInterval = null;
  }
  
  // Reset puzzle start time
  puzzleStartTime = new Date().getTime();
  
  // Load the associated arrangement
  fetch(`arrangements/${currentPuzzle.arrangement}`)
    .then(response => response.json())
    .then(arrangementData => {
      // If the puzzle has randomization settings, apply them
      if (currentPuzzle.randomize) {
        applyRandomization(arrangementData);
      }
      
      // Import the arrangement
      importArrangement(arrangementData);
      
      // If this puzzle has a time limit, restart the timer
      if (hasTimeLimitCondition()) {
        startPuzzleTimer();
      }
    })
    .catch(error => {
      console.error(`Error reloading arrangement: ${error}`);
    });
}

// Function to exit puzzle mode
function exitPuzzleMode() {
  isPuzzleMode = false;
  currentPuzzle = null;
  currentPuzzleFilename = null; // Clear the filename
  isPuzzleSolved = false;
  isPuzzleFailed = false;
  
  // Clear any existing timer
  if (timeLimitInterval) {
    clearInterval(timeLimitInterval);
    timeLimitInterval = null;
  }
  
  // Remove the puzzle info panel
  const puzzleInfoPanel = document.getElementById('puzzleInfoPanel');
  if (puzzleInfoPanel) {
    puzzleInfoPanel.remove();
  }
  
  // Reset to default game state
  initializeGame();
}

// Check if puzzle win/lose conditions are met
function checkPuzzleConditions() {
  if (!isPuzzleMode || !currentPuzzle) return;
  
  // Skip if puzzle is already solved or failed
  if (isPuzzleSolved || isPuzzleFailed) return;
  
  // Count reflections by order
  const reflectionCounts = countReflectionsByOrder();
  
  // Check win conditions
  let winConditionsMet = false;
  
  if (currentPuzzle.winConditions) {
    // Multiple win conditions (all must be met)
    winConditionsMet = currentPuzzle.winConditions.every(condition => 
      checkSingleCondition(condition, reflectionCounts));
  } else if (currentPuzzle.winCondition) {
    // Single win condition
    winConditionsMet = checkSingleCondition(currentPuzzle.winCondition, reflectionCounts);
  }
  
  // Check lose conditions
  let loseConditionsMet = false;
  
  if (currentPuzzle.loseConditions) {
    // Multiple lose conditions (any one can trigger failure)
    loseConditionsMet = currentPuzzle.loseConditions.some(condition => 
      checkSingleCondition(condition, reflectionCounts));
  } else if (currentPuzzle.loseCondition) {
    // Single lose condition
    loseConditionsMet = checkSingleCondition(currentPuzzle.loseCondition, reflectionCounts);
  }
  
  // Handle puzzle solved
  if (winConditionsMet) {
    puzzleSolved();
  }
  
  // Handle puzzle failed
  if (loseConditionsMet) {
    puzzleFailed();
  }
}

// Helper function to check a single condition
function checkSingleCondition(condition, reflectionCounts) {
  switch (condition.type) {
    case 'exactReflections':
      // Check if there are exactly N reflections of order X
      return reflectionCounts[condition.order] === condition.count;
      
    case 'minReflections':
      // Check if there are at least N reflections of order X
      return reflectionCounts[condition.order] >= condition.count;
      
    case 'maxReflections':
      // Check if there are at most N reflections of order X
      return reflectionCounts[condition.order] <= condition.count;
      
    case 'totalReflections':
      // Check total reflections against operator and count
      const total = Object.values(reflectionCounts).reduce((sum, count) => sum + count, 0);
      
      switch (condition.operator) {
        case '=': return total === condition.count;
        case '>': return total > condition.count;
        case '<': return total < condition.count;
        case '>=': return total >= condition.count;
        case '<=': return total <= condition.count;
        default: return false;
      }
      
    case 'timeLimit':
      // Check if time limit is exceeded
      const currentTime = new Date().getTime();
      const elapsedSeconds = (currentTime - puzzleStartTime) / 1000;
      return elapsedSeconds > condition.seconds;
      
    default:
      console.error(`Unknown condition type: ${condition.type}`);
      return false;
  }
}

// Count reflections grouped by their order/depth
function countReflectionsByOrder() {
  const counts = {};
  
  // Initialize counts for all possible orders
  for (let i = 1; i <= MAX_REFLECTIONS; i++) {
    counts[i] = 0;
  }
  
  // Count visible reflections by their depth
  for (let reflection of reflections) {
    if (isReflectionVisible(reflection)) {
      counts[reflection.depth] = (counts[reflection.depth] || 0) + 1;
    }
  }
  
  return counts;
}

// Handle puzzle solved
function puzzleSolved() {
  isPuzzleSolved = true;
  
  // Stop the timer if it's running
  if (timeLimitInterval) {
    clearInterval(timeLimitInterval);
    timeLimitInterval = null;
  }
  
  // Update status in the puzzle panel
  const statusElement = document.getElementById('puzzleStatus');
  if (statusElement) {
    statusElement.innerHTML = `
      <div class="status-success">PUZZLE SOLVED!</div>
      <button id="retryPuzzleBtn">Try Again</button>
    `;
    
    // Set up retry button
    document.getElementById('retryPuzzleBtn').onclick = resetPuzzle;
  }
}

// Handle puzzle failed
function puzzleFailed() {
  isPuzzleFailed = true;
  
  // Stop the timer if it's running
  if (timeLimitInterval) {
    clearInterval(timeLimitInterval);
    timeLimitInterval = null;
  }
  
  // Update status in the puzzle panel
  const statusElement = document.getElementById('puzzleStatus');
  if (statusElement) {
    statusElement.innerHTML = `
      <div class="status-failure">PUZZLE FAILED</div>
      <button id="retryPuzzleBtn">Try Again</button>
    `;
    
    // Set up retry button
    document.getElementById('retryPuzzleBtn').onclick = resetPuzzle;
  }
}

// Check if the puzzle has a time limit condition
function hasTimeLimitCondition() {
  if (!currentPuzzle) return false;
  
  // Check single lose condition
  if (currentPuzzle.loseCondition && currentPuzzle.loseCondition.type === 'timeLimit') {
    return true;
  }
  
  // Check multiple lose conditions
  if (currentPuzzle.loseConditions) {
    return currentPuzzle.loseConditions.some(condition => condition.type === 'timeLimit');
  }
  
  return false;
}

// Get the time limit in seconds from puzzle conditions
function getPuzzleTimeLimit() {
  if (!currentPuzzle) return 0;
  
  // Check single lose condition
  if (currentPuzzle.loseCondition && currentPuzzle.loseCondition.type === 'timeLimit') {
    return currentPuzzle.loseCondition.seconds;
  }
  
  // Check multiple lose conditions
  if (currentPuzzle.loseConditions) {
    const timeCondition = currentPuzzle.loseConditions.find(condition => condition.type === 'timeLimit');
    if (timeCondition) {
      return timeCondition.seconds;
    }
  }
  
  return 0;
}

// Start the puzzle timer
function startPuzzleTimer() {
  // Clear any existing interval
  if (timeLimitInterval) {
    clearInterval(timeLimitInterval);
  }
  
  // Get the time limit
  const timeLimit = getPuzzleTimeLimit();
  if (!timeLimit) return;
  
  // Update timer every second
  timeLimitInterval = setInterval(() => {
    // Calculate remaining time
    const currentTime = new Date().getTime();
    const elapsedSeconds = Math.floor((currentTime - puzzleStartTime) / 1000);
    const remainingSeconds = Math.max(0, timeLimit - elapsedSeconds);
    
    // Format the time as MM:SS
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    const timeDisplay = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Update the timer display
    const timerElement = document.getElementById('puzzleTimer');
    if (timerElement) {
      timerElement.innerHTML = `Time: ${timeDisplay}`;
      
      // Highlight timer when time is running low (less than 10 seconds)
      if (remainingSeconds < 10) {
        timerElement.classList.add('time-low');
      } else {
        timerElement.classList.remove('time-low');
      }
    }
    
    // Check if time has run out
    if (remainingSeconds === 0) {
      clearInterval(timeLimitInterval);
      
      // If the puzzle isn't already solved or failed, mark it as failed
      if (!isPuzzleSolved && !isPuzzleFailed) {
        puzzleFailed();
      }
    }
  }, 1000);
}

// Mouse released function
function mouseReleased() {
  // Reset dragging state regardless of puzzle state
  isDragging = false;
  draggedObject = null;
  draggedMirrorPoint = null;
  draggedMirrorIndex = null;
} 