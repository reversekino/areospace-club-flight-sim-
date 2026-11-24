# Aerospace Flight Game

A 3D flight game that runs in the browser. Pick a real aircraft and fly through 12 rings as fast as you can. It works on computers and phones.

**Play it:** open `index.html`, or turn on GitHub Pages (see below).

## Aircraft

| Plane | Type | Handling |
|---|---|---|
| Cessna 172 Skyhawk | Light trainer | Easy |
| Piper J-3 Cub | Light utility | Easy, slow |
| P-51D Mustang | WWII fighter | Fast, agile |
| F-16 Fighting Falcon | Jet fighter | Very fast |
| Boeing 747-400 | Airliner | Heavy |

## Controls

**Keyboard:** W/S nose down/up, A/D roll, Q/E rudder, Shift/Ctrl (or Z/X) throttle, R restart, M change plane.

**Phone:** left joystick to steer (pull down to climb), right slider for throttle, arrow buttons for rudder.

## How the physics works

Every frame, the game adds up four forces on the plane:

- **Thrust:** pushes it forward. Propeller thrust fades as speed goes up, and jet thrust stays steady.
- **Gravity:** pulls it down.
- **Lift:** `lift = K * speed² * CL`. The lift coefficient `CL` grows with the **angle of attack** until the wing **stalls**. Past that point, lift drops.
- **Drag:** `drag = K * speed² * (CD0 + k * CL²)`. Drag rises near the speed of sound.

`K = 0.5 × air density × wing area ÷ mass`, so each plane's wing loading changes how it flies. The numbers for each plane are in `src/physics.js`.

## Project layout

```
index.html        the playable game (everything bundled into one file)
src/physics.js    flight physics and aircraft data
src/models.js     3D models of each plane
src/game.js       scene, camera, controls, menu
src/template.html page layout and styles
src/build.sh      rebuilds index.html
```

## Editing the game

You need [Node.js](https://nodejs.org).

```
cd src
npm install
npm run build
```

Then open `index.html` to test it.

## Publishing with GitHub Pages

1. Upload this folder to a new GitHub repository.
2. Go to **Settings → Pages**.
3. Under **Source**, choose **Deploy from a branch**. Pick `main` and `/ (root)`, then save.
4. After a minute, the game is live at `https://YOUR-USERNAME.github.io/REPO-NAME/`.

Built with [three.js](https://threejs.org).
