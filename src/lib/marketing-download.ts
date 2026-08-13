/**
 * The desktop download, as data.
 *
 * One constant to update per release, because the page, the button and the
 * requirements all read from here — a new version is a version bump and an
 * asset name, not a page edit.
 *
 * The binaries live in a public releases-only repository rather than beside
 * the source: the source repo is private, and a private release asset cannot
 * be downloaded by someone without an account. Releases-only is the standard
 * shape for closed-source apps — the binary is public by definition, the code
 * stays where it is.
 */
export const DESKTOP = {
  version: '0.1.2',
  releasesRepo: 'https://github.com/DanielDerefaka/mason-releases',
  mac: {
    label: 'Download for Mac',
    /** Apple Silicon. An Intel build is a second target when somebody asks. */
    requirement: 'macOS 12 or later, Apple Silicon',
    url: 'https://github.com/DanielDerefaka/mason-releases/releases/download/v0.1.2/Mason-0.1.2-arm64.dmg',
  },
  /**
   * Unsigned for now, and the page says so rather than letting Gatekeeper's
   * warning read as malware: right-click → Open, once.
   */
  signed: false,
} as const
