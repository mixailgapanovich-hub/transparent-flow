import React, { useMemo } from 'react';
import '@xyflow/react/dist/style.css';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
} from '@xyflow/react';
import { tasksToFlowElements } from '../utils/taskGraphLayout';

const STATUS_RING = {
  backlog: 'ring-slate-200',
  'to-do': 'ring-blue-200',
  'in-progress': 'ring-violet-200',
  waiting: 'ring-orange-200',
  done: 'ring-emerald-200',
};

const TAG_BADGE = {
  Блокирующая: 'bg-red-500 text-white',
  Ключевая: 'bg-[#FFD700] text-slate-900',
  Обычная: 'bg-slate-100 text-slate-500',
};

function TaskNode({ data }) {
  const ring = STATUS_RING[data.status] ?? STATUS_RING.backlog;
  const badge = TAG_BADGE[data.tag] ?? TAG_BADGE.Обычная;

  return (
    <>
      <Handle type="target" position={Position.Left} className="!bg-slate-400 !w-2 !h-2" />
      <div
        className={`rounded-xl border border-slate-100 bg-white p-3 shadow-sm ring-2 ring-offset-2 ring-offset-white w-[260px] ${ring}`}
      >
        <span className={`mb-2 inline-block text-[10px] font-bold uppercase tracking-tight rounded-md px-2 py-0.5 ${badge}`}>
          {data.tag}
        </span>
        <p className="text-xs font-semibold leading-snug text-slate-800">{data.title}</p>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-slate-400 !w-2 !h-2" />
    </>
  );
}

const nodeTypes = { taskNode: TaskNode };

export default function TasksMindMapView({ tasks }) {
  const { nodes, edges } = useMemo(() => tasksToFlowElements(tasks), [tasks]);

  const flowKey = useMemo(
    () =>
      tasks
        .map((t) => `${t.id}:${t.status}:${(t.dependsOn ?? []).join(',')}`)
        .join('|'),
    [tasks]
  );

  return (
    <div className="flex min-h-[480px] flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-[#F8FAFC]">
      <ReactFlow
        className="h-full min-h-[480px] w-full"
        key={flowKey}
        defaultNodes={nodes}
        defaultEdges={edges}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
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
        <Controls showInteractive={false} className="!shadow-md" />
      </ReactFlow>
    </div>
  );
}
