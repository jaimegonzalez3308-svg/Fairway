import SwiftUI
import WidgetKit

struct FairwayEntry: TimelineEntry { let date: Date }
struct FairwayProvider: TimelineProvider {
    func placeholder(in context: Context) -> FairwayEntry { FairwayEntry(date: .now) }
    func getSnapshot(in context: Context, completion: @escaping (FairwayEntry) -> Void) { completion(FairwayEntry(date: .now)) }
    func getTimeline(in context: Context, completion: @escaping (Timeline<FairwayEntry>) -> Void) {
        completion(Timeline(entries: [FairwayEntry(date: .now)], policy: .never))
    }
}
struct FairwayWidgetView: View {
    @Environment(\.widgetFamily) var family
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack { Image(systemName: "flag.fill"); Text("fairway.").font(.system(.title2, design: .serif).weight(.bold)) }
                .foregroundStyle(Color(red: 0.14, green: 0.30, blue: 0.21))
            Text("Tu próxima ronda, a mano.").font(.caption).foregroundStyle(Color(red: 0.30, green: 0.34, blue: 0.29))
            if family == .systemMedium {
                HStack(spacing: 12) {
                    shortcut("Mis scores", icon: "scope", page: "scores")
                    shortcut("Partidas", icon: "flag", page: "partidas")
                }
            } else { Text("Abrir mis scores →").font(.subheadline.weight(.semibold)) }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .foregroundStyle(Color(red: 0.14, green: 0.30, blue: 0.21))
        .containerBackground(for: .widget) { Color(red: 0.96, green: 0.95, blue: 0.91) }
        .widgetURL(URL(string: "com.fairway.app://open?screen=scores"))
    }
    private func shortcut(_ title: String, icon: String, page: String) -> some View {
        Link(destination: URL(string: "com.fairway.app://open?screen=\(page)")!) {
            Label(title, systemImage: icon).font(.subheadline.weight(.semibold))
                .frame(maxWidth: .infinity, minHeight: 44)
                .background(Color(red: 0.88, green: 0.91, blue: 0.82), in: RoundedRectangle(cornerRadius: 12))
                .foregroundStyle(Color(red: 0.14, green: 0.30, blue: 0.21))
        }
    }
}
@main
struct FairwayWidgets: Widget {
    let kind = "FairwayShortcuts"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: FairwayProvider()) { _ in FairwayWidgetView() }
            .configurationDisplayName("Fairway a mano")
            .description("Abre tus scores o partidas. No muestra datos privados en la pantalla de inicio.")
            .supportedFamilies([.systemSmall, .systemMedium])
    }
}
