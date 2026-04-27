import Foundation
import SwiftUI

let just20AppGroupIdentifier = "group.com.anonymous.just20"
let just20StatusKey = "Just20Status"

struct Just20Status: Codable {
  var completedToday: Bool
  var currentStreak: Int
  var freezeCount: Int
  var remainingNudges: Int
  var nextNudgeAt: Double?
  var lastCompletedDate: String?
  var mascotMood: String
  var streakTierLabel: String
  var lockInModeEnabled: Bool
  var widgetUrgencyEnabled: Bool
  var watchNudgesEnabled: Bool
  var lastUpdatedAt: Double

  static let fallback = Just20Status(
    completedToday: false,
    currentStreak: 0,
    freezeCount: 0,
    remainingNudges: 20,
    nextNudgeAt: nil,
    lastCompletedDate: nil,
    mascotMood: "neutral",
    streakTierLabel: "Dormant",
    lockInModeEnabled: false,
    widgetUrgencyEnabled: true,
    watchNudgesEnabled: true,
    lastUpdatedAt: 0
  )
}

enum Just20StatusStore {
  static func read() -> Just20Status {
    guard
      let defaults = UserDefaults(suiteName: just20AppGroupIdentifier),
      let json = defaults.string(forKey: just20StatusKey),
      let data = json.data(using: .utf8),
      let status = try? JSONDecoder().decode(Just20Status.self, from: data)
    else {
      return .fallback
    }
    return status
  }
}

enum Just20Mascot {
  static func emoji(for mood: String) -> String {
    switch mood {
    case "sleeping": return "😴"
    case "annoyed": return "😒"
    case "angry": return "😤"
    case "furious": return "🤬"
    case "celebrating": return "🥳"
    default: return "😐"
    }
  }

  static func background(for mood: String) -> Color {
    switch mood {
    case "annoyed": return Color(red: 1, green: 0.90, blue: 0.70)
    case "angry": return Color(red: 1, green: 0.80, blue: 0.82)
    case "furious": return Color(red: 1, green: 0.54, blue: 0.50)
    case "celebrating": return Color(red: 0.78, green: 0.90, blue: 0.79)
    default: return Color(red: 0.91, green: 0.91, blue: 0.88)
    }
  }
}

enum Just20Copy {
  static func headline(for status: Just20Status) -> String {
    if status.completedToday { return "Done today." }
    if status.lockInModeEnabled && status.widgetUrgencyEnabled { return "Lock-in mode is watching." }
    if Calendar.current.component(.hour, from: Date()) >= 20 && status.currentStreak > 0 {
      return "Day \(status.currentStreak) is not saving itself."
    }
    return "20 waiting."
  }

  static func subline(for status: Just20Status) -> String {
    if status.completedToday { return "Day \(status.currentStreak) survived." }
    if status.remainingNudges <= 3 { return "The floor is getting impatient." }
    if let next = status.nextNudgeAt {
      let date = Date(timeIntervalSince1970: next / 1000)
      return "Next nudge \(date.formatted(date: .omitted, time: .shortened))."
    }
    return "\(status.remainingNudges) nudges left."
  }

  static func url(for status: Just20Status) -> URL? {
    URL(string: status.completedToday ? "just20://streak" : "just20://workout")
  }
}
