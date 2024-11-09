# Elebus

The elebus for creating a tree-like event bus

## Overview

The library provides 2 tools for working with the event bus:
1) root node (transport)
2) nodes (subscription tree nodes)

transport implements all the basic interfaces of the event bus and is the main node.

To combine subscriptions to several transports and access them through namespaces, the library provides nodes.

At the moment, the library provides 1 node: `baseNode`, which implements an abstract tree,
i.e. when creating child nodes of subscribers, they all directly refer to the root nodes
