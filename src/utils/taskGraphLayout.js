const COL_WIDTH = 300;
const ROW_GAP = 110;

/**
 * @param {Array<{ id: string, title: string, tag: string, status: string, dependsOn?: string[] }>} tasks
 * @returns {{ nodes: import('@xyflow/react').Node[], edges: import('@xyflow/react').Edge[] }}
 */
export function tasksToFlowElements(tasks) {
  const byId = Object.fromEntries(tasks.map((t) => [t.id, t]));
  const depthMemo = {};

  function depth(id) {
    if (depthMemo[id] != null) return depthMemo[id];
    const task = byId[id];
    if (!task) return (depthMemo[id] = 0);
    const deps = task.dependsOn ?? [];
    if (deps.length === 0) return (depthMemo[id] = 0);
    return (depthMemo[id] = 1 + Math.max(...deps.map((d) => depth(d))));
  }

  tasks.forEach((t) => depth(t.id));

  const byDepth = {};
  for (const t of tasks) {
    const d = depth(t.id);
    if (!byDepth[d]) byDepth[d] = [];
    byDepth[d].push(t);
  }

  const nodes = [];
  for (const d of Object.keys(byDepth)
    .map(Number)
    .sort((a, b) => a - b)) {
    const row = byDepth[d];
    row.forEach((task, i) => {
      nodes.push({
        id: task.id,
        type: 'taskNode',
        position: { x: d * COL_WIDTH, y: i * ROW_GAP },
        data: { title: task.title, tag: task.tag, status: task.status },
      });
    });
  }

  const edges = [];
  for (const task of tasks) {
    for (const prereqId of task.dependsOn ?? []) {
      if (!byId[prereqId]) continue;
      edges.push({
        id: `${prereqId}-${task.id}`,
        source: prereqId,
        target: task.id,
        type: 'smoothstep',
      });
    }
  }

  return { nodes, edges };
}
