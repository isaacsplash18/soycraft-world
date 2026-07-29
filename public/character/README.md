# Character (dog) model

Drop a rigged dog **GLB** here (e.g. `soycraft-dog.glb`), then point to it in
`src/config/settings.js`:

```js
assets: {
  dogModel: '/character/soycraft-dog.glb',
  dogScale: 1.0, // tweak so the dog roughly matches the capsule height
}
```

The player code (`src/player/Player.js`) looks for these **animation clip names**
on the GLB and crossfades between them automatically:

- `Idle`
- `Walk`
- `Run`

If your model uses different clip names, either rename them in your DCC tool /
glTF, or edit the `['Idle', 'Walk', 'Run']` list in `Player.js#_loadDogGLB`.

The model should face **+Z** in its rest pose (the loader rotates it 180° to match
the camera convention; adjust `model.rotation.y` if yours faces the other way).

No model here? The game falls back to a procedural box-and-capsule "dog" so it
always runs.
