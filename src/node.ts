/**
 * A doubly-linked node within a hierarchical tree.
 * Supports both lateral traversal (siblings) and vertical traversal (parent-child).
 *
 * @template Self The type of this Node subclass itself.
 * @template Child Type of the nodes stored in the children array.
 * @template Parent Type of the parent node.
 */
export class Node<Self extends Node<Self, Child, Parent>, Child = never, Parent = never> {
  /** Next sibling in the sequence. */
  next: Self | null = null;
  /** Previous sibling in the sequence. */
  prev: Self | null = null;
  /** Reference to the parent container. */
  parent: Parent | null = null;
  /** Collection of child nodes. */
  children: Child[] | null = null;

  constructor() {}

  /**
   * Connects an array of nodes as a doubly-linked sibling chain starting after this node.
   */
  set siblings(arr: Self[]) {
    const len = arr.length;
    for (let index = 0; index < len; index++) {
      const curr = arr[index];
      const nxt = arr[index + 1] || null;
      const prv = arr[index - 1] || this;
      curr.prev = prv;
      prv.next = curr;
      curr.next = nxt;
    }
  }

  /**
   * Retrieves all subsequent nodes in the current sibling chain.
   */
  get siblings(): Self[] {
    let curr = this.next;
    const res = [];
    while (curr) {
      res.push(curr);
      curr = curr.next;
    }
    return res;
  }
}
