import SwiftUI
import WatchKit

@main
struct Just20WatchApp: App {
  var body: some Scene {
    WindowGroup {
      Just20WatchView()
    }
  }
}

struct Just20WatchView: View {
  @State private var status = Just20StatusStore.read()

  var body: some View {
    NavigationStack {
      VStack(spacing: 10) {
        ZStack {
          Circle()
            .fill(Just20Mascot.background(for: status.mascotMood))
          Text(Just20Mascot.emoji(for: status.mascotMood))
            .font(.system(size: 40))
        }
        .frame(width: 74, height: 74)

        Text(Just20Copy.headline(for: status))
          .font(.headline)
          .fontWeight(.black)
          .multilineTextAlignment(.center)
          .minimumScaleFactor(0.7)

        Text(Just20Copy.subline(for: status))
          .font(.footnote)
          .foregroundStyle(.secondary)
          .multilineTextAlignment(.center)

        HStack(spacing: 8) {
          Label("\(status.currentStreak)", systemImage: "flame.fill")
          if status.freezeCount > 0 {
            Label("\(status.freezeCount)", systemImage: "snowflake")
          }
        }
        .font(.caption)
        .fontWeight(.bold)
        .foregroundStyle(.orange)

        Button(status.completedToday ? "Open Streak" : "Start on iPhone") {
          openPhone()
        }
        .buttonStyle(.borderedProminent)

        if status.lockInModeEnabled && !status.completedToday {
          Text("Lock-in mode is on.")
            .font(.caption2)
            .foregroundStyle(.red)
        }
      }
      .padding()
      .navigationTitle("Just20")
    }
    .onAppear {
      status = Just20StatusStore.read()
    }
  }

  private func openPhone() {
    guard let url = Just20Copy.url(for: status) else { return }
    WKExtension.shared().openSystemURL(url)
  }
}
