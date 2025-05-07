let mirrors = [];
let ball;
let maxReflections = 3;
let targetReflections = []; // Array to store target reflections
let userReflections = []; // Array to store user-generated reflections
let matchTolerance = 5; // Pixel tolerance for matching reflections
let isPuzzleSolved = false;
let currentLevel = 0;
let levels = []; // Will store level configurations
let addingMirror = false;
let mirrorStartX, mirrorStartY; // Coordinates for new mirror start point
let debugMode = true; // Toggle for debug visualization

function setup() {
	createCanvas(windowWidth, windowHeight);
	
	// Initialize levels - now done after canvas is created
	initializeLevels();
	
	// Load the first level
	loadLevel(currentLevel);
	
	// Create UI buttons
	createUI();
}

function draw() {
	background(255);
	
	// Draw mirrors
	for (let mirror of mirrors) {
		mirror.show();
	}
	
	// Draw ball
	ball.show();
	
	// Calculate reflections based on current arrangement
	userReflections = calculateReflections(ball, mirrors, maxReflections);
	
	// Debug draw: Show normal vectors for each mirror
	if (debugMode) {
		drawDebugInfo();
	}
	
	// Draw target reflections (yellow ghosts)
	for (let target of targetReflections) {
		fill(255, 255, 0, 150);
		noStroke();
		ellipse(target.x, target.y, target.r * 2);
	}
	
	// Draw user reflections and check for matches
	let matchedCount = 0;
	
	for (let reflection of userReflections) {
		// Check if this reflection matches any target
		let isMatched = isReflectionMatched(reflection, targetReflections, matchTolerance);
		
		// Draw reflection based on matched status
		if (isMatched) {
			fill(0, 255, 0, 200); // Green for matched reflections
			matchedCount++;
		} else {
			fill(0, 100, 255, 150); // Blue for unmatched reflections
		}
		noStroke();
		ellipse(reflection.x, reflection.y, reflection.r * 2);
	}
	
	// Check if puzzle is solved
	if (matchedCount >= targetReflections.length && targetReflections.length > 0) {
		if (!isPuzzleSolved) {
			isPuzzleSolved = true;
			console.log("Puzzle solved!");
		}
		
		// Display success message
		fill(0, 200, 0);
		textSize(32);
		textAlign(CENTER, CENTER);
		text("Puzzle Solved!", width/2, 50);
		text("Press 'N' for next level", width/2, 90);
	} else {
		isPuzzleSolved = false;
	}
	
	// Draw UI instructions
	textAlign(LEFT, TOP);
	fill(0);
	textSize(14);
	text("Drag blue ball to position", 20, 20);
	text("Drag black dots to move mirror endpoints", 20, 40);
	text("Press 'A' to add a new mirror", 20, 60);
	text("Press 'R' to reset level", 20, 80);
	text("Level: " + (currentLevel + 1), 20, 100);
	text("Press 'D' to toggle debug mode", 20, 120);
	text("Debug mode: " + (debugMode ? "ON" : "OFF"), 20, 140);

	// If adding a mirror, draw the preview line
	if (addingMirror && mirrorStartX !== undefined) {
		stroke(100, 100, 255);
		strokeWeight(2);
		line(mirrorStartX, mirrorStartY, mouseX, mouseY);
	}
}

function drawDebugInfo() {
	// Draw normal vectors for mirrors
	for (let mirror of mirrors) {
		let midX = (mirror.x1 + mirror.x2) / 2;
		let midY = (mirror.y1 + mirror.y2) / 2;
		
		// Draw mirror's normal vector
		let mirrorVector = createVector(mirror.x2 - mirror.x1, mirror.y2 - mirror.y1);
		let normal = createVector(mirrorVector.y, -mirrorVector.x).normalize().mult(50);
		
		stroke(255, 0, 0);
		strokeWeight(2);
		line(midX, midY, midX + normal.x, midY + normal.y);
		
		// Show angle labels
		fill(0);
		noStroke();
		textSize(10);
		textAlign(CENTER, CENTER);
		text("N", midX + normal.x * 1.1, midY + normal.y * 1.1);
	}
	
	// Draw lines from ball to reflections
	if (userReflections.length > 0) {
		stroke(0, 0, 255, 100);
		strokeWeight(1);
		for (let reflection of userReflections) {
			line(ball.x, ball.y, reflection.x, reflection.y);
		}
	}
}

function mousePressed() {
	if (addingMirror) {
		// Start creating a new mirror
		mirrorStartX = mouseX;
		mirrorStartY = mouseY;
		return;
	}
	
	// Check if clicking on a mirror endpoint
	for (let mirror of mirrors) {
		let d1 = dist(mouseX, mouseY, mirror.x1, mirror.y1);
		let d2 = dist(mouseX, mouseY, mirror.x2, mirror.y2);
		
		// Drag threshold - 10px radius
		if (d1 < 10) {
			mirror.startDrag('p1');
			return;
		} else if (d2 < 10) {
			mirror.startDrag('p2');
			return;
		}
	}
}

function mouseReleased() {
	if (addingMirror && mirrorStartX !== undefined) {
		// Finish creating a new mirror
		// Only add if it has some length
		let length = dist(mirrorStartX, mirrorStartY, mouseX, mouseY);
		if (length > 10) {
			mirrors.push(new Mirror(mirrorStartX, mirrorStartY, mouseX, mouseY));
		}
		
		addingMirror = false;
		mirrorStartX = undefined;
		mirrorStartY = undefined;
		return;
	}
	
	// Stop dragging all mirrors
	for (let mirror of mirrors) {
		mirror.stopDrag();
	}
}

function mouseDragged() {
	// Check if we're dragging a mirror endpoint
	let mirrorDragged = false;
	for (let mirror of mirrors) {
		if (mirror.isDragging) {
			mirror.drag(mouseX, mouseY);
			mirrorDragged = true;
		}
	}
	
	// If no mirror is being dragged, move the ball
	if (!mirrorDragged && !addingMirror) {
		ball.setPosition(mouseX, mouseY);
	}
}

function keyPressed() {
	if (key === 'a' || key === 'A') {
		// Start adding a new mirror
		addingMirror = true;
	} else if (key === 'r' || key === 'R') {
		// Reset the current level
		loadLevel(currentLevel);
	} else if ((key === 'n' || key === 'N') && isPuzzleSolved) {
		// Go to next level if puzzle is solved
		nextLevel();
	} else if (key === 'd' || key === 'D') {
		// Toggle debug mode
		debugMode = !debugMode;
	}
}

function initializeLevels() {
	// Clear existing levels
	levels = [];
	
	// Level 1: Basic single mirror
	levels.push({
		ballPos: { x: width / 3, y: height / 2 },
		mirrors: [
			{ x1: width / 2, y1: height / 4, x2: width / 2, y2: 3 * height / 4 }
		],
		targets: [
			{ x: 2 * width / 3, y: height / 2, r: 20 }
		]
	});
	
	// Level 2: Two mirrors
	levels.push({
		ballPos: { x: width / 4, y: height / 4 },
		mirrors: [
			{ x1: width / 2, y1: height / 4, x2: width / 2, y2: 3 * height / 4 },
			{ x1: width / 2, y1: 3 * height / 4, x2: 3 * width / 4, y2: 3 * height / 4 }
		],
		targets: [
			{ x: 3 * width / 4, y: height / 4, r: 20 },
			{ x: width / 4, y: 3 * height / 4, r: 20 }
		]
	});
	
	// Level 3: Free-form - no initial mirrors, user must create them
	levels.push({
		ballPos: { x: width / 4, y: height / 4 },
		mirrors: [],
		targets: [
			{ x: 3 * width / 4, y: 3 * height / 4, r: 20 },
			{ x: 3 * width / 4, y: height / 4, r: 20 },
			{ x: width / 4, y: 3 * height / 4, r: 20 }
		]
	});
}

function loadLevel(levelIndex) {
	if (levelIndex >= levels.length) {
		// No more levels, go back to the first one
		levelIndex = 0;
	}
	
	// Get the level data
	let level = levels[levelIndex];
	
	// Reset game state
	isPuzzleSolved = false;
	addingMirror = false;
	mirrors = [];
	targetReflections = [];
	
	// Set the ball position
	ball = new Ball(level.ballPos.x, level.ballPos.y, 20);
	
	// Create mirrors
	for (let m of level.mirrors) {
		mirrors.push(new Mirror(m.x1, m.y1, m.x2, m.y2));
	}
	
	// Set target reflections
	targetReflections = level.targets;
	
	// Update current level
	currentLevel = levelIndex;
}

function nextLevel() {
	loadLevel(currentLevel + 1);
}

function createUI() {
	// Simple text-based UI is created in the draw function
}

class Ball {
	constructor(x, y, r) {
		this.x = x;
		this.y = y;
		this.r = r;
	}
	show() {
		fill(0, 100, 255);
		noStroke();
		ellipse(this.x, this.y, this.r * 2);
	}
	setPosition(x, y) {
		this.x = x;
		this.y = y;
	}
}

class Mirror {
	constructor(x1, y1, x2, y2) {
		this.x1 = x1;
		this.y1 = y1;
		this.x2 = x2;
		this.y2 = y2;
		this.isDragging = false;
		this.dragPoint = null; // Which endpoint is being dragged
	}
	
	show() {
		stroke(0);
		strokeWeight(2);
		line(this.x1, this.y1, this.x2, this.y2);
		
		// Show endpoints for dragging
		fill(0);
		noStroke();
		ellipse(this.x1, this.y1, 8);
		ellipse(this.x2, this.y2, 8);
	}
	
	startDrag(point) {
		this.isDragging = true;
		this.dragPoint = point;
	}
	
	stopDrag() {
		this.isDragging = false;
		this.dragPoint = null;
	}
	
	drag(x, y) {
		if (this.dragPoint === 'p1') {
			this.x1 = x;
			this.y1 = y;
		} else if (this.dragPoint === 'p2') {
			this.x2 = x;
			this.y2 = y;
		}
	}
}
