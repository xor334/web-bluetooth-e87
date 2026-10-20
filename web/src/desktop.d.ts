type BadgeDevice = { deviceId: string; deviceName: string; advertisedMac?: string; rssi?: number }
type BadgeScan = { requestId: number; devices: BadgeDevice[] }
interface Window {
  e87Desktop?: {
    platform: string
    onDevices: (handler: (scan: BadgeScan | null) => void) => () => void
    select: (requestId: number, deviceId: string) => Promise<boolean>
    savePayload: (bytes: Uint8Array, extension: string) => Promise<boolean>
    setTransferActive: (active: boolean) => Promise<void>
    onCloseBlocked: (handler: () => void) => Promise<() => void>
  }
}
