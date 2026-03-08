# Clickable Audit Checklist

Every button, link, and clickable element must have a distinct purpose and working implementation. No dead buttons.

## Audit Criteria

For each interactive element:
1. **Purpose** – What user goal does it serve?
2. **Implementation** – Does it have an `onClick`, `href`, or equivalent handler?
3. **Feedback** – Does the user get visible feedback (navigation, state change, toast)?
4. **Disabled state** – If disabled, is it disabled for a clear reason?

## Checklist

### Sidebar
| Element | Purpose | Handler | Status |
|---------|---------|---------|--------|
| Nav links | Navigate to route | Link href | ✓ |
| Expand/collapse toggle | Toggle sidebar width | onClick | ✓ |

### Map Page
| Element | Purpose | Handler | Status |
|---------|---------|---------|--------|
| Draw tools (Polygon, Line, Point, Select) | Enter draw mode | setDrawMode | ✓ |
| Undo (while drawing) | Remove last point | undoLastPoint | ✓ |
| Node Palette items | Select draw tool | setDrawMode | ✓ |
| Layer control toggle | Expand/collapse | onClick | ✓ |
| Layer visibility toggle | Toggle layer | toggleLayerVisibility | ✓ |
| Survey Import link | Navigate to settings | Link href | ✓ |
| Save Changes | Persist feedback | onClick (shows "Saved") | ✓ |
| Node markers | Select node | onClick | ✓ |
| Polygon/line features | Select node | data click listener | ✓ |
| Node Action Menu Close | Close menu | setSelectedMapNode(null) | ✓ |
| Node Action Menu Manage | View details | (panel already open) | ✓ |
| Node Action Menu Rename | Rename node | prompt + updateNode | ✓ |
| Node Action Menu Delete | Delete with confirm | removeNode | ✓ |
| Node Detail Panel Close (X) | Close panel | setSelectedMapNode(null) | ✓ |
| Node Detail Panel Add (+) | Add item, switch tab | setTab + setAddRequested | ✓ |
| Node Detail Panel tabs | Switch tab content | onClick | ✓ |
| Node Detail Panel Close button | Close panel | setSelectedMapNode(null) | ✓ |
| Add Activity (in Activity tab) | Open form | setShowForm | ✓ |
| Add Planting (in Plantings tab) | Open form | setShowForm | ✓ |
| CreateNodeModal Cancel | Cancel create | setCompletedGeometry(null) | ✓ |
| CreateNodeModal Create | Create node | addNode + setCompletedGeometry | ✓ |

### Nodes Page
| Element | Purpose | Handler | Status |
|---------|---------|---------|--------|
| Flow nodes | Select node | (via React Flow) | ✓ |
| Auto layout | Re-layout flow | onLayout | ✓ |
| Survey Import link | Navigate to settings | Link href | ✓ |

### Settings
| Element | Purpose | Handler | Status |
|---------|---------|---------|--------|
| Add to map | Add layer to map | addToMap | ✓ |
| File input | Trigger file upload | onChange | ✓ |

## Grep Rules for Audit

```bash
# Find buttons without onClick
rg '<button' --type tsx -A 2 | grep -v onClick

# Find buttons with empty or placeholder handlers
rg 'onClick=\{\s*\}'
rg 'onClick={() => {}}'
```

## Remediation

Any button without a handler or with a no-op handler must either:
- Be wired to real behavior
- Be removed
- Be disabled with a clear reason (e.g. "Coming soon" with tooltip)
