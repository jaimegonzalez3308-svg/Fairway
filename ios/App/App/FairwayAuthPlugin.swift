import AuthenticationServices
import Capacitor
import UIKit

/// A system authentication sheet; Google credentials never enter our web view.
@objc(FairwayAuthPlugin)
public final class FairwayAuthPlugin: CAPPlugin, CAPBridgedPlugin, ASWebAuthenticationPresentationContextProviding {
    public let identifier = "FairwayAuthPlugin"
    public let jsName = "FairwayAuth"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authenticate", returnType: CAPPluginReturnPromise)
    ]

    private var authenticationSession: ASWebAuthenticationSession?
    private var presentationWindow: UIWindow?

    @objc func authenticate(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            guard self.authenticationSession == nil else {
                call.reject("Ya hay un acceso con Google en curso.")
                return
            }
            guard let value = call.getString("url"),
                  let components = URLComponents(string: value),
                  let url = components.url,
                  components.scheme == "https", components.host != nil,
                  components.user == nil, components.password == nil,
                  components.path == "/auth/v1/authorize",
                  components.queryItems?.first(where: { $0.name == "provider" })?.value == "google",
                  components.queryItems?.first(where: { $0.name == "redirect_to" })?.value == "com.fairway.app://auth/callback",
                  let window = self.bridge?.viewController?.view.window else {
                call.reject("No se pudo abrir el acceso seguro con Google. Intenta de nuevo.")
                return
            }
            self.presentationWindow = window
            let session = ASWebAuthenticationSession(url: url, callbackURLScheme: "com.fairway.app") { [weak self] callback, error in
                DispatchQueue.main.async {
                    self?.authenticationSession = nil
                    self?.presentationWindow = nil
                    if let error = error as? ASWebAuthenticationSessionError, error.code == .canceledLogin {
                        call.resolve(["cancelled": true])
                    } else if error != nil || callback == nil {
                        call.reject("No se pudo completar el acceso con Google. Intenta de nuevo.")
                    } else if let callback = callback {
                        call.resolve(["cancelled": false, "url": callback.absoluteString])
                    }
                }
            }
            session.presentationContextProvider = self
            // Reuse the user's browser sign-in if iOS and Google allow it.
            session.prefersEphemeralWebBrowserSession = false
            self.authenticationSession = session
            if !session.start() {
                self.authenticationSession = nil
                self.presentationWindow = nil
                call.reject("No se pudo abrir Google. Intenta de nuevo.")
            }
        }
    }

    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        presentationWindow ?? ASPresentationAnchor()
    }
}
