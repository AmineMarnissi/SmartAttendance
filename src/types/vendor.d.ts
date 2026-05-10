declare module 'victory-native' {
  import * as React from 'react';

  export const VictoryBar: React.ComponentType<any>;
  export const VictoryChart: React.ComponentType<any>;
  export const VictoryTheme: any;
  export const VictoryAxis: React.ComponentType<any>;
  export const VictoryLine: React.ComponentType<any>;
}

declare module 'react-native-vector-icons/MaterialCommunityIcons' {
  import * as React from 'react';
  import {TextProps} from 'react-native';

  type IconProps = TextProps & {
    name: string;
    size?: number;
    color?: string;
  };

  const MaterialCommunityIcons: React.ComponentType<IconProps>;
  export default MaterialCommunityIcons;
}
