"use client";
import dynamic from "next/dynamic";
import type { Edge, Node, NodeMouseHandler, OnNodesChange, OnEdgesChange } from "@xyflow/react";
import { Skeleton } from "@/components/ui/primitives";

/**
 * Code-split React Flow (besar) — dimuat client-only agar bundle halaman
 * ringan & SSR tidak membawa xyflow.
 */
const ReactFlowInner = dynamic(
  () =>
    import("@xyflow/react").then((m) => {
      const { ReactFlow, Background, Controls } = m;
      return function Inner({
        nodes,
        edges,
        onNodeClick,
        onNodesChange,
        onEdgesChange,
        height,
      }: {
        nodes: Node[];
        edges: Edge[];
        onNodeClick?: NodeMouseHandler;
        onNodesChange?: OnNodesChange;
        onEdgesChange?: OnEdgesChange;
        height?: number;
      }) {
        return (
          <div style={{ height: height ?? "100%" }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodeClick={onNodeClick}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              fitView
              fitViewOptions={{ padding: 0.25 }}
              proOptions={{ hideAttribution: true }}
              nodesConnectable={false}
              onlyRenderVisibleElements
            >
              <Background color="#21262D" gap={24} />
              <Controls />
            </ReactFlow>
          </div>
        );
      };
    }),
  { ssr: false, loading: () => <Skeleton className="h-full min-h-[320px]" /> },
);

export function FlowCanvas({
  nodes,
  edges,
  onNodeClick,
  onNodesChange,
  onEdgesChange,
  height,
}: {
  nodes: Node[];
  edges: Edge[];
  onNodeClick?: NodeMouseHandler;
  onNodesChange?: OnNodesChange;
  onEdgesChange?: OnEdgesChange;
  height?: number;
}) {
  return <ReactFlowInner nodes={nodes} edges={edges} onNodeClick={onNodeClick} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} height={height} />;
}
