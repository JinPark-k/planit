import React, { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

export function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const { width, height } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const finish = useRef(onFinish);
  finish.current = onFinish;

  useEffect(() => {
    let disposed = false;
    let completed = false;
    let animation: Animated.CompositeAnimation | undefined;
    const complete = () => {
      if (!disposed && !completed) {
        completed = true;
        finish.current();
      }
    };
    // A failed accessibility lookup or interrupted animation must never trap launch.
    const fallback = setTimeout(complete, 2500);
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => true)
      .then(reduced => {
        if (disposed || completed) return;
        animation = reduced
          ? Animated.sequence([
              Animated.delay(200),
              Animated.timing(opacity, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
              }),
            ])
          : Animated.sequence([
              Animated.delay(350),
              Animated.timing(progress, {
                toValue: -0.04,
                duration: 160,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              }),
              Animated.parallel([
                Animated.timing(progress, {
                  toValue: 1,
                  duration: 480,
                  easing: Easing.in(Easing.cubic),
                  useNativeDriver: true,
                }),
                Animated.sequence([
                  Animated.delay(300),
                  Animated.timing(opacity, {
                    toValue: 0,
                    duration: 220,
                    useNativeDriver: true,
                  }),
                ]),
              ]),
            ]);
        animation.start(({ finished }) => {
          if (finished) complete();
        });
      });
    return () => {
      disposed = true;
      clearTimeout(fallback);
      animation?.stop();
    };
  }, [opacity, progress]);

  const size = Math.min(width * 0.7, height * 0.4, 300);
  return (
    <Animated.View
      style={[styles.overlay, { opacity }]}
      accessibilityViewIsModal
      accessibilityLabel="PLANIT"
      accessibilityRole="image"
    >
      <View style={{ width: size, height: size }}>
        <Svg width="100%" height="100%" viewBox="0 0 300 300">
          <Path
            d="M 20 266 C 88 278 125 205 82 210 C 40 215 60 280 128 247 Q 165 228 174 182"
            fill="none"
            stroke="#6B33CC"
            strokeWidth={7}
            strokeLinecap="round"
            strokeDasharray="9 12"
          />
        </Svg>
        <Animated.View
          style={[
            styles.plane,
            {
              transform: [
                { translateX: Animated.multiply(progress, width) },
                { translateY: Animated.multiply(progress, -height * 0.75) },
                {
                  rotate: progress.interpolate({
                    inputRange: [-0.04, 0, 1],
                    outputRange: ['-4deg', '0deg', '9deg'],
                  }),
                },
              ],
            },
          ]}
        >
          <Image
            source={require('../assets/splash-plane.png')}
            style={styles.image}
            resizeMode="contain"
            accessible={false}
          />
        </Animated.View>
      </View>
      <Text
        allowFontScaling={false}
        style={[styles.wordmark, { fontSize: size * 0.21 }]}
      >
        PLAN<Text style={styles.lime}>IT</Text>
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plane: {
    position: 'absolute',
    width: '80%',
    height: '80%',
    right: 0,
    top: 0,
  },
  image: { width: '100%', height: '100%' },
  wordmark: {
    color: '#6B33CC',
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: -8,
  },
  lime: { color: '#A6CE39' },
});
