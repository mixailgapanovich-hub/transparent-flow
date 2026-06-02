import { useMemo, useState } from 'react';
import '@xyflow/react/dist/style.css';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
} from '@xyflow/react';
import { Flame } from 'lucide-react';
import { tasksToFlowElements } from '../utils/taskGraphLayout';
import { TASK_STATUS_RING, TASK_TAG_BADGE } from '../theme/taskStyles';

function TaskNode({ data }) {
  const ring = TASK_STATUS_RING[data.status] ?? TASK_STATUS_RING.backlog;
  const badge = TASK_TAG_BADGE[data.tag] ?? TASK_TAG_BADGE.Обычная;

  return (
    <>
      <Handle type="target" position={Position.Left} className="bg-slate-400! w-2! h-2!" />
      <button
        type="button"
        onClick={() => data.onOpen?.(data.taskId)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            data.onOpen?.(data.taskId);
          }
        }}
        className={`relative w-[260px] rounded-xl border border-slate-100 bg-white p-3 text-left shadow-sm ring-2 ring-offset-2 ring-offset-white transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3C50B4]/30 ${ring}`}
      >
        {data.isImportant ? <Flame size={14} className="absolute right-3 top-3 text-orange-400 animate-pulse" /> : null}
        <span className={`mb-2 inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight ${badge}`}>
          {data.tag}
        </span>
        {data.status === 'waiting' ? (
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-orange-600">Ждём клиента</p>
        ) : null}
        {data.status === 'client-uploaded' ? (
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-teal-600">Контент загружен</p>
        ) : null}
        <p className="text-xs font-semibold leading-snug text-slate-800">{data.title}</p>
      </button>
      <Handle type="source" position={Position.Right} className="bg-slate-400! w-2! h-2!" />
    </>
  );
}

const nodeTypes = { taskNode: TaskNode };

export default function TasksMindMapView({ tasks, onTaskClick, editable = false, onAddDependency, onRemoveDependency }) {
  // Принудительный ремоунт после каждой попытки правки связи: сбрасывает «оптимистичное»
  // ребро ReactFlow и перерисовывает граф из авторитетных tasks (изменятся лишь при успехе).
  const [nonce, setNonce] = useState(0);

  const handleConnect = (params) => {
    if (!editable || !onAddDependency || !params.source || !params.target) return;
    // Ребро source→target означает «target зависит от source».
    onAddDependency(params.target, params.source);
    setNonce((n) => n + 1);
  };

  const handleEdgesDelete = (deleted) => {
    if (!editable || !onRemoveDependency) return;
    deleted.forEach((e) => onRemoveDependency(e.target, e.source));
    setNonce((n) => n + 1);
  };

  const { nodes, edges } = useMemo(() => {
    const flow = tasksToFlowElements(tasks);
    return {
      nodes: flow.nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          onOpen: onTaskClick,
        },
      })),
      edges: flow.edges,
    };
  }, [tasks, onTaskClick]);

  const flowKey = useMemo(
    () =>
      tasks
        .map((t) => `${t.id}:${t.status}:${(t.dependsOn ?? []).join(',')}`)
        .join('|') + `#${nonce}`,
    [tasks, nonce]
  );

  return (
    <div className="flex min-h-[480px] flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-[#F8FAFC]">
      {editable && (
        <div className="shrink-0 border-b border-slate-200/70 bg-white/70 px-4 py-2 text-[11px] font-semibold text-slate-500">
          Потяните от правого края одной задачи к левому краю другой, чтобы создать зависимость. Выделите связь и нажмите Delete, чтобы удалить.
        </div>
      )}
      <ReactFlow
        className="h-full min-h-[480px] w-full"
        key={flowKey}
        defaultNodes={nodes}
        defaultEdges={edges}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={editable}
        elementsSelectable={editable}
        onConnect={handleConnect}
        onEdgesDelete={handleEdgesDelete}
        deleteKeyCode={editable ? ['Backspace', 'Delete'] : null}
        panOnScroll
        zoomOnScroll
        minZoom={0.35}
        maxZoom={1.5}
        defaultEdgeOptions={{ style: { stroke: '#94a3b8', strokeWidth: 1.5 } }}
        fitView
        fitViewOptions={{ padding: 0.15, maxZoom: 1.2 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} color="#e2e8f0" />
        <Controls showInteractive={false} className="shadow-md!" />
      </ReactFlow>
    </div>
  );
}
