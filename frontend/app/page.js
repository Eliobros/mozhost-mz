import Link from "next/link";
import styles from "./landing.module.css";

export const metadata = {
  title: "Hospede Bots & APIs sem complicação",
  description:
    "MozHost: plataforma moçambicana para hospedar bots WhatsApp/Telegram/Discord e APIs. Deploy em segundos, paga com M-Pesa, e-Mola ou MercadoPago. Infraestrutura Docker feita para devs.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "MozHost — Hospedagem de Bots e APIs em Moçambique",
    description:
      "Plataforma 100% moçambicana para hospedar bots e APIs. Pague com M-Pesa ou e-Mola e tenha seu projeto online em segundos.",
    url: "/",
  },
};

export default function Home() {
  return (
    <div className={styles.root}>
      {/* NAV */}
      <nav className={styles.nav}>
        <div className={styles.logoWrap}>
          <div className={styles.logoIcon}>🗄️</div>
          <span className={styles.logoText}>MozHost</span>
        </div>
        <Link className={styles.btnNav} href="/login">Entrar →</Link>
      </nav>

      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <span className={styles.badge}>🇲🇿 Feito em Moçambique · ElioBros Tech</span>
        <h1 className={styles.h1}>
          Hospede seus <span className={styles.grad}>Bots &amp; APIs</span><br />
          sem complicação
        </h1>
        <p className={styles.sub}>
          Deploy em segundos. Paga com M-Pesa ou e-Mola. Infraestrutura Docker feita para devs moçambicanos.
        </p>

        {/* Preview card */}
        <div className={styles.previewCard}>
          <div className={styles.previewHeader}>
            <div className={styles.welcome}>Bem-vindo de volta! 👋</div>
            <div className={styles.hintText}>Aqui está um resumo da sua conta MozHost</div>
            <div className={styles.previewPills}>
              <span className={styles.pill}>Coins: 0.00</span>
              <span className={styles.pill}>⚡ Uptime: 99.9%</span>
            </div>
          </div>
          <div className={styles.previewBody}>
            {[
              { icon: "⟨/⟩", iconClass: styles.iconGreen, title: "Novo Container Node.js", sub: "Criar container para bots JavaScript" },
              { icon: "🗄", iconClass: styles.iconBlue, title: "Novo Container Python", sub: "Criar container para bots Python" },
              { icon: ">_", iconClass: styles.iconDark, title: "Acessar Terminal", sub: "Terminal web para comandos" },
            ].map((a) => (
              <div key={a.title} className={styles.actionRow}>
                <div className={`${styles.actionIcon} ${a.iconClass}`}>{a.icon}</div>
                <div className={styles.actionText}>
                  <div className={styles.at}>{a.title}</div>
                  <div className={styles.as}>{a.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.ctaWrap}>
          <Link className={styles.btnPrimary} href="/login">Começar agora 🚀</Link>
          <span className={styles.hintSm}>Já tem conta? O botão te leva direto.</span>
        </div>
      </section>

      {/* FEATURES */}
      <section className={styles.features}>
        <div className={styles.sectionLabel}>Recursos</div>
        <div className={styles.sectionTitle}>Tudo que você precisa</div>
        <div className={styles.grid}>
          {[
            { icon: "⚡", bg: "#16a34a22", color: "#22c55e", title: "Deploy em segundos", desc: "Sobe bots WhatsApp, APIs Node.js e sites estáticos direto pelo painel ou pela CLI." },
            { icon: "📱", bg: "#f9731622", color: "#f97316", title: "Paga pelo celular", desc: "M-Pesa e e-Mola integrados. Sem cartão internacional, sem burocracia." },
            { icon: "🐳", bg: "#3b82f622", color: "#3b82f6", title: "Docker gerenciado", desc: "Cada projeto no seu container isolado. Logs em tempo real no painel." },
            { icon: "🤖", bg: "#6c3de822", color: "#8b5cf6", title: "IA de suporte", desc: "Assistente integrado que responde dúvidas e abre tickets para a equipe." },
          ].map((f) => (
            <div key={f.title} className={styles.card}>
              <div className={styles.ci} style={{ background: f.bg, color: f.color }}>{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PAYMENT */}
      <div className={styles.paymentSection}>
        <div className={styles.paymentBox}>
          <div className={styles.payIcon}>💳</div>
          <div>
            <h3>Pagamentos moçambicanos</h3>
            <p>Aceita os métodos de pagamento que os devs de Moçambique realmente usam.</p>
          </div>
          <div className={styles.payMethods}>
            <span className={styles.payTag}>M-Pesa</span>
            <span className={styles.payTag}>e-Mola</span>
          </div>
        </div>
      </div>

      {/* BOTTOM CTA */}
      <section className={styles.bottomCta}>
        <h2>Pronto para hospedar? 🚀</h2>
        <p>Cria a tua conta e faz o primeiro deploy hoje.</p>
        <Link className={styles.btnOrange} href="/login">Ver Planos →</Link>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.footerTop}>
          <div className={styles.footerBrand}>
            <div className={styles.logoWrap}>
              <div className={styles.logoIcon}>🗄️</div>
              <span className={styles.logoText}>MozHost</span>
            </div>
            <p>Hospedagem de Bots e APIs com<br />tecnologia moçambicana.</p>
          </div>
          <div className={styles.footerCol}>
            <h4>Empresa</h4>
            <Link href="/termos">Termos e Condições</Link>
            <Link href="/privacidade">Política de Privacidade</Link>
            <Link href="/faq">FAQ</Link>
          </div>
          <div className={styles.footerCol}>
            <h4>Recursos</h4>
            <Link href="/docs">📚 Documentação</Link>
            <Link href="/coins">🪙 Comprar Coins</Link>
            <Link href="/cli">⚡ CLI MozHost</Link>
            <Link href="/suporte">🎧 Suporte</Link>
          </div>
        </div>
        <div className={styles.footerBottom}>
          © 2025 – 2026 ElioBros Tech. Todos os direitos reservados.
        </div>
      </footer>

    </div>
  );
}
