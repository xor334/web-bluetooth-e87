'use strict';

// Own each Chromium chooser callback exactly once. Repeated scan events update
// the same request; stale renderer messages cannot choose from a later scan.
class Selection {
  constructor(publish, timeoutMs = 120000) {
    this.publish = publish;
    this.timeoutMs = timeoutMs;
    this.nextId = 0;
    this.pending = null;
  }
  update(devices, callback) {
    if (!this.pending) {
      const id = ++this.nextId;
      this.pending = { id, callback, devices: [], timer: setTimeout(() => this.finish(id, ''), this.timeoutMs) };
    }
    this.pending.callback = callback;
    this.pending.devices = devices.map(({ deviceId, deviceName, advertisedMac, rssi }) => ({ deviceId, deviceName, advertisedMac, rssi }));
    this.publish({ requestId: this.pending.id, devices: this.pending.devices });
  }
  finish(id, deviceId) {
    const p = this.pending;
    if (!p || p.id !== id) return false;
    if (deviceId && !p.devices.some(d => d.deviceId === deviceId)) return false;
    this.pending = null;
    clearTimeout(p.timer);
    this.publish(null);
    p.callback(deviceId);
    return true;
  }
  cancel() { if (this.pending) this.finish(this.pending.id, ''); }
}
module.exports = { Selection };
