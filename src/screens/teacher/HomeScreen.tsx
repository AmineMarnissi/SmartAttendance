import React, {useEffect, useRef} from 'react';
import {
  View,
  StyleSheet,
  Text,
  Animated,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  Alert,
  Image,
} from 'react-native';
import {useTheme, Surface} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useThemeStore} from '../../store/useThemeStore';
import {classRepository} from '../../services/database/classRepository';
import {embeddingStorage} from '../../services/faceRecognition/EmbeddingStorage';

const {width} = Dimensions.get('window');

const HomeScreen = ({navigation}: any) => {
  const theme = useTheme();
  const isDarkMode = useThemeStore(state => state.isDarkMode);
  const [scanClass, setScanClass] = React.useState<{
    id: number;
    name: string;
    embeddingCount: number;
  } | null>(null);

  // Animations pour le contenu
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // Animations pour le fond (Blobs)
  const blob1Pos = useRef(new Animated.Value(0)).current;
  const blob2Pos = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Séquence d'entrée du contenu
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Animation continue des "blobs" de fond pour l'effet vivant
    const createLoop = (anim: Animated.Value, duration: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration,
            useNativeDriver: true,
          }),
        ]),
      );
    };

    createLoop(blob1Pos, 12000).start();
    createLoop(blob2Pos, 18000).start();
  }, [blob1Pos, blob2Pos, fadeAnim, scaleAnim, slideAnim]);

  useEffect(() => {
    const loadScanClass = async () => {
      try {
        const classes = await classRepository.getAll();

        if (classes.length === 0) {
          console.warn('[HomeScreen] No class found for scan.');
          setScanClass(null);
          return;
        }

        const classesWithEmbeddings = await Promise.all(
          classes.map(async cls => {
            const embeddings = await embeddingStorage.getAllForClass(cls.id);
            return {
              id: cls.id,
              name: cls.name,
              embeddingCount: embeddings.length,
            };
          }),
        );
        const preferredClass =
          classesWithEmbeddings.find(cls => cls.embeddingCount > 0) ??
          classesWithEmbeddings[0];

        console.log('[HomeScreen] Selected scan class:', preferredClass);
        setScanClass(preferredClass);
      } catch (error) {
        console.error('[HomeScreen] Failed to load scan class:', error);
        setScanClass(null);
      }
    };

    const unsubscribe = navigation.addListener('focus', loadScanClass);
    loadScanClass();

    return unsubscribe;
  }, [navigation]);

  const handleStartScan = () => {
    if (scanClass == null) {
      Alert.alert(
        'No Class Found',
        'Create a class and enroll at least one student before scanning.',
      );
      return;
    }

    if (scanClass.embeddingCount === 0) {
      Alert.alert(
        'No Face Embeddings',
        `Class "${scanClass.name}" has no enrolled face data. Enroll a student with face capture first.`,
      );
      return;
    }

    console.log('[HomeScreen] Opening scan for class:', scanClass);
    navigation.navigate('Scan', {classId: scanClass.id});
  };

  const b1TranslateX = blob1Pos.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, 50],
  });
  const b1TranslateY = blob1Pos.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 100],
  });

  const b2TranslateX = blob2Pos.interpolate({
    inputRange: [0, 1],
    outputRange: [30, -30],
  });
  const b2TranslateY = blob2Pos.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -80],
  });

  return (
    <View style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"} 
        translucent 
        backgroundColor="transparent" 
      />
      
      {/* Fond Animé "Safe" (Sans Skia pour éviter les crashs) */}
      <View style={[styles.backgroundContainer, {backgroundColor: theme.colors.background}]}>
        <Animated.View 
          style={[
            styles.blob, 
            styles.blob1, 
            { 
              backgroundColor: isDarkMode ? '#2C5364' : '#00D1FF33', // 20% opacity primary blue
              transform: [{translateX: b1TranslateX}, {translateY: b1TranslateY}] 
            }
          ]} 
        />
        <Animated.View 
          style={[
            styles.blob, 
            styles.blob2, 
            { 
              backgroundColor: isDarkMode ? '#203A43' : '#00D1FF22', // 13% opacity primary blue
              transform: [{translateX: b2TranslateX}, {translateY: b2TranslateY}] 
            }
          ]} 
        />
        <View style={[styles.overlay, {backgroundColor: isDarkMode ? 'rgba(15, 32, 39, 0.4)' : 'rgba(255, 255, 255, 0.4)'}]} />
      </View>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{translateY: slideAnim}, {scale: scaleAnim}],
          },
        ]}>
        
        {/* Logo Container with Glassmorphism */}
        <View style={styles.logoContainer}>
          <Surface style={[styles.glassLogo, {backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.03)'}]} elevation={0}>
            <Image 
              source={require('../../../logo.png')} 
              style={{width: 80, height: 80}} 
              resizeMode="contain" 
            />
          </Surface>
        </View>

        {/* Brand Section */}
        <View style={styles.textContainer}>
          <Text style={[styles.welcomeText, {color: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'}]}>Système de Présence</Text>

          <Text style={[styles.brandText, {color: theme.colors.onSurface}]}>REGISTRE</Text>
          <Text style={[styles.brandText, {color: '#4facfe'}]}>INTELLIGENT</Text>
          <View style={styles.separator} />
          <Text style={[styles.tagline, {color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'}]}>Sécurisé • Précis • Instantané</Text>
        </View>

        {/* Primary Action */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleStartScan}
          style={styles.mainActionWrapper}>
          <Surface style={styles.mainActionButton} elevation={5}>
            <View style={styles.btnContent}>
              <MaterialCommunityIcons name="camera-iris" size={26} color="#fff" />
              <Text style={styles.btnText}>COMMENCER LE SCAN</Text>
            </View>
          </Surface>
        </TouchableOpacity>

        {/* Quick Access Grid */}
        <View style={styles.secondaryActions}>
          <TouchableOpacity
            onPress={() => navigation.navigate('History')}
            style={styles.smallBtn}>
            <Surface style={[styles.iconCircle, {backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.05)'}]} elevation={1}>
              <MaterialCommunityIcons
                name="history"
                size={24}
                color={isDarkMode ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.7)"}
              />
            </Surface>
            <Text style={[styles.smallBtnText, {color: theme.colors.onSurfaceVariant}]}>Historique</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Classes')}
            style={styles.smallBtn}>
            <Surface style={[styles.iconCircle, {backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.05)'}]} elevation={1}>
              <MaterialCommunityIcons
                name="account-group"
                size={24}
                color={isDarkMode ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.7)"}
              />
            </Surface>
            <Text style={[styles.smallBtnText, {color: theme.colors.onSurfaceVariant}]}>Étudiants</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            style={styles.smallBtn}>
            <Surface style={[styles.iconCircle, {backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.05)'}]} elevation={1}>
              <MaterialCommunityIcons
                name="cog-outline"
                size={24}
                color={isDarkMode ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.7)"}
              />
            </Surface>
            <Text style={[styles.smallBtnText, {color: theme.colors.onSurfaceVariant}]}>Paramètres</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Footer Decoration */}
      <View style={styles.footer}>
        <Text style={[styles.versionText, {color: isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}]}>v0.78.3 Prototype</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F2027', // Sombre profond
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0F2027',
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: (width * 1.2) / 2,
    opacity: 0.3,
  },
  blob1: {
    backgroundColor: '#2C5364',
    top: -width * 0.4,
    left: -width * 0.2,
  },
  blob2: {
    backgroundColor: '#203A43',
    bottom: -width * 0.4,
    right: -width * 0.2,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 32, 39, 0.4)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logoContainer: {
    marginBottom: 30,
  },
  glassLogo: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  welcomeText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  brandText: {
    fontSize: 40,
    color: '#fff',
    fontWeight: '900',
    lineHeight: 46,
    textAlign: 'center',
  },
  separator: {
    width: 50,
    height: 3,
    backgroundColor: '#4facfe',
    marginVertical: 20,
    borderRadius: 2,
  },
  tagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '400',
  },
  mainActionWrapper: {
    width: '100%',
    maxWidth: 280,
  },
  mainActionButton: {
    borderRadius: 16,
    backgroundColor: '#4facfe',
    overflow: 'hidden',
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  btnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1,
  },
  secondaryActions: {
    flexDirection: 'row',
    marginTop: 50,
    gap: 50,
  },
  smallBtn: {
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  smallBtnText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
  },
  versionText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1,
  },
});

export default HomeScreen;
