import Foundation
import React
import WidgetKit

@objc(Just20SharedStatus)
class Just20SharedStatus: NSObject {
  private let appGroupIdentifier = "group.com.anonymous.just20"
  private let statusKey = "Just20Status"

  @objc(writeStatus:resolver:rejecter:)
  func writeStatus(
    _ status: NSDictionary,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    guard let defaults = UserDefaults(suiteName: appGroupIdentifier) else {
      reject("app_group_unavailable", "Unable to open \(appGroupIdentifier).", nil)
      return
    }

    guard JSONSerialization.isValidJSONObject(status) else {
      reject("invalid_status", "Status payload is not JSON serializable.", nil)
      return
    }

    do {
      let data = try JSONSerialization.data(withJSONObject: status, options: [])
      let json = String(data: data, encoding: .utf8)
      defaults.set(json, forKey: statusKey)
      defaults.synchronize()
      WidgetCenter.shared.reloadAllTimelines()
      resolve(nil)
    } catch {
      reject("write_failed", "Unable to write shared Just20 status.", error)
    }
  }
}
