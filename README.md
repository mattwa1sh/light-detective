# Light Detective

A physics-based reflection puzzle game where you experiment with mirrors, light paths, and reflections.

## Overview

Light Detective is an interactive simulation that demonstrates the physics of light reflections. The game places a ball and mirrors in a scene, with an eye at the bottom of the screen to observe the various reflections created by the mirrors.

## How to Play

1. Open `index.html` in a web browser to start the game
2. Interact with the game elements:
   - **Ball**: Click and drag the blue ball to reposition it
   - **Mirrors**: Drag the endpoints to adjust the angle and position, or drag the middle to move the entire mirror
   - **Eye**: Drag to change your viewing position

## Game Elements

### Objects
- **Blue Ball**: The original object being reflected
- **Mirrors**: Have two sides:
  - **Blue Side**: Reflective surface that creates reflections
  - **Black Side**: Non-reflective back side

### Reflections
The game calculates and displays reflections based on the position of mirrors:
- **Green Balls**: First-order reflections (reflected once)
- **Purple Balls**: Second-order reflections (reflected twice)
- **Orange Balls**: Third-order reflections (reflected three times)
- **Teal Balls**: Fourth-order reflections (reflected four times)
- **Red Balls**: Higher-order reflections (reflected five or more times)

### Ray Paths
Ray paths show how light travels from the eye, to mirrors, and to the ball:
- Use the **Cycle Rays** button to cycle through visible reflections
- Use the **Hide Rays** button to hide all ray paths
- Ray colors match their corresponding reflection orders (green for first-order, etc.)
- Each ray accurately traces the path light would follow, showing:
  - Where it hits each mirror surface
  - The proper angles of incidence and reflection
  - The complete path from eye to ball

## Physics Features
- **Reflection Visibility**: Only reflections visible from the eye's position are shown
- **Canvas Boundaries**: Reflections outside the canvas area are not shown
- **Scaling**: Reflections get smaller based on distance from the original ball
- **Partial Mirror Visibility**: Only portions of mirrors directly visible to the eye can create reflections

## Controls
- **Cycle Rays**: Shows ray paths one at a time, cycling through all visible reflections
- **Hide Rays**: Turns off all ray path visibility
- **Add Mirror**: Adds a new mirror to the scene
- **Reset**: Randomizes the game with new positions for the ball and mirrors

## Development
This game is built using:
- HTML5 for structure
- CSS for styling
- p5.js for canvas operations and drawing
- JavaScript for physics calculations and interactivity 