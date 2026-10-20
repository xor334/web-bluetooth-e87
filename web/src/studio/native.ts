import { invoke, isTauri } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { NativeBluetooth } from './native-bluetooth'

export async function initializeNative() {
  // WebKit versions without OffscreenCanvas still support the same 2D renderer
  // on an unattached HTML canvas (including drawImage and JPEG encoding).
  if (typeof OffscreenCanvas === 'undefined' || !OffscreenCanvas.prototype.convertToBlob) {
    const Canvas = function (width: number, height: number) {
      const canvas = document.createElement('canvas') as HTMLCanvasElement & { convertToBlob: (options?: ImageEncodeOptions) => Promise<Blob> }
      canvas.width = width; canvas.height = height
      canvas.convertToBlob = (options = {}) => new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Не удалось создать изображение.')), options.type, options.quality))
      return canvas
    }
    Object.defineProperty(globalThis, 'OffscreenCanvas', { value: Canvas, configurable: true })
  }
  if (!isTauri()) return
  const bluetooth = new NativeBluetooth(invoke)
  await listen<Parameters<NativeBluetooth['receiveScan']>[0]>('ble-scan', e => bluetooth.receiveScan(e.payload))
  await listen<Parameters<NativeBluetooth['receiveNotification']>[0]>('ble-notification', e => bluetooth.receiveNotification(e.payload))
  await listen<number>('ble-disconnected', e => bluetooth.receiveDisconnect(e.payload))
  Object.defineProperty(navigator, 'bluetooth', { value: bluetooth, configurable: true })
  const platform = await invoke<string>('platform')
  window.e87Desktop = {
    platform,
    onDevices: handler => bluetooth.onDevices(handler),
    select: (requestId, deviceId) => bluetooth.select(requestId, deviceId),
    savePayload: (bytes, extension) => invoke<boolean>('save_payload', { bytes: Array.from(bytes), extension }),
    setTransferActive: active => invoke('set_transfer_active', { active }),
    onCloseBlocked: async handler => listen('transfer-close-blocked', handler),
  }
}
