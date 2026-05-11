import React from 'react';
import {Image} from 'react-native';
import {Avatar} from 'react-native-paper';
import {Buffer} from 'buffer';

interface StudentThumbnailProps {
  thumbnail: any; // BLOB from SQLite (Uint8Array or ArrayBuffer)
  size?: number;
}

const StudentThumbnail = ({thumbnail, size = 50}: StudentThumbnailProps) => {
  if (!thumbnail) {
    return <Avatar.Icon size={size} icon="account" />;
  }

  let base64 = '';

  try {
    if (typeof thumbnail === 'string') {
      // Already a string (Base64 or URI)
      base64 = thumbnail.startsWith('data:')
        ? thumbnail
        : `data:image/jpeg;base64,${thumbnail}`;
    } else if (thumbnail instanceof Uint8Array || thumbnail instanceof ArrayBuffer) {
      const u8 = thumbnail instanceof Uint8Array ? thumbnail : new Uint8Array(thumbnail);
      base64 = `data:image/jpeg;base64,${Buffer.from(u8).toString('base64')}`;
    } else if (thumbnail && typeof thumbnail === 'object') {
      // Sometimes SQLite returns an object with numeric keys for BLOBs
      const u8 = new Uint8Array(Object.values(thumbnail));
      base64 = `data:image/jpeg;base64,${Buffer.from(u8).toString('base64')}`;
    }
  } catch (error) {
    console.error('[StudentThumbnail] Failed to parse thumbnail:', error);
    return <Avatar.Icon size={size} icon="account-alert" />;
  }

  if (!base64) {
    return <Avatar.Icon size={size} icon="account" />;
  }

  return (
    <Image
      source={{uri: base64}}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
      }}
    />
  );
};

export default StudentThumbnail;
