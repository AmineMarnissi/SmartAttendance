declare module 'victory-native' {
  import * as React from 'react';

  export const CartesianChart: React.ComponentType<any>;
  export const Line: React.ComponentType<any>;
  export const Bar: React.ComponentType<any>;
  export const Pie: React.ComponentType<any>;
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
