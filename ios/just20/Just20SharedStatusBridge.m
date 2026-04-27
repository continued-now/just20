#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(Just20SharedStatus, NSObject)

RCT_EXTERN_METHOD(writeStatus:(NSDictionary *)status
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
