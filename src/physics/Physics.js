import { Octree } from 'three/addons/math/Octree.js';
import { OctreeHelper } from 'three/addons/helpers/OctreeHelper.js';

/**
 * World physics: an Octree built from collidable meshes, plus gravity.
 * Same collision strategy as the reference template — a Capsule (the player)
 * is intersected against this Octree each frame so you can't walk through
 * walls, trees, props, or the ground.
 *
 * The key difference from the reference: there, the Octree was built only from
 * a loaded GLB. Here it's built from whatever collidable meshes the World
 * module produces — placeholder primitives OR a dropped-in GLB — so collision
 * works in both cases.
 */
export const GRAVITY = 30;

export class Physics {
  constructor() {
    this.octree = new Octree();
    this.helper = null;
  }

  /**
   * (Re)build the collision tree from a node (group/scene/mesh).
   * @param {THREE.Object3D} node — root whose meshes become collidable.
   */
  buildFrom(node) {
    this.octree = new Octree();
    this.octree.fromGraphNode(node);
  }

  /** Optional debug wireframe of the Octree. Toggle with the H key in main.js. */
  attachHelper(scene) {
    this.helper = new OctreeHelper(this.octree);
    this.helper.visible = false;
    scene.add(this.helper);
    return this.helper;
  }

  toggleHelper() {
    if (this.helper) this.helper.visible = !this.helper.visible;
  }
}
