import Foundation
import CoreBluetooth
import CryptoKit

// E87's 0x6DB9 manufacturer record contains the screen address in bytes 2...7.
// CoreBluetooth hides the radio address; Chromium uses a SHA256-derived ID.
// This read-only helper joins those two identifiers without connecting to GATT.
final class Discovery: NSObject, CBCentralManagerDelegate {
    var central: CBCentralManager!
    var last: [String: String] = [:]
    override init() {
        super.init()
        central = CBCentralManager(delegate: self, queue: .main, options: [CBCentralManagerOptionShowPowerAlertKey: false])
    }
    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        if central.state == .poweredOn {
            central.scanForPeripherals(withServices: [CBUUID(string: "FD00")], options: [CBCentralManagerScanOptionAllowDuplicatesKey: true])
        } else if central.state == .unauthorized || central.state == .unsupported {
            exit(0)
        }
    }
    func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String: Any], rssi RSSI: NSNumber) {
        let name = (advertisementData[CBAdvertisementDataLocalNameKey] as? String) ?? peripheral.name ?? ""
        guard name.hasPrefix("E87"), let payload = advertisementData[CBAdvertisementDataManufacturerDataKey] as? Data else { return }
        let bytes = [UInt8](payload)
        guard bytes.count >= 10, bytes[0] == 0xB9, bytes[1] == 0x6D else { return }
        let mac = bytes[2..<8].map { String(format: "%02X", $0) }.joined(separator: ":")
        guard mac != "00:00:00:00:00:00", mac != "FF:FF:FF:FF:FF:FF" else { return }
        let uuid = peripheral.identifier.uuidString
        let id = SHA256.hash(data: Data(uuid.utf8)).prefix(6).map { String(format: "%02X", $0) }.joined(separator: ":")
        guard last[id] != mac else { return }
        last[id] = mac
        let record: [String: Any] = ["deviceId": id, "advertisedMac": mac, "rssi": RSSI.intValue]
        if let data = try? JSONSerialization.data(withJSONObject: record), let line = String(data: data, encoding: .utf8) {
            print(line); fflush(stdout)
        }
    }
    func stop() { central.stopScan() }
}

let discovery = Discovery()
DispatchQueue.main.asyncAfter(deadline: .now() + 18) { discovery.stop(); exit(0) }
RunLoop.main.run()
