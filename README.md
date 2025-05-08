# Light Detective

A physics-based puzzle game about reflections. This game demonstrates how light reflects off mirrors, creating multiple reflections that can be observed from different angles.

## Features

- Place and manipulate a ball and mirrors
- See reflections in real-time
- Visualize ray paths for each reflection
- Export and import arrangements

## How to Play

1. **Open the game**: Simply open index.html in a modern web browser
2. **Interact with objects**:
   - Drag the blue ball to move it
   - Drag mirrors by their endpoints or middle to reposition them
   - Drag the eye to change the viewing position

## Controls

- **Reset**: Randomizes the ball and mirror positions
- **Cycle Rays**: Cycles through visualization of different reflection ray paths
- **Hide Rays**: Hides all ray visualizations
- **Add Mirror**: Adds a new mirror to the scene
- **Export**: Saves the current arrangement to a JSON file
- **Import**: Loads a previously saved arrangement from your computer

## Export/Import Functionality

### Exporting Arrangements

Click the "Export" button to save the current state of the game to a JSON file. The file will be saved with a timestamp in the filename.

### Importing Arrangements

1. Click the "Import" button to open a file selection dialog
2. Select a previously exported JSON arrangement file
3. The arrangement will be loaded immediately

## How It Works

- Blue side of mirrors reflects light
- Black side of mirrors does not reflect light
- Green balls show first-order reflections
- Purple balls show second-order reflections
- Orange balls show third-order reflections
- Reflections are only shown if they would be visible from the eye's position

## Technical Details

The game is built using:
- JavaScript and p5.js for rendering
- HTML/CSS for the user interface
- Browser's File API for importing/exporting arrangements

Arrangements are stored as JSON files containing:
- Ball position and size
- Eye position
- Mirror positions, orientations, and properties 