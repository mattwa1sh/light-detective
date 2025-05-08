# Light Detective Puzzles

This folder contains puzzle files for the Light Detective game. Each puzzle is a JSON file that defines an optical challenge for players to solve.

## Puzzle File Structure

```json
{
  "name": "Puzzle Name",
  "description": "Puzzle description visible to the player",
  "arrangement": "filename.json",
  "movableObjects": {
    "mirrors": true/false,
    "ball": true/false,
    "eye": true/false
  },
  "winCondition": {
    "type": "condition-type",
    "order": number,
    "count": number,
    "operator": "="/">"/"<"/">=",
    ...
  },
  "loseCondition": {
    ...
  },
  "hints": [
    "Hint 1",
    "Hint 2",
    ...
  ]
}
```

## Win Condition Types

- `exactReflections`: Exactly N reflections of order X
- `minReflections`: At least N reflections of order X
- `maxReflections`: At most N reflections of order X
- `totalReflections`: Total reflections across all orders matches a comparison

For `totalReflections`, use the `operator` field with one of: `=`, `>`, `<`, `>=`, `<=`

## Multiple Conditions

For more complex puzzles, you can use multiple win or lose conditions:

```json
"winConditions": [
  { "type": "exactReflections", "order": 1, "count": 3 },
  { "type": "exactReflections", "order": 2, "count": 1 }
],
"loseConditions": [
  { "type": "totalReflections", "operator": ">", "count": 5 },
  { "type": "timeLimit", "seconds": 120 }
]
```

## Creating New Puzzles

1. Start by creating an arrangement in sandbox mode
2. Export the arrangement to the `arrangements` folder
3. Create a new puzzle JSON file referencing that arrangement
4. Define the movable objects and win/lose conditions
5. Add helpful hints for players

Happy puzzling!