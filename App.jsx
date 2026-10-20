import { useState } from "react";

const COMMAND_URL = "http://127.0.0.1:8000/command";
const COMMAND_FALLBACK_URL = "/command";

async function postCommand(text) {
  const options = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  };
  try {
    return await fetch(COMMAND_URL, options);
  } catch {
    return await fetch(COMMAND_FALLBACK_URL, options);
  }
}

const INITIAL_SYSTEMS = [
  {
    id: "shields",
    name: "Shields",
    value: 94,
    unit: "%",
    status: "ONLINE",
    alert: null,
  },
  {
    id: "engines",
    name: "Engines",
    value: 78,
    unit: "%",
    status: "ONLINE",
    alert: null,
  },
  {
    id: "database",
    name: "Database",
    value: 12,
    unit: "ms",
    status: "SYNCED",
    alert: null,
  },
  {
    id: "docker",
    name: "Docker Containers",
    value: 6,
    unit: "up",
    status: "NOMINAL",
    alert: null,
  },
];

const INITIAL_LOGS = [
  {
    id: 1,
    time: "13:41:02",
    source: "NAV",
    message: "Course locked: sector 7G",
  },
  {
    id: 2,
    time: "13:41:18",
    source: "ENG",
    message: "Warp core idle — ready for jump",
  },
  {
    id: 3,
    time: "13:42:04",
    source: "SEC",
    message: "Shield harmonics aligned",
  },
  {
    id: 4,
    time: "13:42:41",
    source: "SYS",
    message: "Docker swarm: 6/6 containers healthy",
  },
];

function nowStamp() {
  return new Date().toLocaleTimeString("en-GB", { hour12: false });
}

function formatConfidence(confidence) {
  const pct =
    Number(confidence) <= 1 ? Number(confidence) * 100 : Number(confidence);
  return `${pct.toFixed(1)}%`;
}

function barFillStyle(sys) {
  if (sys.alert === "killed") {
    return {
      ...styles.barFill,
      width: "100%",
      background: "#ff2a4a",
      boxShadow: "0 0 10px #ff2a4acc",
    };
  }
  if (sys.alert === "flash") {
    return {
      ...styles.barFill,
      width: "100%",
      background: "#3cf0ff",
      boxShadow: "0 0 14px #3cf0ff",
      animation: "shieldPulse 0.65s ease-in-out infinite",
    };
  }
  return {
    ...styles.barFill,
    width: `${sys.unit === "%" ? sys.value : 70}%`,
  };
}

function App() {
  const [transcript, setTranscript] = useState("");
  const [logs, setLogs] = useState(INITIAL_LOGS);
  const [systems, setSystems] = useState(INITIAL_SYSTEMS);
  const [sending, setSending] = useState(false);

  const pushLog = (source, message) => {
    setLogs((prev) =>
      [
        {
          id: `${Date.now()}-${Math.random()}`,
          time: nowStamp(),
          source,
          message,
        },
        ...prev,
      ].slice(0, 40),
    );
  };

  const applyDecision = (decision) => {
    if (decision === "kill_docker_containers") {
      setSystems((prev) =>
        prev.map((sys) =>
          sys.id === "docker"
            ? {
                ...sys,
                value: 0,
                unit: "up",
                status: "OFFLINE",
                alert: "killed",
              }
            : sys,
        ),
      );
      return;
    }
    if (decision === "raise_shields") {
      setSystems((prev) =>
        prev.map((sys) =>
          sys.id === "shields"
            ? { ...sys, value: 100, unit: "%", status: "MAX", alert: "flash" }
            : sys,
        ),
      );
    }
  };

const handleCommand = async (event) => {
  event.preventDefault();
  const command = transcript.trim();
  if (!command || sending) return;

  setSending(true);
  pushLog("VOICE", `Transcript: "${command}"`);
  pushLog("NET", "Uplink to command classifier…");

  try {
    const response = await postCommand(command);

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(detail || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const decision = data.decision;
    const confidence = formatConfidence(data.confidence);

    pushLog("AI", `DECISION: ${decision} (${confidence} confidence)`);
    if (data.bedrock_summary) {
      pushLog("BEDROCK", data.bedrock_summary);
    }
    applyDecision(decision);
    setTranscript("");
  } catch (error) {
    pushLog("ERR", `Command uplink failed: ${error.message}`);
  } finally {
    setSending(false);
  }
};


  return (
    <div style={styles.shell}>
      <style>{`
        @keyframes shieldPulse {
          0%, 100% { opacity: 1; filter: brightness(1); }
          50% { opacity: 0.55; filter: brightness(1.8); }
        }
        @keyframes shieldCardPulse {
          0%, 100% { box-shadow: 0 0 8px #3cf0ff55; border-color: #3cf0ff; }
          50% { box-shadow: 0 0 22px #3cf0ffcc; border-color: #9ef7ff; }
        }
      `}</style>
      <header style={styles.header}>
        <div>
          <p style={styles.kicker}>OVERLORD // BRIDGE OS</p>
          <h1 style={styles.title}>STARSHIP COMMAND</h1>
        </div>
        <div style={styles.headerMeta}>
          <span style={styles.pill}>HULL-09</span>
          <span
            style={{ ...styles.pill, color: "#39ff14", borderColor: "#39ff14" }}
          >
            LINK ACTIVE
          </span>
        </div>
      </header>

      <main style={styles.main}>
        <section style={styles.left}>
          <div style={styles.panel}>
            <div style={styles.panelHead}>
              <h2 style={styles.panelTitle}>Voice Command</h2>
              <span style={styles.live}>● LISTENING</span>
            </div>
            <p style={styles.hint}>
              Type a simulated voice transcript, then transmit to the bridge AI.
            </p>
            <form onSubmit={handleCommand} style={styles.voiceForm}>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="e.g. Raise shields to 100% and spin up warp engines…"
                rows={3}
                style={styles.textarea}
                disabled={sending}
              />
              <div style={styles.voiceActions}>
                <button
                  type="submit"
                  style={{
                    ...styles.primaryBtn,
                    opacity: sending ? 0.55 : 1,
                    cursor: sending ? "wait" : "pointer",
                  }}
                  disabled={sending}
                >
                  {sending ? "TRANSMITTING…" : "TRANSMIT"}
                </button>
                <button
                  type="button"
                  style={styles.ghostBtn}
                  onClick={() => setTranscript("")}
                  disabled={sending}
                >
                  CLEAR
                </button>
              </div>
            </form>
          </div>

          <div style={styles.panel}>
            <div style={styles.panelHead}>
              <h2 style={styles.panelTitle}>System Status</h2>
              <span style={styles.subtle}>4 SUBSYSTEMS</span>
            </div>
            <div style={styles.grid}>
              {systems.map((sys) => (
                <article
                  key={sys.id}
                  style={{
                    ...styles.card,
                    ...(sys.alert === "killed"
                      ? {
                          borderColor: "#ff2a4a",
                          boxShadow: "0 0 12px #ff2a4a44",
                        }
                      : {}),
                    ...(sys.alert === "flash"
                      ? {
                          borderColor: "#3cf0ff",
                          animation:
                            "shieldCardPulse 0.65s ease-in-out infinite",
                        }
                      : {}),
                  }}
                >
                  <div style={styles.cardTop}>
                    <span style={styles.cardName}>{sys.name}</span>
                    <span
                      style={{
                        ...styles.status,
                        color:
                          sys.alert === "killed"
                            ? "#ff2a4a"
                            : sys.alert === "flash"
                              ? "#3cf0ff"
                              : styles.status.color,
                      }}
                    >
                      {sys.status}
                    </span>
                  </div>
                  <p style={styles.metric}>
                    {sys.value}
                    <small style={styles.unit}>{sys.unit}</small>
                  </p>
                  <div style={styles.barTrack}>
                    <div style={barFillStyle(sys)} />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <aside style={styles.logPanel}>
          <div style={styles.panelHead}>
            <h2 style={styles.panelTitle}>Log</h2>
            <span style={styles.subtle}>{logs.length} EVENTS</span>
          </div>
          <ul style={styles.logList}>
            {logs.map((entry) => (
              <li key={entry.id} style={styles.logItem}>
                <span style={styles.logTime}>{entry.time}</span>
                <span style={styles.logSource}>[{entry.source}]</span>
                <span style={styles.logMsg}>{entry.message}</span>
              </li>
            ))}
          </ul>
        </aside>
      </main>
    </div>
  );
}

const styles = {
  shell: {
    minHeight: "100vh",
    background:
      "radial-gradient(1200px 600px at 10% -10%, #123047 0%, transparent 50%), radial-gradient(900px 500px at 100% 0%, #0d2a1a 0%, transparent 45%), #121418",
    color: "#d7ffe8",
    fontFamily: '"Segoe UI", "Rajdhani", system-ui, sans-serif',
    padding: "24px 28px 32px",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottom: "1px solid #1f3d3a",
    paddingBottom: 16,
    marginBottom: 20,
  },
  kicker: {
    margin: 0,
    letterSpacing: "0.28em",
    fontSize: 11,
    color: "#3cf0ff",
  },
  title: {
    margin: "4px 0 0",
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: "0.12em",
    color: "#e8fff4",
    textShadow: "0 0 12px #39ff1466",
  },
  headerMeta: {
    display: "flex",
    gap: 10,
  },
  pill: {
    border: "1px solid #3cf0ff",
    color: "#3cf0ff",
    padding: "6px 12px",
    fontSize: 11,
    letterSpacing: "0.16em",
  },
  main: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.6fr) minmax(280px, 0.9fr)",
    gap: 18,
    alignItems: "start",
  },
  left: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  panel: {
    background: "rgba(18, 22, 26, 0.85)",
    border: "1px solid #1f3d3a",
    boxShadow: "0 0 24px #00ffd10f inset",
    padding: 18,
  },
  panelHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  panelTitle: {
    margin: 0,
    fontSize: 14,
    letterSpacing: "0.22em",
    color: "#39ff14",
  },
  live: {
    color: "#39ff14",
    fontSize: 11,
    letterSpacing: "0.14em",
  },
  hint: {
    margin: "0 0 12px",
    color: "#8aa8a0",
    fontSize: 13,
  },
  voiceForm: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  textarea: {
    width: "100%",
    boxSizing: "border-box",
    resize: "vertical",
    background: "#0c1014",
    border: "1px solid #2a6b7a",
    color: "#d7ffe8",
    padding: 12,
    fontSize: 14,
    outline: "none",
    boxShadow: "0 0 12px #3cf0ff22",
  },
  voiceActions: {
    display: "flex",
    gap: 10,
  },
  primaryBtn: {
    background: "transparent",
    border: "1px solid #39ff14",
    color: "#39ff14",
    padding: "8px 16px",
    letterSpacing: "0.18em",
    cursor: "pointer",
    boxShadow: "0 0 14px #39ff1433",
  },
  ghostBtn: {
    background: "transparent",
    border: "1px solid #3cf0ff66",
    color: "#3cf0ff",
    padding: "8px 16px",
    letterSpacing: "0.18em",
    cursor: "pointer",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
  },
  card: {
    border: "1px solid #1f4a55",
    background: "#0e1318",
    padding: 14,
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 8,
  },
  cardName: {
    fontSize: 12,
    letterSpacing: "0.12em",
    color: "#9fd9ff",
  },
  status: {
    fontSize: 10,
    color: "#39ff14",
    letterSpacing: "0.1em",
  },
  metric: {
    margin: "0 0 10px",
    fontSize: 28,
    color: "#e8fff4",
  },
  unit: {
    marginLeft: 6,
    fontSize: 12,
    color: "#3cf0ff",
  },
  barTrack: {
    height: 4,
    background: "#1a2428",
  },
  barFill: {
    height: "100%",
    background: "linear-gradient(90deg, #39ff14, #3cf0ff)",
    boxShadow: "0 0 8px #39ff14aa",
  },
  logPanel: {
    background: "rgba(10, 14, 16, 0.92)",
    border: "1px solid #1f3d3a",
    padding: 18,
    minHeight: 420,
    maxHeight: "calc(100vh - 160px)",
    overflow: "auto",
  },
  logList: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  logItem: {
    display: "grid",
    gridTemplateColumns: "70px 64px 1fr",
    gap: 8,
    fontSize: 12,
    borderBottom: "1px solid #1a2a28",
    paddingBottom: 8,
  },
  logTime: {
    color: "#3cf0ff",
    fontVariantNumeric: "tabular-nums",
  },
  logSource: {
    color: "#39ff14",
    letterSpacing: "0.06em",
  },
  logMsg: {
    color: "#c9e6dc",
  },
  subtle: {
    color: "#6f8b86",
    fontSize: 11,
    letterSpacing: "0.12em",
  },
};

export default App;
