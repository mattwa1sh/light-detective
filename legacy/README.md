# Light Detective

Light Detective is a 2D browser-based puzzle game that challenges you to reverse-engineer the placement of mirrors and a ball by matching reflected images.

## How to Play

1. **Goal**: Position the blue ball and mirrors to create reflections that match the yellow ghost targets.
2. **Success**: When your reflections match all the targets, they turn green and you solve the level!

## Controls

- **Blue Ball**: Drag to position
- **Mirrors**: Drag the black dots at the ends to move and rotate mirrors
- **Add Mirror**: Press `A` to add a new mirror (click and drag to place)
- **Reset Level**: Press `R` to reset the current level
- **Next Level**: Press `N` to go to the next level (after solving the current one)

## Technical Details

This game demonstrates principles of optics like the law of reflection (angle of incidence = angle of reflection) in a fun and interactive way. The game is built using p5.js, a JavaScript library for creative coding.

## Development

The game follows these core technical steps:

1. Calculate reflections using vector math
2. Compare user-generated reflections to targets
3. Provide visual feedback for matches

## Levels

- **Level 1**: Basic single mirror reflection
- **Level 2**: Two mirrors with multiple reflections
- **Level 3**: Free-form - create your own mirror arrangement to match three targets

Enjoy playing! 