# World / environment models

Drop a low-poly park/garden **GLB** here (e.g. `soycraft-park.glb`), then point to
it in `src/config/settings.js`:

```js
assets: {
  worldModel: '/world/soycraft-park.glb',
}
```

When `worldModel` is set, the procedural placeholder park is skipped and this GLB
becomes the walkable, collidable world (the Octree is built from its meshes).

Tips for performance (most traffic is mobile):
- Keep it low-poly (aim < ~80k triangles for the whole scene).
- Bake lighting into the textures where you can; use compressed textures (KTX2/Basis).
- Center the model near the origin and scale it so 1 unit ≈ 1 meter.
- Make sure there's a flat-ish floor near `(0, 0, 0)` — that's where the player spawns.
