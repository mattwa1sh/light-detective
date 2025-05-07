/**
 * Light Detective - A physics-based puzzle game about reflections
 * 
 * This game randomly places a ball and mirrors, with an eye fixed at the center bottom
 * of the canvas to observe the reflections.
 */

// Game constants
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;
const BALL_RADIUS = 15;
const MIRROR_COUNT = 3;
const MIRROR_LENGTH = BALL_RADIUS * 10; // Fixed mirror length (5 times ball diameter)
const MIRROR_THICKNESS = 4;
const EYE_SIZE = 40;
const MAX_REFLECTIONS = 10; // Maximum number of reflections to prevent infinite loops
const MIN_REFLECTION_SIZE_RATIO = 0.05; // Minimum size ratio to original ball (10%)

// Game objects
let ball; 
let mirrors = [];
let eye;
let eyePosition = {x: 0, y: 0}; // Will be set in setup
let reflections = []; // Array to store calculated reflections

// Dragging state
let isDragging = false;
let draggedObject = null;
let draggedMirrorPoint = null; // Which endpoint of a mirror is being dragged

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
    
    // Add mirror
    mirrors.push({
      x1, y1, x2, y2,
      thickness: MIRROR_THICKNESS
    });
  }
  
  // Clear reflections
  reflections = [];
}

function drawMirrors() {
  // Draw all mirrors as light blue lines
  stroke(100, 200, 255);
  strokeWeight(MIRROR_THICKNESS);
  
  for (let mirror of mirrors) {
    // Draw the line for the mirror
    line(mirror.x1, mirror.y1, mirror.x2, mirror.y2);
    //console.log(mirror.x1 + "," + mirror.y1 + " " + mirror.x2 + "," + mirror.y2);
  }
}

function drawBall() {
  // Draw the ball as a blue circle
  fill(50, 100, 255);
  noStroke();
  ellipse(ball.x, ball.y, ball.radius * 2);
}

function drawReflections() {
  // Draw all reflections as green balls
  fill(50, 200, 100, 200); // Semi-transparent green
  noStroke();
  
  for (let reflection of reflections) {
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

function calculateReflections() {
  // Clear previous reflections
  reflections = [];

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
      {x: (mirror.x1 + mirror.x2) / 2, y: (mirror.y1 + mirror.y2) / 2} // midpoint
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
  
  // Now calculate reflections only for visible mirrors
  for (let mirror of visibleMirrors) {
    calculateMirrorReflection(mirror, ball, ball.radius, 1, visibleMirrors);
  }
}

function calculateMirrorReflection(mirror, object, objectRadius, depth, visibleMirrors) {
  // Don't go beyond max reflection depth
  if (depth > MAX_REFLECTIONS) return;
  
  // Don't calculate reflections that are too small
  if (objectRadius / BALL_RADIUS < MIN_REFLECTION_SIZE_RATIO) return;
  
  // Get mirror direction vector
  const mirrorVector = { 
    x: mirror.x2 - mirror.x1, 
    y: mirror.y2 - mirror.y1 
  };
  const mirrorLength = Math.sqrt(mirrorVector.x * mirrorVector.x + mirrorVector.y * mirrorVector.y);
  
  // Get normalized mirror direction and normal
  const mirrorDir = {
    x: mirrorVector.x / mirrorLength,
    y: mirrorVector.y / mirrorLength
  };
  
  // Get mirror normal (perpendicular to mirror)
  const mirrorNormal = {
    x: -mirrorDir.y,
    y: mirrorDir.x
  };
  
  // Calculate reflection of object across mirror line
  // First find distance from object to mirror along normal
  const objectToMirrorVec = {
    x: object.x - mirror.x1,
    y: object.y - mirror.y1
  };
  const normalDistance = dotProduct(objectToMirrorVec, mirrorNormal);
  
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
    radius: reflectionRadius
  };
  
  // Now check if the eye can see this virtual object through the mirror
  // Line from eye to virtual object
  const eyeToVirtualObject = {
    start: {x: eyePosition.x, y: eyePosition.y},
    end: {x: virtualObject.x, y: virtualObject.y}
  };
  
  // Find intersection of this line with the mirror
  const intersection = lineIntersection(
    eyeToVirtualObject.start.x, eyeToVirtualObject.start.y,
    eyeToVirtualObject.end.x, eyeToVirtualObject.end.y,
    mirror.x1, mirror.y1,
    mirror.x2, mirror.y2
  );
  
  // If there's an intersection, check if the eye can actually see this point on the mirror
  if (intersection) {
    // Check that virtual object and eye are on opposite sides of the mirror
    const intersectionToEye = {
      x: eyePosition.x - intersection.x,
      y: eyePosition.y - intersection.y
    };
    const intersectionToVirtual = {
      x: virtualObject.x - intersection.x,
      y: virtualObject.y - intersection.y
    };
    
    // Calculate dot product to see if they're pointing in opposite directions
    const dotProd = dotProduct(intersectionToEye, intersectionToVirtual);
    
    // If dot product is negative, they're on opposite sides of the mirror (correct)
    if (dotProd < 0) {
      // One last check: Make sure no other mirror is blocking the view from eye to intersection
      let hasObstacle = false;
      
      for (let otherMirror of mirrors) {
        // Skip the mirror we're reflecting in
        if (otherMirror === mirror) continue;
        
        // Check if the line from eye to intersection point intersects any other mirror
        const blockingIntersection = lineIntersection(
          eyePosition.x, eyePosition.y,
          intersection.x, intersection.y,
          otherMirror.x1, otherMirror.y1,
          otherMirror.x2, otherMirror.y2
        );
        
        if (blockingIntersection) {
          hasObstacle = true;
          break;
        }
      }
      
      // Only show reflection if nothing is blocking the view
      if (!hasObstacle) {
        // Add the reflection at the virtual object position
        reflections.push({
          x: virtualObject.x,
          y: virtualObject.y,
          radius: virtualObject.radius,
          depth: depth
        });
        
        // Calculate reflections of this reflection in other mirrors
        for (let otherMirror of visibleMirrors) {
          // Skip the mirror that created this reflection
          if (otherMirror === mirror) continue;
          
          // Calculate reflection of this reflection in the other mirror
          calculateMirrorReflection(otherMirror, virtualObject, virtualObject.radius, depth + 1, visibleMirrors);
        }
      }
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

function keyPressed() {
  if (key === 'r' || key === 'R') {
    initializeGame();
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
  
  // Check if clicked on a mirror endpoint
  for (let i = 0; i < mirrors.length; i++) {
    const mirror = mirrors[i];
    
    // Check first endpoint
    if (dist(mouseX, mouseY, mirror.x1, mirror.y1) < 10) {
      isDragging = true;
      draggedObject = 'mirror';
      draggedMirrorPoint = {index: i, point: 1};
      return;
    }
    
    // Check second endpoint
    if (dist(mouseX, mouseY, mirror.x2, mirror.y2) < 10) {
      isDragging = true;
      draggedObject = 'mirror';
      draggedMirrorPoint = {index: i, point: 2};
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
  else if (draggedObject === 'mirror' && draggedMirrorPoint) {
    // Get the mirror being dragged
    const mirror = mirrors[draggedMirrorPoint.index];
    
    // Update the appropriate endpoint
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
} 