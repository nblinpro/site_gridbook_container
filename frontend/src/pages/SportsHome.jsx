import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import Icon from "../components/ui/Icon";
import { useAuth } from "../auth/AuthContext";
import { DISCIPLINES } from "../data/disciplines";
import apiClient from "../services/apiClient";
import { countdown, formatApex, formatDateTime } from "../utils/format";
import "./sportsHome.css";

// Accueil connecté : le prochain rendez-vous de chaque championnat, en un coup d'œil.
export default function SportsHome() {
  const { user } = useAuth();
  const [next, setNext] = useState({});
  const [counts, setCounts] = useState({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.allSettled(DISCIPLINES.map((d) => apiClient.get(`/races/?discipline=${d.slug}`)))
      .then((results) => {
        const nextBySport = {};
        const countBySport = {};
        results.forEach((res, i) => {
          if (res.status !== "fulfilled") return;
          const races = res.value.data;
          const slug = DISCIPLINES[i].slug;
          nextBySport[slug] = races.find((r) => r.status === "upcoming" && r.is_open) || null;
          countBySport[slug] = { done: races.filter((r) => r.status === "finished").length, total: races.length };
        });
        setNext(nextBySport);
        setCounts(countBySport);
      })
      .finally(() => setLoaded(true));
  }, []);

  return (
    <Layout>
      <div className="page">
        <header className="home-hero">
          <span className="eyebrow">Saison 2026</span>
          <h1 className="page-title">Bonjour {user?.username}</h1>
          <p className="page-subtitle">
            Choisis un championnat, analyse la grille et place tes pronostics avant le départ.
            Tu disposes de <strong className="num">{formatApex(user?.wallet)} APEX</strong>.
          </p>
        </header>

        <div className="home-sports">
          {DISCIPLINES.map((d) => {
            const race = next[d.slug];
            const count = counts[d.slug];
            return (
              <Link key={d.slug} to={d.routes.dashboard} className="home-sport card card-interactive" style={{ "--sport": d.accent, "--sport-contrast": d.contrast }}>
                <div className="home-sport-head">
                  <span className="badge badge-sport">{d.short}</span>
                  {count && <span className="muted num home-sport-progress">{count.done}/{count.total} {d.labels.events.toLowerCase()}</span>}
                </div>
                <h2 className="home-sport-name">{d.name}</h2>
                <p className="home-sport-tagline">{d.tagline}</p>
                {count && <div className="progress" aria-hidden><span style={{ width: `${(count.done / Math.max(1, count.total)) * 100}%` }} /></div>}

                <div className="home-sport-next">
                  {!loaded ? (
                    <div className="skeleton" style={{ height: 52 }} />
                  ) : race ? (
                    <>
                      <span className="stat-label">Prochain {d.labels.event.toLowerCase()}</span>
                      <strong className="home-sport-race">{race.name}</strong>
                      <span className="home-sport-when">
                        <Icon name="clock" size={14} />{formatDateTime(race.start_datetime)}
                        <span className="home-sport-countdown">{countdown(race.start_datetime)}</span>
                      </span>
                    </>
                  ) : (
                    <span className="muted">Aucune course ouverte aux paris pour le moment.</span>
                  )}
                </div>

                <span className="btn btn-primary btn-block">
                  Entrer dans le paddock <Icon name="arrowRight" size={16} />
                </span>
              </Link>
            );
          })}
        </div>

        <section className="home-how">
          {[
            { icon: "calendar", title: "Choisis une course", text: "Calendriers, circuits et engagés viennent des API officielles et se mettent à jour toutes les 6 heures." },
            { icon: "ticket", title: "Mise tes APEX", text: "Pari mutuel : la cote dépend des mises de tous les joueurs. Annulable tant que le marché est ouvert." },
            { icon: "trophy", title: "Encaisse et grimpe", text: "Les gains sont versés automatiquement à l'arrivée. Dépense-les en boutique ou vise le haut du classement." },
          ].map((step, i) => (
            <div key={step.title} className="home-how-step">
              <span className="home-how-num">{i + 1}</span>
              <div>
                <strong className="home-how-title"><Icon name={step.icon} size={16} />{step.title}</strong>
                <p className="muted">{step.text}</p>
              </div>
            </div>
          ))}
        </section>
      </div>
    </Layout>
  );
}
