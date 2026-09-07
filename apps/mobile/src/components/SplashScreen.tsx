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
import Svg, { Circle, Defs, Mask, Path } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const TRAIL_PATH =
  'M 20 266 C 88 278 125 205 82 210 C 40 215 60 280 128 247 Q 165 228 174 182';
const TRAIL_LENGTH = 330;

export function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const { width, height } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;
  const arrival = useRef(new Animated.Value(0)).current;
  const trail = useRef(new Animated.Value(0)).current;
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
    const fallback = setTimeout(complete, 4000);
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
              Animated.delay(180),
              Animated.parallel([
                Animated.timing(arrival, {
                  toValue: 1,
                  duration: 900,
                  easing: Easing.inOut(Easing.quad),
                  useNativeDriver: true,
                }),
                Animated.timing(trail, {
                  toValue: 1,
                  duration: 900,
                  easing: Easing.linear,
                  useNativeDriver: false,
                }),
              ]),
              Animated.delay(260),
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
  }, [arrival, opacity, progress, trail]);

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
          <Defs>
            <Mask id="trail-reveal">
              <AnimatedPath
                d={TRAIL_PATH}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth={14}
                strokeLinecap="round"
                strokeDasharray={`${TRAIL_LENGTH} ${TRAIL_LENGTH}`}
                strokeDashoffset={trail.interpolate({
                  inputRange: [0, 1],
                  outputRange: [TRAIL_LENGTH, 0],
                })}
              />
            </Mask>
          </Defs>
          <Circle cx={20} cy={266} r={14} fill="#6B33CC" />
          <Path
            d={TRAIL_PATH}
            fill="none"
            stroke="#6B33CC"
            strokeWidth={7}
            strokeLinecap="round"
            strokeDasharray="9 12"
            mask="url(#trail-reveal)"
          />
        </Svg>
        <Animated.View
          style={[
            styles.plane,
            {
              transform: [
                {
                  translateX: arrival.interpolate({
                    inputRange: [0, 0.28, 0.52, 0.74, 1],
                    outputRange: [
                      -size * 0.55,
                      -size * 0.36,
                      -size * 0.48,
                      -size * 0.2,
                      0,
                    ],
                  }),
                },
                {
                  translateY: arrival.interpolate({
                    inputRange: [0, 0.28, 0.52, 0.74, 1],
                    outputRange: [
                      size * 0.34,
                      size * 0.12,
                      size * 0.03,
                      size * 0.19,
                      0,
                    ],
                  }),
                },
                {
                  rotate: arrival.interpolate({
                    inputRange: [0, 0.28, 0.52, 0.74, 1],
                    outputRange: ['18deg', '-8deg', '9deg', '-4deg', '0deg'],
                  }),
                },
              ],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.image,
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
            <View style={[styles.spark, styles.sparkOne]} />
            <View style={[styles.spark, styles.sparkTwo]} />
            <View style={[styles.spark, styles.sparkDot]} />
          </Animated.View>
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
  spark: {
    position: 'absolute',
    backgroundColor: '#A6CE39',
    borderRadius: 999,
  },
  sparkOne: {
    width: 9,
    height: 30,
    right: 9,
    top: 0,
    transform: [{ rotate: '28deg' }],
  },
  sparkTwo: {
    width: 9,
    height: 25,
    right: -9,
    top: 21,
    transform: [{ rotate: '54deg' }],
  },
  sparkDot: {
    width: 12,
    height: 12,
    right: -8,
    top: 51,
  },
  wordmark: {
    color: '#6B33CC',
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: -8,
  },
  lime: { color: '#A6CE39' },
});
