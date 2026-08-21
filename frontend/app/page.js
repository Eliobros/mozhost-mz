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
        <div className={styles.navLinks}>
          <a href="#recursos" className={styles.navLink}>Recursos</a>
          <a href="#precos" className={styles.navLink}>Preços</a>
          <Link className={styles.btnNav} href="/login">Entrar →</Link>
        </div>
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
              <span className={styles.pill}>🎁 Plano Free · 7 dias</span>
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
      <section id="recursos" className={styles.features}>
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

      {/* PRICING */}
      <section id="precos" className={styles.pricing}>
        <div className={styles.sectionLabel}>Planos &amp; Preços</div>
        <div className={styles.sectionTitle}>Preços simples, sem surpresas</div>
        <p className={styles.pricingSub}>
          Teste grátis por 7 dias — sem cartão. Depois escolhe o plano que cabe no teu bolso.
          Paga com M-Pesa ou e-Mola.
        </p>

        {/* Free trial strip */}
        <div className={styles.trialStrip}>
          <span className={styles.trialBadge}>🎁 TRIAL GRÁTIS</span>
          <span className={styles.trialText}>
            <strong>7 dias grátis</strong> com 1 container de 512MB RAM / 0.5 vCPU — sem cartão de crédito
          </span>
        </div>

        <div className={styles.pricingGrid}>
          {[
            {
              id: "starter",
              name: "Starter",
              mt: 150,
              brl: 15,
              tagline: "Pra quem está começando",
              features: ["3 containers", "512MB RAM", "2GB Storage", "Subdomínio grátis", "Terminal Web"],
            },
            {
              id: "basic",
              name: "Basic",
              mt: 350,
              brl: 35,
              tagline: "O favorito dos devs",
              popular: true,
              features: ["5 containers", "1GB RAM", "5GB Storage", "Domínio customizado", "Suporte prioritário"],
            },
            {
              id: "pro",
              name: "Pro",
              mt: 700,
              brl: 70,
              tagline: "Para bots que não podem cair",
              features: ["10 containers", "2GB RAM", "10GB Storage", "SSL grátis", "Suporte VIP", "Backups diários"],
            },
            {
              id: "business",
              name: "Business",
              mt: 1500,
              brl: 150,
              tagline: "Para operações sérias",
              features: ["25 containers", "4GB RAM", "25GB Storage", "SSL grátis", "Suporte 24/7", "Backups diários", "IP dedicado"],
            },
          ].map((plan) => (
            <div key={plan.id} className={`${styles.planCard} ${plan.popular ? styles.planPopular : ""}`}>
              {plan.popular && <span className={styles.planBadge}>⭐ POPULAR</span>}
              <h3 className={styles.planName}>{plan.name}</h3>
              <p className={styles.planTagline}>{plan.tagline}</p>
              <div className={styles.planPrice}>
                <span className={styles.planPriceValue}>{plan.mt}</span>
                <span className={styles.planPriceUnit}>MT/mês</span>
              </div>
              <p className={styles.planPriceBrl}>≈ R$ {plan.brl}/mês</p>
              <ul className={styles.planFeatures}>
                {plan.features.map((f) => (
                  <li key={f} className={styles.planFeature}>✓ {f}</li>
                ))}
              </ul>
              <Link className={`${styles.planBtn} ${plan.popular ? styles.planBtnPopular : ""}`} href="/login">
                Começar agora
              </Link>
            </div>
          ))}
        </div>

        <p className={styles.pricingNote}>
          Precisa de mais recursos ou de um plano sob medida?{" "}
          <a href="https://api.whatsapp.com/send?phone=258862840075&text=Ola%20quero%20um%20plano%20personalizado" target="_blank" rel="noopener noreferrer">
            Fala com a gente no WhatsApp
          </a>.
        </p>
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
        <Link className={styles.btnOrange} href="/login">Criar conta grátis →</Link>
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
            <Link href="/sobre">Sobre Nós</Link>
            <Link href="/contato">Contacto</Link>
            <Link href="/termos">Termos e Condições</Link>
            <Link href="/privacidade">Política de Privacidade</Link>
          </div>
          <div className={styles.footerCol}>
            <h4>Recursos</h4>
            <Link href="/docs">📚 Documentação</Link>
            <Link href="/coins">🪙 Comprar Coins</Link>
            <Link href="/cli">⚡ CLI MozHost</Link>
            <Link href="/contato">📞 Contacto</Link>
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
