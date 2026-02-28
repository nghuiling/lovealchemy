import { AvatarConfig } from "@/types/profile";

export function PixelAvatar({ avatar, size = 180 }: { avatar: AvatarConfig; size?: number }) {
  const rand = (offset: number) => ((avatar.seed + offset * 31) % 100) / 100;
  const eyeOffset = rand(2) > 0.5 ? 1 : 0;
  const hairStyle = avatar.hairStyle ?? "short";
  const motif = avatar.motifs[0];

  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      style={{ imageRendering: "pixelated" }}
      aria-label="Generated avatar"
    >
      <rect width="16" height="16" fill={avatar.palette.aura} />
      <rect x="4" y="3" width="8" height="8" fill={avatar.palette.skin} />
      <rect x="3" y="11" width="10" height="4" fill={avatar.palette.outfit} />

      {hairStyle === "short" && <rect x="3" y="2" width="10" height="3" fill={avatar.palette.hair} />}
      {hairStyle === "medium" && (
        <>
          <rect x="3" y="2" width="10" height="2" fill={avatar.palette.hair} />
          <rect x="2" y="3" width="2" height="2" fill={avatar.palette.hair} />
          <rect x="12" y="3" width="2" height="2" fill={avatar.palette.hair} />
        </>
      )}
      {hairStyle === "long" && (
        <>
          <rect x="3" y="2" width="10" height="2" fill={avatar.palette.hair} />
          <rect x="2" y="3" width="2" height="4" fill={avatar.palette.hair} />
          <rect x="12" y="3" width="2" height="4" fill={avatar.palette.hair} />
        </>
      )}

      <rect x={6 - eyeOffset} y="6" width="1" height="1" fill="#1a102f" />
      <rect x={9 + eyeOffset} y="6" width="1" height="1" fill="#1a102f" />
      <rect x="7" y="8" width="2" height="1" fill="#b25858" />

      {motif.includes("leaf") && (
        <>
          <rect x="2" y="1" width="2" height="1" fill={avatar.palette.accent} />
          <rect x="12" y="1" width="2" height="1" fill={avatar.palette.accent} />
        </>
      )}
      {motif.includes("wave") && (
        <>
          <rect x="1" y="13" width="3" height="1" fill={avatar.palette.accent} />
          <rect x="12" y="13" width="3" height="1" fill={avatar.palette.accent} />
        </>
      )}
      {motif.includes("gear") && (
        <>
          <rect x="0" y="4" width="1" height="1" fill={avatar.palette.accent} />
          <rect x="15" y="4" width="1" height="1" fill={avatar.palette.accent} />
        </>
      )}
      {motif.includes("ember") && <rect x="7" y="0" width="2" height="2" fill={avatar.palette.accent} />}
    </svg>
  );
}
