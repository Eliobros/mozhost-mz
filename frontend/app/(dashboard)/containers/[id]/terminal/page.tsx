"use client";

import React from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";

const ContainerTerminal = dynamic(
  () => import("@/components/ContainerTerminal"),
  { ssr: false }
);

export default function ContainerTerminalPage() {
  const params = useParams();
  const containerId = params.id as string;

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <ContainerTerminal containerId={containerId} />
    </div>
  );
}
