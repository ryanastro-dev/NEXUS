export const REPO_URL = "https://github.com/ryanastro-dev/NEXUS";
export const RELEASE_API_URL =
  "https://api.github.com/repos/ryanastro-dev/NEXUS/releases/latest";
export const RELEASES_LATEST_URL = `${REPO_URL}/releases/latest`;
export const RELEASE_REQUEST_TIMEOUT_MS = 4500;
export const RELEASE_REQUEST_RETRIES = 2;

export const RELEASE_SELECTORS = {
  "windows-exe": [/x64-setup\.exe$/i, /\.exe$/i],
  "windows-msi": [/x64.*\.msi$/i, /\.msi$/i],
  "macos-dmg": [/aarch64.*\.dmg$/i, /\.dmg$/i],
  "macos-x64-tar": [/x64.*\.app\.tar\.gz$/i],
  "linux-appimage": [/amd64.*\.appimage$/i, /\.appimage$/i],
  "linux-deb": [/amd64.*\.deb$/i, /\.deb$/i],
  "linux-rpm": [/\.x86_64\.rpm$/i, /\.rpm$/i],
} as const;

export type DownloadKey = keyof typeof RELEASE_SELECTORS;

export interface ReleaseAsset {
  name?: string | null;
  browser_download_url?: string | null;
}

export interface LatestRelease {
  tag_name?: string | null;
  assets?: ReleaseAsset[] | null;
}

export const createDownloadFallbackMap = (): Record<DownloadKey, string> => {
  return Object.fromEntries(
    (Object.keys(RELEASE_SELECTORS) as DownloadKey[]).map((key) => [
      key,
      RELEASES_LATEST_URL,
    ]),
  ) as Record<DownloadKey, string>;
};

const delay = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export const findAssetUrl = (
  assets: ReleaseAsset[],
  patterns: readonly RegExp[],
): string | null => {
  for (const pattern of patterns) {
    const matched = assets.find((asset) =>
      pattern.test(String(asset.name || "").toLowerCase()),
    );
    if (matched?.browser_download_url) {
      return matched.browser_download_url;
    }
  }

  return null;
};

export const fetchLatestRelease = async (): Promise<LatestRelease | null> => {
  for (let attempt = 0; attempt <= RELEASE_REQUEST_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      RELEASE_REQUEST_TIMEOUT_MS,
    );

    try {
      const response = await fetch(RELEASE_API_URL, {
        headers: {
          Accept: "application/vnd.github+json",
        },
        signal: controller.signal,
      });

      if (response.ok) {
        return (await response.json()) as LatestRelease;
      }
    } catch {
    } finally {
      clearTimeout(timeout);
    }

    if (attempt < RELEASE_REQUEST_RETRIES) {
      await delay(250 * (attempt + 1));
    }
  }

  return null;
};
