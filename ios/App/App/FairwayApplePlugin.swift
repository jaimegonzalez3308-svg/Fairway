import AuthenticationServices
import Capacitor
import CryptoKit
import Security
import UIKit

@objc(FairwayApplePlugin)
public final class FairwayApplePlugin: CAPPlugin, CAPBridgedPlugin, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    public let identifier = "FairwayApplePlugin"
    public let jsName = "FairwayApple"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authorize", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "credentialState", returnType: CAPPluginReturnPromise)
    ]
    private var pending: CAPPluginCall?
    private var nonce: String?
    private var controller: ASAuthorizationController?
    private var revokedObserver: NSObjectProtocol?

    public override func load() {
        revokedObserver = NotificationCenter.default.addObserver(forName: ASAuthorizationAppleIDProvider.credentialRevokedNotification, object: nil, queue: .main) { [weak self] _ in
            self?.notifyListeners("credentialRevoked", data: [:])
        }
    }
    deinit { if let observer = revokedObserver { NotificationCenter.default.removeObserver(observer) } }

    @objc func credentialState(_ call: CAPPluginCall) {
        guard let user = call.getString("user"), !user.isEmpty else { call.reject("Identidad no disponible"); return }
        ASAuthorizationAppleIDProvider().getCredentialState(forUserID: user) { state, error in
            if error != nil { call.reject("Apple no está disponible"); return }
            switch state {
            case .revoked, .notFound: call.resolve(["revoked": true])
            default: call.resolve(["revoked": false])
            }
        }
    }

    @objc func authorize(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            guard self.pending == nil, self.bridge?.viewController?.view.window != nil else {
                call.reject("Ya hay un acceso en curso o la app no está lista."); return
            }
            var bytes = [UInt8](repeating: 0, count: 32)
            guard SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes) == errSecSuccess else {
                call.reject("No se pudo preparar el acceso seguro con Apple."); return
            }
            let nonce = Data(bytes).base64EncodedString()
            let request = ASAuthorizationAppleIDProvider().createRequest()
            request.requestedScopes = [.fullName, .email]
            request.nonce = SHA256.hash(data: Data(nonce.utf8)).map { String(format: "%02x", $0) }.joined()
            let controller = ASAuthorizationController(authorizationRequests: [request])
            self.pending = call
            self.nonce = nonce
            self.controller = controller
            controller.delegate = self
            controller.presentationContextProvider = self
            controller.performRequests()
        }
    }

    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        bridge?.viewController?.view.window ?? ASPresentationAnchor()
    }
    public func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        defer { pending = nil; nonce = nil; self.controller = nil }
        guard let call = pending, let nonce = nonce,
              let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let tokenData = credential.identityToken, let token = String(data: tokenData, encoding: .utf8),
              let codeData = credential.authorizationCode, let code = String(data: codeData, encoding: .utf8) else {
            pending?.reject("Apple no devolvió una confirmación válida. Intenta de nuevo."); return
        }
        let name = credential.fullName.map { PersonNameComponentsFormatter().string(from: $0) } ?? ""
        call.resolve(["cancelled": false, "identityToken": token, "authorizationCode": code, "nonce": nonce, "name": name])
    }
    public func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        defer { pending = nil; nonce = nil; self.controller = nil }
        if (error as? ASAuthorizationError)?.code == .canceled {
            pending?.resolve(["cancelled": true])
        } else {
            pending?.reject("No se pudo completar el acceso con Apple. Revisa la conexión y la disponibilidad de tu cuenta.")
        }
    }
}
