"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Globe,
  Plus,
  Link2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  AlertCircle,
  Loader,
} from "lucide-react";

const API = "https://api.mozhost.shop";

export default function ContainerDomainsPage() {
  const params = useParams();
  const containerId = params.id as string;

  const [domains, setDomains] = useState<any[]>([]);
  const [container, setContainer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{
    message: string;
    type: string;
  } | null>(null);

  const showToast = (message: string, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const hdrs = () => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("mozhost_token")
        : "";
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  };

  const cpy = (t: string) => {
    navigator.clipboard.writeText(t);
    showToast("Copiado!");
  };

  const loadData = async () => {
    try {
      const [domRes, contRes] = await Promise.all([
        fetch(`${API}/api/domains`, { headers: hdrs() }),
        fetch(`${API}/api/containers`, { headers: hdrs() }),
      ]);
      if (domRes.ok) {
        const d = await domRes.json();
        const allDomains = Array.isArray(d) ? d : [];
        setDomains(
          allDomains.filter((d: any) => d.container_id === containerId)
        );
      }
      if (contRes.ok) {
        const c = await contRes.json();
        const found = (c.containers || []).find(
          (c: any) => c.id === containerId
        );
        if (found) setContainer(found);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [containerId]);

  const addDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/domains`, {
        method: "POST",
        headers: hdrs(),
        body: JSON.stringify({
          containerId,
          domain: newDomain.toLowerCase().trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowAdd(false);
        setNewDomain("");
        loadData();
        showToast(
          `Domínio adicionado! Configure DNS A → ${data.instructions?.ip || "IP do servidor"}`
        );
      } else {
        showToast(data.error || "Erro ao adicionar domínio", "error");
      }
    } catch {
      showToast("Erro de conexão", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const verifyDomain = async (id: string) => {
    setVerifying((p) => ({ ...p, [id]: true }));
    try {
      const res = await fetch(`${API}/api/domains/${id}/verify`, {
        method: "POST",
        headers: hdrs(),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(
          data.configured
            ? `DNS verificado! IP: ${data.ip}`
            : `DNS não propagou ainda.`,
          data.configured ? "success" : "warning"
        );
        loadData();
      } else showToast(data.error || "Erro na verificação", "error");
    } catch {
      showToast("Erro de conexão", "error");
    } finally {
      setVerifying((p) => ({ ...p, [id]: false }));
    }
  };

  const removeDomain = async (id: string, name: string) => {
    if (!confirm(`Remover ${name}?`)) return;
    try {
      const res = await fetch(`${API}/api/domains/${id}`, {
        method: "DELETE",
        headers: hdrs(),
      });
      if (res.ok) {
        loadData();
        showToast("Domínio removido");
      }
    } catch {
      showToast("Erro ao remover", "error");
    }
  };

  const stCfg = (s: string) =>
    ({
      active: {
        icon: CheckCircle2,
        color: "text-green-500",
        bg: "bg-green-50 border-green-200",
        text: "Ativo",
        dot: "bg-green-400",
      },
      pending: {
        icon: Clock,
        color: "text-yellow-500",
        bg: "bg-yellow-50 border-yellow-200",
        text: "Pendente",
        dot: "bg-yellow-400",
      },
      failed: {
        icon: XCircle,
        color: "text-red-500",
        bg: "bg-red-50 border-red-200",
        text: "Falhou",
        dot: "bg-red-400",
      },
    }[s] || {
      icon: Clock,
      color: "text-gray-500",
      bg: "bg-gray-50 border-gray-200",
      text: s || "?",
      dot: "bg-gray-400",
    });

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm flex items-center gap-2 ${
            toast.type === "error" ? "bg-red-600" : "bg-green-600"
          }`}
        >
          {toast.type === "success" && <CheckCircle2 className="w-4 h-4" />}
          {toast.type === "error" && <XCircle className="w-4 h-4" />}
          {toast.message}
          <button
            onClick={() => setToast(null)}
            className="ml-2 hover:bg-white/20 rounded"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            Domínios de {container?.name || "Container"}
          </h2>
          <p className="text-sm text-gray-500">
            {domains.length} domínio(s) conectado(s)
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Conectar Domínio
        </button>
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Conectar Domínio</h3>
              <button
                onClick={() => setShowAdd(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                ✕
              </button>
            </div>
            <form onSubmit={addDomain} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Domínio
                </label>
                <input
                  type="text"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="meusite.com"
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                Configure um registo DNS tipo A apontando para o IP do servidor.
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-2"
                >
                  {submitting && <Loader className="w-4 h-4 animate-spin" />}
                  <Link2 className="w-4 h-4" /> Conectar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Domain list */}
      {domains.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          <Globe className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 text-sm mb-1">
            Nenhum domínio conectado a este container
          </p>
          <p className="text-gray-400 text-xs">
            Conecte um domínio para aceder ao container via URL personalizada
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {domains.map((d) => {
            const sc = stCfg(d.status);
            const SI = sc.icon;
            return (
              <div
                key={d.id}
                className="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-bold text-gray-900 truncate">
                        {d.domain}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${sc.bg} ${sc.color}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}
                        ></span>
                        {sc.text}
                      </span>
                    </div>
                    {d.status === "pending" && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mt-2 text-xs">
                        Configure DNS tipo <strong>A</strong> →{" "}
                        <code className="bg-white px-1 rounded">
                          {d.server_ip || "208.110.72.191"}
                        </code>
                        <button
                          onClick={() =>
                            cpy(d.server_ip || "208.110.72.191")
                          }
                          className="ml-1 text-blue-600 hover:underline"
                        >
                          copiar
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {d.status === "active" && (
                      <a
                        href={`https://${d.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                        title="Visitar"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      onClick={() => verifyDomain(d.id)}
                      disabled={verifying[d.id]}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50"
                      title="Verificar DNS"
                    >
                      {verifying[d.id] ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => removeDomain(d.id, d.domain)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Remover"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
