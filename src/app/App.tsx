import ui from "../config/ui.json";

/**
 * Boot shell. The title screen is the first stop of the player journey;
 * the playthrough test starts here. Game canvas + scenes mount inside as
 * the runtime lands (directive S3-S5).
 */
export function App() {
  return (
    <div
      data-testid="app-shell"
      style={{
        position: "fixed",
        inset: 0,
        background: ui.theme.background,
        color: ui.theme.textPrimary,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: `'${ui.font.family}', ${ui.font.fallback}`,
      }}
    >
      <h1
        style={{
          color: ui.theme.accentGold,
          textShadow: `4px 4px 0px ${ui.theme.accentRedDark}`,
          letterSpacing: "0.1em",
          textAlign: "center",
        }}
      >
        A GOOD OLD FASHIONED ADVENTURE
      </h1>
      <p style={{ color: ui.theme.textMuted, textTransform: "uppercase", fontSize: 12 }}>
        16-bit interactive action rpg
      </p>
    </div>
  );
}
