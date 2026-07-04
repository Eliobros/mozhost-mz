"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  Server,
  FolderOpen,
  Code,
  Terminal,
  FileText,
  Globe,
  ArrowLeft,
  ExternalLink,
  Play,
  Square,
  RotateCcw,
  Loader,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.mozhost.shop";

const tabs = [
  { id: "files", label: "Ficheiros", icon: FolderOpen },
  { id: "editor", label: "Editor", icon: Code },
  { id: "terminal", label: "Terminal", icon: Terminal },
  { id: "logs", label: "Logs", icon: FileText },
  { id: "domains", label: "Domínios", icon: Globe },
];

export default function ContainerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const containerId = params.id as string;

  const [container, setContainer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadContainer = async () => {
    try {
      const token = localStorage.getItem("mozhost_token");
      const res = await fetch(`${API}/api/containers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const found = (data.containers || []).find(
          (c: any) => c.id === containerId
        );
        if (found) setContainer(found);
        else setError("Container não encontrado");
      }
    } catch {
      setError("Erro ao carregar container");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContainer();
  }, [containerId]);

  const handleAction = async (action: string) => {
    setActionLoading(action);
    try {
      const token = localStorage.getItem("mozhost_token");
      const res = await fetch(`${API}/api/containers/${containerId}/${action}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await loadContainer();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const getActiveTab = () => {
    for (const tab of tabs) {
      if (pathname.includes(`/containers/${containerId}/${tab.id}`)) {
        return tab.id;
      }
    }
    return "files";
  };

  const activeTab = getActiveTab();

  const statusConfig: Record<string, any> = {
    running: { color: "green", icon: CheckCircle, text: "Rodando" },
    stopped: { color: "gray", icon: Square, text: "Parado" },
    error: { color: "red", icon: AlertCircle, text: "Erro" },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !container) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Server className="w-16 h-16 text-gray-300" />
        <p className="text-gray-500">{error || "Container não encontrado"}</p>
        <Link
          href="/containers"
          className="text-blue-600 hover:underline flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para containers
        </Link>
      </div>
    );
  }

  const sc = statusConfig[container.status] || statusConfig.stopped;
  const StatusIcon = sc.icon;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Container Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          {/* Top bar: back + name + status + actions */}
          <div className="flex items-center justify-between py-3 gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href="/containers"
                className="p-1.5 hover:bg-gray-100 rounded-lg flex-shrink-0"
                title="Voltar para containers"
              >
                <ArrowLeft className="w-5 h-5 text-gray-500" />
              </Link>
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-gray-900 truncate">
                  {container.name}
                </h1>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-500 uppercase">
                    {container.type}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                      sc.color === "green"
                        ? "bg-green-100 text-green-800 border-green-200"
                        : sc.color === "red"
                        ? "bg-red-100 text-red-800 border-red-200"
                        : "bg-gray-100 text-gray-800 border-gray-200"
                    }`}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {sc.text}
                  </span>
                  {container.port && (
                    <span className="text-xs text-gray-400">
                      Porta: {container.port}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {container.domain && (
                <a
                  href={`https://${container.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all"
                  title={container.domain}
                >
                  <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="hidden sm:inline truncate max-w-[120px]">{container.domain}</span>
                </a>
              )}
              {container.status === "stopped" || container.status === "error" ? (
                <button
                  onClick={() => handleAction("start")}
                  disabled={actionLoading === "start"}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50 transition-colors"
                  title="Iniciar"
                >
                  {actionLoading === "start" ? (
                    <Loader className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">Iniciar</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => handleAction("stop")}
                    disabled={actionLoading === "stop"}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg disabled:opacity-50 transition-colors"
                    title="Parar"
                  >
                    {actionLoading === "stop" ? (
                      <Loader className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Square className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:inline">Parar</span>
                  </button>
                  <button
                    onClick={() => handleAction("restart")}
                    disabled={actionLoading === "restart"}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all"
                    title="Reiniciar"
                  >
                    {actionLoading === "restart" ? (
                      <Loader className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:inline">Restart</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex gap-0 -mb-px overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <Link
                  key={tab.id}
                  href={`/containers/${containerId}/${tab.id}`}
                  className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-all ${
                    isActive
                      ? "border-blue-600 text-blue-600 bg-blue-50/50"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4">{children}</div>
    </div>
  );
}
