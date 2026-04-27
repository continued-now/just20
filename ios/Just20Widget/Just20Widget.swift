import SwiftUI
import WidgetKit

struct Just20WidgetEntry: TimelineEntry {
  let date: Date
  let status: Just20Status
}

struct Just20WidgetProvider: TimelineProvider {
  func placeholder(in context: Context) -> Just20WidgetEntry {
    Just20WidgetEntry(date: Date(), status: .fallback)
  }

  func getSnapshot(in context: Context, completion: @escaping (Just20WidgetEntry) -> Void) {
    completion(Just20WidgetEntry(date: Date(), status: Just20StatusStore.read()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<Just20WidgetEntry>) -> Void) {
    let status = Just20StatusStore.read()
    let now = Date()
    let entry = Just20WidgetEntry(date: now, status: status)

    let nextNudge = status.nextNudgeAt.map { Date(timeIntervalSince1970: $0 / 1000) }
    let midnight = Calendar.current.startOfDay(for: now).addingTimeInterval(24 * 60 * 60)
    let evening = Calendar.current.date(bySettingHour: 20, minute: 0, second: 0, of: now)
    let candidates = [nextNudge, evening, midnight, now.addingTimeInterval(60 * 60)]
      .compactMap { $0 }
      .filter { $0 > now.addingTimeInterval(60) }
      .sorted()

    completion(Timeline(entries: [entry], policy: .after(candidates.first ?? now.addingTimeInterval(60 * 60))))
  }
}

struct Just20WidgetView: View {
  @Environment(\.widgetFamily) private var family
  let entry: Just20WidgetEntry

  var body: some View {
    switch family {
    case .systemMedium:
      medium
    case .accessoryCircular:
      accessoryCircular
    case .accessoryRectangular:
      accessoryRectangular
    case .accessoryInline:
      Text(entry.status.completedToday ? "Just20 done" : "Just20: 20 waiting")
    default:
      small
    }
  }

  private var small: some View {
    VStack(alignment: .leading, spacing: 8) {
      mascot(size: 44)
      Text(Just20Copy.headline(for: entry.status))
        .font(.headline)
        .fontWeight(.black)
        .minimumScaleFactor(0.75)
      Text(Just20Copy.subline(for: entry.status))
        .font(.caption)
        .foregroundStyle(.secondary)
      Spacer(minLength: 0)
      Text("DAY \(entry.status.currentStreak)")
        .font(.caption2)
        .fontWeight(.black)
        .foregroundStyle(Color.orange)
    }
    .widgetURL(Just20Copy.url(for: entry.status))
    .just20WidgetBackground()
  }

  private var medium: some View {
    HStack(spacing: 14) {
      mascot(size: 72)
      VStack(alignment: .leading, spacing: 6) {
        Text(Just20Copy.headline(for: entry.status))
          .font(.title3)
          .fontWeight(.black)
          .minimumScaleFactor(0.7)
        Text(Just20Copy.subline(for: entry.status))
          .font(.subheadline)
          .foregroundStyle(.secondary)
        HStack(spacing: 8) {
          Label("Day \(entry.status.currentStreak)", systemImage: "flame.fill")
          if entry.status.freezeCount > 0 {
            Label("\(entry.status.freezeCount)", systemImage: "snowflake")
          }
        }
        .font(.caption)
        .fontWeight(.bold)
        .foregroundStyle(Color.orange)
      }
      Spacer(minLength: 0)
    }
    .widgetURL(Just20Copy.url(for: entry.status))
    .just20WidgetBackground()
  }

  private var accessoryCircular: some View {
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

  private var accessoryRectangular: some View {
    VStack(alignment: .leading, spacing: 2) {
      Text(entry.status.completedToday ? "Just20 complete" : "Just20 waiting")
        .font(.headline)
      Text(Just20Copy.subline(for: entry.status))
        .font(.caption)
    }
    .widgetURL(Just20Copy.url(for: entry.status))
  }

  private func mascot(size: CGFloat) -> some View {
    ZStack {
      Circle()
        .fill(Just20Mascot.background(for: entry.status.mascotMood))
      Text(Just20Mascot.emoji(for: entry.status.mascotMood))
        .font(.system(size: size * 0.48))
    }
    .frame(width: size, height: size)
  }
}

struct Just20Widget: Widget {
  let kind = "Just20Widget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: Just20WidgetProvider()) { entry in
      Just20WidgetView(entry: entry)
    }
    .configurationDisplayName("Just20")
    .description("See your streak, mascot mood, and whether the floor is waiting.")
    .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular, .accessoryInline])
  }
}

@main
struct Just20WidgetBundle: WidgetBundle {
  var body: some Widget {
    Just20Widget()
  }
}

private extension View {
  @ViewBuilder
  func just20WidgetBackground() -> some View {
    if #available(iOSApplicationExtension 17.0, *) {
      self.containerBackground(Color(red: 0.96, green: 0.96, blue: 0.92), for: .widget)
    } else {
      self.background(Color(red: 0.96, green: 0.96, blue: 0.92))
    }
  }
}
