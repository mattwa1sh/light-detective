/**
 * Light Detective - A physics-based puzzle game about reflections
 * 
 * This game randomly places a ball and mirrors, with an eye fixed at the center bottom
 * of the canvas to observe the reflections.
 */

// Game constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const BALL_RADIUS = 15;
const MIRROR_COUNT = 3;
const MIRROR_LENGTH = BALL_RADIUS * 10; // Fixed mirror length (5 times ball diameter)
const MIRROR_THICKNESS = 4;
const EYE_SIZE = 40;

// Game objects
let ball; 
let mirrors = [];
let eye;
let eyePosition = {x: 0, y: 0}; // Will be set in setup

// Dragging state
let isDragging = false;
let draggedObject = null;
let draggedMirrorPoint = null; // Which endpoint of a mirror is being dragged

function setup() {
  console.log("--- SETUP START ---");
  // Create a fixed-size canvas
  createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  console.log(`Canvas created: ${CANVAS_WIDTH}x${CANVAS_HEIGHT}`);
  
  // Load the eye image
  eye = loadImage('eye.svg');
  console.log("Eye image loading initiated");
  
  // Set eye position
  eyePosition = {
    x: width / 2,
    y: height - 30
  };
  console.log(`Eye position set to (${eyePosition.x}, ${eyePosition.y})`);
  
  // Initialize game objects with random positions
  initializeGame();
  console.log("--- SETUP COMPLETE ---");
}

function draw() {
  // Clear the canvas
  background(240);
  
  // Draw all mirrors
  drawMirrors();
  
  // Draw the ball
  drawBall();
  
  // Draw the eye at the center bottom
  drawEye();
}

function initializeGame() {
  console.log("--- INITIALIZING GAME ---");
  
  // Create a ball at a random position
  ball = {
    x: random(BALL_RADIUS, width - BALL_RADIUS),
    y: random(BALL_RADIUS, height * 0.7),  // Keep ball in upper 70% of screen
    radius: BALL_RADIUS
  };
  console.log(`Ball created at (${ball.x.toFixed(2)}, ${ball.y.toFixed(2)}), radius ${ball.radius}`);
  
  // Create random mirrors with fixed length
  mirrors = [];
  console.log(`Creating ${MIRROR_COUNT} random mirrors with fixed length ${MIRROR_LENGTH}:`);
  for (let i = 0; i < MIRROR_COUNT; i++) {
    // Random position for first endpoint
    const x1 = random(width);
    const y1 = random(height * 0.8); // Keep mirrors in upper 80% of screen
    
    // Random angle
    const angle = random(TWO_PI);
    
    // Calculate second endpoint with fixed length
    const x2 = x1 + cos(angle) * MIRROR_LENGTH;
    const y2 = y1 + sin(angle) * MIRROR_LENGTH;
    
    // Add mirror
    mirrors.push({
      x1, y1, x2, y2,
      thickness: MIRROR_THICKNESS
    });
    console.log(`Mirror ${i+1}: (${x1.toFixed(2)}, ${y1.toFixed(2)}) to (${x2.toFixed(2)}, ${y2.toFixed(2)}), length ${MIRROR_LENGTH}`);
  }
  
  console.log("--- GAME INITIALIZATION COMPLETE ---");
}

function drawMirrors() {
  // Draw all mirrors as light blue lines
  stroke(100, 200, 255);
  strokeWeight(MIRROR_THICKNESS);
  
  for (let mirror of mirrors) {
    // Draw the line for the mirror
    line(mirror.x1, mirror.y1, mirror.x2, mirror.y2);
    console.log(mirror.x1 + "," + mirror.y1 + " " + mirror.x2 + "," + mirror.y2);
  }
}

function drawBall() {
  // Draw the ball as a blue circle
  fill(50, 100, 255);
  noStroke();
  ellipse(ball.x, ball.y, ball.radius * 2);
}

function drawEye() {
  // Position the eye at the center bottom of the canvas
  const eyeX = eyePosition.x - EYE_SIZE / 2;
  const eyeY = eyePosition.y - EYE_SIZE / 2;
  
  // Draw the eye image
  image(eye, eyeX, eyeY, EYE_SIZE, EYE_SIZE);
}

function mousePressed() {
  console.log(`Mouse pressed at (${mouseX}, ${mouseY})`);
  
  // Check if clicked on the ball
  if (dist(mouseX, mouseY, ball.x, ball.y) < ball.radius) {
    isDragging = true;
    draggedObject = 'ball';
    console.log("Started dragging ball");
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
      console.log(`Started dragging mirror ${i} endpoint 1`);
      return;
    }
    
    // Check second endpoint
    if (dist(mouseX, mouseY, mirror.x2, mirror.y2) < 10) {
      isDragging = true;
      draggedObject = 'mirror';
      draggedMirrorPoint = {index: i, point: 2};
      console.log(`Started dragging mirror ${i} endpoint 2`);
      return;
    }
  }
  
  // Check if clicked on the eye
  if (dist(mouseX, mouseY, eyePosition.x, eyePosition.y) < EYE_SIZE / 2) {
    isDragging = true;
    draggedObject = 'eye';
    console.log("Started dragging eye");
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
    
    console.log(`Dragged ball to (${ball.x.toFixed(2)}, ${ball.y.toFixed(2)})`);
  } 
  else if (draggedObject === 'mirror' && draggedMirrorPoint) {
    // Get the mirror being dragged
    const mirror = mirrors[draggedMirrorPoint.index];
    
    // Update the appropriate endpoint
    if (draggedMirrorPoint.point === 1) {
      mirror.x1 = mouseX;
      mirror.y1 = mouseY;
      console.log(`Dragged mirror ${draggedMirrorPoint.index} endpoint 1 to (${mirror.x1.toFixed(2)}, ${mirror.y1.toFixed(2)})`);
    } else {
      mirror.x2 = mouseX;
      mirror.y2 = mouseY;
      console.log(`Dragged mirror ${draggedMirrorPoint.index} endpoint 2 to (${mirror.x2.toFixed(2)}, ${mirror.y2.toFixed(2)})`);
    }
    
    // Keep endpoints within canvas bounds
    mirror.x1 = constrain(mirror.x1, 0, width);
    mirror.y1 = constrain(mirror.y1, 0, height);
    mirror.x2 = constrain(mirror.x2, 0, width);
    mirror.y2 = constrain(mirror.y2, 0, height);
  }
  else if (draggedObject === 'eye') {
    // Move the eye to the mouse position
    eyePosition.x = mouseX;
    eyePosition.y = mouseY;
    
    // Keep eye within canvas bounds
    eyePosition.x = constrain(eyePosition.x, EYE_SIZE / 2, width - EYE_SIZE / 2);
    eyePosition.y = constrain(eyePosition.y, EYE_SIZE / 2, height - EYE_SIZE / 2);
    
    console.log(`Dragged eye to (${eyePosition.x.toFixed(2)}, ${eyePosition.y.toFixed(2)})`);
  }
}

function mouseReleased() {
  console.log(`Mouse released, stopped dragging ${draggedObject}`);
  isDragging = false;
  draggedObject = null;
  draggedMirrorPoint = null;
}

function keyPressed() {
  console.log(`Key pressed: ${key} (code: ${keyCode})`);
  
  // Reset the game with a new random arrangement when 'R' is pressed
  if (key === 'r' || key === 'R') {
    console.log("Resetting game with new random arrangement");
    initializeGame();
  }
} 