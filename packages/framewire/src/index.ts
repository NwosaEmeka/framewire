export { createHost, type HostOptions } from './host';
export { createFrame, type FrameOptions } from './frame';
export { FramewireError, type ErrorCode } from './errors';
export { PROTOCOL_VERSION } from './protocol';
export type { AllowedOrigins, OriginPredicate } from './origin';
export type { NavigateOptions, NavigationPolicy } from './navigate';
export type { FrameResizeOptions, HostResizeOptions } from './resize';
export type {
  AnyContract,
  Bridge,
  BridgeOptions,
  Contract,
  DropReason,
  Events,
  FrameBridge,
  FrameExtras,
  HostBridge,
  Methods,
  RequestOptions,
  State,
} from './types';
