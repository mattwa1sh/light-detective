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

// Dragging state
let isDragging = false;
let draggedObject = null;
let draggedMirrorPoint = null; // Which endpoint of a mirror is being dragged
let draggedMirrorIndex = null; // Index of the mirror being dragged for middle dragging

// This function runs when the page loads
window.onload = function() {
  // Get the toggle button and add a click event handler
  const toggleBtn = document.getElementById('toggleRay');
  if (toggleBtn) {
    toggleBtn.onclick = function() {
      showRayPaths = !showRayPaths; // Toggle the ray paths
    };
  }
  
  // Get the add mirror button and add a click event handler
  const addMirrorBtn = document.getElementById('addMirror');
  if (addMirrorBtn) {
    addMirrorBtn.onclick = function() {
      addNewMirror(); // Add a new mirror
    };
  }
};

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
}

function initializeGame() {
  // Create a ball at a random position
  ball = {
    x: random(BALL_RADIUS, width - BALL_RADIUS),
    y: random(BALL_RADIUS, height * 0.7),  // Keep ball in upper 70% of screen
    radius: BALL_RADIUS
  };
  
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
  }
  
  // Clear reflections
  reflections = [];
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
  for (let reflection of reflections) {
    let path = traceRayPath(reflection);
    if (path.length < 2) continue;
    
    // Color by order
    switch (reflection.depth) {
      case 1:
        // First-order paths - Green
        stroke(50, 200, 100, 120);
        break;
      case 2:
        // Second-order paths - Purple
        stroke(180, 100, 255, 120);
        break;
      case 3:
        // Third-order paths - Orange
        stroke(255, 150, 50, 120);
        break;
      case 4:
        // Fourth-order paths - Teal
        stroke(0, 200, 200, 120);
        break;
      default:
        // Higher orders - Red
        stroke(255, 100, 100, 120);
        break;
    }
    
    strokeWeight(2);
    noFill();
    beginShape();
    for (let pt of path) {
      vertex(pt.x, pt.y);
    }
    endShape();
  }
}

// Function to trace the ray path from the eye to the ball for a given reflection
function traceRayPath(reflection) {
  // Only trace paths for visible reflections
  if (!isReflectionVisible(reflection)) return [];
  
  let path = [{ x: eyePosition.x, y: eyePosition.y }];
  let current = reflection;
  
  // Add the reflection point
  path.push({ x: current.x, y: current.y });
  
  // Find intersection of line from eye to current reflection with the mirror
  let mirror = current.sourceMirror;
  const intersection = lineIntersection(
    eyePosition.x, eyePosition.y, 
    current.x, current.y,
    mirror.x1, mirror.y1, 
    mirror.x2, mirror.y2
  );
  
  if (intersection) {
    path.splice(1, 0, intersection); // Insert intersection between eye and reflection
  }
  
  // For first-order reflections, add the original ball
  if (current.depth === 1) {
    path.push({ x: ball.x, y: ball.y });
  } else if (current.parentReflection) {
    // For higher-order reflections, recursively get the parent path
    let parentPath = traceRayPath(current.parentReflection);
    if (parentPath.length > 0) {
      // Remove the eye from parent path to avoid duplicates
      parentPath.shift();
      // Add the parent path
      path = path.concat(parentPath);
    }
  }
  
  return path;
}

// Function to calculate reflections
function calculateReflections() {
  // Clear previous reflections
  reflections = [];

  // For direct testing - generate reflections for all mirrors first
  // Make sure each mirror has a direct first-order reflection
  for (let mirror of mirrors) {
    // Use the stored normal vector for this mirror
    const mirrorNormal = mirror.normal;
    
    // Calculate reflection of ball across mirror line
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
    
    // Calculate reflection size based on distance to mirror
    // Further away = smaller reflection
    const distanceFactor = 1 / (1 + distToMirror * 0.005);
    const reflectionRadius = ball.radius * distanceFactor;
    
    // Don't show reflections that would be too small
    if (reflectionRadius < BALL_RADIUS * MIN_REFLECTION_SIZE_RATIO) continue;
    
    // Reflection of ball position is on opposite side of mirror, same distance from mirror
    const virtualBall = {
      x: ball.x - 2 * normalDistance * mirrorNormal.x,
      y: ball.y - 2 * normalDistance * mirrorNormal.y,
      radius: reflectionRadius,
      depth: 1,
      sourceMirror: mirror,
      parentReflection: null // First-order reflections don't have parent reflections
    };
    
    // Add this first-order reflection
    reflections.push(virtualBall);
  }

  // Then check for second-order reflections and higher
  // First check which mirrors are visible from the eye
  const visibleMirrors = [];
  
  for (let mirror of mirrors) {
    // For a mirror to be visible, the eye must have a clear line of sight 
    // to at least one point on the mirror
    let mirrorVisible = false;
    
    // Check visibility to mirror endpoints and midpoint
    const checkPoints = [
      {x: mirror.x1, y: mirror.y1},
      {x: mirror.x2, y: mirror.y2},
      {x: (mirror.x1 + mirror.x2) / 2, y: (mirror.y1 + mirror.y2) / 2}, // midpoint
      {x: (mirror.x1 + mirror.x2) * 0.25 + mirror.x1, y: (mirror.y1 + mirror.y2) * 0.25 + mirror.y1}, // 1/4 point
      {x: (mirror.x1 + mirror.x2) * 0.75 + mirror.x1, y: (mirror.y1 + mirror.y2) * 0.75 + mirror.y1}  // 3/4 point
    ];
    
    for (let point of checkPoints) {
      // Create a line from eye to this point on the mirror
      const eyeToPoint = {
        start: {x: eyePosition.x, y: eyePosition.y},
        end: {x: point.x, y: point.y}
      };
      
      // Check if this line intersects with any other mirror
      let hasObstacle = false;
      
      for (let otherMirror of mirrors) {
        // Skip checking against the mirror we're testing visibility for
        if (otherMirror === mirror) continue;
        
        // Check if the line intersects this other mirror
        const intersection = lineIntersection(
          eyeToPoint.start.x, eyeToPoint.start.y,
          eyeToPoint.end.x, eyeToPoint.end.y,
          otherMirror.x1, otherMirror.y1,
          otherMirror.x2, otherMirror.y2
        );
        
        if (intersection) {
          hasObstacle = true;
          break;
        }
      }
      
      // If no obstacles, this part of the mirror is visible
      if (!hasObstacle) {
        mirrorVisible = true;
        break;
      }
    }
    
    // If mirror is visible, add it to visible mirrors
    if (mirrorVisible) {
      visibleMirrors.push(mirror);
    }
  }
  
  // Calculate higher-order reflections for each first-order reflection
  const firstOrderReflections = [...reflections]; // Copy the array of first-order reflections
  for (let reflection of firstOrderReflections) {
    // Calculate reflection of this reflection in other mirrors
    for (let otherMirror of visibleMirrors) {
      // Skip the mirror that created this reflection
      if (otherMirror === reflection.sourceMirror) continue;
      
      calculateHigherOrderReflection(otherMirror, reflection, reflection.radius, 2, visibleMirrors);
    }
  }
}

// Calculate higher-order reflections (2nd order and above)
function calculateHigherOrderReflection(mirror, object, objectRadius, depth, visibleMirrors) {
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
  
  // Calculate reflection size based on distance to mirror
  // Further away = smaller reflection
  const distanceFactor = 1 / (1 + distToMirror * 0.005);
  const reflectionRadius = objectRadius * distanceFactor;
  
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
  
  // Add this higher-order reflection
  reflections.push(virtualObject);
  
  // Recursively calculate next level reflections
  for (let otherMirror of visibleMirrors) {
    // Skip the mirror that created this reflection
    if (otherMirror === mirror) continue;
    
    calculateHigherOrderReflection(otherMirror, virtualObject, virtualObject.radius, depth + 1, visibleMirrors);
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

function keyPressed() {
  if (key === 'r' || key === 'R') {
    initializeGame();
    return false;
  }
  
  // Toggle ray paths with 'p' key
  if (key === 'p' || key === 'P') {
    showRayPaths = !showRayPaths;
    return false;
  }
  
  return false;
}

function mousePressed() {
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

function mouseDragged() {
  if (!isDragging) return;
  
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
        mirror.y2 = height;
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
}

function mouseReleased() {
  isDragging = false;
  draggedObject = null;
  draggedMirrorPoint = null;
  draggedMirrorIndex = null;
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

// Function to check if a reflection is visible from current eye position
function isReflectionVisible(reflection) {
  // Get the source mirror that created this reflection
  const mirror = reflection.sourceMirror;
  const mirrorNormal = mirror.normal;
  
  // Create a line from eye to reflection
  const eye = eyePosition;
  
  // Find intersection of eye-to-reflection line with the mirror
  const intersection = lineIntersection(
    eye.x, eye.y,
    reflection.x, reflection.y,
    mirror.x1, mirror.y1,
    mirror.x2, mirror.y2
  );
  
  // If no intersection, the reflection is not visible
  if (!intersection) return false;
  
  // Calculate vectors for the blue and black sides of the mirror
  const blueVector = {
    x: mirror.blueX1 - mirror.x1,
    y: mirror.blueY1 - mirror.y1
  };
  
  // Create a vector from mirror center line to intersection point
  const toIntersection = {
    x: intersection.x - mirror.x1,
    y: intersection.y - mirror.y1
  };
  
  // Calculate the direction from eye to intersection
  const eyeToIntersection = {
    x: intersection.x - eye.x,
    y: intersection.y - eye.y
  };
  
  // When dot product of normal and eyeToIntersection is negative,
  // the eye is looking at the blue side of the mirror first
  const lookingAtBlueSideFirst = dotProduct(mirrorNormal, eyeToIntersection) < 0;
  
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
  
  // For a reflection to be visible, the ray must:
  // 1. Hit the blue side of the mirror first
  // 2. Then reach the reflection
  return lookingAtBlueSideFirst && intersectsBeforeReflection;
} 