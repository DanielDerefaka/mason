/**
 * Packaging, as code rather than JSON for one reason: notarisation is
 * conditional. With an Apple Developer ID in the environment the build signs,
 * hardens and notarises; without one it falls back to the ad-hoc build that
 * needs the xattr workaround. JSON cannot express "if", and a config that
 * demanded credentials would break `npm run dist` for anyone without them.
 *
 * To notarise: enrol in the Apple Developer Program, install a "Developer ID
 * Application" certificate in the keychain, then export
 * APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD (appleid.apple.com → app-specific
 * passwords) and APPLE_TEAM_ID before `npm run dist`. Nothing else changes.
 */
import { cpSync } from 'node:fs'
import { join } from 'node:path'

const canNotarize = Boolean(
  process.env.APPLE_ID && process.env.APPLE_APP_SPECIFIC_PASSWORD && process.env.APPLE_TEAM_ID,
)

if (!canNotarize) {
  console.warn('[dist] no Apple credentials in env — building unsigned (xattr workaround applies)')
}

export default {
  appId: 'design.mason.desktop',
  productName: 'Mason',
  files: ['main.js', 'package.json', 'build/icon.png'],
  /**
   * The server is copied by hand, not by extraResources. electron-builder's
   * copier silently drops node_modules and dot-directories whatever the
   * filter says — which shipped a server with no Next runtime and no build
   * output, and it crashed on every machine except the one that built it,
   * where a leftover dev instance on the same port answered the smoke test
   * for it. cpSync copies what it is told.
   */
  afterPack: async (context) => {
    const resources =
      context.electronPlatformName === 'darwin'
        ? join(
            context.appOutDir,
            `${context.packager.appInfo.productFilename}.app`,
            'Contents',
            'Resources',
          )
        : join(context.appOutDir, 'resources')
    cpSync(join(import.meta.dirname, 'webapp'), join(resources, 'app-server'), {
      recursive: true,
    })
  },
  directories: { output: 'release' },
  mac: {
    category: 'public.app-category.graphics-design',
    target: ['dmg', 'zip'],
    icon: 'build/icon.png',
    hardenedRuntime: canNotarize,
    entitlements: 'build/entitlements.mac.plist',
    entitlementsInherit: 'build/entitlements.mac.plist',
    notarize: canNotarize,
  },
  win: { target: ['nsis'], icon: 'build/icon.png' },
  linux: { target: ['AppImage'] },
}
