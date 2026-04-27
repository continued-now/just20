import SwiftUI
import WidgetKit

struct Just20ComplicationEntry: TimelineEntry {
  let date: Date
  let status: Just20Status
}

struct Just20ComplicationProvider: TimelineProvider {
  func placeholder(in context: Context) -> Just20ComplicationEntry {
    Just20ComplicationEntry(date: Date(), status: .fallback)
  }

  func getSnapshot(in context: Context, completion: @escaping (Just20ComplicationEntry) -> Void) {
    completion(Just20ComplicationEntry(date: Date(), status: Just20StatusStore.read()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<Just20ComplicationEntry>) -> Void) {
    let now = Date()
    let status = Just20StatusStore.read()
    completion(Timeline(entries: [Just20ComplicationEntry(date: now, status: status)], policy: .after(now.addingTimeInterval(30 * 60))))
  }
}

struct Just20ComplicationView: View {
  @Environment(\.widgetFamily) private var family
  let entry: Just20ComplicationEntry

  var body: some View {
    switch family {
    case .accessoryRectangular:
      VStack(alignment: .leading, spacing: 2) {
        Text(entry.status.completedToday ? "Just20 done" : "Just20 waiting")
          .font(.headline)
        Text(Just20Copy.subline(for: entry.status))
          .font(.caption2)
      }
      .widgetURL(Just20Copy.url(for: entry.status))
    case .accessoryInline:
      Text(entry.status.completedToday ? "Just20 done" : "Just20: \(entry.status.currentStreak)🔥")
        .widgetURL(Just20Copy.url(for: entry.status))
    default:
      ZStack {
        AccessoryWidgetBackground()
        VStack(spacing: 0) {
          Text(Just20Mascot.emoji(for: entry.status.mascotMood))
            .font(.title3)
          Text("\(entry.status.currentStreak)")
            .font(.caption2)
            .fontWeight(.black)
        }
      }
      .widgetURL(Just20Copy.url(for: entry.status))
    }
  }
}

@main
struct Just20WatchComplication: Widget {
  let kind = "Just20WatchComplication"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: Just20ComplicationProvider()) { entry in
      Just20ComplicationView(entry: entry)
    }
    .configurationDisplayName("Just20")
    .description("Keep your pushup streak on your watch face.")
    .supportedFamilies([.accessoryCircular, .accessoryRectangular, .accessoryInline])
  }
}
