/* eslint-disable react-hooks/set-state-in-effect --
   Граф ReactFlow контролируемый: позиции узлов живут в локальном state, чтобы при
   перетаскивании узел плавно следовал за курсором (onNodesChange). Синхронизация
   из внешних props (tasks + сохранённая раскладка) неизбежно идёт через effect. */
import { useCallback, useEffect, useState } from 'react';
import '@xyflow/react/dist/style.css';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';
import { Flame, Sparkles } from 'lucide-react';
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
        <span className="mb-2 flex items-center gap-1.5">
          <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight ${badge}`}>
            {data.tag}
          </span>
          {data.isImportant ? <Flame size={13} className="text-orange-400 animate-pulse shrink-0" /> : null}
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

export default function TasksMindMapView({
  tasks,
  onTaskClick,
  editable = false,
  onAddDependency,
  onRemoveDependency,
  onLoadLayout,
  onSaveLayout,
}) {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  // saved: Map<taskId,{x,y}> сохранённых позиций. null — пока не загрузили.
  const [saved, setSaved] = useState(null);

  // 1) Загрузка сохранённой раскладки (один раз; onLoadLayout стабилен через useCallback в родителе).
  useEffect(() => {
    let cancelled = false;
    if (!onLoadLayout) { setSaved(new Map()); return undefined; }
    onLoadLayout()
      .then((rows) => { if (!cancelled) setSaved(new Map((rows ?? []).map((r) => [r.taskId, { x: r.x, y: r.y }]))); })
      .catch(() => { if (!cancelled) setSaved(new Map()); });
    return () => { cancelled = true; };
  }, [onLoadLayout]);

  // 2) Пересборка узлов/рёбер при изменении задач или сохранённой раскладки.
  //    Сохранённые позиции перекрывают авто-раскладку; новые задачи — авто.
  useEffect(() => {
    if (!saved) return;
    const flow = tasksToFlowElements(tasks);
    setNodes(flow.nodes.map((n) => ({
      ...n,
      position: saved.get(n.id) ?? n.position,
      data: { ...n.data, onOpen: onTaskClick },
    })));
    setEdges(flow.edges);
  }, [tasks, saved, onTaskClick]);

  const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);

  // Перетащили узел — сохраняем его позицию (для своей аудитории).
  const handleNodeDragStop = useCallback((_e, node) => {
    const pos = { x: Math.round(node.position.x), y: Math.round(node.position.y) };
    setSaved((prev) => { const m = new Map(prev ?? []); m.set(node.id, pos); return m; });
    onSaveLayout?.([{ taskId: node.id, x: pos.x, y: pos.y }]);
  }, [onSaveLayout]);

  // «Упорядочить»: авто-раскладка по зависимостям + сохранить (перезаписать ручные сдвиги).
  const handleTidy = useCallback(() => {
    const flow = tasksToFlowElements(tasks);
    const positions = flow.nodes.map((n) => ({ taskId: n.id, x: n.position.x, y: n.position.y }));
    setSaved(new Map(positions.map((p) => [p.taskId, { x: p.x, y: p.y }])));
    onSaveLayout?.(positions);
  }, [tasks, onSaveLayout]);

  // Связи (только для PM): добавление/удаление, граф пересоберётся из обновлённых задач.
  const handleConnect = useCallback((params) => {
    if (!editable || !onAddDependency || !params.source || !params.target) return;
    onAddDependency(params.target, params.source); // ребро source→target: target зависит от source
  }, [editable, onAddDependency]);

  const handleEdgesDelete = useCallback((deleted) => {
    if (!editable || !onRemoveDependency) return;
    deleted.forEach((e) => onRemoveDependency(e.target, e.source));
  }, [editable, onRemoveDependency]);

  return (
    <div className="relative flex min-h-[480px] flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-[#F8FAFC]">
      {editable && (
        <div className="shrink-0 border-b border-slate-200/70 bg-white/70 px-4 py-2 text-[11px] font-semibold text-slate-500">
          Потяните от правого края одной задачи к левому краю другой, чтобы создать зависимость. Выделите связь и нажмите Delete, чтобы удалить.
        </div>
      )}

      {/* Кнопка «Упорядочить» — поверх графа */}
      <button
        type="button"
        onClick={handleTidy}
        className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-bold text-[#3C50B4] shadow-sm backdrop-blur transition hover:bg-white"
        title="Авто-раскладка по зависимостям"
        style={editable ? { top: '3rem' } : undefined}
      >
        <Sparkles size={14} /> Упорядочить
      </button>

      {nodes.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
          {saved === null ? 'Загружаем граф…' : 'Нет задач для отображения'}
        </div>
      ) : (
        <ReactFlow
          className="h-full min-h-[480px] w-full"
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStop={handleNodeDragStop}
          nodeTypes={nodeTypes}
          nodesDraggable
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
      )}
    </div>
  );
}
