const $placeholder = Symbol();
const $container = Symbol();
const $nextSiblingPatched = Symbol();
const $childNodesPatched = Symbol();

declare global {
  interface Node {
    [$container]?: HTMLElement;
    [$nextSiblingPatched]?: true;
    [$placeholder]: Comment;
    [$childNodesPatched]?: true;
    content: ChildNode[];
  }
}

const isContainer = (node: HTMLElement) => 'content' in node;

const patchParentNode = (node: Node, container: HTMLElement) => {
  if ($container in node) {
    return;
  }

  node[$container] = container;

  Object.defineProperty(node, 'parentNode', {
    get(this: HTMLElement) {
      return this[$container] || this.parentElement;
    },
  });
};

const patchNextSibling = (node: Node) => {
  if ($nextSiblingPatched in node) {
    return;
  }

  node[$nextSiblingPatched] = true;

  Object.defineProperty(node, 'nextSibling', {
    get(this: HTMLElement) {
      const { childNodes } = this.parentNode!;
      const index = [...childNodes].indexOf(this);
      if (index > -1) {
        return childNodes[index + 1] || null;
      }
      return null;
    },
  });
};

const patchChildNodes = (element: HTMLElement) => {
  if ($childNodesPatched in element) {
    return;
  }

  element[$childNodesPatched] = true;

  Object.defineProperties(element, {
    childNodes: {
      get(this: HTMLElement) {
        return this.content || getChildNodesInContainer(this);
      },
    },
    firstChild: {
      get(this: HTMLElement) {
        return this.childNodes[0] || null;
      },
    },
  });

  element.hasChildNodes = function (this: HTMLElement) {
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
  this.content[0].before(...nodes);
}

function remove(this: HTMLElement) {
  // If the fragment is being removed, all children, including placeholder should be removed
  const { content } = this;
  const removed = content.splice(0, content.length);

  removed.forEach((node: ChildNode) => {
    node.remove();
  });
}

function addPlaceholder(node: HTMLElement, insertBeforeNode: ChildNode) {
  const placeholder = node[$placeholder];

  insertBeforeNode.before(placeholder);
  patchParentNode(placeholder, node);
  node.content.unshift(placeholder);
}

function removeChild(this: HTMLElement, node: HTMLElement) {
  if (isContainer(this)) {
    // If this is a fragment element
    const hasChildInFragment = this.content.indexOf(node);
    if (hasChildInFragment > -1) {
      const [removedNode] = this.content.splice(hasChildInFragment, 1);

      // If last node, insert placeholder
      if (this.content.length === 0) {
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
  const insertNodes = insertNode.content || [insertNode];

  // If this element is a fragment, insert nodes in virtual fragment
  if (isContainer(this)) {
    const { content } = this;

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

  insertNodes.forEach((node) => {
    patchParentNode(node, this);
  });

  const lastNode = insertNodes[insertNodes.length - 1];
  patchNextSibling(lastNode);

  return insertNode;
}

function appendChild(this: HTMLElement, node: HTMLElement) {
  const { content } = this;
  const lastChild = content[content.length - 1];

  lastChild.after(node);
  patchParentNode(node, this);

  removePlaceholder(this);

  content.push(node);

  return node;
}

function removePlaceholder(node: HTMLElement) {
  const placeholder = node[$placeholder];
  if (node.content[0] === placeholder) {
    node.content.shift();
    placeholder.remove();
  }
}

export const vueElement = {
  inserted(element: HTMLElement) {
    const { parentNode, nextSibling, previousSibling } = element;
    const childNodes = [...element.childNodes];
    const placeholder = document.createComment('');

    if (childNodes.length === 0) {
      childNodes.push(placeholder);
    }

    element.content = childNodes;
    element[$placeholder] = placeholder;

    const fragment = document.createDocumentFragment();
    fragment.append(...childNodes);
    element.replaceWith(fragment);

    childNodes.forEach((node) => {
      patchParentNode(node, element);
      patchNextSibling(node);
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
      set(this: HTMLElement, htmlString: string) {
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
