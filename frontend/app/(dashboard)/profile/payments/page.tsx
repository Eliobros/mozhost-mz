"use client";

import React, { useState, useEffect } from "react";
import { Download, Loader, Coins, CheckCircle, Clock, XCircle, RefreshCcw } from "lucide-react";

const ALAUDA_API_URL = "https://alauda-api.mozhost.shop";

const PROVIDER_LABELS: Record<string, string> = {
  mpesa: "M-Pesa",
  emola: "E-Mola",
  mkesh: "mKesh",
  visa_mastercard: "Visa/Mastercard",
  mercadopago: "MercadoPago",
};

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: typeof CheckCircle }
> = {
  completed: { label: "Concluído", color: "text-green-700 bg-green-50 border-green-200", icon: CheckCircle },
  approved: { label: "Aprovado", color: "text-green-700 bg-green-50 border-green-200", icon: CheckCircle },
  pending: { label: "Pendente", color: "text-yellow-700 bg-yellow-50 border-yellow-200", icon: Clock },
  in_process: { label: "Processando", color: "text-yellow-700 bg-yellow-50 border-yellow-200", icon: Clock },
  failed: { label: "Falhou", color: "text-red-700 bg-red-50 border-red-200", icon: XCircle },
  rejected: { label: "Rejeitado", color: "text-red-700 bg-red-50 border-red-200", icon: XCircle },
  cancelled: { label: "Cancelado", color: "text-gray-700 bg-gray-50 border-gray-200", icon: XCircle },
  expired: { label: "Expirado", color: "text-gray-700 bg-gray-50 border-gray-200", icon: XCircle },
  refunded: { label: "Reembolsado", color: "text-blue-700 bg-blue-50 border-blue-200", icon: RefreshCcw },
};

interface Payment {
  payment_id: string;
  amount: number;
  currency: string;
  credits_to_add: number;
  provider: string;
  status: string;
  created_at: string;
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PaymentsHistoryPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    setLoading(true);
    setError("");
    try {
      const userData = JSON.parse(localStorage.getItem("mozhost_user") || "{}");
      const userId = userData.id;

      const res = await fetch(`${ALAUDA_API_URL}/api/payment/my-payments?usuario_id=${userId}`, {
        headers: {
          "X-API-Key": process.env.NEXT_PUBLIC_ALAUDA_API_KEY || "",
        },
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Erro ao carregar pagamentos");
      }

      setPayments(data.data?.payments || []);
    } catch (err) {
      console.error("Erro ao carregar pagamentos:", err);
      setError("Não foi possível carregar o histórico de pagamentos.");
    } finally {
      setLoading(false);
    }
  };

  const downloadReceipt = async (paymentId: string) => {
    setDownloadingId(paymentId);
    try {
      const res = await fetch(`${ALAUDA_API_URL}/api/payment/receipt/${paymentId}`, {
        headers: {
          "X-API-Key": process.env.NEXT_PUBLIC_ALAUDA_API_KEY || "",
        },
      });

      if (!res.ok) throw new Error("Erro ao baixar recibo");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `recibo_mozhost_${paymentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Erro ao baixar recibo:", err);
      alert("Erro ao baixar recibo. Tenta novamente.");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Histórico de Pagamentos</h1>
          <p className="text-sm text-gray-500 mt-1">
            Consulta as tuas compras de coins e baixa os comprovantes a qualquer momento.
          </p>
        </div>
        <button
          onClick={loadPayments}
          className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
          title="Atualizar"
        >
          <RefreshCcw className="w-4 h-4" />
          <span className="hidden sm:inline">Atualizar</span>
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      )}

      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && payments.length === 0 && (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
          <Coins className="w-14 h-14 mx-auto mb-4 text-gray-300" />
          <h3 className="text-base font-medium text-gray-700 mb-1">
            Ainda não tens pagamentos
          </h3>
          <p className="text-sm text-gray-500">
            As tuas compras de coins vão aparecer aqui.
          </p>
        </div>
      )}

      {!loading && !error && payments.length > 0 && (
        <div className="space-y-3">
          {payments.map((p) => {
            const statusInfo = STATUS_CONFIG[p.status] || {
              label: p.status,
              color: "text-gray-700 bg-gray-50 border-gray-200",
              icon: Clock,
            };
            const StatusIcon = statusInfo.icon;
            const canDownload = ["completed", "approved"].includes(p.status);

            return (
              <div
                key={p.payment_id}
                className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">
                      {p.amount} {p.currency}
                    </span>
                    <span className="text-gray-300">•</span>
                    <span className="text-sm text-gray-600 flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5 text-yellow-500" />
                      {p.credits_to_add} coins
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {PROVIDER_LABELS[p.provider] || p.provider} • {formatDate(p.created_at)}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${statusInfo.color}`}
                  >
                    <StatusIcon className="w-3.5 h-3.5" />
                    {statusInfo.label}
                  </span>

                  {canDownload && (
                    <button
                      onClick={() => downloadReceipt(p.payment_id)}
                      disabled={downloadingId === p.payment_id}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white disabled:opacity-50 transition-all"
                    >
                      {downloadingId === p.payment_id ? (
                        <Loader className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      Recibo
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
