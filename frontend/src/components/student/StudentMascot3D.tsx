import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export type MascotMood =
  | 'idle'
  | 'welcome'
  | 'happy'
  | 'excited'
  | 'celebrating'
  | 'encouraging'
  | 'thinking'
  | 'focused';

export type MascotReactionType =
  | 'HAPPY'
  | 'PLAYFUL'
  | 'FOCUSED'
  | 'ENCOURAGING'
  | 'CELEBRATING'
  | 'HOVER_GREET';

export interface MascotSpeechEvent {
  message: string;
  emoji?: string;
  durationMs?: number;
}

interface StudentMascot3DProps {
  mood?: MascotMood;
  studentName?: string;
  scoreImprovement?: number;
  isPersonalBest?: boolean;
  streakDays?: number;
  hasUpcomingTest?: boolean;
  fallbackImage?: string;
  onCompanionMessage?: (event: MascotSpeechEvent) => void;
}

// 5 Interactive Reactions with 8th–12th age-appropriate copy
const CLICK_REACTIONS: {
  type: MascotReactionType;
  message: string;
  emoji: string;
  animationDuration: number;
}[] = [
  {
    type: 'HAPPY',
    message: 'Hey! 😄 Ready to learn?',
    emoji: '✨',
    animationDuration: 1800,
  },
  {
    type: 'PLAYFUL',
    message: 'Psst… ready for another challenge?',
    emoji: '😉',
    animationDuration: 2000,
  },
  {
    type: 'FOCUSED',
    message: 'Study mode: ON. 🎯',
    emoji: '🎯',
    animationDuration: 1900,
  },
  {
    type: 'ENCOURAGING',
    message: "You've got this! 💪",
    emoji: '💪',
    animationDuration: 1800,
  },
  {
    type: 'CELEBRATING',
    message: 'Woohoo! 🎉',
    emoji: '🎉',
    animationDuration: 2200,
  },
];

export default function StudentMascot3D({
  mood = 'idle',
  scoreImprovement = 0,
  isPersonalBest = false,
  streakDays = 0,
  hasUpcomingTest = false,
  fallbackImage = '/mascot-owl.png',
  onCompanionMessage,
}: StudentMascot3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [useFallback, setUseFallback] = useState(false);

  // Active transient click/tap reaction state
  const [activeReaction, setActiveReaction] = useState<{
    type: MascotReactionType;
    startTime: number;
    duration: number;
  } | null>(null);

  // Reaction click cooldown tracker
  const lastClickTimeRef = useRef(0);
  const reactionIndexRef = useRef(0);
  const rapidClickCountRef = useRef(0);

  // Hover greeting cooldown tracker
  const lastHoverTimeRef = useRef(0);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Subtle floating emoji badge reflecting live companion state
  const baseEmoji = React.useMemo(() => {
    switch (mood) {
      case 'celebrating':
        return '🏆';
      case 'excited':
        return '🔥';
      case 'happy':
        return scoreImprovement > 5 ? '🚀' : '📈';
      case 'welcome':
        return '🌱';
      case 'focused':
        return '🎯';
      case 'thinking':
        return '💡';
      case 'encouraging':
        return '💪';
      case 'idle':
      default:
        return '✨';
    }
  }, [mood, scoreImprovement]);

  const [currentEmoji, setCurrentEmoji] = useState(baseEmoji);

  useEffect(() => {
    if (!activeReaction) {
      setCurrentEmoji(baseEmoji);
    }
  }, [baseEmoji, activeReaction]);

  // Click / Tap Handler with cooldown & round-robin reactions
  const handleInteraction = useCallback(
    (e?: React.MouseEvent | React.TouchEvent) => {
      if (e) {
        e.stopPropagation();
      }

      const now = Date.now();
      // Easter egg tracker for rapid clicking
      if (now - lastClickTimeRef.current < 650) {
        rapidClickCountRef.current += 1;
        if (rapidClickCountRef.current >= 3) {
          rapidClickCountRef.current = 0;
          lastClickTimeRef.current = now;
          setActiveReaction({
            type: 'PLAYFUL',
            startTime: performance.now(),
            duration: 2200,
          });
          setCurrentEmoji('😂');
          if (onCompanionMessage) {
            onCompanionMessage({
              message: "Okay okay! 😂 Let's study!",
              emoji: '😂',
              durationMs: 2800,
            });
          }
          return;
        }
      } else {
        rapidClickCountRef.current = 0;
      }

      // 1.1s cooldown for normal reactions to avoid spam
      if (now - lastClickTimeRef.current < 1100) {
        return;
      }
      lastClickTimeRef.current = now;

      // Select next reaction round-robin
      const reaction = CLICK_REACTIONS[reactionIndexRef.current % CLICK_REACTIONS.length];
      reactionIndexRef.current += 1;

      setActiveReaction({
        type: reaction.type,
        startTime: performance.now(),
        duration: reaction.animationDuration,
      });

      setCurrentEmoji(reaction.emoji);

      // Emit contextual message to parent speech bubble
      if (onCompanionMessage) {
        onCompanionMessage({
          message: reaction.message,
          emoji: reaction.emoji,
          durationMs: 3000,
        });
      }

      // Automatically reset active reaction after its duration
      setTimeout(() => {
        setActiveReaction(prev => {
          if (prev?.type === reaction.type) {
            return null;
          }
          return prev;
        });
      }, reaction.animationDuration);
    },
    [onCompanionMessage]
  );

  // Hover detection handler with debounce & cooldown
  const handlePointerEnter = useCallback(() => {
    const now = Date.now();
    // 8s cooldown for hover greetings so it doesn't annoy the student
    if (now - lastHoverTimeRef.current < 8000) {
      return;
    }

    hoverTimeoutRef.current = setTimeout(() => {
      lastHoverTimeRef.current = Date.now();
      if (!activeReaction && onCompanionMessage) {
        onCompanionMessage({
          message: 'Hi! 👋',
          emoji: '👋',
          durationMs: 2200,
        });
      }
    }, 400); // 400ms delay to verify intentional hover
  }, [activeReaction, onCompanionMessage]);

  const handlePointerLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  // Three.js Canvas Scene initialization
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Check for prefers-reduced-motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Check WebGL availability
    const testCanvas = document.createElement('canvas');
    const gl =
      testCanvas.getContext('webgl') ||
      testCanvas.getContext('experimental-webgl');
    if (!gl) {
      setUseFallback(true);
      return;
    }

    const width = container.clientWidth || 220;
    const height = container.clientHeight || 220;

    // Scene + Camera + Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    camera.position.set(0, 0.25, 4.0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = false;
    container.appendChild(renderer.domElement);

    // Studio Lighting tailored for clean dashboard integration
    scene.add(new THREE.AmbientLight(0xffffff, 1.4));
    const keyLight = new THREE.DirectionalLight(0xfffaf0, 1.8);
    keyLight.position.set(2.5, 4, 3.5);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xccfbf1, 1.0);
    fillLight.position.set(-3, 1, 2);
    scene.add(fillLight);

    const mascotGroup = new THREE.Group();
    scene.add(mascotGroup);

    // Track internal animated parts for procedural character
    const animParts: {
      leftEye?: THREE.Mesh;
      rightEye?: THREE.Mesh;
      leftPupil?: THREE.Mesh;
      rightPupil?: THREE.Mesh;
      leftWing?: THREE.Mesh;
      rightWing?: THREE.Mesh;
      beak?: THREE.Mesh;
      capSkull?: THREE.Mesh;
      capTop?: THREE.Mesh;
      tasselLine?: THREE.Mesh;
      tasselDrop?: THREE.Mesh;
      body?: THREE.Mesh;
      confettiGroup?: THREE.Group;
    } = {};

    let animationFrameId: number;
    const clock = new THREE.Clock();

    const buildProceduralOwl = () => {
      // 1. Soft Ground Shadow disc underneath
      const shadowGeo = new THREE.CircleGeometry(0.75, 32);
      const shadowMat = new THREE.MeshBasicMaterial({
        color: 0x0f172a,
        transparent: true,
        opacity: 0.08,
      });
      const shadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
      shadowDisc.rotation.x = -Math.PI / 2;
      shadowDisc.position.set(0, -1.05, 0);
      scene.add(shadowDisc);

      // 2. Body (Emerald / Mint Teal with subtle sheen)
      const bodyGeo = new THREE.SphereGeometry(0.78, 36, 36);
      bodyGeo.scale(1, 1.14, 0.95);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x059669,
        roughness: 0.32,
        metalness: 0.08,
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      mascotGroup.add(body);
      animParts.body = body;

      // 3. Belly Patch (Cream Warm White)
      const bellyGeo = new THREE.SphereGeometry(0.52, 28, 28);
      bellyGeo.scale(0.85, 0.98, 0.42);
      const bellyMat = new THREE.MeshStandardMaterial({
        color: 0xfefce8,
        roughness: 0.45,
      });
      const belly = new THREE.Mesh(bellyGeo, bellyMat);
      belly.position.set(0, -0.16, 0.62);
      mascotGroup.add(belly);

      // 4. Eyes (Outer white)
      const eyeGeo = new THREE.SphereGeometry(0.25, 24, 24);
      eyeGeo.scale(1, 1, 0.38);
      const eyeWhiteMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.15,
      });

      const leftEye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
      leftEye.position.set(-0.3, 0.25, 0.68);
      mascotGroup.add(leftEye);
      animParts.leftEye = leftEye;

      const rightEye = new THREE.Mesh(eyeGeo.clone(), eyeWhiteMat);
      rightEye.position.set(0.3, 0.25, 0.68);
      mascotGroup.add(rightEye);
      animParts.rightEye = rightEye;

      // 5. Pupils (Dark Slate with subtle specular shine)
      const pupilGeo = new THREE.SphereGeometry(0.125, 20, 20);
      pupilGeo.scale(1, 1, 0.38);
      const pupilMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.1,
      });

      const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
      leftPupil.position.set(-0.28, 0.25, 0.78);
      mascotGroup.add(leftPupil);
      animParts.leftPupil = leftPupil;

      const rightPupil = new THREE.Mesh(pupilGeo.clone(), pupilMat);
      rightPupil.position.set(0.28, 0.25, 0.78);
      mascotGroup.add(rightPupil);
      animParts.rightPupil = rightPupil;

      // Eye catchlights (Tiny reflection spots)
      const catchlightGeo = new THREE.SphereGeometry(0.035, 12, 12);
      const catchlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const leftCatch = new THREE.Mesh(catchlightGeo, catchlightMat);
      leftCatch.position.set(-0.24, 0.3, 0.82);
      mascotGroup.add(leftCatch);
      const rightCatch = new THREE.Mesh(catchlightGeo.clone(), catchlightMat);
      rightCatch.position.set(0.32, 0.3, 0.82);
      mascotGroup.add(rightCatch);

      // 6. Beak (Warm Amber Orange)
      const beakGeo = new THREE.ConeGeometry(0.12, 0.26, 18);
      const beak = new THREE.Mesh(
        beakGeo,
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.25 })
      );
      beak.rotation.x = Math.PI / 2 + 0.32;
      beak.position.set(0, 0.05, 0.82);
      mascotGroup.add(beak);
      animParts.beak = beak;

      // 7. Wings (Left & Right)
      const wingGeo = new THREE.SphereGeometry(0.42, 22, 22);
      wingGeo.scale(0.28, 1.15, 0.7);
      const wingMat = new THREE.MeshStandardMaterial({
        color: 0x047857,
        roughness: 0.35,
      });

      const leftWing = new THREE.Mesh(wingGeo, wingMat);
      leftWing.position.set(-0.84, -0.06, 0.1);
      leftWing.rotation.z = 0.22;
      mascotGroup.add(leftWing);
      animParts.leftWing = leftWing;

      const rightWing = new THREE.Mesh(wingGeo.clone(), wingMat);
      rightWing.position.set(0.84, -0.06, 0.1);
      rightWing.rotation.z = -0.22;
      mascotGroup.add(rightWing);
      animParts.rightWing = rightWing;

      // 8. Graduation Cap (Academic Identity)
      const capMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.3,
      });
      const capSkull = new THREE.Mesh(
        new THREE.CylinderGeometry(0.34, 0.38, 0.22, 24),
        capMat
      );
      capSkull.position.set(0, 0.9, 0);
      mascotGroup.add(capSkull);
      animParts.capSkull = capSkull;

      const capTop = new THREE.Mesh(
        new THREE.BoxGeometry(0.95, 0.055, 0.95),
        capMat
      );
      capTop.position.set(0, 1.03, 0);
      capTop.rotation.y = Math.PI / 4;
      mascotGroup.add(capTop);
      animParts.capTop = capTop;

      // Cap button
      const capButton = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.06, 16),
        new THREE.MeshStandardMaterial({ color: 0x0f172a })
      );
      capButton.position.set(0, 1.07, 0);
      mascotGroup.add(capButton);

      // Gold Tassel
      const tasselLineGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.38, 8);
      const tasselMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        roughness: 0.3,
      });
      const tasselLine = new THREE.Mesh(tasselLineGeo, tasselMat);
      tasselLine.position.set(0.38, 0.92, 0.38);
      tasselLine.rotation.z = -0.4;
      mascotGroup.add(tasselLine);
      animParts.tasselLine = tasselLine;

      const tasselDrop = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 12, 12),
        tasselMat
      );
      tasselDrop.position.set(0.46, 0.74, 0.38);
      mascotGroup.add(tasselDrop);
      animParts.tasselDrop = tasselDrop;

      // 9. Subtle celebratory confetti particles group (dormant until CELEBRATING reaction)
      const confettiGroup = new THREE.Group();
      confettiGroup.visible = false;
      const confettiColors = [0x14b8a6, 0xf59e0b, 0x10b981, 0x6366f1];
      for (let i = 0; i < 18; i++) {
        const cGeo = new THREE.PlaneGeometry(0.045, 0.045);
        const cMat = new THREE.MeshBasicMaterial({
          color: confettiColors[i % confettiColors.length],
          side: THREE.DoubleSide,
        });
        const cMesh = new THREE.Mesh(cGeo, cMat);
        cMesh.position.set(
          (Math.random() - 0.5) * 1.5,
          Math.random() * 1.4,
          (Math.random() - 0.5) * 0.8
        );
        cMesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        confettiGroup.add(cMesh);
      }
      scene.add(confettiGroup);
      animParts.confettiGroup = confettiGroup;
    };

    // Try GLB first, fallback to procedural model
    const loader = new GLTFLoader();
    loader.load(
      '/models/student-mascot.glb',
      gltf => {
        mascotGroup.add(gltf.scene);
      },
      undefined,
      () => {
        buildProceduralOwl();
      }
    );

    // Mouse tracking for subtle 3D tilt & smooth gaze
    let targetRotX = 0;
    let targetRotY = 0;
    let targetEyeX = 0;
    let targetEyeY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      if (prefersReducedMotion) return;
      const rect = container.getBoundingClientRect();
      // Distance from mascot container center
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distFromCenter = Math.hypot(e.clientX - centerX, e.clientY - centerY);

      // Only track if cursor is reasonably near (within 450px)
      if (distFromCenter < 450) {
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
        targetRotY = THREE.MathUtils.clamp(x * 0.28, -0.38, 0.38);
        targetRotX = THREE.MathUtils.clamp(-y * 0.2, -0.25, 0.25);
        targetEyeX = THREE.MathUtils.clamp(x * 0.025, -0.025, 0.025);
        targetEyeY = THREE.MathUtils.clamp(y * 0.018, -0.018, 0.018);
      } else {
        targetRotX = 0;
        targetRotY = 0;
        targetEyeX = 0;
        targetEyeY = 0;
      }
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Blink & Idle life randomized timers
    let lastBlinkTime = 0;
    let nextBlinkInterval = 3.5;
    let isBlinking = false;

    let lastIdleFidgetTime = 0;
    let nextFidgetInterval = 5.0;
    let activeFidget = 0; // 0=none, 1=lookLeft, 2=lookRight, 3=capShift

    // Main render and animation loop
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      if (!prefersReducedMotion) {
        // ── Blinking (randomized between 3.0s and 4.8s) ──
        if (t - lastBlinkTime > nextBlinkInterval) {
          isBlinking = true;
          lastBlinkTime = t;
          nextBlinkInterval = 3.0 + Math.random() * 2.0;
        }

        if (isBlinking) {
          const blinkProgress = (t - lastBlinkTime) / 0.16;
          if (blinkProgress <= 1) {
            const scaleY = Math.max(0.1, 1 - Math.sin(blinkProgress * Math.PI) * 0.9);
            if (animParts.leftEye) animParts.leftEye.scale.y = scaleY;
            if (animParts.rightEye) animParts.rightEye.scale.y = scaleY;
            if (animParts.leftPupil) animParts.leftPupil.scale.y = scaleY;
            if (animParts.rightPupil) animParts.rightPupil.scale.y = scaleY;
          } else {
            isBlinking = false;
            if (animParts.leftEye) animParts.leftEye.scale.y = 1;
            if (animParts.rightEye) animParts.rightEye.scale.y = 1;
            if (animParts.leftPupil) animParts.leftPupil.scale.y = 1;
            if (animParts.rightPupil) animParts.rightPupil.scale.y = 1;
          }
        }

        // ── Idle Micro-actions & Natural Life ──
        if (t - lastIdleFidgetTime > nextFidgetInterval) {
          lastIdleFidgetTime = t;
          nextFidgetInterval = 4.5 + Math.random() * 3.5;
          activeFidget = Math.floor(Math.random() * 4); // 0..3
        }

        let fidgetRotY = 0;
        let fidgetCapZ = 0;
        const fidgetAge = t - lastIdleFidgetTime;
        if (fidgetAge < 1.4) {
          const fProgress = Math.sin((fidgetAge / 1.4) * Math.PI);
          if (activeFidget === 1) {
            fidgetRotY = -0.12 * fProgress; // look subtle left
          } else if (activeFidget === 2) {
            fidgetRotY = 0.12 * fProgress; // look subtle right
          } else if (activeFidget === 3) {
            fidgetCapZ = 0.08 * fProgress; // tiny cap shift
          }
        }

        if (animParts.capTop && animParts.capSkull) {
          animParts.capTop.rotation.z = fidgetCapZ;
          animParts.capSkull.rotation.z = fidgetCapZ;
        }

        // ── Smooth Pupil Eye Tracking ──
        if (animParts.leftPupil && animParts.rightPupil) {
          const naturalDriftX = Math.sin(t * 0.8) * 0.008;
          const naturalDriftY = Math.cos(t * 0.6) * 0.006;
          const curTargetX = targetEyeX + naturalDriftX;
          const curTargetY = targetEyeY + naturalDriftY;

          animParts.leftPupil.position.x +=
            (-0.28 + curTargetX - animParts.leftPupil.position.x) * 0.1;
          animParts.leftPupil.position.y +=
            (0.25 + curTargetY - animParts.leftPupil.position.y) * 0.1;
          animParts.rightPupil.position.x +=
            (0.28 + curTargetX - animParts.rightPupil.position.x) * 0.1;
          animParts.rightPupil.position.y +=
            (0.25 + curTargetY - animParts.rightPupil.position.y) * 0.1;
        }

        // ── Handle Active Transient Click Reaction ──
        if (activeReaction) {
          const elapsedReaction = performance.now() - activeReaction.startTime;
          const progress = Math.min(1, elapsedReaction / activeReaction.duration);
          const reactionPhase = Math.sin(progress * Math.PI);

          if (animParts.confettiGroup) {
            animParts.confettiGroup.visible = false;
          }

          switch (activeReaction.type) {
            case 'HAPPY':
              // Small bounce + head tilt + wing wave
              mascotGroup.position.y = Math.sin(progress * Math.PI * 2) * 0.08;
              mascotGroup.rotation.z = Math.sin(progress * Math.PI) * 0.08;
              if (animParts.rightWing) {
                animParts.rightWing.rotation.z = -0.22 - reactionPhase * 0.35;
              }
              break;

            case 'PLAYFUL':
              // Wink with right eye + cap tilt + wing movement
              if (animParts.rightEye && animParts.rightPupil && progress < 0.6) {
                animParts.rightEye.scale.y = 0.15;
                animParts.rightPupil.scale.y = 0.15;
              }
              if (animParts.capTop) {
                animParts.capTop.rotation.z = Math.sin(progress * Math.PI * 2) * 0.12;
              }
              if (animParts.leftWing) {
                animParts.leftWing.rotation.z = 0.22 + reactionPhase * 0.25;
              }
              break;

            case 'FOCUSED':
              // Straighten posture + forward gaze
              mascotGroup.position.y = THREE.MathUtils.lerp(
                mascotGroup.position.y,
                0.03,
                0.15
              );
              mascotGroup.rotation.x = THREE.MathUtils.lerp(
                mascotGroup.rotation.x,
                0.1,
                0.15
              );
              mascotGroup.rotation.z = 0;
              break;

            case 'ENCOURAGING':
              // Gentle reassuring nod
              mascotGroup.position.y = Math.sin(progress * Math.PI * 3) * 0.04;
              mascotGroup.rotation.x = Math.sin(progress * Math.PI * 2) * 0.06;
              break;

            case 'CELEBRATING':
              // Joyful victory hop + wing flap + confetti
              mascotGroup.position.y = Math.abs(Math.sin(progress * Math.PI * 3)) * 0.1;
              if (animParts.leftWing && animParts.rightWing) {
                animParts.leftWing.rotation.z =
                  0.35 + Math.sin(progress * Math.PI * 6) * 0.3;
                animParts.rightWing.rotation.z =
                  -0.35 - Math.sin(progress * Math.PI * 6) * 0.3;
              }
              if (animParts.confettiGroup) {
                animParts.confettiGroup.visible = true;
                animParts.confettiGroup.position.y = progress * 0.4;
                animParts.confettiGroup.rotation.y += 0.02;
              }
              break;
          }
        } else {
          // ── Data-Driven Default State & Breathing Animation ──
          if (animParts.confettiGroup) {
            animParts.confettiGroup.visible = false;
          }

          switch (mood) {
            case 'welcome':
              mascotGroup.position.y = Math.sin(t * 2.0) * 0.04;
              mascotGroup.rotation.z = Math.sin(t * 1.5) * 0.04;
              if (animParts.rightWing) {
                animParts.rightWing.rotation.z =
                  -0.22 - Math.abs(Math.sin(t * 4)) * 0.35;
              }
              break;

            case 'happy':
              mascotGroup.position.y = Math.sin(t * 2.8) * 0.06;
              mascotGroup.rotation.z = Math.sin(t * 1.8) * 0.05;
              if (animParts.leftWing && animParts.rightWing) {
                animParts.leftWing.rotation.z = 0.22 + Math.sin(t * 5.5) * 0.22;
                animParts.rightWing.rotation.z = -0.22 - Math.sin(t * 5.5) * 0.22;
              }
              break;

            case 'excited':
              mascotGroup.position.y = Math.sin(t * 3.2) * 0.07;
              if (animParts.leftWing && animParts.rightWing) {
                animParts.leftWing.rotation.z = 0.3 + Math.sin(t * 6) * 0.25;
                animParts.rightWing.rotation.z = -0.3 - Math.sin(t * 6) * 0.25;
              }
              break;

            case 'celebrating':
              mascotGroup.position.y = Math.abs(Math.sin(t * 3.2)) * 0.08;
              if (animParts.leftWing && animParts.rightWing) {
                animParts.leftWing.rotation.z = 0.35 + Math.sin(t * 6) * 0.25;
                animParts.rightWing.rotation.z = -0.35 - Math.sin(t * 6) * 0.25;
              }
              break;

            case 'encouraging':
              mascotGroup.position.y = Math.sin(t * 1.4) * 0.03;
              mascotGroup.rotation.x = Math.sin(t * 1.8) * 0.04;
              break;

            case 'thinking':
              mascotGroup.position.y = Math.sin(t * 1.3) * 0.025;
              mascotGroup.rotation.z = 0.06;
              mascotGroup.rotation.x = -0.04;
              break;

            case 'focused':
              mascotGroup.position.y = Math.sin(t * 1.6) * 0.03;
              mascotGroup.rotation.x = 0.08 + Math.sin(t * 1.2) * 0.02;
              break;

            case 'idle':
            default:
              // Natural organic breathing + gentle floating
              mascotGroup.position.y = Math.sin(t * 1.6) * 0.035;
              if (animParts.body) {
                const breath = 1 + Math.sin(t * 1.2) * 0.015;
                animParts.body.scale.set(breath, breath, breath);
              }
              if (animParts.leftWing)
                animParts.leftWing.rotation.z = 0.22 + Math.sin(t * 1.4) * 0.04;
              if (animParts.rightWing)
                animParts.rightWing.rotation.z =
                  -0.22 - Math.sin(t * 1.4) * 0.04;
              break;
          }

          // Smooth mouse look & natural fidget head motion interpolation
          mascotGroup.rotation.y +=
            (targetRotY + fidgetRotY - mascotGroup.rotation.y) * 0.08;
          mascotGroup.rotation.x += (targetRotX - mascotGroup.rotation.x) * 0.08;
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [mood, activeReaction]);

  return (
    <div className="relative flex flex-col items-center select-none shrink-0">
      {/* Interactive Mascot Avatar Zone */}
      <div
        onClick={handleInteraction}
        onTouchEnd={handleInteraction}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        className="relative cursor-pointer transition-transform duration-200 ease-out group hover:scale-[1.02] active:scale-[0.98]"
        title="Tap me to interact!"
        role="button"
        tabIndex={0}
        aria-label="IQ Companion Interactive 3D Mascot"
      >
        {/* Subtle, soft ambient mint/teal radial glow — clean light background aura */}
        <div
          className="absolute -inset-4 rounded-full pointer-events-none transition-opacity duration-500 opacity-60 group-hover:opacity-90"
          style={{
            background:
              'radial-gradient(circle, rgba(20,184,166,0.15) 0%, rgba(16,185,129,0.06) 55%, transparent 75%)',
          }}
        />

        {/* Mascot Canvas Container (44–52 = ~180px–210px) */}
        <div className="relative w-44 h-44 sm:w-52 sm:h-52">
          {useFallback ? (
            <img
              src={fallbackImage}
              alt="IQ Companion"
              className="w-full h-full object-contain drop-shadow-md pointer-events-none"
              draggable={false}
            />
          ) : (
            <div ref={mountRef} className="w-full h-full" />
          )}

          {/* Floating emoji reaction badge */}
          <div
            className="absolute top-1 right-2 text-2xl leading-none drop-shadow-sm select-none transition-transform duration-200 group-hover:scale-115 group-active:scale-95"
            aria-hidden="true"
          >
            {currentEmoji}
          </div>
        </div>
      </div>
    </div>
  );
}
