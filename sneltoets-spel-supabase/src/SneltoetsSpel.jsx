
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const opdrachten = [
  { tekst: "Maak deze tekst vet", toets: "b", ctrl: true },
  { tekst: "Kopieer deze regel", toets: "c", ctrl: true },
  { tekst: "Plak de gekopieerde regel", toets: "v", ctrl: true },
  { tekst: "Maak ongedaan", toets: "z", ctrl: true },
  { tekst: "Onderstreep deze tekst", toets: "u", ctrl: true },
  { tekst: "Open zoeken", toets: "f", ctrl: true },
  { tekst: "Opslaan als", toets: "s", ctrl: true },
  { tekst: "Selecteer alles", toets: "a", ctrl: true },
  { tekst: "Open nieuw venster", toets: "n", ctrl: true },
  { tekst: "Sluit het venster", toets: "w", ctrl: true },
];

export default function SneltoetsSpel() {
  const [stap, setStap] = useState("start");
  const [naam, setNaam] = useState("");
  const [score, setScore] = useState(0);
  const [index, setIndex] = useState(0);
  const [huidige, setHuidige] = useState(opdrachten[0]);
  const [feedback, setFeedback] = useState("");
  const [startTijd, setStartTijd] = useState(null);
  const [timer, setTimer] = useState(10);
  const [tijdOp, setTijdOp] = useState(false);
  const [foutCount, setFoutCount] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    if (stap === "einde") {
      supabase.from("scores").insert([{ naam, score }]).then(() => {
        updateLeaderboard();
      });
    }
  }, [stap]);

  const updateLeaderboard = async () => {
    const { data } = await supabase
      .from("scores")
      .select("*")
      .order("score", { ascending: false })
      .limit(10);
    setLeaderboard(data || []);
  };

  useEffect(() => {
    let countdown;
    if (stap === "spel") {
      setStartTijd(Date.now());
      setTimer(10);
      setTijdOp(false);
      setFoutCount(0);
      countdown = setInterval(() => {
        setTimer((t) => {
          if (t <= 1) {
            clearInterval(countdown);
            setTijdOp(true);
            setFeedback("⏱️ Termijn verlopen! Je kunt nog steeds reageren.");
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(countdown);
  }, [huidige, stap]);

  useEffect(() => {
    const handler = (e) => {
      if (stap !== "spel") return;
      if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) return;
      if (e.key.toLowerCase() === huidige.toets && (!huidige.ctrl || e.ctrlKey)) {
        const tijdsduur = (Date.now() - startTijd) / 1000;
        const punten = Math.max(1, Math.round(10 - tijdsduur));
        setScore((s) => s + punten);
        setFeedback(`✅ Gegrond! (+${punten} punten)`);
        setTimeout(() => {
          volgendeOpdracht();
        }, 1000);
      } else {
        const nieuwFoutCount = foutCount + 1;
        setFoutCount(nieuwFoutCount);
        if (nieuwFoutCount >= 3) {
          setFeedback(`❌ Ongeldig verweer. Het juiste antwoord was: Ctrl + ${huidige.toets.toUpperCase()}`);
          setTimeout(() => {
            volgendeOpdracht();
          }, 2000);
        } else {
          setFeedback(`⚠️ Onvoldoende onderbouwing (${nieuwFoutCount}/3)`);
        }
      }
    };
    const wrappedHandler = (e) => {
      if (document.activeElement.tagName !== "INPUT") {
        e.preventDefault();
        handler(e);
      }
    };
    window.addEventListener("keydown", wrappedHandler);
    return () => window.removeEventListener("keydown", wrappedHandler);
  }, [huidige, stap, startTijd, foutCount]);

  const volgendeOpdracht = () => {
    const nieuwIndex = index + 1;
    if (nieuwIndex >= opdrachten.length) {
      setStap("einde");
    } else {
      setIndex(nieuwIndex);
      setHuidige(opdrachten[nieuwIndex]);
      setFeedback("");
      setStartTijd(Date.now());
      setTimer(10);
      setTijdOp(false);
      setFoutCount(0);
    }
  };

  if (stap === "start") {
    return (
      <div className="card">
        <h1>ToetsTrein 🚆</h1>
        <input
          placeholder="Voer je naam in"
          value={naam}
          onChange={(e) => setNaam(e.target.value)}
        />
        <button onClick={() => naam && setStap("spel")}>Start procedure</button>
      </div>
    );
  }

  if (stap === "spel") {
    return (
      <div className="card text-center">
        <p>Zaak {index + 1} van {opdrachten.length}</p>
        <p><strong>{huidige.tekst}</strong></p>
        {!tijdOp && <p>⏱️ Termijn: {timer} seconden</p>}
        <p>{feedback}</p>
      </div>
    );
  }

  if (stap === "einde") {
    return (
      <div className="card text-center">
        <h2>Uitspraak</h2>
        <p>Naam: {naam}</p>
        <p>Score: {score}</p>
        <h3 className="mt-4">Leaderboard</h3>
        <ul>
          {leaderboard.map((entry, i) => (
            <li key={i}>{entry.naam}: {entry.score} punten</li>
          ))}
        </ul>
      </div>
    );
  }
}
