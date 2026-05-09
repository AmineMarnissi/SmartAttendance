/* eslint-env jest */

jest.mock('@op-engineering/op-sqlite', () => ({
  open: jest.fn(() => ({
    execute: jest.fn().mockResolvedValue({rows: {_array: []}, insertId: 1}),
  })),
}));

jest.mock('react-native-vision-camera', () => ({
  Camera: () => null,
  VisionCamera: {
    cameraPermissionStatus: 'authorized',
    requestCameraPermission: jest.fn().mockResolvedValue(true),
  },
  useCameraDevice: jest.fn().mockReturnValue({position: 'front'}),
  useFrameOutput: jest.fn().mockReturnValue({
    thread: {},
    setOnFrameDroppedCallback: jest.fn(),
  }),
}));

jest.mock('react-native-fast-tflite', () => ({
  loadTensorflowModel: jest.fn().mockResolvedValue({
    run: jest.fn().mockResolvedValue([new Float32Array(128)]),
    runSync: jest.fn().mockReturnValue([new Float32Array(128).buffer]),
  }),
  useTensorflowModel: jest.fn().mockReturnValue({
    state: 'loaded',
    model: {
      run: jest.fn().mockResolvedValue([new Float32Array(128)]),
      runSync: jest.fn().mockReturnValue([new Float32Array(128).buffer]),
    },
  }),
}));

jest.mock('react-native-nitro-modules', () => ({
  NitroModules: {
    box: jest.fn(value => ({
      unbox: () => value,
    })),
  },
}));

jest.mock('vision-camera-face-detector', () => ({
  scanFaces: jest.fn().mockReturnValue([]),
}));

jest.mock('vision-camera-resize-plugin', () => ({
  useResizePlugin: jest.fn().mockReturnValue({
    resize: jest.fn((_frame, options) => {
      const size = options.scale.width * options.scale.height * 3;
      return options.dataType === 'float32'
        ? new Float32Array(size)
        : new Uint8Array(size);
    }),
  }),
}));

jest.mock('victory-native', () => {
  const React = require('react');
  const {View} = require('react-native');
  const Mock = ({children}) => React.createElement(View, null, children);
  return {
    VictoryBar: Mock,
    VictoryChart: Mock,
    VictoryTheme: {},
    VictoryAxis: Mock,
    VictoryLine: Mock,
  };
});

jest.mock('react-native-worklets-core', () => ({
  useRunOnJS: jest.fn(callback => callback),
  Worklets: {
    createRunOnJS: jest.fn(callback => callback),
  },
}));

jest.mock('@notifee/react-native', () => ({
  displayNotification: jest.fn(),
  createChannel: jest.fn(),
  requestPermission: jest.fn(),
  AndroidImportance: {HIGH: 4},
}));

jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    NavigationContainer: ({children}) =>
      React.createElement(React.Fragment, null, children),
  };
});

jest.mock('@react-navigation/stack', () => {
  const React = require('react');
  const createStackNavigator = () => ({
    Navigator: ({children}) =>
      React.createElement(React.Fragment, null, children),
    Screen: ({children}) => React.createElement(React.Fragment, null, children),
  });
  return {createStackNavigator};
});

jest.mock('@react-navigation/bottom-tabs', () => {
  const React = require('react');
  const createBottomTabNavigator = () => ({
    Navigator: ({children}) =>
      React.createElement(React.Fragment, null, children),
    Screen: ({children}) => React.createElement(React.Fragment, null, children),
  });
  return {createBottomTabNavigator};
});

jest.mock('react-native-reanimated', () => {
  return {
    __esModule: true,
    default: {},
    useSharedValue: jest.fn(value => ({value})),
    useAnimatedStyle: jest.fn(() => ({})),
  };
});

jest.mock('react-native-gesture-handler', () => {
  return {
    GestureHandlerRootView: ({children}) => children,
    Swipeable: ({children}) => children,
    DrawerLayout: ({children}) => children,
    State: {},
    PanGestureHandler: ({children}) => children,
    BaseButton: ({children}) => children,
    RectButton: ({children}) => children,
    NativeViewGestureHandler: ({children}) => children,
    TapGestureHandler: ({children}) => children,
    FlingGestureHandler: ({children}) => children,
    ForceTouchGestureHandler: ({children}) => children,
    LongPressGestureHandler: ({children}) => children,
    RotationGestureHandler: ({children}) => children,
    PinchGestureHandler: ({children}) => children,
    Directions: {},
  };
});

jest.mock('react-native-fs', () => ({
  writeFile: jest.fn(),
  DocumentDirectoryPath: '/mock-path',
}));

const ReactNative = require('react-native');
ReactNative.Linking.addEventListener = jest.fn(() => ({
  remove: jest.fn(),
}));
ReactNative.Linking.removeEventListener = jest.fn();
ReactNative.Linking.getInitialURL = jest.fn().mockResolvedValue(null);
ReactNative.Linking.openSettings = jest.fn();
ReactNative.AccessibilityInfo = {
  addEventListener: jest.fn(() => ({
    remove: jest.fn(),
  })),
  removeEventListener: jest.fn(),
  isReduceMotionEnabled: jest.fn().mockResolvedValue(false),
  isScreenReaderEnabled: jest.fn().mockResolvedValue(false),
};
