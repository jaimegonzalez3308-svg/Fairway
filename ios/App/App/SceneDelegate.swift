import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = FairwayContainerViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }

    func sceneDidEnterBackground(_ scene: UIScene) {
        NativePrivacyLock.shared.lock()
    }
}

/// Keep every web screen, including fixed toolbars and dialogs, clear of iOS system UI.
private final class FairwayBridgeViewController: CAPBridgeViewController {
    override var preferredStatusBarStyle: UIStatusBarStyle { .darkContent }
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(FairwayAuthPlugin())
        bridge?.registerPluginInstance(FairwayDevicePlugin())
        bridge?.registerPluginInstance(FairwayApplePlugin())
    }
}

private final class FairwayContainerViewController: UIViewController {
    private let bridgeViewController = FairwayBridgeViewController()

    override var childForStatusBarStyle: UIViewController? { bridgeViewController }
    override var childForStatusBarHidden: UIViewController? { bridgeViewController }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 245 / 255.0, green: 243 / 255.0, blue: 234 / 255.0, alpha: 1)

        addChild(bridgeViewController)
        let contentView = bridgeViewController.view!
        contentView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(contentView)

        let safeArea = view.safeAreaLayoutGuide
        NSLayoutConstraint.activate([
            contentView.topAnchor.constraint(equalTo: safeArea.topAnchor),
            contentView.bottomAnchor.constraint(equalTo: safeArea.bottomAnchor),
            contentView.leadingAnchor.constraint(equalTo: safeArea.leadingAnchor),
            contentView.trailingAnchor.constraint(equalTo: safeArea.trailingAnchor)
        ])
        bridgeViewController.didMove(toParent: self)
        NativePrivacyLock.shared.attach(to: view, content: contentView)
    }
}
