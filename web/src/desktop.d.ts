type BadgeDevice = { deviceId: string; deviceName: string; advertisedMac?: string; rssi?: number }
type BadgeScan = { requestId: number; devices: BadgeDevice[] }
type BadgePairing = { requestId: number; deviceId: string; pairingKind: 'confirm' | 'confirmPin' | 'providePin'; pin?: string }
interface Window {
  e87Desktop?: {
    platform: string
    onDevices: (handler: (scan: BadgeScan | null) => void) => () => void
    select: (requestId: number, deviceId: string) => Promise<boolean>
    onPairing: (handler: (pairing: BadgePairing | null) => void) => () => void
    pair: (requestId: number, response: { confirmed: boolean; pin?: string }) => Promise<boolean>
  }
}
