import { useAppearance } from "src/state/appearance";

const IdolsBackground = () => {
  const blur = useAppearance((s) => s.backgroundBlur);
  const dark = useAppearance((s) => s.darkMode);

  return (
    <div
      className="idolsBackground"
      style={{
        backgroundImage: "url(/idols_default_background.webp)",
        filter: `blur(${blur}px)`,
      }}
    >
      <div
        className="idolsBackgroundScrim"
        style={{
          background: dark
            ? "linear-gradient(135deg, rgba(10,14,20,0.72) 0%, rgba(10,14,20,0.38) 100%)"
            : "linear-gradient(135deg, rgba(242,246,255,0.35) 0%, rgba(242,246,255,0.12) 100%)",
        }}
      />
    </div>
  );
};

export default IdolsBackground;
