import Capacitor
import LocalAuthentication
import Security
import UIKit
import UserNotifications

final class NativePrivacyLock {
    static let shared = NativePrivacyLock()
    static let preference = "fairway.biometric-enabled"
    private weak var host: UIView?
    private weak var content: UIView?
    private var shield: UIView?
    private var authenticating = false

    func attach(to host: UIView, content: UIView) {
        self.host = host
        self.content = content
        if UserDefaults.standard.bool(forKey: Self.preference) { lock() }
    }

    func lock() {
        guard UserDefaults.standard.bool(forKey: Self.preference), shield == nil, let host = host else { return }
        let cover = UIView()
        cover.backgroundColor = UIColor(red: 245 / 255.0, green: 243 / 255.0, blue: 234 / 255.0, alpha: 1)
        cover.translatesAutoresizingMaskIntoConstraints = false
        cover.accessibilityViewIsModal = true
        let title = UILabel()
        title.text = "Fairway está protegido"
        title.textColor = UIColor(red: 37 / 255.0, green: 76 / 255.0, blue: 54 / 255.0, alpha: 1)
        title.font = .preferredFont(forTextStyle: .title2)
        title.adjustsFontForContentSizeCategory = true
        title.textAlignment = .center
        title.numberOfLines = 0
        let button = UIButton(type: .system)
        button.tintColor = UIColor(red: 37 / 255.0, green: 76 / 255.0, blue: 54 / 255.0, alpha: 1)
        button.setTitle("Desbloquear con Face ID, Touch ID o código", for: .normal)
        button.titleLabel?.font = .preferredFont(forTextStyle: .body)
        button.titleLabel?.adjustsFontForContentSizeCategory = true
        button.titleLabel?.numberOfLines = 0
        button.titleLabel?.textAlignment = .center
        button.heightAnchor.constraint(greaterThanOrEqualToConstant: 56).isActive = true
        button.addTarget(self, action: #selector(unlock), for: .touchUpInside)
        let stack = UIStackView(arrangedSubviews: [title, button])
        stack.axis = .vertical
        stack.spacing = 24
        stack.translatesAutoresizingMaskIntoConstraints = false
        cover.addSubview(stack)
        host.addSubview(cover)
        NSLayoutConstraint.activate([
            cover.topAnchor.constraint(equalTo: host.topAnchor), cover.bottomAnchor.constraint(equalTo: host.bottomAnchor),
            cover.leadingAnchor.constraint(equalTo: host.leadingAnchor), cover.trailingAnchor.constraint(equalTo: host.trailingAnchor),
            stack.centerYAnchor.constraint(equalTo: cover.centerYAnchor),
            stack.leadingAnchor.constraint(equalTo: cover.safeAreaLayoutGuide.leadingAnchor, constant: 24),
            stack.trailingAnchor.constraint(equalTo: cover.safeAreaLayoutGuide.trailingAnchor, constant: -24)
        ])
        content?.accessibilityElementsHidden = true
        content?.isUserInteractionEnabled = false
        shield = cover
        UIAccessibility.post(notification: .screenChanged, argument: title)
    }

    @objc private func unlock() {
        guard !authenticating else { return }
        authenticating = true
        let context = LAContext()
        context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: "Desbloquear Fairway y tus datos de golf") { [weak self] success, _ in
            DispatchQueue.main.async {
                self?.authenticating = false
                if success { self?.removeShield() }
            }
        }
    }

    func removeShield() {
        shield?.removeFromSuperview()
        shield = nil
        content?.accessibilityElementsHidden = false
        content?.isUserInteractionEnabled = true
        UIAccessibility.post(notification: .screenChanged, argument: nil)
    }
}

@objc(FairwayDevicePlugin)
public final class FairwayDevicePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "FairwayDevicePlugin"
    public let jsName = "FairwayDevice"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "get", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "set", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "remove", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearPrivateData", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setBiometricEnabled", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "haptic", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setBadge", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openSettings", returnType: CAPPluginReturnPromise)
    ]
    private let service = "com.fairway.app.private.v1"

    public override func load() {
        // Keychain survives reinstall; a new installation must not inherit a session.
        if !UserDefaults.standard.bool(forKey: "fairway.vault-initialized") {
            SecItemDelete([kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service] as CFDictionary)
            UserDefaults.standard.set(true, forKey: "fairway.vault-initialized")
            UserDefaults.standard.set(false, forKey: NativePrivacyLock.preference)
        }
    }

    private func query(_ call: CAPPluginCall) -> [String: Any]? {
        guard let key = call.getString("key"), !key.isEmpty, key.utf8.count <= 200 else {
            call.reject("No se pudo acceder al almacenamiento seguro.")
            return nil
        }
        return [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: key]
    }

    @objc func get(_ call: CAPPluginCall) {
        guard var query = query(call) else { return }
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        if status == errSecItemNotFound { call.resolve(["value": NSNull()]); return }
        guard status == errSecSuccess, let data = result as? Data, let value = String(data: data, encoding: .utf8) else {
            call.reject("Desbloquea el iPhone para recuperar tus datos seguros."); return
        }
        call.resolve(["value": value])
    }

    @objc func set(_ call: CAPPluginCall) {
        guard var query = query(call) else { return }
        guard let value = call.getString("value"), let data = value.data(using: .utf8), data.count <= 1024 * 1024 else {
            call.reject("No se pudo guardar: el dato supera el espacio seguro."); return
        }
        let update = [kSecValueData as String: data]
        let result = SecItemUpdate(query as CFDictionary, update as CFDictionary)
        if result == errSecItemNotFound {
            query[kSecValueData as String] = data
            query[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
            query[kSecAttrSynchronizable as String] = false
            guard SecItemAdd(query as CFDictionary, nil) == errSecSuccess else {
                call.reject("No se pudo guardar en el llavero del iPhone."); return
            }
        } else if result != errSecSuccess {
            call.reject("Desbloquea el iPhone antes de guardar."); return
        }
        call.resolve()
    }

    @objc func remove(_ call: CAPPluginCall) {
        guard let query = query(call) else { return }
        let status = SecItemDelete(query as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            call.reject("No se pudo eliminar el dato seguro."); return
        }
        call.resolve()
    }

    @objc func clearPrivateData(_ call: CAPPluginCall) {
        for key in ["offline.snapshot.v1", "offline.scores.v1"] {
            SecItemDelete([kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: key] as CFDictionary)
        }
        DispatchQueue.main.async {
            UserDefaults.standard.set(false, forKey: NativePrivacyLock.preference)
            NativePrivacyLock.shared.removeShield()
            call.resolve()
        }
    }

    @objc func status(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let context = LAContext()
            let available = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: nil)
            let name = context.biometryType == .faceID ? "Face ID" : context.biometryType == .touchID ? "Touch ID" : "Biometría"
            UNUserNotificationCenter.current().getNotificationSettings { settings in
                let status: String
                switch settings.authorizationStatus {
                case .authorized: status = "authorized"
                case .provisional, .ephemeral: status = "provisional"
                case .denied: status = "denied"
                default: status = "notDetermined"
                }
                call.resolve([
                    "biometricAvailable": available, "biometricName": name,
                    "biometricEnabled": UserDefaults.standard.bool(forKey: NativePrivacyLock.preference),
                    "pushConfigured": Bundle.main.object(forInfoDictionaryKey: "FairwayPushEnabled") as? Bool ?? false,
                    "pushEnvironment": self.apnsEnvironment,
                    "pushStatus": status
                ])
            }
        }
    }

    private var apnsEnvironment: String {
        Bundle.main.object(forInfoDictionaryKey: "FairwayAPNSEnvironment") as? String == "production" ? "production" : "sandbox"
    }

    @objc func setBiometricEnabled(_ call: CAPPluginCall) {
        let enabled = call.getBool("enabled") ?? false
        DispatchQueue.main.async {
            let context = LAContext()
            guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: nil) else {
                call.reject("Configura Face ID, Touch ID o un código en Ajustes del iPhone."); return
            }
            context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: "Cambiar la protección de Fairway en este iPhone") { success, _ in
                guard success else { call.reject("No se cambió la protección de Fairway."); return }
                DispatchQueue.main.async {
                    UserDefaults.standard.set(enabled, forKey: NativePrivacyLock.preference)
                    if !enabled { NativePrivacyLock.shared.removeShield() }
                    call.resolve()
                }
            }
        }
    }

    @objc func haptic(_ call: CAPPluginCall) {
        DispatchQueue.main.async { UISelectionFeedbackGenerator().selectionChanged(); call.resolve() }
    }
    @objc func setBadge(_ call: CAPPluginCall) {
        let count = max(0, min(call.getInt("count") ?? 0, 999))
        UNUserNotificationCenter.current().setBadgeCount(count) { _ in call.resolve() }
    }
    @objc func openSettings(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let url = URL(string: UIApplication.openSettingsURLString) else { call.resolve(); return }
            UIApplication.shared.open(url) { _ in call.resolve() }
        }
    }
}
