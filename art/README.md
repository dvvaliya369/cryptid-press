# DreamLayer Asset Workflow

DreamLayer creates the final visual assets before they are imported into the game.

1. Generate one reference image for a creature.
2. Review its silhouette, colors, and recognizable features.
3. Use the approved image as the reference for each behavior pose.
4. Remove the background and clean the exported PNG.
5. Place game-ready images in `public/assets/images`.
6. Record the prompt, operation, and final path in `asset-plan.json`.

Raw outputs belong in `art/generated`. Approved reference images belong in `art/references`.
The DreamLayer API key must never be added to the game or committed to Git.
