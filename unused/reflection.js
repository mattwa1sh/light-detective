/**
 * Light Detective - Reflection Engine
 * Handles the calculation of reflections using the law of reflection (angle of incidence = angle of reflection)
 */

// Maximum recursion depth for reflections
const MAX_REFLECTIONS = 3;

/**
 * Calculates all reflections for a given ball and set of mirrors
 * @param {Ball} ball - The ball to reflect
 * @param {Array} mirrors - Array of Mirror objects
 * @param {number} maxDepth - Maximum reflection depth (recursion level)
 * @returns {Array} Array of reflection objects with x, y, and r properties
 */
function calculateReflections(ball, mirrors, maxDepth = MAX_REFLECTIONS) {
    const reflections = [];
    
    // Calculate first-level reflections for each mirror
    for (let mirror of mirrors) {
        reflectBall(ball, mirror, 0, [], reflections, mirrors, maxDepth);
    }
    
    return reflections;
}

/**
 * Recursively calculates reflections of a ball across mirrors
 * @param {Object} ball - Object with x, y, r properties
 * @param {Mirror} mirror - Current mirror to reflect across
 * @param {number} depth - Current recursion depth
 * @param {Array} seenMirrors - Mirrors already used in this reflection path
 * @param {Array} reflections - Array to store resulting reflections
 * @param {Array} allMirrors - All mirrors in the scene
 * @param {number} maxDepth - Maximum recursion depth
 */
function reflectBall(ball, mirror, depth, seenMirrors, reflections, allMirrors, maxDepth) {
    // Stop recursion if max depth reached
    if (depth >= maxDepth) return;
    
    // Calculate reflection
    let reflected = reflectPoint(ball.x, ball.y, mirror);
    
    // Skip if reflection is invalid
    if (!reflected) return;
    
    // Create reflection object
    let reflection = {
        x: reflected.x,
        y: reflected.y,
        r: ball.r,
        depth: depth + 1
    };
    
    // Add to reflections array
    reflections.push(reflection);
    
    // Keep track of mirrors we've already reflected across in this path
    let newSeenMirrors = [...seenMirrors, mirror];
    
    // Recursively reflect this reflection across other mirrors
    for (let otherMirror of allMirrors) {
        // Skip the mirror we just reflected across and any mirrors already seen in this path
        if (otherMirror !== mirror && !newSeenMirrors.includes(otherMirror)) {
            reflectBall(reflection, otherMirror, depth + 1, newSeenMirrors, reflections, allMirrors, maxDepth);
        }
    }
}

/**
 * Calculates the reflection of a point across a mirror line
 * @param {number} x - X coordinate of the point
 * @param {number} y - Y coordinate of the point
 * @param {Mirror} mirror - Mirror to reflect across
 * @returns {Object|null} Reflected point with x, y coordinates or null if invalid
 */
function reflectPoint(x, y, mirror) {
    try {
        // Get mirror as a line
        let mirrorVector = createVector(mirror.x2 - mirror.x1, mirror.y2 - mirror.y1);
        
        // Skip if mirror has no length
        if (mirrorVector.mag() < 1) return null;
        
        // Get normal to the mirror (perpendicular)
        let normal = createVector(mirrorVector.y, -mirrorVector.x).normalize();
        
        // Vector from mirror start to point
        let pointVector = createVector(x - mirror.x1, y - mirror.y1);
        
        // Project point onto mirror line to find closest point on the mirror
        let mirrorNormalized = mirrorVector.copy().normalize();
        let projection = p5.Vector.dot(pointVector, mirrorNormalized);
        
        // Check if projection falls within the mirror segment
        let mirrorLength = mirrorVector.mag();
        
        // Create closest point on the mirror line
        let closestPoint = createVector(
            mirror.x1 + projection * mirrorNormalized.x,
            mirror.y1 + projection * mirrorNormalized.y
        );
        
        // Skip reflection if closest point is outside the mirror segment
        if (projection < 0 || projection > mirrorLength) {
            return null;
        }
        
        // Calculate distance from point to the mirror line
        let distance = p5.Vector.dot(pointVector, normal);
        
        // For reflection, we need to go 2x the distance in the normal direction
        let reflectionVector = createVector(
            x - 2 * distance * normal.x,
            y - 2 * distance * normal.y
        );
        
        return reflectionVector;
    } catch (e) {
        console.error("Error in reflectPoint:", e);
        return null;
    }
}

/**
 * Checks if a reflection matches any target within the given tolerance
 * @param {Object} reflection - Reflection object with x, y properties
 * @param {Array} targets - Array of target objects with x, y properties
 * @param {number} tolerance - Maximum distance to consider a match (in pixels)
 * @returns {boolean} True if the reflection matches a target
 */
function isReflectionMatched(reflection, targets, tolerance) {
    for (let target of targets) {
        let distance = dist(reflection.x, reflection.y, target.x, target.y);
        if (distance <= tolerance) {
            return true;
        }
    }
    return false;
} 