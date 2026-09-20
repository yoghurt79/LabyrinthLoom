import { Raycaster, Vector2, type Camera, type Intersection, type Object3D } from 'three';

const raycaster = new Raycaster();
const pointer = new Vector2();

export function raycastFromPointer(
  event: PointerEvent,
  canvas: HTMLCanvasElement,
  camera: Camera,
  objects: Object3D[],
): Intersection[] {
  const bounds = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  return raycaster.intersectObjects(objects, false);
}
