const $placeholder = Symbol();
const $container = Symbol();
const $nextSiblingPatched = Symbol();
const $childNodesPatched = Symbol();

const isContainer = (node: HTMLElement) => 'content' in node;

const patchParentNode = (node: HTMLElement, container: HTMLElement) => {
  if ($container in node) {
    return;
  }

  (node as any)[$container] = container;

  Object.defineProperty(node, 'parentNode', {
    get() {
      return this[$container] || this.parentElement;
    },
  });
};

const patchNextSibling = (node: HTMLElement) => {
  if ($nextSiblingPatched in node) {
    return;
  }

  (node as any)[$nextSiblingPatched] = true;

  Object.defineProperty(node, 'nextSibling', {
    get() {
      const { childNodes } = this.parentNode;
      const index = childNodes.indexOf(this);
      if (index > -1) {
        return childNodes[index + 1] || null;
      }
      return null;
    },
  });
};

const patchChildNodes = (node: HTMLElement) => {
  if ($childNodesPatched in node) {
    return;
  }

  (node as any)[$childNodesPatched] = true;

  Object.defineProperties(node, {
    childNodes: {
      get() {
        return this.content || getChildNodesInContainer(this);
      },
    },
    firstChild: {
      get() {
        return this.childNodes[0] || null;
      },
    },
  });

  node.hasChildNodes = function () {
    return this.childNodes.length > 0;
  };
};

let getChildNodes: () => ChildNode[];
const getChildNodesInContainer = (node: HTMLElement) => {
  // In case SSR
  if (!getChildNodes) {
    const childNodesDescriptor = Object.getOwnPropertyDescriptor(Node.prototype, 'childNodes');
    getChildNodes = childNodesDescriptor?.get!;
  }

  return getChildNodes.apply(node);
};

function before(this: HTMLElement, ...nodes: Node[]) {
  (this as any).content[0].before(...nodes);
}

function remove(this: HTMLElement) {
  // If the fragment is being removed, all children, including placeholder should be removed
  const { content } = this as any;
  const removed = content.splice(0, content.length);

  removed.forEach((node: HTMLElement) => {
    node.remove();
  });
}

function addPlaceholder(node: HTMLElement, insertBeforeNode: HTMLElement) {
  const placeholder = (node as any)[$placeholder];

  insertBeforeNode.before(placeholder);
  patchParentNode(placeholder, node);
  (node as any).content.unshift(placeholder);
}

function removeChild(this: HTMLElement, node: HTMLElement) {
  if (isContainer(this)) {
    // If this is a fragment element
    const hasChildInFragment = (this as any).content.indexOf(node);
    if (hasChildInFragment > -1) {
      const [removedNode] = (this as any).content.splice(hasChildInFragment, 1);

      // If last node, insert placeholder
      if ((this as any).content.length === 0) {
        addPlaceholder(this, removedNode);
      }

      node.remove();
    }
  } else {
    // For frag parent
    const children = getChildNodesInContainer(this);
    const hasChild = [...children].indexOf(node);

    if (hasChild > -1) {
      node.remove();
    }
  }

  return node;
}

function insertBefore(this: HTMLElement, insertNode: HTMLElement, insertBeforeNode: HTMLElement) {
  // Should this be leaf nodes?
  const insertNodes = (insertNode as any).content || [insertNode];

  // If this element is a fragment, insert nodes in virtual fragment
  if (isContainer(this)) {
    const { content } = this as any;

    if (insertBeforeNode) {
      const index = content.indexOf(insertBeforeNode);
      if (index > -1) {
        content.splice(index, 0, ...insertNodes);
        insertBeforeNode.before(...insertNodes);
      }
    } else {
      const lastNode = content[content.length - 1];
      content.push(...insertNodes);
      lastNode.after(...insertNodes);
    }

    removePlaceholder(this);
  } else if (insertBeforeNode) {
    if ([...this.childNodes].includes(insertBeforeNode)) {
      insertBeforeNode.before(...insertNodes);
    }
  } else {
    this.append(...insertNodes);
  }

  insertNodes.forEach((node: HTMLElement) => {
    patchParentNode(node, this);
  });

  const lastNode = insertNodes[insertNodes.length - 1];
  patchNextSibling(lastNode);

  return insertNode;
}

function appendChild(this: HTMLElement, node: HTMLElement) {
  const { content } = this as any;
  const lastChild = content[content.length - 1];

  lastChild.after(node);
  patchParentNode(node, this);

  removePlaceholder(this);

  content.push(node);

  return node;
}

function removePlaceholder(node: HTMLElement) {
  const placeholder = (node as any)[$placeholder];
  if ((node as any).content[0] === placeholder) {
    (node as any).content.shift();
    placeholder.remove();
  }
}

export const vueElement = {
  inserted(element: HTMLElement) {
    const { parentNode, nextSibling, previousSibling } = element;
    const childNodes = Array.from(element.childNodes);
    const placeholder = document.createComment('');

    if (childNodes.length === 0) {
      childNodes.push(placeholder);
    }

    (element as any).content = childNodes;
    (element as any)[$placeholder] = placeholder;

    const fragment = document.createDocumentFragment();
    fragment.append(...childNodes);
    element.replaceWith(fragment);

    childNodes.forEach((node) => {
      patchParentNode(node as HTMLElement, element);
      patchNextSibling(node as HTMLElement);
    });

    patchChildNodes(element);

    Object.assign(element, {
      remove,
      appendChild,
      insertBefore,
      removeChild,
      before,
    });

    Object.defineProperty(element, 'innerHTML', {
      set(htmlString) {
        const domify = document.createElement('div');
        domify.innerHTML = htmlString;

        const oldNodesIndex = this.content.length;

        Array.from(domify.childNodes).forEach((node) => {
          this.appendChild(node);
        });

        domify.append(...this.content.splice(0, oldNodesIndex));
      },
      get() {
        return '';
      },
    });

    if (parentNode) {
      Object.assign(parentNode, {
        removeChild,
        insertBefore,
      });
      patchParentNode(element, parentNode as HTMLElement);
      patchChildNodes(parentNode as HTMLElement);
    }

    if (nextSibling) {
      patchNextSibling(element);
    }

    if (previousSibling) {
      patchNextSibling(previousSibling as HTMLElement);
    }
  },
  unbind(element: HTMLElement) {
    element.remove();
  },
};
