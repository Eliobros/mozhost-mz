// utils/email.js
const axios = require('axios');
require('dotenv').config();

function generateCode(length = 6) {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(Math.random() * (max - min + 1) + min).toString();
}

async function sendEmail({ toEmail, toName, subject, htmlContent, textContent }) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('⚠️ RESEND_API_KEY não configurado, simulando envio de email');
      console.log(`📧 Email simulado para: ${toEmail}`);
      console.log(`📄 Assunto: ${subject}`);
      console.log(`📝 Conteúdo: ${textContent || htmlContent}`);
      return { messageId: 'simulated', success: true };
    }

    const response = await axios.post('https://api.resend.com/emails', {
      from: 'MozHost <noreply@mozhost.shop>',
      to: toEmail,
      subject: subject,
      html: htmlContent,
      text: textContent
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Email enviado via Resend:', response.data);
    return { messageId: response.data.id, success: true };

  } catch (error) {
    console.error('❌ Erro ao enviar email via Resend:', error.response?.data || error.message);
    throw new Error('Falha no envio do email: ' + (error.response?.data?.message || error.message));
  }
}

module.exports = { sendEmail, generateCode };

// ===== Templates =====
// Layout base responsivo usado por todos os emails de produto.
function baseLayout(innerHtml) {
  return `
  <div style="background-color:#f1f5f9;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;">
      <div style="background:linear-gradient(135deg,#1e3a5f,#312e81);padding:26px;text-align:center;">
        <h1 style="color:#ffffff;margin:0;font-size:24px;letter-spacing:1px;">MOZHOST</h1>
        <p style="color:#93c5fd;margin:4px 0 0;font-size:12px;">Hospedagem de Bots & APIs</p>
      </div>
      <div style="padding:26px;color:#0f172a;font-size:14px;line-height:1.6;">
        ${innerHtml}
      </div>
      <div style="background:#f8fafc;padding:16px;text-align:center;color:#94a3b8;font-size:11px;border-top:1px solid #e2e8f0;">
        MozHost © ${new Date().getFullYear()} · mozhost.shop<br/>
        Este é um email automático, por favor não responda.
      </div>
    </div>
  </div>`;
}

// Bloco de apresentação dos planos (usado no email de boas-vindas).
function plansShowcaseHtml() {
  const plans = [
    { name: 'Starter', price: '150 MT/mês', features: '3 containers · 512MB RAM · 2GB Storage' },
    { name: 'Basic', price: '350 MT/mês', features: '5 containers · 1GB RAM · 5GB Storage', popular: true },
    { name: 'Pro', price: '700 MT/mês', features: '10 containers · 2GB RAM · 10GB Storage' },
    { name: 'Business', price: '1500 MT/mês', features: '25 containers · 4GB RAM · 25GB Storage' }
  ];
  const rows = plans.map(p => `
    <tr>
      <td style="padding:12px 14px;border-bottom:1px solid #f1f5f9;${p.popular ? 'background:#eff6ff;' : ''}">
        <strong style="color:#1e40af;font-size:14px;">${p.name}</strong>${p.popular ? ' <span style="background:#1e40af;color:#fff;font-size:9px;padding:2px 6px;border-radius:8px;">POPULAR</span>' : ''}
        <div style="color:#64748b;font-size:12px;margin-top:2px;">${p.features}</div>
      </td>
      <td style="padding:12px 14px;border-bottom:1px solid #f1f5f9;text-align:right;white-space:nowrap;${p.popular ? 'background:#eff6ff;' : ''}">
        <strong style="color:#0f172a;">${p.price}</strong>
      </td>
    </tr>`).join('');
  return `
    <h3 style="margin:24px 0 8px;color:#0f172a;">💎 Nossos planos</h3>
    <p style="color:#64748b;font-size:13px;margin:0 0 10px;">Escolha um plano para desbloquear todo o potencial da sua conta (pague com M-Pesa, e-Mola ou cartão):</p>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
      ${rows}
    </table>
    <a href="https://mozhost.shop/billing" style="display:block;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#ffffff;text-decoration:none;text-align:center;padding:13px;border-radius:10px;font-weight:bold;margin-top:14px;font-size:14px;">Ver planos & assinar</a>`;
}

// Email de boas-vindas + código de verificação + apresentação dos planos.
async function sendWelcomeEmail({ toEmail, toName, code }) {
  const inner = `
    <h2 style="margin:0 0 6px;color:#0f172a;">Bem-vindo(a), ${toName}! 🎉</h2>
    <p style="color:#475569;">Sua conta MozHost foi criada com sucesso! Você começa com um <strong>plano gratuito de 7 dias</strong> para testar tudo.</p>
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:16px;text-align:center;margin:16px 0;">
      <p style="margin:0 0 6px;color:#64748b;font-size:12px;">Seu código de verificação:</p>
      <p style="margin:0;font-size:28px;font-weight:bold;letter-spacing:6px;color:#1e40af;">${code}</p>
      <p style="margin:8px 0 0;color:#94a3b8;font-size:11px;">Válido por 15 minutos</p>
    </div>
    <p style="color:#475569;">Digite esse código no app para ativar sua conta.</p>
    ${plansShowcaseHtml()}`;
  return sendEmail({
    toEmail,
    toName,
    subject: 'Bem-vindo à MozHost! Confirme seu email 🎉',
    htmlContent: baseLayout(inner),
    textContent: `Bem-vindo à MozHost, ${toName}! Seu código de verificação: ${code} (válido por 15 minutos). Conheça nossos planos: https://mozhost.shop/billing`
  });
}

// Email de plano ativado (assinatura inicial ou renovação).
async function sendPlanActivatedEmail({ toEmail, toName, planName, amount, currency, isRenewal, expiresAt, pendingPlanName }) {
  const isScheduled = !!pendingPlanName;
  const inner = isScheduled ? `
    <h2 style="margin:0 0 6px;color:#0f172a;">Upgrade agendado! 📅</h2>
    <p style="color:#475569;">Recebemos seu pagamento do plano <strong>${pendingPlanName}</strong>. Ele será aplicado automaticamente quando seu ciclo atual terminar, em <strong>${expiresAt}</strong>.</p>
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px;margin:14px 0;">
      <p style="margin:0;color:#1e40af;"><strong>${pendingPlanName}</strong> — ${currency} ${amount}</p>
    </div>
    <p style="color:#475569;">Seus containers continuam funcionando normalmente até lá. 🚀</p>` : `
    <h2 style="margin:0 0 6px;color:#0f172a;">${isRenewal ? 'Plano renovado com sucesso! ✅' : 'Plano ativado com sucesso! 🎉'}</h2>
    <p style="color:#475569;">${isRenewal ? 'Sua assinatura foi renovada e tudo continua no ar, sem interrupções.' : 'Sua assinatura está ativa! Já pode aproveitar todos os recursos do seu plano.'}</p>
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px;margin:14px 0;">
      <p style="margin:0;color:#1e40af;"><strong>Plano ${planName}</strong> — ${currency} ${amount}</p>
      <p style="margin:4px 0 0;color:#64748b;font-size:13px;">Válido até <strong>${expiresAt}</strong></p>
    </div>
    <a href="https://mozhost.shop/dashboard" style="display:block;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#ffffff;text-decoration:none;text-align:center;padding:13px;border-radius:10px;font-weight:bold;font-size:14px;">Abrir painel</a>
    <p style="color:#94a3b8;font-size:12px;margin-top:14px;">O recibo deste pagamento está disponível em Planos & Pagamentos → Histórico → Recibo (PDF).</p>`;
  return sendEmail({
    toEmail,
    toName,
    subject: isScheduled
      ? `MozHost — Upgrade para ${pendingPlanName} agendado 📅`
      : isRenewal
        ? 'MozHost — Plano renovado com sucesso ✅'
        : 'MozHost — Plano ativado com sucesso 🎉',
    htmlContent: baseLayout(inner),
    textContent: isScheduled
      ? `Upgrade para ${pendingPlanName} agendado para ${expiresAt}. Valor: ${currency} ${amount}.`
      : `Plano ${planName} ${isRenewal ? 'renovado' : 'ativado'} com sucesso! Válido até ${expiresAt}. Valor: ${currency} ${amount}.`
  });
}

module.exports.sendWelcomeEmail = sendWelcomeEmail;
module.exports.sendPlanActivatedEmail = sendPlanActivatedEmail;
