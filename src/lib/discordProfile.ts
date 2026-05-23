export type DiscordMe = {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
  discriminator?: string;
};

export async function fetchDiscordMe(accessToken: string): Promise<DiscordMe> {
  const response = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const body = (await response.json().catch(() => ({}))) as DiscordMe & {
    message?: string;
  };

  if (!response.ok) {
    throw new Error(body.message || `Discord /users/@me (${response.status})`);
  }

  return body;
}

export function discordAvatarUrl(user: DiscordMe): string | undefined {
  if (user.avatar) {
    const ext = user.avatar.startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=128`;
  }
  const discrim =
    user.discriminator && user.discriminator !== "0"
      ? Number(user.discriminator) % 5
      : Number(BigInt(user.id) % BigInt(6));
  return `https://cdn.discordapp.com/embed/avatars/${discrim}.png`;
}

export function buildPersonFromDiscord(user: DiscordMe): PersonResponse {
  const displayName = (user.global_name || user.username || "Joueur").trim();
  const avatarUrl = discordAvatarUrl(user);

  return {
    ID: user.id,
    Account: {
      DisplayName: displayName,
      Discord: {
        Username: user.username,
        AvatarUrl: avatarUrl,
        Id: user.id,
      },
      Stats: {},
      State: {
        Packages: [],
        ClaimedPackages: [],
      },
    },
    Profiles: {
      athena: {
        Items: {},
        Loadouts: [],
        Attributes: { loadouts: [] },
      },
      common_core: {
        Items: {},
        Loadouts: [],
        Attributes: {},
      },
    },
  };
}
